"use client";
import { useState } from "react";
import { useAppStore } from "@/store/appStore";
import {
  sortTasks,
  computeTaskStats,
  daysUntilDeadline,
  groupTasksByCategory,
} from "@/lib/timeline";
import { formatDateCompact, priorityColor } from "@/lib/utils";
import {
  CheckCircle2,
  Circle,
  CalendarDays,
  AlertTriangle,
  Pencil,
  Trash2,
  Check,
  X,
} from "lucide-react";

export default function TimelineTab() {
  const { currentPlan, toggleTaskComplete, editTask, deleteTask } = useAppStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: "", description: "", priority: "medium", category: "" });
  const [groupBy, setGroupBy] = useState<"date" | "category">("date");

  if (!currentPlan) {
    return <div className="text-center py-20" style={{ color: "var(--muted-foreground)" }}>No event selected.</div>;
  }

  if (currentPlan.tasks.length === 0) {
    return <EmptyTimeline />;
  }

  const sorted = sortTasks(currentPlan.tasks);
  const stats = computeTaskStats(currentPlan.tasks);
  const grouped = groupTasksByCategory(sorted);

  const startEdit = (task: typeof sorted[0]) => {
    setEditingId(task.id);
    setEditForm({
      title: task.title,
      description: task.description ?? "",
      priority: task.priority,
      category: task.category ?? "General",
    });
  };

  const saveEdit = (id: string) => {
    editTask(id, {
      title: editForm.title,
      description: editForm.description,
      priority: editForm.priority as "high" | "medium" | "low",
      category: editForm.category,
    });
    setEditingId(null);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2
          className="text-2xl font-bold mb-2"
          style={{ fontFamily: "'Playfair Display', serif", color: "var(--foreground)" }}
        >
          Planning Timeline
        </h2>
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          All task deadlines are computed from your event date.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total, color: "var(--foreground)" },
          { label: "Completed", value: stats.completed, color: "var(--success)" },
          { label: "Pending", value: stats.pending, color: "var(--warning)" },
          { label: "Overdue", value: stats.overdue, color: stats.overdue > 0 ? "var(--destructive)" : "var(--success)" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl p-4 text-center"
            style={{ background: "white", border: "1px solid var(--border)" }}
          >
            <p className="text-xl font-bold" style={{ color: s.color }}>
              {s.value}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div
        className="rounded-xl p-5"
        style={{ background: "white", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
            Overall Progress
          </span>
          <span className="text-sm font-bold" style={{ color: "var(--primary)" }}>
            {stats.completionPercent}%
          </span>
        </div>
        <div
          className="w-full rounded-full h-2"
          style={{ background: "var(--muted)" }}
          role="progressbar"
          aria-valuenow={stats.completionPercent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-2 rounded-full transition-all"
            style={{
              width: `${stats.completionPercent}%`,
              background: "linear-gradient(90deg, var(--primary), var(--primary-light))",
            }}
          />
        </div>
      </div>

      {/* Group by toggle */}
      <div className="flex gap-2">
        {(["date", "category"] as const).map((g) => (
          <button
            key={g}
            onClick={() => setGroupBy(g)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize"
            style={{
              background: groupBy === g ? "var(--primary)" : "white",
              color: groupBy === g ? "white" : "var(--foreground)",
              border: "1px solid var(--border)",
            }}
            aria-pressed={groupBy === g}
          >
            By {g}
          </button>
        ))}
      </div>

      {/* Task list */}
      {groupBy === "category" ? (
        <div className="space-y-6">
          {Object.entries(grouped).map(([category, tasks]) => (
            <div key={category}>
              <h3 className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: "var(--muted-foreground)" }}>
                {category}
              </h3>
              <div className="space-y-2">
                {tasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    isEditing={editingId === task.id}
                    editForm={editForm}
                    setEditForm={setEditForm}
                    onToggle={() => toggleTaskComplete(task.id)}
                    onEdit={() => startEdit(task)}
                    onSave={() => saveEdit(task.id)}
                    onCancel={() => setEditingId(null)}
                    onDelete={() => deleteTask(task.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              isEditing={editingId === task.id}
              editForm={editForm}
              setEditForm={setEditForm}
              onToggle={() => toggleTaskComplete(task.id)}
              onEdit={() => startEdit(task)}
              onSave={() => saveEdit(task.id)}
              onCancel={() => setEditingId(null)}
              onDelete={() => deleteTask(task.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TaskRow({
  task,
  isEditing,
  editForm,
  setEditForm,
  onToggle,
  onEdit,
  onSave,
  onCancel,
  onDelete,
}: {
  task: import("@/lib/schemas").PlanningTask;
  isEditing: boolean;
  editForm: { title: string; description: string; priority: string; category: string };
  setEditForm: React.Dispatch<React.SetStateAction<typeof editForm>>;
  onToggle: () => void;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const days = daysUntilDeadline(task.deadline);
  const isOverdue = !task.completed && days < 0;

  return (
    <div
      className="rounded-xl p-4 transition-all"
      style={{
        background: task.completed ? "var(--muted)" : "white",
        border: `1px solid ${isOverdue ? "#fca5a5" : "var(--border)"}`,
        opacity: task.completed ? 0.75 : 1,
      }}
    >
      {isEditing ? (
        <div className="space-y-3">
          <input
            value={editForm.title}
            onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg text-sm font-medium"
            style={{ border: "1px solid var(--primary)", outline: "none" }}
            aria-label="Task title"
          />
          <input
            value={editForm.description}
            onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{ border: "1px solid var(--border)", outline: "none" }}
            aria-label="Task description"
          />
          <div className="flex gap-3 items-center">
            <select
              value={editForm.priority}
              onChange={(e) => setEditForm((f) => ({ ...f, priority: e.target.value }))}
              className="px-2 py-1.5 rounded-lg text-xs"
              style={{ border: "1px solid var(--border)", outline: "none" }}
              aria-label="Task priority"
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <input
              value={editForm.category}
              onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}
              placeholder="Category"
              className="flex-1 px-2 py-1.5 rounded-lg text-xs"
              style={{ border: "1px solid var(--border)", outline: "none" }}
              aria-label="Task category"
            />
            <button onClick={onSave} className="p-1.5 rounded-lg" style={{ background: "var(--success)", color: "white" }} aria-label="Save">
              <Check className="w-3.5 h-3.5" />
            </button>
            <button onClick={onCancel} className="p-1.5 rounded-lg" style={{ background: "var(--muted)", color: "var(--foreground)" }} aria-label="Cancel">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3">
          <button
            onClick={onToggle}
            className="mt-0.5 flex-shrink-0"
            aria-label={task.completed ? `Mark "${task.title}" incomplete` : `Mark "${task.title}" complete`}
          >
            {task.completed ? (
              <CheckCircle2 className="w-5 h-5" style={{ color: "var(--success)" }} />
            ) : (
              <Circle className="w-5 h-5" style={{ color: "var(--border)" }} />
            )}
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p
                className="text-sm font-medium"
                style={{
                  color: task.completed ? "var(--muted-foreground)" : "var(--foreground)",
                  textDecoration: task.completed ? "line-through" : "none",
                }}
              >
                {task.title}
              </p>
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={onEdit}
                  className="p-1 opacity-60 hover:opacity-100"
                  aria-label={`Edit "${task.title}"`}
                  style={{ color: "var(--primary)" }}
                >
                  <Pencil className="w-3 h-3" />
                </button>
                <button
                  onClick={onDelete}
                  className="p-1 opacity-60 hover:opacity-100"
                  aria-label={`Delete "${task.title}"`}
                  style={{ color: "var(--destructive)" }}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
            {task.description && (
              <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                {task.description}
              </p>
            )}
            <div className="flex flex-wrap gap-2 mt-2">
              <span
                className="text-xs px-2 py-0.5 rounded-full border font-medium"
                style={{ ...(priorityColor(task.priority).split(" ").reduce((acc, cls) => {
                  // Parse Tailwind-like utility names to inline styles
                  return acc;
                }, {})) }}
              >
                {task.priority}
              </span>
              {task.category && (
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}>
                  {task.category}
                </span>
              )}
              <span
                className="text-xs flex items-center gap-1"
                style={{ color: isOverdue ? "var(--destructive)" : "var(--muted-foreground)" }}
              >
                {isOverdue ? (
                  <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                ) : (
                  <CalendarDays className="w-3 h-3" aria-hidden="true" />
                )}
                {isOverdue
                  ? `${Math.abs(days)} days overdue`
                  : task.completed
                  ? formatDateCompact(task.deadline)
                  : days === 0
                  ? "Due today"
                  : `${days} days left`}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyTimeline() {
  const { setActiveTab } = useAppStore();
  return (
    <div className="text-center py-20">
      <CalendarDays className="w-12 h-12 mx-auto mb-4" style={{ color: "var(--muted-foreground)" }} />
      <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--foreground)" }}>
        No Tasks Yet
      </h3>
      <p className="text-sm mb-6" style={{ color: "var(--muted-foreground)" }}>
        Generate an AI plan to create a personalized planning timeline.
      </p>
      <button
        onClick={() => setActiveTab("ai")}
        className="px-6 py-3 rounded-xl font-medium text-sm"
        style={{ background: "var(--primary)", color: "white" }}
      >
        Generate Timeline
      </button>
    </div>
  );
}

