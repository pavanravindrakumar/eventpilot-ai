/**
 * TDD: Tests for deterministic timeline/task calculation functions.
 */
import { describe, it, expect } from "vitest";
import {
  computeDeadline,
  buildTasksFromAISuggestions,
  sortTasks,
  toggleTaskCompletion,
  updateTask,
  daysUntilDeadline,
  computeTaskStats,
  groupTasksByCategory,
  shiftTaskDeadlines,
} from "@/lib/timeline";
import { PlanningTask } from "@/lib/schemas";

const makeTask = (overrides: Partial<PlanningTask> = {}): PlanningTask => ({
  id: "t1",
  eventId: "evt-001",
  title: "Test Task",
  description: "A test task",
  deadline: "2025-06-15",
  priority: "medium",
  completed: false,
  category: "General",
  ...overrides,
});

describe("computeDeadline", () => {
  it("returns the event date when daysBeforeEvent is 0", () => {
    const result = computeDeadline("2025-12-25", 0);
    expect(result).toBe("2025-12-25");
  });

  it("computes correct deadline for 30 days before event", () => {
    const result = computeDeadline("2025-12-25", 30);
    expect(result).toBe("2025-11-25");
  });

  it("computes correct deadline for 365 days before event", () => {
    const result = computeDeadline("2026-01-01", 365);
    expect(result).toBe("2025-01-01");
  });

  it("clamps to event date for negative daysBeforeEvent", () => {
    // negative days should not go after event date — clamp at 0
    const result = computeDeadline("2025-12-25", -5);
    expect(result).toBe("2025-12-25");
  });

  it("throws for invalid date string", () => {
    expect(() => computeDeadline("not-a-date", 30)).toThrow();
  });
});

describe("buildTasksFromAISuggestions", () => {
  it("builds tasks with computed deadlines", () => {
    const suggestions = [
      { title: "Book venue", daysBeforeEvent: 180, priority: "high" as const },
      { title: "Send invites", daysBeforeEvent: 60, priority: "medium" as const },
    ];
    const tasks = buildTasksFromAISuggestions(suggestions, "evt-001", "2025-12-25");
    expect(tasks).toHaveLength(2);
    expect(tasks[0].deadline).toBe("2025-06-28"); // ~180 days before Dec 25
    expect(tasks[0].completed).toBe(false);
    expect(tasks[0].eventId).toBe("evt-001");
  });

  it("filters out tasks with empty titles", () => {
    const suggestions = [
      { title: "", daysBeforeEvent: 30, priority: "low" as const },
      { title: "Valid task", daysBeforeEvent: 30, priority: "low" as const },
    ];
    const tasks = buildTasksFromAISuggestions(suggestions, "evt-001", "2025-12-25");
    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toBe("Valid task");
  });

  it("assigns unique IDs to each task", () => {
    const suggestions = [
      { title: "Task A", daysBeforeEvent: 10, priority: "high" as const },
      { title: "Task B", daysBeforeEvent: 20, priority: "low" as const },
    ];
    const tasks = buildTasksFromAISuggestions(suggestions, "evt-001", "2025-12-25");
    expect(tasks[0].id).not.toBe(tasks[1].id);
  });
});

describe("sortTasks", () => {
  it("sorts tasks by deadline ascending", () => {
    const tasks: PlanningTask[] = [
      makeTask({ id: "t2", deadline: "2025-08-01" }),
      makeTask({ id: "t1", deadline: "2025-06-01" }),
      makeTask({ id: "t3", deadline: "2025-10-01" }),
    ];
    const sorted = sortTasks(tasks);
    expect(sorted[0].id).toBe("t1");
    expect(sorted[1].id).toBe("t2");
    expect(sorted[2].id).toBe("t3");
  });

  it("breaks ties by priority weight (high before low)", () => {
    const tasks: PlanningTask[] = [
      makeTask({ id: "t2", deadline: "2025-06-01", priority: "low" }),
      makeTask({ id: "t1", deadline: "2025-06-01", priority: "high" }),
    ];
    const sorted = sortTasks(tasks);
    expect(sorted[0].priority).toBe("high");
  });

  it("does not mutate the original array", () => {
    const tasks: PlanningTask[] = [
      makeTask({ id: "t2", deadline: "2025-08-01" }),
      makeTask({ id: "t1", deadline: "2025-06-01" }),
    ];
    const original = [...tasks];
    sortTasks(tasks);
    expect(tasks[0].id).toBe(original[0].id);
  });
});

describe("toggleTaskCompletion", () => {
  it("toggles incomplete to complete", () => {
    const tasks = [makeTask({ id: "t1", completed: false })];
    const result = toggleTaskCompletion(tasks, "t1");
    expect(result[0].completed).toBe(true);
  });

  it("toggles complete back to incomplete", () => {
    const tasks = [makeTask({ id: "t1", completed: true })];
    const result = toggleTaskCompletion(tasks, "t1");
    expect(result[0].completed).toBe(false);
  });

  it("only toggles the specified task", () => {
    const tasks = [
      makeTask({ id: "t1", completed: false }),
      makeTask({ id: "t2", completed: false }),
    ];
    const result = toggleTaskCompletion(tasks, "t1");
    expect(result[0].completed).toBe(true);
    expect(result[1].completed).toBe(false);
  });
});

describe("updateTask", () => {
  it("updates title for the correct task", () => {
    const tasks = [makeTask({ id: "t1", title: "Old Title" })];
    const result = updateTask(tasks, "t1", { title: "New Title" });
    expect(result[0].title).toBe("New Title");
  });

  it("does not change other tasks", () => {
    const tasks = [
      makeTask({ id: "t1", title: "Task 1" }),
      makeTask({ id: "t2", title: "Task 2" }),
    ];
    const result = updateTask(tasks, "t1", { title: "Updated" });
    expect(result[1].title).toBe("Task 2");
  });
});

describe("computeTaskStats", () => {
  it("returns zeroes for empty task list", () => {
    const stats = computeTaskStats([]);
    expect(stats.total).toBe(0);
    expect(stats.completionPercent).toBe(0);
  });

  it("computes correct completion percentage", () => {
    const tasks = [
      makeTask({ id: "t1", completed: true }),
      makeTask({ id: "t2", completed: true }),
      makeTask({ id: "t3", completed: false }),
      makeTask({ id: "t4", completed: false }),
    ];
    const stats = computeTaskStats(tasks);
    expect(stats.total).toBe(4);
    expect(stats.completed).toBe(2);
    expect(stats.completionPercent).toBe(50);
  });

  it("counts overdue tasks correctly", () => {
    const pastDate = "2020-01-01"; // definitely in the past
    const tasks = [
      makeTask({ id: "t1", completed: false, deadline: pastDate }),
      makeTask({ id: "t2", completed: true, deadline: pastDate }), // completed, not overdue
      makeTask({ id: "t3", completed: false, deadline: "2099-01-01" }), // future, not overdue
    ];
    const stats = computeTaskStats(tasks);
    expect(stats.overdue).toBe(1); // only t1
  });
});

describe("groupTasksByCategory", () => {
  it("groups tasks by their category", () => {
    const tasks = [
      makeTask({ id: "t1", category: "Venue" }),
      makeTask({ id: "t2", category: "Catering" }),
      makeTask({ id: "t3", category: "Venue" }),
    ];
    const groups = groupTasksByCategory(tasks);
    expect(Object.keys(groups)).toContain("Venue");
    expect(Object.keys(groups)).toContain("Catering");
    expect(groups["Venue"]).toHaveLength(2);
    expect(groups["Catering"]).toHaveLength(1);
  });

  it("uses General as default category", () => {
    const tasks = [makeTask({ id: "t1", category: undefined })];
    const groups = groupTasksByCategory(tasks);
    expect(Object.keys(groups)).toContain("General");
  });
});

describe("shiftTaskDeadlines", () => {
  it("shifts task deadlines forward when event date moves forward", () => {
    const tasks = [
      makeTask({ id: "t1", deadline: "2025-06-01" }), // 14 days before 2025-06-15
      makeTask({ id: "t2", deadline: "2025-06-10" }), // 5 days before 2025-06-15
    ];
    // Move event from 2025-06-15 to 2025-06-25 (+10 days)
    const shifted = shiftTaskDeadlines(tasks, "2025-06-15", "2025-06-25");
    expect(shifted[0].deadline).toBe("2025-06-11");
    expect(shifted[1].deadline).toBe("2025-06-20");
  });

  it("shifts task deadlines backward when event date moves backward", () => {
    const tasks = [makeTask({ id: "t1", deadline: "2025-06-10" })];
    // Move event from 2025-06-15 to 2025-06-10 (-5 days)
    const shifted = shiftTaskDeadlines(tasks, "2025-06-15", "2025-06-10");
    expect(shifted[0].deadline).toBe("2025-06-05");
  });

  it("returns original tasks if event dates are identical", () => {
    const tasks = [makeTask({ id: "t1", deadline: "2025-06-10" })];
    const shifted = shiftTaskDeadlines(tasks, "2025-06-15", "2025-06-15");
    expect(shifted[0].deadline).toBe("2025-06-10");
  });

  it("handles invalid dates gracefully", () => {
    const tasks = [makeTask({ id: "t1", deadline: "2025-06-10" })];
    const shifted = shiftTaskDeadlines(tasks, "invalid", "2025-06-15");
    expect(shifted[0].deadline).toBe("2025-06-10");
  });
});


