"use client";
import { useState } from "react";
import { useAppStore, useBudgetTotals } from "@/store/appStore";
import { computeTaskStats } from "@/lib/timeline";
import { formatCurrency, eventTypeLabel, formatDate } from "@/lib/utils";
import Modal from "@/components/ui/Modal";
import {
  CalendarDays,
  MapPin,
  Users,
  DollarSign,
  Sparkles,
  CheckCircle2,
  Clock,
  AlertCircle,
  PlusCircle,
  TrendingUp,
  Pencil,
  X,
  Check,
} from "lucide-react";

export default function HomeTab() {
  const { currentPlan, allEvents, loadDemoEvent, loadLiveEvent, setActiveTab, updateEvent } = useAppStore();
  const budgetTotals = useBudgetTotals();

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    date: "",
    location: "",
    guestCount: "",
    budget: "",
  });

  if (!currentPlan) {
    return (
      <EmptyHome
        onCreateEvent={() => setActiveTab("create")}
        onLoadDemo={loadDemoEvent}
        onLoadLive={loadLiveEvent}
      />
    );
  }

  const { event, tasks, vendors, isDemo } = currentPlan;
  const taskStats = computeTaskStats(tasks);
  const bookedVendors = vendors.filter((v) => v.bookingStatus === "booked").length;

  const startEditing = () => {
    setEditForm({
      name: event.name,
      date: event.date,
      location: event.location,
      guestCount: event.guestCount.toString(),
      budget: event.budget.toString(),
    });
    setIsEditing(true);
  };

  const saveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    const guests = parseInt(editForm.guestCount);
    const budgetVal = parseFloat(editForm.budget);

    updateEvent({
      name: editForm.name.trim() || event.name,
      date: editForm.date || event.date,
      location: editForm.location.trim() || event.location,
      guestCount: isNaN(guests) || guests < 1 ? event.guestCount : guests,
      budget: isNaN(budgetVal) || budgetVal <= 0 ? event.budget : budgetVal,
    });
    setIsEditing(false);
  };

  return (
    <div className="space-y-8">
      {/* Demo mode banner */}
      {isDemo && (
        <div
          className="px-4 py-3 rounded-xl flex items-center gap-3"
          style={{
            background: "linear-gradient(135deg, #fef3c7, #fde68a)",
            border: "1px solid #f59e0b",
          }}
          role="alert"
        >
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" aria-hidden="true" />
          <p className="text-sm text-amber-800">
            <strong>Demo Mode</strong> — This is sample data. To use AI-generated plans, add your{" "}
            <code className="font-mono text-xs bg-amber-100 px-1 rounded">GEMINI_API_KEY</code> to{" "}
            <code className="font-mono text-xs bg-amber-100 px-1 rounded">.env.local</code>.
          </p>
        </div>
      )}

      {/* Verified AI saved example banner */}
      {!isDemo && currentPlan.generatedBy && (
        <div
          className="px-4 py-3 rounded-xl flex items-center justify-between gap-3 text-xs"
          style={{
            background: "#ecfdf5",
            border: "1px solid #a7f3d0",
            color: "#065f46",
          }}
          role="status"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600 flex-shrink-0" aria-hidden="true" />
            <p>
              <strong>Verified Gemini-generated plan — saved example</strong> (Model:{" "}
              <code className="font-mono font-semibold">{currentPlan.generatedBy}</code>).
            </p>
          </div>
          <button
            onClick={() => setActiveTab("ai")}
            className="underline font-semibold flex-shrink-0 hover:text-emerald-800"
          >
            AI Details
          </button>
        </div>
      )}

      {/* Event header */}
      <div
        className="rounded-2xl p-6 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #2d1f0e 0%, #4a3015 50%, #6b4420 100%)",
          color: "white",
        }}
      >
        <div className="relative z-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span
                className="text-xs font-medium px-2.5 py-1 rounded-full mb-2 inline-block"
                style={{ background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.9)" }}
              >
                {eventTypeLabel(event.type)}
              </span>
              <h2
                className="text-2xl font-bold mt-1"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {event.name}
              </h2>
            </div>
            <div className="flex gap-2">
              <button
                onClick={startEditing}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium flex-shrink-0"
                style={{ background: "rgba(255,255,255,0.15)", color: "white" }}
                aria-label="Edit event details"
              >
                <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                Edit Details
              </button>
              <button
                onClick={() => setActiveTab("ai")}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium flex-shrink-0"
                style={{ background: "rgba(255,255,255,0.15)", color: "white" }}
                aria-label="Open AI assistant"
              >
                <Sparkles className="w-4 h-4" aria-hidden="true" />
                AI Plan
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            <EventDetail icon={CalendarDays} label="Date" value={formatDate(event.date)} />
            <EventDetail icon={MapPin} label="Location" value={event.location} />
            <EventDetail icon={Users} label="Guests" value={event.guestCount.toString()} />
            <EventDetail
              icon={DollarSign}
              label="Budget"
              value={formatCurrency(event.budget, event.currency)}
            />
          </div>
        </div>

        {/* Accessible Event Setup Modal with Focus Trap */}
        <Modal
          isOpen={isEditing}
          onClose={() => setIsEditing(false)}
          title="Event Setup & Configuration"
          description="Update your event's core details. Timelines and budget allocations will automatically adjust."
          maxWidth="lg"
        >
          <form onSubmit={saveEdit} className="space-y-4">
            <div className="space-y-3">
              <div>
                <label htmlFor="modal-event-name" className="block text-xs font-semibold mb-1" style={{ color: "var(--foreground)" }}>
                  Event Name
                </label>
                <input
                  id="modal-event-name"
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  style={{ borderColor: "var(--border)", background: "var(--background)", color: "var(--foreground)" }}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="modal-event-date" className="block text-xs font-semibold mb-1" style={{ color: "var(--foreground)" }}>
                    Date
                  </label>
                  <input
                    id="modal-event-date"
                    type="date"
                    required
                    value={editForm.date}
                    onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                    style={{ borderColor: "var(--border)", background: "var(--background)", color: "var(--foreground)" }}
                  />
                </div>

                <div>
                  <label htmlFor="modal-event-location" className="block text-xs font-semibold mb-1" style={{ color: "var(--foreground)" }}>
                    Location
                  </label>
                  <input
                    id="modal-event-location"
                    type="text"
                    required
                    value={editForm.location}
                    onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                    style={{ borderColor: "var(--border)", background: "var(--background)", color: "var(--foreground)" }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="modal-guest-count" className="block text-xs font-semibold mb-1" style={{ color: "var(--foreground)" }}>
                    Guest Count
                  </label>
                  <input
                    id="modal-guest-count"
                    type="number"
                    min={1}
                    max={10000}
                    required
                    value={editForm.guestCount}
                    onChange={(e) => setEditForm((f) => ({ ...f, guestCount: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                    style={{ borderColor: "var(--border)", background: "var(--background)", color: "var(--foreground)" }}
                  />
                </div>

                <div>
                  <label htmlFor="modal-budget" className="block text-xs font-semibold mb-1" style={{ color: "var(--foreground)" }}>
                    Budget ({event.currency})
                  </label>
                  <input
                    id="modal-budget"
                    type="number"
                    min={1}
                    required
                    value={editForm.budget}
                    onChange={(e) => setEditForm((f) => ({ ...f, budget: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                    style={{ borderColor: "var(--border)", background: "var(--background)", color: "var(--foreground)" }}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
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
                Save Changes
              </button>
            </div>
          </form>
        </Modal>

        {/* Decorative pattern */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 50%, white 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
          aria-hidden="true"
        />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Tasks Done"
          value={`${taskStats.completed}/${taskStats.total}`}
          sub={`${taskStats.completionPercent}% complete`}
          color="var(--success)"
          icon={CheckCircle2}
          onClick={() => setActiveTab("timeline")}
        />
        <StatCard
          label="Overdue"
          value={taskStats.overdue.toString()}
          sub="tasks need attention"
          color={taskStats.overdue > 0 ? "var(--destructive)" : "var(--success)"}
          icon={AlertCircle}
          onClick={() => setActiveTab("timeline")}
        />
        <StatCard
          label="Vendors Booked"
          value={`${bookedVendors}/${vendors.length}`}
          sub="of total vendors"
          color="var(--primary)"
          icon={Users}
          onClick={() => setActiveTab("vendors")}
        />
        {budgetTotals ? (
          <StatCard
            label="Budget Remaining"
            value={formatCurrency(budgetTotals.remainingBalance, event.currency)}
            sub={budgetTotals.isOverBudget ? "⚠ Over budget!" : "of total"}
            color={budgetTotals.isOverBudget ? "var(--destructive)" : "var(--success)"}
            icon={TrendingUp}
            onClick={() => setActiveTab("budget")}
          />
        ) : (
          <StatCard
            label="Budget"
            value="Not set"
            sub="Generate a plan to start"
            color="var(--muted-foreground)"
            icon={DollarSign}
            onClick={() => setActiveTab("ai")}
          />
        )}
      </div>

      {/* Progress bar */}
      {taskStats.total > 0 && (
        <div
          className="rounded-xl p-5"
          style={{ background: "white", border: "1px solid var(--border)" }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
              Planning Progress
            </h3>
            <span className="text-sm font-bold" style={{ color: "var(--primary)" }}>
              {taskStats.completionPercent}%
            </span>
          </div>
          <div
            className="w-full rounded-full h-2.5"
            style={{ background: "var(--muted)" }}
            role="progressbar"
            aria-valuenow={taskStats.completionPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Planning progress"
          >
            <div
              className="h-2.5 rounded-full transition-all duration-500"
              style={{
                width: `${taskStats.completionPercent}%`,
                background: "linear-gradient(90deg, var(--primary) 0%, var(--primary-light) 100%)",
              }}
            />
          </div>
          <div className="flex gap-4 mt-3 text-xs" style={{ color: "var(--muted-foreground)" }}>
            <span>{taskStats.completed} completed</span>
            <span>{taskStats.pending} pending</span>
            {taskStats.overdue > 0 && (
              <span style={{ color: "var(--destructive)" }}>{taskStats.overdue} overdue</span>
            )}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <QuickAction
          title="Generate AI Plan"
          description="Get AI-powered budget, timeline, and vendor suggestions."
          icon={Sparkles}
          onClick={() => setActiveTab("ai")}
          primary
        />
        <QuickAction
          title="Manage Timeline"
          description={`${taskStats.pending} tasks pending — stay on track.`}
          icon={Clock}
          onClick={() => setActiveTab("timeline")}
        />
      </div>
    </div>
  );
}

function EmptyHome({
  onCreateEvent,
  onLoadDemo,
  onLoadLive,
}: {
  onCreateEvent: () => void;
  onLoadDemo: () => void;
  onLoadLive?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
        style={{ background: "var(--accent)" }}
        aria-hidden="true"
      >
        <Sparkles
          className="w-10 h-10"
          style={{ color: "var(--primary)" }}
        />
      </div>
      <h2
        className="text-3xl font-bold mb-3"
        style={{ fontFamily: "'Playfair Display', serif", color: "var(--foreground)" }}
      >
        Welcome to EventPilot AI
      </h2>
      <p className="text-base max-w-md mb-8" style={{ color: "var(--muted-foreground)" }}>
        Your celebration, intelligently planned. Create a new event or load a demo to explore the
        full planning experience.
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={onCreateEvent}
          className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-sm"
          style={{ background: "var(--primary)", color: "white" }}
        >
          <PlusCircle className="w-4 h-4" aria-hidden="true" />
          Create New Event
        </button>
        <button
          onClick={onLoadDemo}
          className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-sm"
          style={{
            background: "white",
            color: "var(--foreground)",
            border: "1px solid var(--border)",
          }}
        >
          <Sparkles className="w-4 h-4" aria-hidden="true" />
          Load Demo Wedding
        </button>
        {onLoadLive && (
          <button
            onClick={onLoadLive}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-sm"
            style={{
              background: "#ecfdf5",
              color: "#065f46",
              border: "1px solid #10b981",
            }}
          >
            <Sparkles className="w-4 h-4 text-emerald-600" aria-hidden="true" />
            Load Verified AI Plan (Saved)
          </button>
        )}
      </div>
    </div>
  );
}

function EventDetail({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1" style={{ color: "rgba(255,255,255,0.6)" }}>
        <Icon className="w-3 h-3" aria-hidden="true" />
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-sm font-medium text-white truncate">{value}</p>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  color,
  icon: Icon,
  onClick,
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
  icon: React.ElementType;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-xl p-4 text-left w-full transition-all hover:shadow-md"
      style={{ background: "white", border: "1px solid var(--border)" }}
      aria-label={`${label}: ${value}. ${sub}`}
    >
      <Icon className="w-4 h-4 mb-2" style={{ color }} aria-hidden="true" />
      <p className="text-lg font-bold" style={{ color: "var(--foreground)" }}>
        {value}
      </p>
      <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
        {label}
      </p>
      <p className="text-xs mt-0.5" style={{ color }}>
        {sub}
      </p>
    </button>
  );
}

function QuickAction({
  title,
  description,
  icon: Icon,
  onClick,
  primary = false,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-xl p-5 text-left flex items-start gap-4 transition-all hover:shadow-md"
      style={{
        background: primary ? "var(--accent)" : "white",
        border: `1px solid ${primary ? "var(--primary)" : "var(--border)"}`,
      }}
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: primary ? "var(--primary)" : "var(--muted)" }}
        aria-hidden="true"
      >
        <Icon
          className="w-5 h-5"
          style={{ color: primary ? "white" : "var(--primary)" }}
        />
      </div>
      <div>
        <h3 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
          {title}
        </h3>
        <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
          {description}
        </p>
      </div>
    </button>
  );
}

