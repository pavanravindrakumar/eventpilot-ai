/**
 * Deterministic timeline / task calculation functions.
 * Task deadlines are computed from the event date — never by AI.
 */
import { PlanningTask, TaskPriority } from "./schemas";
import { nanoid } from "./utils";

/**
 * Compute a deadline date string given the event date and days-before-event.
 * The result is an ISO date string (YYYY-MM-DD).
 */
export function computeDeadline(
  eventDateStr: string,
  daysBeforeEvent: number
): string {
  const eventDate = new Date(eventDateStr);
  if (isNaN(eventDate.getTime())) {
    throw new Error(`Invalid event date: ${eventDateStr}`);
  }
  const deadline = new Date(eventDate);
  deadline.setDate(deadline.getDate() - Math.max(0, daysBeforeEvent));
  return deadline.toISOString().split("T")[0];
}

/**
 * Build PlanningTask objects from AI-suggested task templates.
 * Deadlines are computed deterministically here — not from AI.
 */
export function buildTasksFromAISuggestions(
  suggestions: Array<{
    title: string;
    description?: string;
    daysBeforeEvent: number;
    priority: TaskPriority;
    category?: string;
  }>,
  eventId: string,
  eventDateStr: string
): PlanningTask[] {
  return suggestions
    .filter((s) => s.title.trim().length > 0)
    .map((s) => ({
      id: nanoid(),
      eventId,
      title: s.title,
      description: s.description ?? "",
      deadline: computeDeadline(eventDateStr, s.daysBeforeEvent),
      priority: s.priority,
      completed: false,
      category: s.category ?? "General",
    }));
}

/**
 * Sort tasks by deadline ascending, then by priority weight.
 */
export function sortTasks(tasks: PlanningTask[]): PlanningTask[] {
  const priorityWeight: Record<TaskPriority, number> = {
    high: 0,
    medium: 1,
    low: 2,
  };
  return [...tasks].sort((a, b) => {
    const dateCompare = a.deadline.localeCompare(b.deadline);
    if (dateCompare !== 0) return dateCompare;
    return priorityWeight[a.priority] - priorityWeight[b.priority];
  });
}

/**
 * Toggle a task's completion status.
 */
export function toggleTaskCompletion(
  tasks: PlanningTask[],
  taskId: string
): PlanningTask[] {
  return tasks.map((t) =>
    t.id === taskId ? { ...t, completed: !t.completed } : t
  );
}

/**
 * Update task fields by id.
 */
export function updateTask(
  tasks: PlanningTask[],
  taskId: string,
  updates: Partial<Pick<PlanningTask, "title" | "description" | "priority" | "category">>
): PlanningTask[] {
  return tasks.map((t) => (t.id === taskId ? { ...t, ...updates } : t));
}

/**
 * Get the number of days between today and a deadline.
 * Negative means overdue.
 */
export function daysUntilDeadline(deadlineStr: string): number {
  const deadline = new Date(deadlineStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  deadline.setHours(0, 0, 0, 0);
  return Math.round(
    (deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
}

/**
 * Compute completion stats for a task list.
 */
export function computeTaskStats(tasks: PlanningTask[]): {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
  completionPercent: number;
} {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.completed).length;
  const pending = total - completed;
  const overdue = tasks.filter(
    (t) => !t.completed && daysUntilDeadline(t.deadline) < 0
  ).length;
  const completionPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { total, completed, pending, overdue, completionPercent };
}

/**
 * Group tasks by category.
 */
export function groupTasksByCategory(
  tasks: PlanningTask[]
): Record<string, PlanningTask[]> {
  return tasks.reduce(
    (acc, task) => {
      const cat = task.category ?? "General";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(task);
      return acc;
    },
    {} as Record<string, PlanningTask[]>
  );
}

/**
 * Shift task deadlines proportionally when the event date changes.
 * Preserves the exact relative lead time (days before event) for all tasks.
 */
export function shiftTaskDeadlines(
  tasks: PlanningTask[],
  oldEventDateStr: string,
  newEventDateStr: string
): PlanningTask[] {
  if (oldEventDateStr === newEventDateStr) return tasks;

  const oldDate = new Date(oldEventDateStr);
  const newDate = new Date(newEventDateStr);
  if (isNaN(oldDate.getTime()) || isNaN(newDate.getTime())) return tasks;

  const diffTime = newDate.getTime() - oldDate.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return tasks;

  return tasks.map((task) => {
    const currentDeadline = new Date(task.deadline);
    if (isNaN(currentDeadline.getTime())) return task;
    currentDeadline.setDate(currentDeadline.getDate() + diffDays);
    return {
      ...task,
      deadline: currentDeadline.toISOString().split("T")[0],
    };
  });
}


