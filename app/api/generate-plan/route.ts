/**
 * POST /api/generate-plan
 *
 * Production-ready Gemini integration with three-model resilience cascade:
 * 1. Primary: gemini-3.8-flash (9s budget)
 * 2. Secondary: gemini-3.6-flash (10s budget)
 * 3. Final fallback: gemini-3.5-flash-lite (11s budget)
 *
 * Failover trigger conditions:
 * - HTTP 503 UNAVAILABLE
 * - Primary/Secondary timeout (AbortError from bounded per-model budget)
 * - Provider deadline exceeded / transient network timeout
 *
 * Non-fallback conditions:
 * - HTTP 400 (Bad Request)
 * - HTTP 401 / 403 (Auth/Permissions)
 * - HTTP 429 (Quota / Rate Limit)
 * - Schema validation errors
 */
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import {
  GeneratePlanRequestSchema,
  AIGeneratedPlanSchema,
  AIGeneratedPlan,
  GeneratePlanResponse,
  EventType,
} from "@/lib/schemas";
import { getDemoPlan } from "@/lib/demo-plan";

export const maxDuration = 45;

export const PRIMARY_MODEL = "gemini-3.8-flash";
export const SECONDARY_MODEL = "gemini-3.6-flash";
export const TERTIARY_MODEL = "gemini-3.5-flash-lite";
export const FALLBACK_MODEL = SECONDARY_MODEL; // Backwards-compatible alias

export const PRIMARY_TIMEOUT_MS = 9_000;
export const SECONDARY_TIMEOUT_MS = 10_000;
export const TERTIARY_TIMEOUT_MS = 11_000;
export const FALLBACK_TIMEOUT_MS = SECONDARY_TIMEOUT_MS; // Backwards-compatible alias

export const MODEL_CASCADE = [
  { model: PRIMARY_MODEL, timeoutMs: PRIMARY_TIMEOUT_MS },
  { model: SECONDARY_MODEL, timeoutMs: SECONDARY_TIMEOUT_MS },
  { model: TERTIARY_MODEL, timeoutMs: TERTIARY_TIMEOUT_MS },
] as const;

export interface UpstreamErrorDetails {
  status: number;
  message: string;
  isUnavailable: boolean;
  isRateLimit: boolean;
  isAuth: boolean;
  isTimeout: boolean;
  isNetworkTimeout: boolean;
  isSchemaError: boolean;
}

/**
 * Parses errors from @google/genai, network, or runtime.
 * Extracts status code, sanitizes message, and classifies error category.
 */
export function parseUpstreamError(
  err: unknown,
  wasAborted: boolean = false
): UpstreamErrorDetails {
  if (wasAborted) {
    return {
      status: 504,
      message: "AI request timed out.",
      isUnavailable: false,
      isRateLimit: false,
      isAuth: false,
      isTimeout: true,
      isNetworkTimeout: false,
      isSchemaError: false,
    };
  }

  if (err && typeof err === "object") {
    const anyErr = err as Record<string, unknown>;
    const rawMsg = typeof anyErr.message === "string" ? anyErr.message : "";
    const rawStatus = typeof anyErr.status === "number" ? anyErr.status : undefined;
    const errName = typeof anyErr.name === "string" ? anyErr.name : "";

    // Extract JSON payload embedded inside Google SDK error messages
    let parsedCode: number | undefined;
    let parsedMsg: string | undefined;
    try {
      const match = rawMsg.match(/\{[\s\S]*"code"\s*:\s*(\d+)[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (parsed?.error?.code) {
          parsedCode = Number(parsed.error.code);
          parsedMsg = parsed.error.message;
        }
      }
    } catch {
      // Ignore JSON parse failure on raw message string
    }

    const code = rawStatus ?? parsedCode;
    const msg = parsedMsg ?? rawMsg;
    const lower = msg.toLowerCase();

    const isExplicitTimeout =
      Boolean((anyErr as { isTimeout?: boolean }).isTimeout) ||
      errName === "AbortError" ||
      lower.includes("timeout") ||
      lower.includes("timed out") ||
      lower.includes("deadline_exceeded");

    const isNetworkTimeout =
      lower.includes("etimedout") ||
      lower.includes("econnreset") ||
      lower.includes("und_err_connect_timeout") ||
      lower.includes("network timeout") ||
      lower.includes("socket hang up");

    const isSchemaError =
      lower.includes("validation failed") ||
      lower.includes("syntaxerror") ||
      lower.includes("invalid json") ||
      lower.includes("invalid allocation percentage") ||
      lower.includes("negative task lead time");

    const isUnavailable =
      code === 503 ||
      lower.includes("503") ||
      lower.includes("unavailable") ||
      lower.includes("high demand") ||
      lower.includes("temporarily unavailable") ||
      lower.includes("service unavailable");

    const isRateLimit =
      code === 429 ||
      lower.includes("429") ||
      lower.includes("resource_exhausted") ||
      lower.includes("quota");

    const isAuth =
      code === 401 ||
      code === 403 ||
      lower.includes("401") ||
      lower.includes("403") ||
      lower.includes("unauthenticated") ||
      lower.includes("permission_denied") ||
      lower.includes("api_key_invalid") ||
      lower.includes("api key not valid");

    const status = isUnavailable
      ? 503
      : isExplicitTimeout || isNetworkTimeout
      ? 504
      : isRateLimit
      ? 429
      : isAuth
      ? 403
      : code && code >= 400 && code < 600
      ? code
      : isSchemaError
      ? 500
      : 500;

    return {
      status,
      message: msg,
      isUnavailable,
      isRateLimit,
      isAuth,
      isTimeout: isExplicitTimeout,
      isNetworkTimeout,
      isSchemaError,
    };
  }

  return {
    status: 500,
    message: String(err),
    isUnavailable: false,
    isRateLimit: false,
    isAuth: false,
    isTimeout: false,
    isNetworkTimeout: false,
    isSchemaError: false,
  };
}

/**
 * Determines whether a failure condition on a model is eligible for failover.
 */
export function isEligibleForFallback(details: UpstreamErrorDetails): boolean {
  // Do NOT fallback for:
  // - 400 Bad Request
  // - 401 / 403 Auth & Permission errors
  // - 429 Quota / Rate limit
  // - Schema / validation errors (deterministic bugs, not provider transient issues)
  if (
    details.isAuth ||
    details.isRateLimit ||
    details.status === 400 ||
    details.isSchemaError
  ) {
    return false;
  }

  // Trigger fallback for:
  // - 503 UNAVAILABLE
  // - Timeout (AbortError / deadline exceeded)
  // - Transient network timeout
  return details.isUnavailable || details.isTimeout || details.isNetworkTimeout;
}

export function buildPrompt(event: {
  name: string;
  type: EventType;
  date: string;
  location: string;
  guestCount: number;
  budget: number;
  currency: string;
  themePreference?: string;
  requirements?: string;
}): string {
  const eventTypeLabels: Record<EventType, string> = {
    wedding: "Wedding",
    birthday: "Birthday Celebration",
    community: "Community Event",
    custom: "Custom Event",
  };
  const typeLabel = eventTypeLabels[event.type] ?? event.type;

  const now = new Date();
  const eventDate = new Date(event.date);
  const diffDays = Math.max(
    1,
    Math.round((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  );

  const typeSpecificGuidance: Record<EventType, string> = {
    wedding:
      "- Focus on ceremonial sequences, attire and styling, floral & altar/mandap aesthetics, multi-course regional catering considerations, photography shot-lists, and guest invitations.",
    birthday:
      "- Focus on age-appropriate celebration concepts, themed entertainment, custom cake and dessert stations, interactive guest activities, and celebratory photo moments.",
    community:
      "- Focus on municipal permits/licensing, crowd safety and accessible facilities, volunteer coordination, staging & sound AV, local community marketing, and sanitation.",
    custom:
      "- Focus on event objectives, venue layout and staging, attendee schedule, specialized equipment or supplies, and presentation or hospitality coordination.",
  };

  return `You are an expert event planning consultant. Generate a comprehensive, personalized event plan for the following celebration.

EVENT DETAILS:
- Type: ${typeLabel}
- Name: ${event.name}
- Target Date: ${event.date} (${diffDays} days from now)
- Location: ${event.location}
- Guest Count: ${event.guestCount}
- Total Budget: ${event.currency} ${event.budget.toLocaleString()}
- Theme Preference: ${event.themePreference || "Open to creative suggestions"}
- Special Requirements: ${event.requirements || "None specified"}

PLANNING GUIDELINES FOR THIS EVENT TYPE:
${typeSpecificGuidance[event.type]}

Generate a practical, detailed plan. Return ONLY valid JSON matching this exact structure:
{
  "summary": "Brief 2-3 sentence overview of the event plan",
  "budgetAllocations": [
    { "name": "Category name", "percentage": number (0-100), "notes": "brief note" }
  ],
  "tasks": [
    {
      "title": "Task title",
      "description": "What needs to be done",
      "daysBeforeEvent": number (positive integer, days before event date),
      "priority": "high" | "medium" | "low",
      "category": "Category name"
    }
  ],
  "ideas": {
    "themes": ["Theme idea 1", "Theme idea 2", "Theme idea 3"],
    "decorations": ["Decoration idea 1", ...],
    "catering": ["Catering idea 1", ...],
    "activities": ["Activity idea 1", ...],
    "recommendations": ["Practical tip 1", ...]
  },
  "vendorCategories": ["Vendor category 1", "Vendor category 2", ...]
}

CRITICAL RULES:
1. DATE-AWARE TIMELINE: The event is scheduled in ${diffDays} days. All tasks MUST have 'daysBeforeEvent' as a positive integer between 0 and ${diffDays} (where 0 is the event day itself). Do NOT schedule tasks with daysBeforeEvent > ${diffDays} as those deadlines would be in the past. Space the tasks realistically from ${diffDays} down to 0.
2. FINANCIAL REALISM: Total budget is ${event.currency} ${event.budget.toLocaleString()} for ${event.guestCount} guests. Suggested budgetAllocations percentages must sum to at most 90% (leaving at least a 10% contingency reserve). Individual category percentages must be between 0 and 100.
3. Include 8-20 tasks covering planning, booking, preparation, and day-of execution.
4. Include 5-10 budget categories appropriate for this event type and scale.
5. vendorCategories should be 5-10 realistic vendor types needed.
6. NO FICTITIOUS ENDORSEMENTS: Do NOT invent specific company names, telephone numbers, or claim vendors are verified.
7. Tailor ideas and catering recommendations to the specific location (${event.location}), guest count (${event.guestCount}), and budget level.`;
}

/**
 * Invokes a single Gemini model with timeout budget, JSON parsing, and schema validation.
 */
export async function callSingleModel(
  client: GoogleGenAI,
  model: string,
  prompt: string,
  diffDays: number,
  timeoutMs: number = PRIMARY_TIMEOUT_MS
): Promise<AIGeneratedPlan> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await client.models.generateContent({
      model,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        abortSignal: controller.signal,
        responseMimeType: "application/json",
        temperature: 0.7,
        maxOutputTokens: 4096,
        httpOptions: {
          retryOptions: { attempts: 1 },
        },
      },
    });

    clearTimeout(timeoutId);

    if (controller.signal.aborted) {
      const timeoutErr = new Error(
        `AI model ${model} request timed out after ${timeoutMs / 1000} seconds.`
      );
      (timeoutErr as { isTimeout?: boolean }).isTimeout = true;
      throw timeoutErr;
    }

    const text = response.text;
    if (!text) {
      throw new Error(`Empty response from ${model}`);
    }

    // Strip markdown code fences if present
    const cleaned = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const parsed = JSON.parse(cleaned);
    const validated = AIGeneratedPlanSchema.safeParse(parsed);

    if (!validated.success) {
      throw new Error(
        `AI response validation failed: ${validated.error.message}`
      );
    }

    const plan = validated.data;

    // Validate semantic constraints
    for (const alloc of plan.budgetAllocations) {
      if (alloc.percentage < 0 || alloc.percentage > 100) {
        throw new Error(
          `Invalid allocation percentage: ${alloc.percentage}% for "${alloc.name}"`
        );
      }
    }

    for (const task of plan.tasks) {
      if (task.daysBeforeEvent < 0) {
        throw new Error(
          `Negative task lead time: ${task.daysBeforeEvent} for task "${task.title}"`
        );
      }
      if (task.daysBeforeEvent > diffDays) {
        // Enforce upper bound constraint to avoid past deadlines
        task.daysBeforeEvent = Math.min(task.daysBeforeEvent, diffDays);
      }
    }

    return plan;
  } catch (err) {
    clearTimeout(timeoutId);

    if (controller.signal.aborted) {
      const timeoutErr = new Error(
        `AI model ${model} request timed out after ${timeoutMs / 1000} seconds.`
      );
      (timeoutErr as { isTimeout?: boolean }).isTimeout = true;
      throw timeoutErr;
    }

    throw err;
  }
}

/**
 * Three-model controlled fallback orchestrator:
 * 1. gemini-3.8-flash (9s budget)
 * 2. On eligible transient error -> gemini-3.6-flash (10s budget)
 * 3. On eligible transient error -> gemini-3.5-flash-lite (11s budget)
 * Overall deadline bounded to approximately 30.6s max.
 * Does not fallback on 400, 401, 403, 429, or schema errors.
 */
export async function generatePlanWithFallback(
  client: GoogleGenAI,
  prompt: string,
  diffDays: number,
  jitterDelayFn?: () => Promise<void>
): Promise<{ plan: AIGeneratedPlan; modelUsed: string }> {
  let lastError: unknown = null;
  let lastErrorDetails: UpstreamErrorDetails | null = null;

  for (let i = 0; i < MODEL_CASCADE.length; i++) {
    const { model, timeoutMs } = MODEL_CASCADE[i];
    const isLastModel = i === MODEL_CASCADE.length - 1;

    try {
      const plan = await callSingleModel(client, model, prompt, diffDays, timeoutMs);
      return { plan, modelUsed: model };
    } catch (err) {
      lastError = err;
      const isTimeout = (err as { isTimeout?: boolean })?.isTimeout;
      lastErrorDetails = parseUpstreamError(err, isTimeout);

      // If error is not eligible for fallback (400, 401, 403, 429, schema error), fail immediately
      if (!isEligibleForFallback(lastErrorDetails)) {
        throw err;
      }

      // If last model in the cascade failed, break to return final aggregated error
      if (isLastModel) {
        break;
      }

      // Bounded backoff with jitter between attempts
      if (jitterDelayFn) {
        await jitterDelayFn();
      } else {
        const baseDelay = 200 * (i + 1); // 200ms, 400ms
        const jitter = Math.floor(Math.random() * 200);
        await new Promise((resolve) => setTimeout(resolve, baseDelay + jitter));
      }
    }
  }

  // All 3 models failed with eligible transient errors
  if (lastErrorDetails?.isTimeout || lastErrorDetails?.isNetworkTimeout) {
    const timeoutErr = new Error(
      "AI request timed out across all available models. Please click Retry."
    );
    (timeoutErr as { status?: number; isTimeout?: boolean }).status = 504;
    (timeoutErr as { status?: number; isTimeout?: boolean }).isTimeout = true;
    throw timeoutErr;
  }

  if (lastErrorDetails?.isUnavailable) {
    const capacityErr = new Error(
      "The AI service is currently experiencing high demand across all available models. Please try again in a few moments."
    );
    (capacityErr as { status?: number; isUnavailable?: boolean }).status = 503;
    (capacityErr as { status?: number; isUnavailable?: boolean }).isUnavailable = true;
    throw capacityErr;
  }

  throw lastError;
}

// In-memory rate limiting map: ip -> { count: number, resetAt: number }
export const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
export const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
export const MAX_REQUESTS_PER_WINDOW = 20;

export function checkRateLimit(ip: string): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  // Clean expired entries if map grows large
  if (rateLimitMap.size > 1000) {
    for (const [key, val] of rateLimitMap.entries()) {
      if (now > val.resetAt) rateLimitMap.delete(key);
    }
  }

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, retryAfter: 0 };
  }

  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }

  entry.count += 1;
  return { allowed: true, retryAfter: 0 };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "127.0.0.1";

    const rateLimit = checkRateLimit(clientIp);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Rate Limit Exceeded",
          message: "Rate limit exceeded. Please wait a minute before requesting another AI plan.",
        },
        {
          status: 429,
          headers: { "Retry-After": rateLimit.retryAfter.toString() },
        }
      );
    }

    const body = await request.json();
    const parsed = GeneratePlanRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { event } = parsed.data;

    // Security: API key only from server environment — never from client
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      // Demo mode: return pre-built demo plan, clearly labeled
      const demoPlan = getDemoPlan(event);
      const response: GeneratePlanResponse = {
        plan: demoPlan,
        isDemo: true,
        generatedBy: "demo",
        generatedAt: new Date().toISOString(),
      };
      return NextResponse.json(response);
    }

    const client = new GoogleGenAI({
      apiKey,
      httpOptions: {
        retryOptions: { attempts: 1 },
      },
    });
    const now = new Date();
    const eventDate = new Date(event.date);
    const diffDays = Math.max(
      1,
      Math.round((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    );
    const prompt = buildPrompt(event);

    const { plan, modelUsed } = await generatePlanWithFallback(
      client,
      prompt,
      diffDays
    );

    const response: GeneratePlanResponse = {
      plan,
      isDemo: false,
      generatedBy: modelUsed,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (err) {
    const isTimeout = (err as { isTimeout?: boolean })?.isTimeout;
    const parsed = parseUpstreamError(err, isTimeout);

    // Strictly protect against leaking API keys or credentials
    let safeMessage = parsed.message;
    if (parsed.isAuth || /api[_-]?key/i.test(safeMessage)) {
      safeMessage =
        "Authentication error. Please check server Gemini API key configuration.";
    } else {
      safeMessage = safeMessage
        .replace(/AIza[0-9A-Za-z-_]{35}/g, "[REDACTED_KEY]")
        .replace(/AQ\.[0-9A-Za-z-_]{40,}/g, "[REDACTED_KEY]")
        .replace(/key=[^&\s]+/gi, "key=[REDACTED]");
    }

    if (parsed.isUnavailable) {
      safeMessage =
        "The AI service is currently experiencing high demand. Please try again in a few moments.";
    } else if (parsed.isRateLimit) {
      safeMessage =
        "Gemini API rate limit or quota exceeded. Please check your account limits or try again later.";
    } else if (parsed.isTimeout || parsed.isNetworkTimeout) {
      safeMessage =
        "The AI generation request timed out. Your event settings are saved — please click Retry.";
    }

    return NextResponse.json(
      {
        error: parsed.isUnavailable
          ? "Service Unavailable"
          : parsed.isRateLimit
          ? "Rate Limit Exceeded"
          : parsed.isAuth
          ? "Authentication Error"
          : parsed.isTimeout || parsed.isNetworkTimeout
          ? "Gateway Timeout"
          : "Failed to generate event plan",
        message: safeMessage,
      },
      { status: parsed.status }
    );
  }
}
