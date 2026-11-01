"use client";
import { useState } from "react";
import { useAppStore, useBudgetTotals } from "@/store/appStore";
import {
  validateBudgetAllocations,
  formatCurrency,
} from "@/lib/budget";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { DollarSign, AlertTriangle, TrendingUp, Edit2, Check, X, Plus } from "lucide-react";
import Modal from "@/components/ui/Modal";

const CHART_COLORS = [
  "#b5884a", "#c9a872", "#6b8e6b", "#8e7b6b", "#6b7b8e",
  "#8e6b7b", "#7b6b8e", "#8e8a6b", "#6b8e8a", "#a0826b",
  "#6b6b8e", "#8e6b6b",
];

export default function BudgetTab() {
  const { currentPlan, updateBudgetCategory, updateTotalBudget, updateContingency } = useAppStore();
  const budgetTotals = useBudgetTotals();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ percentage: string; actualSpent: string }>({
    percentage: "",
    actualSpent: "",
  });

  // Accessible Expense Modal state
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [expenseAmount, setExpenseAmount] = useState<string>("");
  const [expenseNotes, setExpenseNotes] = useState<string>("");

  if (!currentPlan) {
    return <NoPlan />;
  }

  if (!currentPlan.budget) {
    return <NoBudget />;
  }

  const { budget, event } = currentPlan;
  const currency = event.currency;
  const errors = validateBudgetAllocations(budget.categories);

  const chartData = budget.categories
    .filter((c) => c.plannedAmount > 0)
    .map((c, i) => ({
      name: c.name,
      value: c.plannedAmount,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));

  const startEdit = (id: string, percentage: number, actualSpent: number) => {
    setEditingId(id);
    setEditValues({
      percentage: percentage.toString(),
      actualSpent: actualSpent.toString(),
    });
  };

  const saveEdit = (id: string) => {
    const pct = parseFloat(editValues.percentage);
    const spent = parseFloat(editValues.actualSpent);
    if (!isNaN(pct) && pct >= 0 && pct <= 100) {
      updateBudgetCategory(id, { percentage: pct });
    }
    if (!isNaN(spent) && spent >= 0) {
      updateBudgetCategory(id, { actualSpent: spent });
    }
    setEditingId(null);
  };

  const openExpenseModal = (categoryId?: string) => {
    setSelectedCategory(categoryId || budget.categories[0]?.id || "");
    setExpenseAmount("");
    setExpenseNotes("");
    setIsExpenseModalOpen(true);
  };

  const handleLogExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(expenseAmount);
    if (!selectedCategory || isNaN(amount) || amount <= 0) return;
    const cat = budget.categories.find((c) => c.id === selectedCategory);
    if (cat) {
      updateBudgetCategory(selectedCategory, {
        actualSpent: cat.actualSpent + amount,
        notes: expenseNotes.trim()
          ? `${cat.notes ? cat.notes + "; " : ""}${expenseNotes.trim()}`
          : cat.notes,
      });
    }
    setIsExpenseModalOpen(false);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2
          className="text-2xl font-bold mb-2"
          style={{ fontFamily: "'Playfair Display', serif", color: "var(--foreground)" }}
        >
          Budget Intelligence
        </h2>
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          All calculations are deterministic — AI may suggest allocations but never controls totals.
        </p>
      </div>

      {/* Validation errors */}
      {errors.length > 0 && (
        <div
          className="p-4 rounded-xl flex gap-3"
          style={{ background: "#fef2f2", border: "1px solid #fca5a5" }}
          role="alert"
        >
          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-red-800 mb-1">Budget allocation issues:</p>
            <ul className="list-disc list-inside space-y-0.5">
              {errors.map((e, i) => (
                <li key={i} className="text-sm text-red-700">{e}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Summary cards */}
      {budgetTotals && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <SummaryCard
            label="Total Budget"
            value={formatCurrency(budgetTotals.totalBudget, currency)}
            icon={DollarSign}
            color="var(--primary)"
          />
          <SummaryCard
            label="Contingency"
            value={formatCurrency(budgetTotals.contingencyAmount, currency)}
            sub={`${budget.contingencyPercent}%`}
            icon={AlertTriangle}
            color="var(--warning)"
          />
          <SummaryCard
            label="Total Spent"
            value={formatCurrency(budgetTotals.totalSpent, currency)}
            icon={TrendingUp}
            color={budgetTotals.isOverBudget ? "var(--destructive)" : "var(--success)"}
          />
          <SummaryCard
            label="Remaining"
            value={formatCurrency(budgetTotals.remainingBalance, currency)}
            icon={DollarSign}
            color={budgetTotals.isOverBudget ? "var(--destructive)" : "var(--success)"}
            highlight={budgetTotals.isOverBudget}
          />
        </div>
      )}

      {/* Budget settings */}
      <div
        className="rounded-xl p-5 grid grid-cols-1 sm:grid-cols-3 gap-4"
        style={{ background: "white", border: "1px solid var(--border)" }}
      >
        <div>
          <label
            htmlFor="total-budget"
            className="block text-xs font-medium mb-1.5"
            style={{ color: "var(--muted-foreground)" }}
          >
            Total Budget ({currency})
          </label>
          <input
            id="total-budget"
            key={budget.totalBudget}
            type="number"
            defaultValue={budget.totalBudget}
            onBlur={(e) => {
              const val = parseFloat(e.target.value);
              if (!isNaN(val) && val > 0) updateTotalBudget(val);
            }}
            className="w-full px-3 py-2 rounded-lg text-sm font-medium"
            style={{ border: "1px solid var(--border)", background: "var(--muted)", color: "var(--foreground)", outline: "none" }}
          />
        </div>
        <div>
          <label
            htmlFor="contingency"
            className="block text-xs font-medium mb-1.5"
            style={{ color: "var(--muted-foreground)" }}
          >
            Contingency %
          </label>
          <input
            id="contingency"
            type="number"
            defaultValue={budget.contingencyPercent}
            min={0}
            max={30}
            onBlur={(e) => {
              const val = parseFloat(e.target.value);
              if (!isNaN(val) && val >= 0 && val <= 30) updateContingency(val);
            }}
            className="w-full px-3 py-2 rounded-lg text-sm font-medium"
            style={{ border: "1px solid var(--border)", background: "var(--muted)", color: "var(--foreground)", outline: "none" }}
          />
        </div>
        {budgetTotals && (
          <div className="flex items-end">
            <div
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ background: "var(--accent)", border: "1px solid var(--primary)" }}
            >
              <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                Allocatable budget:
              </span>
              <p className="font-bold" style={{ color: "var(--primary-dark)" }}>
                {formatCurrency(budgetTotals.allocatableBudget, currency)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Chart + table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie chart */}
        <div
          className="rounded-xl p-5"
          style={{ background: "white", border: "1px solid var(--border)" }}
        >
          <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--foreground)" }}>
            Allocation Breakdown
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                dataKey="value"
                labelLine={false}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: any) => [
                  formatCurrency(Number(value) || 0, currency),
                  "Planned",
                ]}
                contentStyle={{
                  background: "white",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: "11px" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Category table */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: "1px solid var(--border)" }}
        >
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ background: "white", borderBottom: "1px solid var(--border)" }}
          >
            <div>
              <h3 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                Category Details
              </h3>
              {budgetTotals && (
                <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                  Total allocation: {budgetTotals.allocationPercentageSum.toFixed(1)}%
                </p>
              )}
            </div>
            <button
              onClick={() => openExpenseModal()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white shadow-sm hover:opacity-95 transition-opacity"
              style={{ background: "var(--primary)" }}
              aria-label="Log an actual expense"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              Log Expense
            </button>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: "280px", background: "white" }}>
            <table className="w-full" aria-label="Budget categories">
              <thead>
                <tr style={{ background: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
                  <th className="text-left px-4 py-2 text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
                    Category
                  </th>
                  <th className="text-right px-4 py-2 text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
                    %
                  </th>
                  <th className="text-right px-4 py-2 text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
                    Planned
                  </th>
                  <th className="text-right px-4 py-2 text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
                    Spent
                  </th>
                  <th className="px-4 py-2" aria-label="Actions"></th>
                </tr>
              </thead>
              <tbody>
                {budget.categories.map((cat, i) => (
                  <tr
                    key={cat.id}
                    style={{
                      borderBottom: i < budget.categories.length - 1 ? "1px solid var(--border)" : "none",
                    }}
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                          aria-hidden="true"
                        />
                        <span className="text-xs font-medium" style={{ color: "var(--foreground)" }}>
                          {cat.name}
                        </span>
                      </div>
                    </td>
                    {editingId === cat.id ? (
                      <>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            value={editValues.percentage}
                            onChange={(e) =>
                              setEditValues((v) => ({ ...v, percentage: e.target.value }))
                            }
                            className="w-16 px-2 py-1 rounded text-xs text-right"
                            style={{ border: "1px solid var(--primary)", outline: "none" }}
                            aria-label={`Percentage for ${cat.name}`}
                          />
                        </td>
                        <td className="px-2 py-2 text-xs text-right" style={{ color: "var(--muted-foreground)" }}>
                          {formatCurrency(cat.plannedAmount, currency)}
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            value={editValues.actualSpent}
                            onChange={(e) =>
                              setEditValues((v) => ({ ...v, actualSpent: e.target.value }))
                            }
                            className="w-20 px-2 py-1 rounded text-xs text-right"
                            style={{ border: "1px solid var(--primary)", outline: "none" }}
                            aria-label={`Actual spent for ${cat.name}`}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex gap-1">
                            <button
                              onClick={() => saveEdit(cat.id)}
                              className="p-1 rounded"
                              style={{ color: "var(--success)" }}
                              aria-label={`Save changes for ${cat.name}`}
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1 rounded"
                              style={{ color: "var(--muted-foreground)" }}
                              aria-label="Cancel editing"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-2.5 text-xs text-right" style={{ color: "var(--muted-foreground)" }}>
                          {cat.percentage}%
                        </td>
                        <td className="px-4 py-2.5 text-xs text-right font-medium" style={{ color: "var(--foreground)" }}>
                          {formatCurrency(cat.plannedAmount, currency)}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-right" style={{ color: cat.actualSpent > cat.plannedAmount ? "var(--destructive)" : "var(--muted-foreground)" }}>
                          {formatCurrency(cat.actualSpent, currency)}
                        </td>
                        <td className="px-4 py-2.5">
                          <button
                            onClick={() => startEdit(cat.id, cat.percentage, cat.actualSpent)}
                            className="p-1 rounded opacity-60 hover:opacity-100"
                            style={{ color: "var(--primary)" }}
                            aria-label={`Edit ${cat.name}`}
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Accessible Expense Modal with Focus Trap */}
      <Modal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        title="Log Actual Expense"
        description="Record an expenditure against a budget category. Remaining budget recalculates deterministically."
        maxWidth="md"
      >
        <form onSubmit={handleLogExpense} className="space-y-4">
          <div className="space-y-3">
            <div>
              <label
                htmlFor="expense-category-select"
                className="block text-xs font-semibold mb-1"
                style={{ color: "var(--foreground)" }}
              >
                Budget Category
              </label>
              <select
                id="expense-category-select"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--background)",
                  color: "var(--foreground)",
                }}
              >
                {budget.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (Planned: {formatCurrency(c.plannedAmount, currency)}, Spent: {formatCurrency(c.actualSpent, currency)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="expense-amount-input"
                className="block text-xs font-semibold mb-1"
                style={{ color: "var(--foreground)" }}
              >
                Amount Spent ({currency})
              </label>
              <input
                id="expense-amount-input"
                type="number"
                min="0.01"
                step="any"
                required
                placeholder="e.g. 500"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--background)",
                  color: "var(--foreground)",
                }}
              />
            </div>

            <div>
              <label
                htmlFor="expense-notes-input"
                className="block text-xs font-semibold mb-1"
                style={{ color: "var(--foreground)" }}
              >
                Notes or Receipt Info (Optional)
              </label>
              <input
                id="expense-notes-input"
                type="text"
                placeholder="e.g. Deposit paid for catering"
                value={expenseNotes}
                onChange={(e) => setExpenseNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--background)",
                  color: "var(--foreground)",
                }}
              />
            </div>
          </div>

          <div
            className="flex justify-end gap-2 pt-3 border-t"
            style={{ borderColor: "var(--border)" }}
          >
            <button
              type="button"
              onClick={() => setIsExpenseModalOpen(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium border hover:bg-stone-50 transition-colors"
              style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white shadow-sm"
              style={{ background: "var(--primary)" }}
            >
              <Check className="w-4 h-4" aria-hidden="true" />
              Log Expense
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  color: string;
  highlight?: boolean;
}) {
  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: highlight ? "#fef2f2" : "white",
        border: `1px solid ${highlight ? "#fca5a5" : "var(--border)"}`,
      }}
    >
      <Icon className="w-4 h-4 mb-2" style={{ color }} aria-hidden="true" />
      <p className="text-base font-bold" style={{ color: highlight ? "var(--destructive)" : "var(--foreground)" }}>
        {value}
      </p>
      <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
        {label}
      </p>
      {sub && (
        <p className="text-xs mt-0.5" style={{ color }}>
          {sub}
        </p>
      )}
    </div>
  );
}

function NoPlan() {
  return (
    <div className="text-center py-20">
      <p style={{ color: "var(--muted-foreground)" }}>No event selected. Create an event first.</p>
    </div>
  );
}

function NoBudget() {
  const { setActiveTab } = useAppStore();
  return (
    <div className="text-center py-20">
      <DollarSign className="w-12 h-12 mx-auto mb-4" style={{ color: "var(--muted-foreground)" }} />
      <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--foreground)" }}>
        No Budget Yet
      </h3>
      <p className="text-sm mb-6" style={{ color: "var(--muted-foreground)" }}>
        Generate an AI plan to get budget allocation suggestions.
      </p>
      <button
        onClick={() => setActiveTab("ai")}
        className="px-6 py-3 rounded-xl font-medium text-sm"
        style={{ background: "var(--primary)", color: "white" }}
      >
        Generate Plan
      </button>
    </div>
  );
}

