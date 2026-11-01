/**
 * Unit and resilience tests for Gemini model fallback policy,
 * status code mappings, structured output validation, and error classification.
 * All provider responses are mocked; real API credentials are not invoked here.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  PRIMARY_MODEL,
  SECONDARY_MODEL,
  TERTIARY_MODEL,
  FALLBACK_MODEL,
  parseUpstreamError,
  callSingleModel,
  generatePlanWithFallback,
  checkRateLimit,
  rateLimitMap,
  MAX_REQUESTS_PER_WINDOW,
  POST,
} from "@/app/api/generate-plan/route";
import { NextRequest } from "next/server";
import { GoogleGenAI } from "@google/genai";

const sampleValidAIPlan = {
  summary: "An elegant traditional wedding celebration in Andhra Pradesh.",
  budgetAllocations: [
    { name: "Venue & Catering", percentage: 45, notes: "Traditional banquet" },
    { name: "Decorations & Floral", percentage: 20, notes: "Garden mandap" },
    { name: "Photography & Video", percentage: 15, notes: "Full coverage" },
  ],
  tasks: [
    {
      title: "Book Venue",
      description: "Finalize garden venue",
      daysBeforeEvent: 120,
      priority: "high" as const,
      category: "Venue",
    },
    {
      title: "Day-of Coordination",
      description: "Oversee mandap sequence",
      daysBeforeEvent: 0,
      priority: "high" as const,
      category: "Ceremony",
    },
  ],
  ideas: {
    themes: ["Traditional Andhra", "Garden Elegance"],
    decorations: ["Marigold garlands", "Brass urulis with floating lights"],
    catering: ["Traditional banana leaf lunch", "Coastal Andhra sweets"],
    activities: ["Talambralu ceremony", "Live classical nadaswaram"],
    recommendations: ["Ensure tenting for garden area", "Arrange welcome drinks"],
  },
  vendorCategories: ["Catering", "Florist", "Photographer", "Audio/Visual"],
};

function createMockClient(
  handler: (params: {
    model: string;
    contents: unknown;
    config?: { abortSignal?: AbortSignal };
  }) => Promise<{ text: string }>
): GoogleGenAI {
  return {
    models: {
      generateContent: vi.fn().mockImplementation((params) => {
        const signal = params?.config?.abortSignal;
        if (signal?.aborted) {
          const err = new Error("The operation was aborted");
          err.name = "AbortError";
          return Promise.reject(err);
        }
        return new Promise((resolve, reject) => {
          signal?.addEventListener("abort", () => {
            const err = new Error("The operation was aborted");
            err.name = "AbortError";
            reject(err);
          });
          handler(params).then(resolve, reject);
        });
      }),
    },
  } as unknown as GoogleGenAI;
}

describe("Error classification: parseUpstreamError", () => {
  it("identifies 503 UNAVAILABLE correctly from Google SDK error string", () => {
    const err = new Error(
      '{"error":{"code":503,"message":"This model is currently experiencing high demand.","status":"UNAVAILABLE"}}'
    );
    const parsed = parseUpstreamError(err);
    expect(parsed.status).toBe(503);
    expect(parsed.isUnavailable).toBe(true);
    expect(parsed.isAuth).toBe(false);
  });

  it("identifies 503 from error object with numeric status", () => {
    const err = { status: 503, message: "Service Unavailable" };
    const parsed = parseUpstreamError(err);
    expect(parsed.status).toBe(503);
    expect(parsed.isUnavailable).toBe(true);
  });

  it("identifies 401 / 403 Authentication and Permission errors", () => {
    const err = new Error("API key not valid. Please pass a valid API key.");
    const parsed = parseUpstreamError(err);
    expect(parsed.status).toBe(403);
    expect(parsed.isAuth).toBe(true);
    expect(parsed.isUnavailable).toBe(false);
  });

  it("identifies 429 Rate limit / Resource exhausted errors", () => {
    const err = new Error("Resource exhausted: 429 Quota exceeded");
    const parsed = parseUpstreamError(err);
    expect(parsed.status).toBe(429);
    expect(parsed.isRateLimit).toBe(true);
    expect(parsed.isUnavailable).toBe(false);
  });

  it("identifies 504 Gateway Timeout when aborted", () => {
    const parsed = parseUpstreamError(new Error("aborted"), true);
    expect(parsed.status).toBe(504);
    expect(parsed.isTimeout).toBe(true);
    expect(parsed.isUnavailable).toBe(false);
  });
});

describe("Single model invocation: callSingleModel", () => {
  it("parses valid JSON response and validates against Zod schema", async () => {
    const client = createMockClient(async () => ({
      text: JSON.stringify(sampleValidAIPlan),
    }));

    const plan = await callSingleModel(client, PRIMARY_MODEL, "prompt", 150);
    expect(plan.summary).toBe(sampleValidAIPlan.summary);
    expect(plan.budgetAllocations).toHaveLength(3);
    expect(plan.tasks).toHaveLength(2);
  });

  it("strips markdown code blocks from response text", async () => {
    const client = createMockClient(async () => ({
      text: "```json\n" + JSON.stringify(sampleValidAIPlan) + "\n```",
    }));

    const plan = await callSingleModel(client, PRIMARY_MODEL, "prompt", 150);
    expect(plan.summary).toBe(sampleValidAIPlan.summary);
  });

  it("throws SyntaxError when response is invalid JSON", async () => {
    const client = createMockClient(async () => ({
      text: "Not JSON { invalid",
    }));

    await expect(
      callSingleModel(client, PRIMARY_MODEL, "prompt", 150)
    ).rejects.toThrow();
  });

  it("throws validation error when required schema fields are missing", async () => {
    const invalidPlan = { summary: "Missing other fields" };
    const client = createMockClient(async () => ({
      text: JSON.stringify(invalidPlan),
    }));

    await expect(
      callSingleModel(client, PRIMARY_MODEL, "prompt", 150)
    ).rejects.toThrow(/validation failed/i);
  });

  it("rejects negative task lead times (semantic validation)", async () => {
    const invalidTasksPlan = {
      ...sampleValidAIPlan,
      tasks: [
        {
          title: "Impossible Task",
          description: "In the future past event",
          daysBeforeEvent: -5,
          priority: "high" as const,
          category: "General",
        },
      ],
    };
    const client = createMockClient(async () => ({
      text: JSON.stringify(invalidTasksPlan),
    }));

    await expect(
      callSingleModel(client, PRIMARY_MODEL, "prompt", 150)
    ).rejects.toThrow(/validation failed/i);
  });

  it("clamps task daysBeforeEvent exceeding event horizon", async () => {
    const horizonPlan = {
      ...sampleValidAIPlan,
      tasks: [
        {
          title: "Early Task",
          description: "Far ahead",
          daysBeforeEvent: 200,
          priority: "high" as const,
          category: "General",
        },
      ],
    };
    const client = createMockClient(async () => ({
      text: JSON.stringify(horizonPlan),
    }));

    const plan = await callSingleModel(client, PRIMARY_MODEL, "prompt", 100);
    expect(plan.tasks[0].daysBeforeEvent).toBe(100);
  });

  it("handles timeout via AbortController", async () => {
    const client = createMockClient(async ({ contents }) => {
      // Simulate hanging call
      await new Promise((r) => setTimeout(r, 100));
      return { text: JSON.stringify(sampleValidAIPlan) };
    });

    // Invoke with 10ms timeout
    await expect(
      callSingleModel(client, PRIMARY_MODEL, "prompt", 150, 10)
    ).rejects.toThrow(/timed out/i);
  });
});

describe("Model fallback policy: generatePlanWithFallback", () => {
  it("uses primary model (gemini-3.8-flash) on success without invoking fallback", async () => {
    const calls: string[] = [];
    const client = createMockClient(async ({ model }) => {
      calls.push(model);
      return { text: JSON.stringify(sampleValidAIPlan) };
    });

    const result = await generatePlanWithFallback(client, "prompt", 150);
    expect(result.modelUsed).toBe(PRIMARY_MODEL);
    expect(calls).toEqual([PRIMARY_MODEL]);
    expect(result.plan.summary).toBe(sampleValidAIPlan.summary);
  });

  it("falls back to secondary (gemini-3.6-flash) when primary returns 503 UNAVAILABLE", async () => {
    const calls: string[] = [];
    const client = createMockClient(async ({ model }) => {
      calls.push(model);
      if (model === PRIMARY_MODEL) {
        const err = new Error(
          '{"error":{"code":503,"message":"This model is experiencing high demand.","status":"UNAVAILABLE"}}'
        );
        throw err;
      }
      return { text: JSON.stringify(sampleValidAIPlan) };
    });

    const mockJitter = vi.fn().mockResolvedValue(undefined);
    const result = await generatePlanWithFallback(
      client,
      "prompt",
      150,
      mockJitter
    );

    expect(calls).toEqual([PRIMARY_MODEL, SECONDARY_MODEL]);
    expect(mockJitter).toHaveBeenCalledOnce();
    expect(result.modelUsed).toBe(SECONDARY_MODEL);
    expect(result.plan.summary).toBe(sampleValidAIPlan.summary);
  });

  it("falls back to secondary (gemini-3.6-flash) when primary times out", async () => {
    const calls: string[] = [];
    const client = createMockClient(async ({ model }) => {
      calls.push(model);
      if (model === PRIMARY_MODEL) {
        const timeoutErr = new Error("AI model gemini-3.8-flash request timed out after 9 seconds.");
        (timeoutErr as { isTimeout?: boolean }).isTimeout = true;
        throw timeoutErr;
      }
      return { text: JSON.stringify(sampleValidAIPlan) };
    });

    const mockJitter = vi.fn().mockResolvedValue(undefined);
    const result = await generatePlanWithFallback(
      client,
      "prompt",
      150,
      mockJitter
    );

    expect(calls).toEqual([PRIMARY_MODEL, SECONDARY_MODEL]);
    expect(mockJitter).toHaveBeenCalledOnce();
    expect(result.modelUsed).toBe(SECONDARY_MODEL);
    expect(result.plan.summary).toBe(sampleValidAIPlan.summary);
  });

  it("falls back to secondary when primary suffers network timeout (ETIMEDOUT)", async () => {
    const calls: string[] = [];
    const client = createMockClient(async ({ model }) => {
      calls.push(model);
      if (model === PRIMARY_MODEL) {
        throw new Error("connect ETIMEDOUT 142.250.190.42:443 (network timeout)");
      }
      return { text: JSON.stringify(sampleValidAIPlan) };
    });

    const mockJitter = vi.fn().mockResolvedValue(undefined);
    const result = await generatePlanWithFallback(
      client,
      "prompt",
      150,
      mockJitter
    );

    expect(calls).toEqual([PRIMARY_MODEL, SECONDARY_MODEL]);
    expect(result.modelUsed).toBe(SECONDARY_MODEL);
    expect(result.plan.summary).toBe(sampleValidAIPlan.summary);
  });

  it("falls back to tertiary (gemini-3.5-flash-lite) when primary times out and secondary returns 503", async () => {
    const calls: string[] = [];
    const client = createMockClient(async ({ model }) => {
      calls.push(model);
      if (model === PRIMARY_MODEL) {
        const timeoutErr = new Error("AI model gemini-3.8-flash request timed out.");
        (timeoutErr as { isTimeout?: boolean }).isTimeout = true;
        throw timeoutErr;
      }
      if (model === SECONDARY_MODEL) {
        throw new Error("503 UNAVAILABLE: Secondary experiencing high demand");
      }
      return { text: JSON.stringify(sampleValidAIPlan) };
    });

    const mockJitter = vi.fn().mockResolvedValue(undefined);
    const result = await generatePlanWithFallback(
      client,
      "prompt",
      150,
      mockJitter
    );

    expect(calls).toEqual([PRIMARY_MODEL, SECONDARY_MODEL, TERTIARY_MODEL]);
    expect(mockJitter).toHaveBeenCalledTimes(2);
    expect(result.modelUsed).toBe(TERTIARY_MODEL);
    expect(result.plan.summary).toBe(sampleValidAIPlan.summary);
  });

  it("returns 503 capacity error when ALL THREE models return 503", async () => {
    const calls: string[] = [];
    const client = createMockClient(async ({ model }) => {
      calls.push(model);
      const err = new Error("503 UNAVAILABLE: Model experiencing high demand");
      throw err;
    });

    const mockJitter = vi.fn().mockResolvedValue(undefined);

    await expect(
      generatePlanWithFallback(client, "prompt", 150, mockJitter)
    ).rejects.toThrow(/high demand across all available models/i);

    expect(calls).toEqual([PRIMARY_MODEL, SECONDARY_MODEL, TERTIARY_MODEL]);
  });

  it("throws 504 when ALL THREE models time out", async () => {
    const calls: string[] = [];
    const client = createMockClient(async ({ model }) => {
      calls.push(model);
      const timeoutErr = new Error(`AI model ${model} request timed out.`);
      (timeoutErr as { isTimeout?: boolean }).isTimeout = true;
      throw timeoutErr;
    });

    const mockJitter = vi.fn().mockResolvedValue(undefined);

    await expect(
      generatePlanWithFallback(client, "prompt", 150, mockJitter)
    ).rejects.toThrow(/timed out across all available models/i);

    expect(calls).toEqual([PRIMARY_MODEL, SECONDARY_MODEL, TERTIARY_MODEL]);
  });

  it("does NOT fallback on 401 / 403 authentication error", async () => {
    const calls: string[] = [];
    const client = createMockClient(async ({ model }) => {
      calls.push(model);
      throw new Error("403: API key not valid");
    });

    await expect(
      generatePlanWithFallback(client, "prompt", 150)
    ).rejects.toThrow(/API key not valid/);

    expect(calls).toEqual([PRIMARY_MODEL]);
  });

  it("does NOT fallback on 429 rate limit error", async () => {
    const calls: string[] = [];
    const client = createMockClient(async ({ model }) => {
      calls.push(model);
      throw new Error("429: Resource exhausted");
    });

    await expect(
      generatePlanWithFallback(client, "prompt", 150)
    ).rejects.toThrow(/Resource exhausted/);

    expect(calls).toEqual([PRIMARY_MODEL]);
  });
});

describe("POST /api/generate-plan handler end-to-end contract", () => {
  const originalEnv = process.env.GEMINI_API_KEY;

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.GEMINI_API_KEY = originalEnv;
    } else {
      delete process.env.GEMINI_API_KEY;
    }
    vi.restoreAllMocks();
  });

  const testEventPayload = {
    event: {
      id: "evt-test-101",
      name: "Elegant Garden Wedding",
      type: "wedding" as const,
      date: "2027-05-15",
      location: "Bhimavaram, Andhra Pradesh, India",
      guestCount: 200,
      budget: 200000,
      currency: "INR" as const,
      themePreference: "Traditional with modern elegance",
      requirements: "",
      createdAt: "2026-11-01T15:00:00.000Z",
      updatedAt: "2026-11-01T15:00:00.000Z",
    },
  };

  it("returns demo plan with isDemo: true and generatedBy: 'demo' when no API key exists", async () => {
    delete process.env.GEMINI_API_KEY;

    const req = new NextRequest("http://localhost:3000/api/generate-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testEventPayload),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.isDemo).toBe(true);
    expect(data.generatedBy).toBe("demo");
    expect(data.plan).toBeDefined();
    expect(data.plan.summary.length).toBeGreaterThan(0);
  });

  it("rejects invalid request payloads with 400", async () => {
    const req = new NextRequest("http://localhost:3000/api/generate-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: { name: "" } }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid request");
  });

  it("enforces in-memory rate limiting and returns 429 when threshold exceeded", async () => {
    rateLimitMap.clear();
    const testIp = "192.168.1.100";

    // Simulate MAX_REQUESTS_PER_WINDOW requests
    for (let i = 0; i < MAX_REQUESTS_PER_WINDOW; i++) {
      const allowed = checkRateLimit(testIp);
      expect(allowed.allowed).toBe(true);
    }

    // Next request from same IP must be blocked
    const blocked = checkRateLimit(testIp);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);

    // POST endpoint returns 429
    const req = new NextRequest("http://localhost:3000/api/generate-plan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": testIp,
      },
      body: JSON.stringify(testEventPayload),
    });

    const res = await POST(req);
    expect(res.status).toBe(429);
    const data = await res.json();
    expect(data.error).toBe("Rate Limit Exceeded");
    expect(res.headers.get("Retry-After")).toBeDefined();

    rateLimitMap.clear();
  });
});
