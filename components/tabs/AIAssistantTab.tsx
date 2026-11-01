"use client";
import { useState } from "react";
import { useAppStore } from "@/store/appStore";
import { GeneratePlanResponse } from "@/lib/schemas";
import { Sparkles, RefreshCw, AlertCircle, Lightbulb, CheckCircle2 } from "lucide-react";

export default function AIAssistantTab() {
  const { currentPlan, setGenerating, setGenerateError, applyGeneratedPlan, isGenerating, generateError } =
    useAppStore();
  const [generated, setGenerated] = useState(false);

  if (!currentPlan) {
    return (
      <div className="text-center py-20">
        <p style={{ color: "var(--muted-foreground)" }}>Create an event first to use the AI assistant.</p>
      </div>
    );
  }

  const handleGenerate = async () => {
    setGenerating(true);
    setGenerateError(null);

    try {
      const res = await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: currentPlan.event }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const message = (errData as { message?: string }).message;
        if (res.status === 503) {
          throw new Error(
            message ??
              "The AI service is experiencing temporary peak demand across models. Your event details are safely preserved — please wait a moment and click Retry."
          );
        }
        if (res.status === 504) {
          throw new Error(
            message ??
              "The AI generation request timed out. Your event details are safely preserved — please click Retry to try again."
          );
        }
        if (res.status === 429) {
          throw new Error(
            message ??
              "API rate limit or quota exceeded. Please check your account quota or wait before retrying."
          );
        }
        if (res.status === 401 || res.status === 403) {
          throw new Error(
            message ??
              "Authentication error with the Gemini API key. Please check server configuration."
          );
        }
        throw new Error(
          message ?? `Server error (${res.status})`
        );
      }

      const data: GeneratePlanResponse = await res.json();

      if (data.isDemo) {
        setGenerateError(
          "Running in Demo Mode — no GEMINI_API_KEY configured. Showing sample plan. Add your API key to .env.local for real AI generation."
        );
      }

      applyGeneratedPlan(data.plan, data.isDemo, data.generatedBy);
      setGenerated(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setGenerateError(msg);
    } finally {
      setGenerating(false);
    }
  };

  const { ideas } = currentPlan;

  return (
    <div className="space-y-8">
      <div>
        <h2
          className="text-2xl font-bold mb-2"
          style={{ fontFamily: "'Playfair Display', serif", color: "var(--foreground)" }}
        >
          AI Event Assistant
        </h2>
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          Generate a complete event plan powered by Gemini AI. Budget allocations, timeline tasks, and
          vendor categories will be created automatically.
        </p>
      </div>

      {/* Event summary */}
      <div
        className="rounded-xl p-5"
        style={{ background: "var(--accent)", border: "1px solid var(--primary)" }}
      >
        <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--foreground)" }}>
          Planning For
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>Event</p>
            <p className="font-medium" style={{ color: "var(--foreground)" }}>{currentPlan.event.name}</p>
          </div>
          <div>
            <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>Type</p>
            <p className="font-medium capitalize" style={{ color: "var(--foreground)" }}>{currentPlan.event.type}</p>
          </div>
          <div>
            <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>Guests</p>
            <p className="font-medium" style={{ color: "var(--foreground)" }}>{currentPlan.event.guestCount}</p>
          </div>
          <div>
            <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>Budget</p>
            <p className="font-medium" style={{ color: "var(--foreground)" }}>
              {currentPlan.event.currency} {currentPlan.event.budget.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Error / demo mode notice */}
      {generateError && (
        <div
          className="p-4 rounded-xl flex gap-3"
          style={{
            background: generateError.includes("Demo Mode") ? "#fefce8" : "#fef2f2",
            border: `1px solid ${generateError.includes("Demo Mode") ? "#fde68a" : "#fca5a5"}`,
          }}
          role="alert"
        >
          <AlertCircle
            className="w-4 h-4 flex-shrink-0 mt-0.5"
            style={{ color: generateError.includes("Demo Mode") ? "#b45309" : "#dc2626" }}
            aria-hidden="true"
          />
          <p className="text-sm" style={{ color: generateError.includes("Demo Mode") ? "#78350f" : "#991b1b" }}>
            {generateError}
          </p>
        </div>
      )}

      {/* Generate button */}
      <div className="flex gap-4 items-center">
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: "var(--primary)", color: "white" }}
          aria-busy={isGenerating}
        >
          {isGenerating ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />
              Generating Plan…
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" aria-hidden="true" />
              {currentPlan.budget ? "Regenerate Plan" : "Generate AI Plan"}
            </>
          )}
        </button>
        {currentPlan.lastGeneratedAt && (
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            Plan generation date:{" "}
            {new Date(currentPlan.lastGeneratedAt).toLocaleString()}
            {currentPlan.isDemo
              ? " (Demo)"
              : currentPlan.generatedBy
              ? ` (via ${currentPlan.generatedBy}${generated ? " — live response" : " — saved example"})`
              : ""}
          </p>
        )}
      </div>

      {/* Loading state */}
      {isGenerating && (
        <div className="space-y-3">
          {["Analyzing your event details…", "Generating budget allocations…", "Building planning timeline…", "Creating personalized ideas…"].map(
            (msg, i) => (
              <div key={i} className="flex items-center gap-3 text-sm" style={{ color: "var(--muted-foreground)" }}>
                <div className="w-4 h-4 rounded-full skeleton flex-shrink-0" />
                {msg}
              </div>
            )
          )}
        </div>
      )}

      {/* Ideas section */}
      {ideas && !isGenerating && (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" style={{ color: "var(--success)" }} aria-hidden="true" />
            <h3 className="text-lg font-semibold" style={{ color: "var(--foreground)", fontFamily: "'Playfair Display', serif" }}>
              Personalized Ideas & Recommendations
            </h3>
          </div>

          {currentPlan.isDemo && (
            <div
              className="p-3 rounded-lg text-xs"
              style={{ background: "#fefce8", border: "1px solid #fde68a", color: "#78350f" }}
              role="note"
            >
              <strong>Demo content</strong> — The following ideas are pre-generated sample data, not produced by Gemini AI.
            </div>
          )}

          {!currentPlan.isDemo && currentPlan.generatedBy && (
            <div
              className="p-3.5 rounded-lg text-xs flex items-center justify-between gap-3"
              style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#065f46" }}
              role="status"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600 flex-shrink-0" aria-hidden="true" />
                <span>
                  {generated ? (
                    <>
                      <strong>Fresh Gemini AI generation</strong> — Model:{" "}
                      <code className="font-mono font-semibold">{currentPlan.generatedBy}</code>. Structured plan verified.
                    </>
                  ) : (
                    <>
                      <strong>Verified Gemini-generated plan — saved example</strong>. Model:{" "}
                      <code className="font-mono font-semibold">{currentPlan.generatedBy}</code>. Structured output validated against Zod schema.
                    </>
                  )}
                </span>
              </div>
              <span className="text-[11px] font-medium opacity-80 flex-shrink-0">
                {generated ? "Live API Response" : "Saved Verified Example"}
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <IdeaCard title="Event Themes" items={ideas.themes} icon="✦" />
            <IdeaCard title="Decoration Ideas" items={ideas.decorations} icon="◆" />
            <IdeaCard title="Catering & Food" items={ideas.catering} icon="◇" />
            <IdeaCard title="Activities & Entertainment" items={ideas.activities} icon="△" />
          </div>

          {ideas.recommendations.length > 0 && (
            <div
              className="rounded-xl p-5"
              style={{ background: "white", border: "1px solid var(--border)" }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="w-4 h-4" style={{ color: "var(--primary)" }} aria-hidden="true" />
                <h4 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                  Practical Recommendations
                </h4>
              </div>
              <ul className="space-y-2">
                {ideas.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "var(--foreground)" }}>
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "var(--primary)" }} aria-hidden="true" />
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* No ideas yet, not loading */}
      {!ideas && !isGenerating && (
        <div
          className="rounded-xl p-8 text-center"
          style={{ background: "var(--muted)", border: "1px dashed var(--border)" }}
        >
          <Sparkles className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--primary)" }} aria-hidden="true" />
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            Click "Generate AI Plan" to create personalized themes, decorations, catering suggestions, and
            practical recommendations for your event.
          </p>
        </div>
      )}
    </div>
  );
}

function IdeaCard({ title, items, icon }: { title: string; items: string[]; icon: string }) {
  return (
    <div
      className="rounded-xl p-5"
      style={{ background: "white", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span style={{ color: "var(--primary)", fontSize: "12px" }} aria-hidden="true">
          {icon}
        </span>
        <h4 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
          {title}
        </h4>
      </div>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="text-sm flex items-start gap-2" style={{ color: "var(--foreground)" }}>
            <span className="mt-1.5 w-1 h-1 rounded-full flex-shrink-0" style={{ background: "var(--primary)" }} aria-hidden="true" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

