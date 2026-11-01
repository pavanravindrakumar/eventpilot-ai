/**
 * Contract and integration tests for API schemas, demo fallback generation,
 * and cross-dashboard consistency.
 */
import { describe, it, expect } from "vitest";
import {
  GeneratePlanRequestSchema,
  AIGeneratedPlanSchema,
  EventSetupSchema,
  EventPlanState,
} from "@/lib/schemas";
import { getDemoPlan } from "@/lib/demo-plan";
import { getDemoEventPlanState } from "@/lib/demo-data";
import { recalculatePlannedAmounts, computeBudgetTotals } from "@/lib/budget";
import { shiftTaskDeadlines } from "@/lib/timeline";

describe("GeneratePlanRequestSchema", () => {
  const validEvent = {
    id: "evt-test-1",
    name: "Summer Wedding",
    type: "wedding" as const,
    date: "2025-08-20",
    location: "Napa Valley, CA",
    guestCount: 120,
    budget: 35000,
    currency: "USD" as const,
    themePreference: "Rustic Chic",
    requirements: "Vegetarian options",
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  };

  it("validates a compliant event request", () => {
    const result = GeneratePlanRequestSchema.safeParse({ event: validEvent });
    expect(result.success).toBe(true);
  });

  it("rejects negative guest count", () => {
    const result = GeneratePlanRequestSchema.safeParse({
      event: { ...validEvent, guestCount: -5 },
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-positive budget", () => {
    const result = GeneratePlanRequestSchema.safeParse({
      event: { ...validEvent, budget: 0 },
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing event name", () => {
    const result = GeneratePlanRequestSchema.safeParse({
      event: { ...validEvent, name: "" },
    });
    expect(result.success).toBe(false);
  });
});

describe("getDemoPlan contract compliance", () => {
  const eventTypes = ["wedding", "birthday", "community", "custom"] as const;

  eventTypes.forEach((type) => {
    it(`generates a schema-valid plan for event type: ${type}`, () => {
      const event = {
        id: `evt-${type}`,
        name: `Test ${type}`,
        type,
        date: "2025-09-15",
        location: "Community Center",
        guestCount: 80,
        budget: 15000,
        currency: "USD" as const,
        themePreference: "Classic",
        requirements: "None",
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-01T00:00:00Z",
      };

      const demoPlan = getDemoPlan(event);
      const validation = AIGeneratedPlanSchema.safeParse(demoPlan);
      expect(validation.success).toBe(true);

      if (validation.success) {
        expect(validation.data.summary.length).toBeGreaterThan(10);
        expect(validation.data.budgetAllocations.length).toBeGreaterThan(0);
        expect(validation.data.tasks.length).toBeGreaterThan(0);
        expect(validation.data.ideas.themes.length).toBeGreaterThan(0);
        expect(validation.data.vendorCategories.length).toBeGreaterThan(0);
      }
    });
  });
});

describe("Cross-dashboard consistency logic", () => {
  it("keeps total budget, contingency, and categories synchronized after budget edit", () => {
    const demo = getDemoEventPlanState();
    expect(demo.budget).toBeDefined();

    const originalBudget = demo.budget!;
    expect(originalBudget.totalBudget).toBe(50000);

    // Simulate budget update to 60000
    const newTotal = 60000;
    const recalculated = recalculatePlannedAmounts({
      ...originalBudget,
      totalBudget: newTotal,
    });

    const totals = computeBudgetTotals(recalculated);
    expect(totals.totalBudget).toBe(60000);
    expect(totals.contingencyAmount).toBe(6000); // 10% of 60000
    expect(totals.allocatableBudget).toBe(54000);

    // Category with 40% (Venue & Catering) should now be 40% of 54000 = 21600
    const venueCat = recalculated.categories.find((c) => c.name === "Venue & Catering");
    expect(venueCat?.plannedAmount).toBe(21600);
  });

  it("shifts task deadlines proportionally when event date moves", () => {
    const demo = getDemoEventPlanState();
    const oldDate = demo.event.date;

    // Shift event date by +14 days
    const nextDate = new Date(oldDate);
    nextDate.setDate(nextDate.getDate() + 14);
    const newDateStr = nextDate.toISOString().split("T")[0];

    const shiftedTasks = shiftTaskDeadlines(demo.tasks, oldDate, newDateStr);
    expect(shiftedTasks.length).toBe(demo.tasks.length);

    demo.tasks.forEach((originalTask, index) => {
      const origDeadline = new Date(originalTask.deadline);
      const newDeadline = new Date(shiftedTasks[index].deadline);
      const diff = Math.round((newDeadline.getTime() - origDeadline.getTime()) / (1000 * 60 * 60 * 24));
      expect(diff).toBe(14);
    });
  });
});

describe("AI Response Schema Strictness & Failure Paths", () => {
  const baseValidPlan = {
    summary: "A practical celebration plan.",
    budgetAllocations: [
      { name: "Venue", percentage: 40, notes: "Main space" },
      { name: "Catering", percentage: 30, notes: "Food and drink" },
      { name: "Decor", percentage: 20, notes: "Lighting and florals" },
    ],
    tasks: [
      {
        title: "Book venue",
        description: "Sign contract",
        daysBeforeEvent: 30,
        priority: "high" as const,
        category: "Venue",
      },
      {
        title: "Final walkthrough",
        description: "Test sound and setup",
        daysBeforeEvent: 1,
        priority: "medium" as const,
        category: "Venue",
      },
    ],
    ideas: {
      themes: ["Rustic", "Modern", "Classic"],
      decorations: ["Lanterns", "Linens"],
      catering: ["Buffet", "Passed appetizers"],
      activities: ["Photo booth", "Music"],
      recommendations: ["Book early", "Reserve 10% contingency"],
    },
    vendorCategories: ["Venue", "Catering", "Photography"],
  };

  it("accepts a fully compliant AI plan", () => {
    const res = AIGeneratedPlanSchema.safeParse(baseValidPlan);
    expect(res.success).toBe(true);
  });

  it("rejects negative daysBeforeEvent in tasks", () => {
    const invalidPlan = {
      ...baseValidPlan,
      tasks: [
        {
          title: "Invalid task",
          description: "Past task",
          daysBeforeEvent: -10,
          priority: "high" as const,
          category: "Planning",
        },
      ],
    };
    const res = AIGeneratedPlanSchema.safeParse(invalidPlan);
    expect(res.success).toBe(false);
  });

  it("rejects category percentage over 100", () => {
    const invalidPlan = {
      ...baseValidPlan,
      budgetAllocations: [{ name: "Venue", percentage: 110, notes: "Too high" }],
    };
    const res = AIGeneratedPlanSchema.safeParse(invalidPlan);
    expect(res.success).toBe(false);
  });

  it("rejects missing idea categories", () => {
    const invalidPlan = {
      ...baseValidPlan,
      ideas: {
        themes: ["Rustic"],
        // missing decorations, catering, activities, recommendations
      },
    };
    const res = AIGeneratedPlanSchema.safeParse(invalidPlan);
    expect(res.success).toBe(false);
  });

  it("rejects non-integer daysBeforeEvent", () => {
    const invalidPlan = {
      ...baseValidPlan,
      tasks: [
        {
          title: "Floating days",
          description: "Fractional",
          daysBeforeEvent: 5.5,
          priority: "low" as const,
          category: "Setup",
        },
      ],
    };
    const res = AIGeneratedPlanSchema.safeParse(invalidPlan);
    expect(res.success).toBe(false);
  });
});

describe("Date-aware planning & Custom event support", () => {
  it("constrains task deadlines to the remaining window when event is soon", () => {
    const today = new Date();
    const soonDate = new Date(today);
    soonDate.setDate(soonDate.getDate() + 25); // Event is in 25 days
    const dateStr = soonDate.toISOString().split("T")[0];

    const event = {
      id: "evt-soon",
      name: "Fast-Track Wedding",
      type: "wedding" as const,
      date: dateStr,
      location: "San Francisco, CA",
      guestCount: 50,
      budget: 15000,
      currency: "USD" as const,
      themePreference: "Minimalist",
      requirements: "Quick turnaround",
      createdAt: "2025-01-01T00:00:00Z",
      updatedAt: "2025-01-01T00:00:00Z",
    };

    const plan = getDemoPlan(event);
    expect(plan.tasks.length).toBeGreaterThan(0);

    // Every task must be scheduled <= 25 days before event
    plan.tasks.forEach((t) => {
      expect(t.daysBeforeEvent).toBeLessThanOrEqual(25);
      expect(t.daysBeforeEvent).toBeGreaterThanOrEqual(0);
    });
  });

  it("generates dedicated custom event plan with custom categories", () => {
    const event = {
      id: "evt-custom",
      name: "Tech Founders Summit",
      type: "custom" as const,
      date: "2027-06-15",
      location: "Austin, TX",
      guestCount: 150,
      budget: 45000,
      currency: "USD" as const,
      themePreference: "Innovation",
      requirements: "Keynote stage and catering",
      createdAt: "2025-01-01T00:00:00Z",
      updatedAt: "2025-01-01T00:00:00Z",
    };

    const plan = getDemoPlan(event);
    const validation = AIGeneratedPlanSchema.safeParse(plan);
    expect(validation.success).toBe(true);

    const categoryNames = plan.budgetAllocations.map((c) => c.name);
    expect(categoryNames).toContain("Venue & Staging");
    expect(categoryNames).toContain("Audio/Visual & Tech");

    const vendorCats = plan.vendorCategories;
    expect(vendorCats).toContain("AV & Technical Services");
  });
});

describe("Model attribution & Live state preservation", () => {
  it("validates GeneratePlanResponseSchema with gemini-3.5-flash-lite and isDemo: false", () => {
    const validResponse = {
      plan: {
        summary: "Live generated wedding plan",
        budgetAllocations: [{ name: "Catering", percentage: 50, notes: "Dinner" }],
        tasks: [
          {
            title: "Task 1",
            description: "Desc",
            daysBeforeEvent: 30,
            priority: "high" as const,
            category: "General",
          },
        ],
        ideas: {
          themes: ["Theme A"],
          decorations: ["Deco A"],
          catering: ["Food A"],
          activities: ["Act A"],
          recommendations: ["Rec A"],
        },
        vendorCategories: ["Catering"],
      },
      isDemo: false,
      generatedAt: new Date().toISOString(),
      generatedBy: "gemini-3.5-flash-lite",
    };

    const res = import("@/lib/schemas").then(({ GeneratePlanResponseSchema }) => {
      const parsed = GeneratePlanResponseSchema.safeParse(validResponse);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.generatedBy).toBe("gemini-3.5-flash-lite");
        expect(parsed.data.isDemo).toBe(false);
      }
    });
    return res;
  });

  it("preserves generatedBy and isDemo in EventPlanStateSchema", async () => {
    const { EventPlanStateSchema } = await import("@/lib/schemas");
    const { getLiveGeneratedPlanState } = await import("@/lib/demo-data");

    const livePlan = getLiveGeneratedPlanState();
    const parsed = EventPlanStateSchema.safeParse(livePlan);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.isDemo).toBe(false);
      expect(parsed.data.generatedBy).toBe("gemini-3.5-flash-lite");
    }
  });

  it("preserves model attribution across JSON serialization / deserialization roundtrip", async () => {
    const { EventPlanStateSchema } = await import("@/lib/schemas");
    const { getLiveGeneratedPlanState } = await import("@/lib/demo-data");

    const livePlan = getLiveGeneratedPlanState();
    const serialized = JSON.stringify(livePlan);
    const deserialized = JSON.parse(serialized);

    const validated = EventPlanStateSchema.safeParse(deserialized);
    expect(validated.success).toBe(true);
    if (validated.success) {
      expect(validated.data.generatedBy).toBe("gemini-3.5-flash-lite");
      expect(validated.data.isDemo).toBe(false);
      expect(validated.data.event.location).toContain("Bhimavaram");
    }
  });
});



