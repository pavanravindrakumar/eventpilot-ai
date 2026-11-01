"use client";
/**
 * Zustand global store for EventPilot AI.
 * Handles event state, budget, tasks, vendors, and AI plan state.
 * All writes are synced to localStorage via the persistence layer.
 */
import { create } from "zustand";
import {
  EventPlanState,
  EventSetup,
  Budget,
  PlanningTask,
  Vendor,
  AIIdea,
  BudgetCategory,
  BookingStatus,
  TaskPriority,
} from "@/lib/schemas";
import {
  savePlan,
  loadAllPlans,
  loadPlan,
  deletePlan,
  getActiveEventId,
  setActiveEventId,
  loadAllEventSetups,
} from "@/lib/persistence";
import {
  computeBudgetTotals,
  updateActualSpending,
  updateCategoryPercentage,
  recalculatePlannedAmounts,
  buildCategoriesFromAISuggestions,
} from "@/lib/budget";
import {
  toggleTaskCompletion as toggleTask,
  updateTask as updateTaskFn,
  buildTasksFromAISuggestions,
  shiftTaskDeadlines,
} from "@/lib/timeline";
import { nanoid } from "@/lib/utils";
import { getDemoEventPlanState, getSyntheticWeddingPlanState, getLiveGeneratedPlanState } from "@/lib/demo-data";

interface AppState {
  // All known events
  allEvents: EventSetup[];
  // Currently active event plan state
  currentPlan: EventPlanState | null;
  // UI state
  activeTab: string;
  isGenerating: boolean;
  generateError: string | null;
  // Actions
  loadFromStorage: () => void;
  selectEvent: (eventId: string) => void;
  createEvent: (setup: Omit<EventSetup, "id" | "createdAt" | "updatedAt">) => EventPlanState;
  updateEvent: (updates: Partial<EventSetup>) => void;
  deleteEvent: (eventId: string) => void;
  loadDemoEvent: () => void;
  loadSyntheticEvent: () => void;
  loadLiveEvent: () => void;
  // Budget
  updateBudgetCategory: (categoryId: string, updates: Partial<BudgetCategory>) => void;
  updateTotalBudget: (amount: number) => void;
  updateContingency: (percent: number) => void;
  setBudget: (budget: Budget) => void;
  // Tasks
  toggleTaskComplete: (taskId: string) => void;
  editTask: (taskId: string, updates: { title?: string; description?: string; priority?: TaskPriority; category?: string }) => void;
  addTask: (task: Omit<PlanningTask, "id" | "eventId">) => void;
  deleteTask: (taskId: string) => void;
  // Vendors
  addVendor: (vendor: Omit<Vendor, "id" | "eventId" | "isVerified">) => void;
  updateVendorStatus: (vendorId: string, status: BookingStatus) => void;
  updateVendor: (vendorId: string, updates: Partial<Omit<Vendor, "id" | "eventId" | "isVerified">>) => void;
  deleteVendor: (vendorId: string) => void;
  toggleVendorChecklistItem: (vendorId: string, item: string) => void;
  // AI
  setGenerating: (val: boolean) => void;
  setGenerateError: (msg: string | null) => void;
  applyGeneratedPlan: (
    plan: import("@/lib/schemas").AIGeneratedPlan,
    isDemo: boolean,
    generatedBy?: string
  ) => void;
  updateIdeas: (ideas: AIIdea) => void;
  // Navigation
  setActiveTab: (tab: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  allEvents: [],
  currentPlan: null,
  activeTab: "home",
  isGenerating: false,
  generateError: null,

  loadFromStorage: () => {
    const allPlans = loadAllPlans();
    // Ensure the verified live generated plan is always seeded in the catalog
    if (!allPlans["live-three-model-wedding-01"]) {
      const live = getLiveGeneratedPlanState();
      savePlan(live);
      allPlans[live.event.id] = live;
    }
    const allSetups = Object.values(allPlans).map((p) => p.event);
    let activeId = getActiveEventId();

    // Default to the live generated plan if no event is active or active event no longer exists
    if (!activeId || !allPlans[activeId]) {
      activeId = "live-three-model-wedding-01";
      setActiveEventId(activeId);
    }
    const currentPlan = allPlans[activeId] ?? null;
    set({ allEvents: allSetups, currentPlan });
  },

  selectEvent: (eventId) => {
    const plan = loadPlan(eventId);
    setActiveEventId(eventId);
    set({ currentPlan: plan, activeTab: "home" });
  },

  createEvent: (setup) => {
    const now = new Date().toISOString();
    const event: EventSetup = {
      ...setup,
      id: nanoid(),
      createdAt: now,
      updatedAt: now,
    };
    const newPlan: EventPlanState = {
      event,
      tasks: [],
      vendors: [],
      isDemo: false,
    };
    savePlan(newPlan);
    setActiveEventId(event.id);
    const allEvents = [...get().allEvents, event];
    set({ allEvents, currentPlan: newPlan, activeTab: "home" });
    return newPlan;
  },

  updateEvent: (updates) => {
    const { currentPlan } = get();
    if (!currentPlan) return;

    let updatedBudget = currentPlan.budget;
    if (updates.budget !== undefined && currentPlan.budget) {
      updatedBudget = recalculatePlannedAmounts({
        ...currentPlan.budget,
        totalBudget: updates.budget,
      });
    }

    let updatedTasks = currentPlan.tasks;
    if (
      updates.date &&
      updates.date !== currentPlan.event.date &&
      currentPlan.tasks.length > 0
    ) {
      updatedTasks = shiftTaskDeadlines(
        currentPlan.tasks,
        currentPlan.event.date,
        updates.date
      );
    }

    const updatedEvent: EventSetup = {
      ...currentPlan.event,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    const updatedPlan: EventPlanState = {
      ...currentPlan,
      event: updatedEvent,
      budget: updatedBudget,
      tasks: updatedTasks,
    };

    savePlan(updatedPlan);
    set({
      currentPlan: updatedPlan,
      allEvents: get().allEvents.map((e) =>
        e.id === currentPlan.event.id ? updatedEvent : e
      ),
    });
  },

  deleteEvent: (eventId) => {
    deletePlan(eventId);
    const allEvents = get().allEvents.filter((e) => e.id !== eventId);
    const currentPlan = get().currentPlan?.event.id === eventId ? null : get().currentPlan;
    if (currentPlan === null) setActiveEventId(null);
    set({ allEvents, currentPlan });
  },

  loadDemoEvent: () => {
    const demo = getDemoEventPlanState();
    savePlan(demo);
    setActiveEventId(demo.event.id);
    const allEvents = get().allEvents.find((e) => e.id === demo.event.id)
      ? get().allEvents
      : [...get().allEvents, demo.event];
    set({ allEvents, currentPlan: demo, activeTab: "home" });
  },

  loadSyntheticEvent: () => {
    const synthetic = getSyntheticWeddingPlanState();
    savePlan(synthetic);
    setActiveEventId(synthetic.event.id);
    const allEvents = get().allEvents.find((e) => e.id === synthetic.event.id)
      ? get().allEvents.map((e) => (e.id === synthetic.event.id ? synthetic.event : e))
      : [...get().allEvents, synthetic.event];
    set({ allEvents, currentPlan: synthetic, activeTab: "home" });
  },

  loadLiveEvent: () => {
    const live = getLiveGeneratedPlanState();
    savePlan(live);
    setActiveEventId(live.event.id);
    const allEvents = get().allEvents.find((e) => e.id === live.event.id)
      ? get().allEvents.map((e) => (e.id === live.event.id ? live.event : e))
      : [...get().allEvents, live.event];
    set({ allEvents, currentPlan: live, activeTab: "ai" });
  },

  // ─── Budget ────────────────────────────────────────────────────────────────
  updateBudgetCategory: (categoryId, updates) => {
    const { currentPlan } = get();
    if (!currentPlan?.budget) return;
    const updatedBudget: Budget = {
      ...currentPlan.budget,
      categories: currentPlan.budget.categories.map((c) =>
        c.id === categoryId ? { ...c, ...updates } : c
      ),
    };
    const recalculated = recalculatePlannedAmounts(updatedBudget);
    const updatedPlan = { ...currentPlan, budget: recalculated };
    savePlan(updatedPlan);
    set({ currentPlan: updatedPlan });
  },

  updateTotalBudget: (amount) => {
    const { currentPlan } = get();
    if (!currentPlan?.budget) return;
    const updatedBudget = recalculatePlannedAmounts({
      ...currentPlan.budget,
      totalBudget: amount,
    });
    const updatedEvent: EventSetup = {
      ...currentPlan.event,
      budget: amount,
      updatedAt: new Date().toISOString(),
    };
    const updatedPlan: EventPlanState = {
      ...currentPlan,
      budget: updatedBudget,
      event: updatedEvent,
    };
    savePlan(updatedPlan);
    set({
      currentPlan: updatedPlan,
      allEvents: get().allEvents.map((e) =>
        e.id === currentPlan.event.id ? updatedEvent : e
      ),
    });
  },

  updateContingency: (percent) => {
    const { currentPlan } = get();
    if (!currentPlan?.budget) return;
    const updatedBudget = recalculatePlannedAmounts({
      ...currentPlan.budget,
      contingencyPercent: percent,
    });
    const updatedPlan = { ...currentPlan, budget: updatedBudget };
    savePlan(updatedPlan);
    set({ currentPlan: updatedPlan });
  },

  setBudget: (budget) => {
    const { currentPlan } = get();
    if (!currentPlan) return;
    const updatedPlan = { ...currentPlan, budget };
    savePlan(updatedPlan);
    set({ currentPlan: updatedPlan });
  },

  // ─── Tasks ─────────────────────────────────────────────────────────────────
  toggleTaskComplete: (taskId) => {
    const { currentPlan } = get();
    if (!currentPlan) return;
    const tasks = toggleTask(currentPlan.tasks, taskId);
    const updatedPlan = { ...currentPlan, tasks };
    savePlan(updatedPlan);
    set({ currentPlan: updatedPlan });
  },

  editTask: (taskId, updates) => {
    const { currentPlan } = get();
    if (!currentPlan) return;
    const tasks = updateTaskFn(currentPlan.tasks, taskId, updates);
    const updatedPlan = { ...currentPlan, tasks };
    savePlan(updatedPlan);
    set({ currentPlan: updatedPlan });
  },

  addTask: (task) => {
    const { currentPlan } = get();
    if (!currentPlan) return;
    const newTask: PlanningTask = {
      ...task,
      id: nanoid(),
      eventId: currentPlan.event.id,
    };
    const updatedPlan = { ...currentPlan, tasks: [...currentPlan.tasks, newTask] };
    savePlan(updatedPlan);
    set({ currentPlan: updatedPlan });
  },

  deleteTask: (taskId) => {
    const { currentPlan } = get();
    if (!currentPlan) return;
    const tasks = currentPlan.tasks.filter((t) => t.id !== taskId);
    const updatedPlan = { ...currentPlan, tasks };
    savePlan(updatedPlan);
    set({ currentPlan: updatedPlan });
  },

  // ─── Vendors ───────────────────────────────────────────────────────────────
  addVendor: (vendor) => {
    const { currentPlan } = get();
    if (!currentPlan) return;
    const newVendor: Vendor = {
      ...vendor,
      id: nanoid(),
      eventId: currentPlan.event.id,
      isVerified: false,
    };
    const updatedPlan = { ...currentPlan, vendors: [...currentPlan.vendors, newVendor] };
    savePlan(updatedPlan);
    set({ currentPlan: updatedPlan });
  },

  updateVendorStatus: (vendorId, status) => {
    const { currentPlan } = get();
    if (!currentPlan) return;
    const vendors = currentPlan.vendors.map((v) =>
      v.id === vendorId ? { ...v, bookingStatus: status } : v
    );
    const updatedPlan = { ...currentPlan, vendors };
    savePlan(updatedPlan);
    set({ currentPlan: updatedPlan });
  },

  updateVendor: (vendorId, updates) => {
    const { currentPlan } = get();
    if (!currentPlan) return;
    const vendors = currentPlan.vendors.map((v) =>
      v.id === vendorId ? { ...v, ...updates } : v
    );
    const updatedPlan = { ...currentPlan, vendors };
    savePlan(updatedPlan);
    set({ currentPlan: updatedPlan });
  },

  deleteVendor: (vendorId) => {
    const { currentPlan } = get();
    if (!currentPlan) return;
    const vendors = currentPlan.vendors.filter((v) => v.id !== vendorId);
    const updatedPlan = { ...currentPlan, vendors };
    savePlan(updatedPlan);
    set({ currentPlan: updatedPlan });
  },

  toggleVendorChecklistItem: (vendorId, item) => {
    const { currentPlan } = get();
    if (!currentPlan) return;
    const vendors = currentPlan.vendors.map((v) => {
      if (v.id !== vendorId) return v;
      const items = v.checklistItems ?? [];
      const has = items.includes(item);
      return {
        ...v,
        checklistItems: has ? items.filter((i) => i !== item) : [...items, item],
      };
    });
    const updatedPlan = { ...currentPlan, vendors };
    savePlan(updatedPlan);
    set({ currentPlan: updatedPlan });
  },

  // ─── AI ────────────────────────────────────────────────────────────────────
  setGenerating: (val) => set({ isGenerating: val }),
  setGenerateError: (msg) => set({ generateError: msg }),

  applyGeneratedPlan: (plan, isDemo, generatedBy) => {
    const { currentPlan } = get();
    if (!currentPlan) return;

    const contingencyPercent = 10;
    const categories = buildCategoriesFromAISuggestions(
      plan.budgetAllocations,
      currentPlan.event.budget,
      contingencyPercent
    );

    const budget: Budget = {
      eventId: currentPlan.event.id,
      totalBudget: currentPlan.event.budget,
      contingencyPercent,
      categories,
      currency: currentPlan.event.currency,
    };

    const tasks = buildTasksFromAISuggestions(
      plan.tasks,
      currentPlan.event.id,
      currentPlan.event.date
    );

    // Build initial vendor list from AI-suggested categories (no fabricated names)
    const vendors: Vendor[] = plan.vendorCategories.map((cat) => ({
      id: nanoid(),
      eventId: currentPlan.event.id,
      name: `[Add ${cat} Vendor]`,
      category: cat,
      estimatedCost: 0,
      contactNotes: "",
      bookingStatus: "not_contacted" as const,
      checklistItems: [],
      isVerified: false,
    }));

    const updatedPlan: EventPlanState = {
      ...currentPlan,
      budget,
      tasks,
      vendors,
      ideas: plan.ideas,
      lastGeneratedAt: new Date().toISOString(),
      isDemo,
      generatedBy,
    };

    savePlan(updatedPlan);
    set({ currentPlan: updatedPlan, generateError: null });
  },

  updateIdeas: (ideas) => {
    const { currentPlan } = get();
    if (!currentPlan) return;
    const updatedPlan = { ...currentPlan, ideas };
    savePlan(updatedPlan);
    set({ currentPlan: updatedPlan });
  },

  setActiveTab: (tab) => set({ activeTab: tab }),
}));

// Convenience selector hooks
export const useCurrentPlan = () => useAppStore((s) => s.currentPlan);
export const useActiveTab = () => useAppStore((s) => s.activeTab);
export const useBudgetTotals = () => {
  const budget = useAppStore((s) => s.currentPlan?.budget);
  if (!budget) return null;
  return computeBudgetTotals(budget);
};

