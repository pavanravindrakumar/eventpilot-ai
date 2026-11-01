/**
 * Deterministic budget calculation functions.
 * AI MUST NOT modify these totals — only suggest percentages.
 * All financial calculations are pure functions with no side effects.
 */
import {
  Budget,
  BudgetCategory,
  BudgetTotals,
  BudgetCategorySchema,
} from "./schemas";
import { nanoid } from "./utils";

/**
 * Compute all derived budget totals from a Budget object.
 * This is the single authoritative source for financial calculations.
 */
export function computeBudgetTotals(budget: Budget): BudgetTotals {
  const { totalBudget, contingencyPercent, categories } = budget;

  const contingencyAmount = (totalBudget * contingencyPercent) / 100;
  const allocatableBudget = totalBudget - contingencyAmount;

  const totalPlanned = categories.reduce(
    (sum, c) => sum + c.plannedAmount,
    0
  );
  const totalSpent = categories.reduce((sum, c) => sum + c.actualSpent, 0);
  const remainingBalance = totalBudget - totalSpent;
  const isOverBudget = totalSpent > totalBudget;
  const allocationPercentageSum = categories.reduce(
    (sum, c) => sum + c.percentage,
    0
  );

  return {
    totalBudget,
    contingencyAmount,
    allocatableBudget,
    totalPlanned,
    totalSpent,
    remainingBalance,
    isOverBudget,
    allocationPercentageSum,
  };
}

/**
 * Recalculate plannedAmount for all categories based on their percentages
 * and the allocatable budget (after contingency).
 */
export function recalculatePlannedAmounts(budget: Budget): Budget {
  const contingencyAmount = (budget.totalBudget * budget.contingencyPercent) / 100;
  const allocatableBudget = budget.totalBudget - contingencyAmount;

  const updatedCategories = budget.categories.map((cat) => ({
    ...cat,
    plannedAmount: parseFloat(
      ((cat.percentage / 100) * allocatableBudget).toFixed(2)
    ),
  }));

  return { ...budget, categories: updatedCategories };
}

/**
 * Validate that budget category percentages are valid.
 * Returns an array of error messages, or empty array if valid.
 */
export function validateBudgetAllocations(categories: BudgetCategory[]): string[] {
  const errors: string[] = [];

  for (const cat of categories) {
    if (cat.percentage < 0) {
      errors.push(`"${cat.name}" cannot have a negative percentage.`);
    }
    if (cat.percentage > 100) {
      errors.push(`"${cat.name}" cannot exceed 100%.`);
    }
    if (cat.actualSpent < 0) {
      errors.push(`"${cat.name}" cannot have negative actual spending.`);
    }
  }

  const totalPercent = categories.reduce((sum, c) => sum + c.percentage, 0);
  if (totalPercent > 100) {
    errors.push(
      `Total allocation (${totalPercent.toFixed(1)}%) exceeds 100%. Please reduce allocations.`
    );
  }

  return errors;
}

/**
 * Build BudgetCategory objects from AI-suggested allocations.
 * Validates AI percentages — normalizes if needed and caps at 100% total.
 * AI never controls the final financial totals; this function does.
 */
export function buildCategoriesFromAISuggestions(
  suggestions: Array<{ name: string; percentage: number; notes?: string }>,
  totalBudget: number,
  contingencyPercent: number
): BudgetCategory[] {
  // Filter out invalid entries
  const valid = suggestions.filter(
    (s) => s.percentage >= 0 && s.name.trim().length > 0
  );

  // Cap total at 100%
  let runningTotal = 0;
  const capped = valid.map((s) => {
    const allowed = Math.min(s.percentage, 100 - runningTotal);
    runningTotal += allowed;
    return { ...s, percentage: parseFloat(allowed.toFixed(2)) };
  });

  const contingencyAmount = (totalBudget * contingencyPercent) / 100;
  const allocatableBudget = totalBudget - contingencyAmount;

  return capped.map((s) => {
    const parsed = BudgetCategorySchema.safeParse({
      id: nanoid(),
      name: s.name,
      percentage: s.percentage,
      plannedAmount: parseFloat(((s.percentage / 100) * allocatableBudget).toFixed(2)),
      actualSpent: 0,
      notes: s.notes ?? "",
    });
    if (!parsed.success) {
      // Fallback safe value
      return {
        id: nanoid(),
        name: s.name,
        percentage: 0,
        plannedAmount: 0,
        actualSpent: 0,
        notes: "",
      };
    }
    return parsed.data;
  });
}

/**
 * Update a single category's actual spending.
 */
export function updateActualSpending(
  budget: Budget,
  categoryId: string,
  newActualSpent: number
): Budget {
  if (newActualSpent < 0) throw new Error("Actual spending cannot be negative.");
  return {
    ...budget,
    categories: budget.categories.map((c) =>
      c.id === categoryId ? { ...c, actualSpent: newActualSpent } : c
    ),
  };
}

/**
 * Update a single category's percentage allocation and recompute planned amounts.
 */
export function updateCategoryPercentage(
  budget: Budget,
  categoryId: string,
  newPercentage: number
): Budget {
  if (newPercentage < 0 || newPercentage > 100) {
    throw new Error("Percentage must be between 0 and 100.");
  }
  const updated = {
    ...budget,
    categories: budget.categories.map((c) =>
      c.id === categoryId ? { ...c, percentage: newPercentage } : c
    ),
  };
  return recalculatePlannedAmounts(updated);
}

/**
 * Format a monetary amount with currency symbol.
 */
export function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

