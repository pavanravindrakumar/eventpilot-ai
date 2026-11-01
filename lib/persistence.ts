/**
 * localStorage persistence layer for EventPilot AI.
 * All reads/writes go through these typed helpers.
 * Never stores API keys or sensitive credentials.
 */
import {
  EventPlanState,
  EventPlanStateSchema,
  EventSetup,
} from "./schemas";

const STORAGE_KEY = "eventpilot_plans_v2";
const ACTIVE_EVENT_KEY = "eventpilot_active_event_id";

/**
 * Load all event plan states from localStorage.
 * Invalid/corrupt entries are silently dropped.
 */
export function loadAllPlans(): Record<string, EventPlanState> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const result: Record<string, EventPlanState> = {};
    for (const [id, val] of Object.entries(parsed)) {
      const validated = EventPlanStateSchema.safeParse(val);
      if (validated.success) {
        result[id] = validated.data;
      }
    }
    return result;
  } catch {
    return {};
  }
}

/**
 * Save a single event plan state to localStorage.
 */
export function savePlan(state: EventPlanState): void {
  if (typeof window === "undefined") return;
  try {
    const all = loadAllPlansRaw();
    all[state.event.id] = state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // Storage may be full or unavailable — fail silently
    console.warn("EventPilot: Failed to persist plan to localStorage.");
  }
}

/**
 * Load a single plan by event ID.
 */
export function loadPlan(eventId: string): EventPlanState | null {
  const all = loadAllPlans();
  return all[eventId] ?? null;
}

/**
 * Delete a plan by event ID.
 */
export function deletePlan(eventId: string): void {
  if (typeof window === "undefined") return;
  try {
    const all = loadAllPlansRaw();
    delete all[eventId];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // ignore
  }
}

/**
 * Get/set the active event ID.
 */
export function getActiveEventId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACTIVE_EVENT_KEY);
}

export function setActiveEventId(id: string | null): void {
  if (typeof window === "undefined") return;
  if (id) {
    localStorage.setItem(ACTIVE_EVENT_KEY, id);
  } else {
    localStorage.removeItem(ACTIVE_EVENT_KEY);
  }
}

/**
 * Load all events as EventSetup array (for the event list / home page).
 */
export function loadAllEventSetups(): EventSetup[] {
  const all = loadAllPlans();
  return Object.values(all).map((p) => p.event);
}

// ─── Internal helper ─────────────────────────────────────────────────────────

function loadAllPlansRaw(): Record<string, unknown> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

