"use client";
import { useAppStore } from "@/store/appStore";
import {
  Home,
  PlusCircle,
  DollarSign,
  CalendarDays,
  Users,
  Sparkles,
  ChevronRight,
} from "lucide-react";

const navItems = [
  { id: "home", label: "Overview", icon: Home },
  { id: "create", label: "Create Event", icon: PlusCircle },
  { id: "budget", label: "Budget", icon: DollarSign },
  { id: "timeline", label: "Timeline", icon: CalendarDays },
  { id: "vendors", label: "Vendors", icon: Users },
  { id: "ai", label: "AI Assistant", icon: Sparkles },
];

export default function Sidebar() {
  const { activeTab, setActiveTab, currentPlan, allEvents, selectEvent } = useAppStore();

  return (
    <>
      {/* Mobile Top Header */}
      <header
        className="md:hidden sticky top-0 z-20 flex items-center justify-between px-4 py-3"
        style={{ background: "white", borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "var(--primary)" }}
            aria-hidden="true"
          >
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span
            className="text-sm font-bold"
            style={{ fontFamily: "'Playfair Display', serif", color: "var(--foreground)" }}
          >
            EventPilot AI
          </span>
        </div>
        {currentPlan && (
          <span
            className="text-xs px-2 py-1 rounded-full font-medium truncate max-w-[140px]"
            style={{ background: "var(--accent)", color: "var(--primary-dark)" }}
          >
            {currentPlan.event.name}
          </span>
        )}
      </header>

      {/* Desktop Sidebar */}
      <aside
        className="hidden md:flex flex-col w-64 min-h-screen sticky top-0"
        style={{
          background: "white",
          borderRight: "1px solid var(--border)",
        }}
        aria-label="Main navigation"
      >
      {/* Logo */}
      <div className="px-6 py-6 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "var(--primary)" }}
            aria-hidden="true"
          >
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1
              className="text-base font-bold leading-none"
              style={{ fontFamily: "'Playfair Display', serif", color: "var(--foreground)" }}
            >
              EventPilot
            </h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
              AI
            </p>
          </div>
        </div>
      </div>

      {/* Current event indicator */}
      {currentPlan && (
        <div
          className="mx-4 my-3 px-3 py-2 rounded-lg"
          style={{ background: "var(--muted)", border: "1px solid var(--border)" }}
        >
          {currentPlan.isDemo && (
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full mb-1 inline-block"
              style={{ background: "var(--primary)", color: "white" }}
            >
              Demo
            </span>
          )}
          {!currentPlan.isDemo && currentPlan.generatedBy && (
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full mb-1 inline-block"
              style={{ background: "#059669", color: "white" }}
            >
              AI: {currentPlan.generatedBy.replace("gemini-", "")} (Verified)
            </span>
          )}
          <p
            className="text-xs font-semibold truncate"
            style={{ color: "var(--foreground)" }}
          >
            {currentPlan.event.name}
          </p>
          <p className="text-xs truncate" style={{ color: "var(--muted-foreground)" }}>
            {new Date(currentPlan.event.date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
          {allEvents.length > 1 && (
            <div className="mt-2 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
              <label htmlFor="sidebar-event-select" className="block text-[10px] font-medium text-stone-500 mb-1">
                Switch Event ({allEvents.length})
              </label>
              <select
                id="sidebar-event-select"
                value={currentPlan.event.id}
                onChange={(e) => selectEvent(e.target.value)}
                className="w-full text-xs font-medium py-1 px-1.5 rounded cursor-pointer"
                style={{
                  background: "white",
                  border: "1px solid var(--border)",
                  color: "var(--foreground)",
                }}
              >
                {allEvents.map((evt) => (
                  <option key={evt.id} value={evt.id}>
                    {evt.id.startsWith("live")
                      ? `${evt.name.slice(0, 16)}… (AI Saved)`
                      : evt.id.startsWith("demo")
                      ? `${evt.name.slice(0, 16)}… (Demo)`
                      : evt.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Nav links */}
      <nav className="flex-1 px-3 py-2" aria-label="Dashboard sections">
        <ul className="space-y-1" role="list">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const isDisabled =
              !currentPlan && !["create", "home"].includes(item.id);

            return (
              <li key={item.id}>
                <button
                  onClick={() => !isDisabled && setActiveTab(item.id)}
                  disabled={isDisabled}
                  aria-current={isActive ? "page" : undefined}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background: isActive ? "var(--accent)" : "transparent",
                    color: isActive
                      ? "var(--primary-dark)"
                      : isDisabled
                      ? "var(--muted-foreground)"
                      : "var(--foreground)",
                    cursor: isDisabled ? "not-allowed" : "pointer",
                    opacity: isDisabled ? 0.5 : 1,
                  }}
                >
                  <Icon
                    className="w-4 h-4 flex-shrink-0"
                    aria-hidden="true"
                  />
                  <span className="flex-1 text-left">{item.label}</span>
                  {isActive && (
                    <ChevronRight
                      className="w-3 h-3"
                      style={{ color: "var(--primary)" }}
                      aria-hidden="true"
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t" style={{ borderColor: "var(--border)" }}>
        <p
          className="text-xs text-center"
          style={{ color: "var(--muted-foreground)" }}
        >
          Your celebration, intelligently planned.
        </p>
      </div>
    </aside>

    {/* Mobile Fixed Bottom Navigation */}
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around px-1 py-1"
      style={{
        background: "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(8px)",
        borderTop: "1px solid var(--border)",
      }}
      aria-label="Mobile navigation"
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        const isDisabled = !currentPlan && !["create", "home"].includes(item.id);

        return (
          <button
            key={item.id}
            onClick={() => !isDisabled && setActiveTab(item.id)}
            disabled={isDisabled}
            aria-current={isActive ? "page" : undefined}
            className="flex flex-col items-center justify-center py-1.5 px-2 rounded-lg min-h-[48px] min-w-[48px] transition-colors"
            style={{
              color: isActive
                ? "var(--primary-dark)"
                : isDisabled
                ? "var(--muted-foreground)"
                : "var(--foreground)",
              opacity: isDisabled ? 0.4 : 1,
            }}
          >
            <Icon
              className="w-4 h-4 mb-0.5"
              style={{ color: isActive ? "var(--primary)" : "currentColor" }}
              aria-hidden="true"
            />
            <span
              className="text-[10px] font-medium leading-none"
              style={{ fontWeight: isActive ? 600 : 500 }}
            >
              {item.label === "Create Event" ? "Create" : item.label === "AI Assistant" ? "AI" : item.label}
            </span>
          </button>
        );
      })}
    </nav>
  </>
  );
}

