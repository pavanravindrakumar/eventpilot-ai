/**
 * TDD: Tests written first, then implementations verified.
 * Tests for deterministic budget calculation functions.
 */
import { describe, it, expect } from "vitest";
import {
  computeBudgetTotals,
  recalculatePlannedAmounts,
  validateBudgetAllocations,
  buildCategoriesFromAISuggestions,
  updateActualSpending,
  updateCategoryPercentage,
  formatCurrency,
} from "@/lib/budget";
import { Budget, BudgetCategory } from "@/lib/schemas";

const makeBudget = (overrides: Partial<Budget> = {}): Budget => ({
  eventId: "evt-001",
  totalBudget: 10000,
  contingencyPercent: 10,
  currency: "USD",
  categories: [
    {
      id: "cat-1",
      name: "Venue",
      percentage: 40,
      plannedAmount: 3600,
      actualSpent: 1000,
      notes: "",
    },
    {
      id: "cat-2",
      name: "Catering",
      percentage: 30,
      plannedAmount: 2700,
      actualSpent: 500,
      notes: "",
    },
    {
      id: "cat-3",
      name: "Photography",
      percentage: 20,
      plannedAmount: 1800,
      actualSpent: 0,
      notes: "",
    },
  ],
  ...overrides,
});

describe("computeBudgetTotals", () => {
  it("computes contingency amount correctly", () => {
    const budget = makeBudget();
    const totals = computeBudgetTotals(budget);
    expect(totals.contingencyAmount).toBe(1000); // 10% of 10000
  });

  it("computes allocatable budget after contingency", () => {
    const budget = makeBudget();
    const totals = computeBudgetTotals(budget);
    expect(totals.allocatableBudget).toBe(9000); // 10000 - 1000
  });

  it("sums total planned amounts from categories", () => {
    const budget = makeBudget();
    const totals = computeBudgetTotals(budget);
    expect(totals.totalPlanned).toBe(3600 + 2700 + 1800); // 8100
  });

  it("sums total actual spending", () => {
    const budget = makeBudget();
    const totals = computeBudgetTotals(budget);
    expect(totals.totalSpent).toBe(1000 + 500); // 1500
  });

  it("computes remaining balance correctly", () => {
    const budget = makeBudget();
    const totals = computeBudgetTotals(budget);
    expect(totals.remainingBalance).toBe(10000 - 1500); // 8500
  });

  it("isOverBudget is false when spent < totalBudget", () => {
    const budget = makeBudget();
    const totals = computeBudgetTotals(budget);
    expect(totals.isOverBudget).toBe(false);
  });

  it("isOverBudget is true when spent > totalBudget", () => {
    const budget = makeBudget({
      categories: [
        { id: "c1", name: "X", percentage: 100, plannedAmount: 10000, actualSpent: 11000, notes: "" },
      ],
    });
    const totals = computeBudgetTotals(budget);
    expect(totals.isOverBudget).toBe(true);
  });

  it("returns zero totals for empty categories", () => {
    const budget = makeBudget({ categories: [] });
    const totals = computeBudgetTotals(budget);
    expect(totals.totalPlanned).toBe(0);
    expect(totals.totalSpent).toBe(0);
    expect(totals.allocationPercentageSum).toBe(0);
  });
});

describe("validateBudgetAllocations", () => {
  it("returns no errors for valid allocations", () => {
    const cats: BudgetCategory[] = [
      { id: "1", name: "A", percentage: 50, plannedAmount: 5000, actualSpent: 0, notes: "" },
      { id: "2", name: "B", percentage: 30, plannedAmount: 3000, actualSpent: 0, notes: "" },
    ];
    expect(validateBudgetAllocations(cats)).toHaveLength(0);
  });

  it("rejects negative percentages", () => {
    const cats: BudgetCategory[] = [
      { id: "1", name: "A", percentage: -5, plannedAmount: 0, actualSpent: 0, notes: "" },
    ];
    const errors = validateBudgetAllocations(cats);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain("negative");
  });

  it("rejects individual percentage > 100", () => {
    const cats: BudgetCategory[] = [
      { id: "1", name: "A", percentage: 110, plannedAmount: 0, actualSpent: 0, notes: "" },
    ];
    const errors = validateBudgetAllocations(cats);
    expect(errors.some((e) => e.includes("100%"))).toBe(true);
  });

  it("rejects total allocation > 100%", () => {
    const cats: BudgetCategory[] = [
      { id: "1", name: "A", percentage: 60, plannedAmount: 0, actualSpent: 0, notes: "" },
      { id: "2", name: "B", percentage: 60, plannedAmount: 0, actualSpent: 0, notes: "" },
    ];
    const errors = validateBudgetAllocations(cats);
    expect(errors.some((e) => e.includes("100%") || e.includes("exceed"))).toBe(true);
  });

  it("rejects negative actual spending", () => {
    const cats: BudgetCategory[] = [
      { id: "1", name: "A", percentage: 50, plannedAmount: 5000, actualSpent: -100, notes: "" },
    ];
    const errors = validateBudgetAllocations(cats);
    expect(errors.some((e) => e.includes("negative"))).toBe(true);
  });
});

describe("recalculatePlannedAmounts", () => {
  it("recalculates plannedAmount based on allocatableBudget", () => {
    const budget = makeBudget();
    const recalculated = recalculatePlannedAmounts(budget);
    // allocatableBudget = 9000 (10% contingency of 10000)
    // cat-1: 40% of 9000 = 3600
    expect(recalculated.categories[0].plannedAmount).toBe(3600);
    // cat-2: 30% of 9000 = 2700
    expect(recalculated.categories[1].plannedAmount).toBe(2700);
    // cat-3: 20% of 9000 = 1800
    expect(recalculated.categories[2].plannedAmount).toBe(1800);
  });
});

describe("buildCategoriesFromAISuggestions", () => {
  it("caps total percentage at 100", () => {
    const suggestions = [
      { name: "A", percentage: 60 },
      { name: "B", percentage: 60 }, // Would push to 120 — must be capped
    ];
    const cats = buildCategoriesFromAISuggestions(suggestions, 10000, 10);
    const total = cats.reduce((s, c) => s + c.percentage, 0);
    expect(total).toBeLessThanOrEqual(100);
  });

  it("filters out invalid entries with empty name", () => {
    const suggestions = [
      { name: "", percentage: 50 },
      { name: "Valid", percentage: 30 },
    ];
    const cats = buildCategoriesFromAISuggestions(suggestions, 10000, 10);
    expect(cats.every((c) => c.name.length > 0)).toBe(true);
  });

  it("filters out negative percentages", () => {
    const suggestions = [
      { name: "Negative", percentage: -10 },
      { name: "Valid", percentage: 40 },
    ];
    const cats = buildCategoriesFromAISuggestions(suggestions, 10000, 10);
    expect(cats.find((c) => c.name === "Negative")).toBeUndefined();
  });
});

describe("updateActualSpending", () => {
  it("updates spending for the correct category", () => {
    const budget = makeBudget();
    const updated = updateActualSpending(budget, "cat-1", 2000);
    expect(updated.categories[0].actualSpent).toBe(2000);
    expect(updated.categories[1].actualSpent).toBe(500); // unchanged
  });

  it("throws for negative spending", () => {
    const budget = makeBudget();
    expect(() => updateActualSpending(budget, "cat-1", -1)).toThrow();
  });
});

describe("updateCategoryPercentage", () => {
  it("updates the percentage and recalculates plannedAmount", () => {
    const budget = makeBudget();
    const updated = updateCategoryPercentage(budget, "cat-1", 50);
    expect(updated.categories[0].percentage).toBe(50);
    // allocatableBudget = 9000; 50% = 4500
    expect(updated.categories[0].plannedAmount).toBe(4500);
  });

  it("throws for out-of-range percentage", () => {
    const budget = makeBudget();
    expect(() => updateCategoryPercentage(budget, "cat-1", -5)).toThrow();
    expect(() => updateCategoryPercentage(budget, "cat-1", 105)).toThrow();
  });
});

describe("formatCurrency", () => {
  it("formats USD correctly", () => {
    const result = formatCurrency(50000, "USD");
    expect(result).toContain("50,000");
    expect(result).toContain("$");
  });

  it("handles unknown currency gracefully", () => {
    const result = formatCurrency(1000, "XYZ");
    expect(result).toContain("1,000");
  });
});

