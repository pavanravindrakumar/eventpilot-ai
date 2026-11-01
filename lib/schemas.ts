/**
 * Canonical Zod schemas for EventPilot AI.
 * Contract-first: all types are derived from these schemas.
 * AI output is always validated against these schemas at runtime.
 */
import { z } from "zod";

// ─── Event Types ──────────────────────────────────────────────────────────────
export const EventTypeSchema = z.enum([
  "wedding",
  "birthday",
  "community",
  "custom",
]);
export type EventType = z.infer<typeof EventTypeSchema>;

export const CurrencySchema = z.enum([
  "USD",
  "EUR",
  "GBP",
  "INR",
  "CAD",
  "AUD",
  "SGD",
]);
export type Currency = z.infer<typeof CurrencySchema>;

export const EventSetupSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Event name is required").max(100),
  type: EventTypeSchema,
  date: z.string().min(1, "Event date is required"), // ISO date string
  location: z.string().min(1, "Location is required").max(200),
  guestCount: z
    .number()
    .int()
    .min(1, "At least 1 guest required")
    .max(10000),
  budget: z.number().positive("Budget must be positive"),
  currency: CurrencySchema,
  themePreference: z.string().max(500).optional().default(""),
  requirements: z.string().max(2000).optional().default(""),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type EventSetup = z.infer<typeof EventSetupSchema>;

// ─── Budget ───────────────────────────────────────────────────────────────────
export const BudgetCategorySchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  percentage: z
    .number()
    .min(0, "Percentage cannot be negative")
    .max(100, "Percentage cannot exceed 100"),
  plannedAmount: z.number().min(0),
  actualSpent: z.number().min(0).default(0),
  notes: z.string().optional().default(""),
});
export type BudgetCategory = z.infer<typeof BudgetCategorySchema>;

export const BudgetSchema = z.object({
  eventId: z.string(),
  totalBudget: z.number().positive(),
  contingencyPercent: z.number().min(0).max(30).default(10),
  categories: z.array(BudgetCategorySchema),
  currency: CurrencySchema,
});
export type Budget = z.infer<typeof BudgetSchema>;

// Derived budget totals (computed deterministically, never by AI)
export const BudgetTotalsSchema = z.object({
  totalBudget: z.number(),
  contingencyAmount: z.number(),
  allocatableBudget: z.number(),
  totalPlanned: z.number(),
  totalSpent: z.number(),
  remainingBalance: z.number(),
  isOverBudget: z.boolean(),
  allocationPercentageSum: z.number(),
});
export type BudgetTotals = z.infer<typeof BudgetTotalsSchema>;

// ─── Task / Timeline ──────────────────────────────────────────────────────────
export const TaskPrioritySchema = z.enum(["high", "medium", "low"]);
export type TaskPriority = z.infer<typeof TaskPrioritySchema>;

export const PlanningTaskSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional().default(""),
  deadline: z.string(), // ISO date string
  priority: TaskPrioritySchema,
  completed: z.boolean().default(false),
  category: z.string().optional().default("General"),
});
export type PlanningTask = z.infer<typeof PlanningTaskSchema>;

// ─── Vendor ───────────────────────────────────────────────────────────────────
export const BookingStatusSchema = z.enum([
  "not_contacted",
  "contacted",
  "quote_received",
  "booked",
  "cancelled",
]);
export type BookingStatus = z.infer<typeof BookingStatusSchema>;

export const VendorSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  name: z.string().min(1).max(200),
  category: z.string().min(1).max(100),
  estimatedCost: z.number().min(0),
  contactNotes: z.string().max(1000).optional().default(""),
  bookingStatus: BookingStatusSchema.default("not_contacted"),
  checklistItems: z.array(z.string()).optional().default([]),
  isVerified: z.literal(false).default(false), // NEVER claim vendors are verified
});
export type Vendor = z.infer<typeof VendorSchema>;

// ─── AI-generated idea ────────────────────────────────────────────────────────
export const AIIdeaSchema = z.object({
  themes: z.array(z.string()),
  decorations: z.array(z.string()),
  catering: z.array(z.string()),
  activities: z.array(z.string()),
  recommendations: z.array(z.string()),
});
export type AIIdea = z.infer<typeof AIIdeaSchema>;

// ─── AI generate-plan API ─────────────────────────────────────────────────────
// Request (from frontend to /api/generate-plan)
export const GeneratePlanRequestSchema = z.object({
  event: EventSetupSchema,
  regenerateIdeas: z.boolean().optional().default(false),
});
export type GeneratePlanRequest = z.infer<typeof GeneratePlanRequestSchema>;

// AI response structure (validated against this after Gemini response)
export const AIGeneratedPlanSchema = z.object({
  summary: z.string().max(500),
  budgetAllocations: z
    .array(
      z.object({
        name: z.string(),
        percentage: z.number().min(0).max(100),
        notes: z.string().optional().default(""),
      })
    )
    .max(15),
  tasks: z
    .array(
      z.object({
        title: z.string().max(200),
        description: z.string().max(1000).optional().default(""),
        daysBeforeEvent: z.number().int().min(0),
        priority: TaskPrioritySchema,
        category: z.string().optional().default("General"),
      })
    )
    .max(30),
  ideas: AIIdeaSchema,
  vendorCategories: z.array(z.string()).max(15),
});
export type AIGeneratedPlan = z.infer<typeof AIGeneratedPlanSchema>;

// Full API response to the frontend
export const GeneratePlanResponseSchema = z.object({
  plan: AIGeneratedPlanSchema,
  isDemo: z.boolean(),
  generatedAt: z.string(),
  generatedBy: z.string().optional(),
});
export type GeneratePlanResponse = z.infer<typeof GeneratePlanResponseSchema>;

// ─── Full event state (persisted to localStorage) ─────────────────────────────
export const EventPlanStateSchema = z.object({
  event: EventSetupSchema,
  budget: BudgetSchema.optional(),
  tasks: z.array(PlanningTaskSchema).default([]),
  vendors: z.array(VendorSchema).default([]),
  ideas: AIIdeaSchema.optional(),
  lastGeneratedAt: z.string().optional(),
  isDemo: z.boolean().default(false),
  generatedBy: z.string().optional(),
});
export type EventPlanState = z.infer<typeof EventPlanStateSchema>;

