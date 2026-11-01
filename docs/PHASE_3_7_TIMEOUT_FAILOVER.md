# EventPilot AI — Phase 3.7: Timeout-Aware Gemini Failover Report

**Date:** 2026-11-01  
**Workspace:** `C:\Users\pavan\.gemini\antigravity\scratch\eventpilot-ai`  
**Evaluation Standard:** AI Evaluation Workflow / Security Auditor / Systematic Debugging / Lint & Validate  

---

## 1. Executive Summary

Phase 3.7 upgrades EventPilot AI's model resilience architecture with **timeout-aware failover**. Previously, model fallback was strictly gated on `HTTP 503 UNAVAILABLE`, causing requests where the primary model hung or queued upstream to exceed the global 30-second budget and fail with `HTTP 504 Gateway Timeout` without attempting the fallback model.

Under Phase 3.7:
1. **Primary Timeout Budget:** Bounded to **12 seconds** (`PRIMARY_TIMEOUT_MS = 12_000`).
2. **Fallback Timeout Budget:** Bounded to **18 seconds** (`FALLBACK_TIMEOUT_MS = 18_000`).
3. **Failover Eligibility:** Fallback to `gemini-3.6-flash` is triggered on:
   - `HTTP 503 UNAVAILABLE` (upstream demand spikes).
   - Primary `AbortError` / timeout (when primary takes $\ge 12$ seconds).
   - Upstream deadline exceeded / transient network timeouts (`ETIMEDOUT`, `ECONNRESET`, `DEADLINE_EXCEEDED`).
4. **Fail-Fast Guards:** Non-transient errors (`400 Bad Request`, `401/403 Auth/Permissions`, `429 Rate Limit`, or Zod validation errors) do **not** trigger fallback.
5. **Bounded Execution:** Maximum one attempt per model with a short jitter backoff (300–600ms), ensuring total request duration never hangs or exceeds $\approx 30.5$ seconds.

---

## 2. Exact Code Changes

### A. Route Implementation (`app/api/generate-plan/route.ts`)
- **Timeout Constants:**
  ```ts
  export const PRIMARY_TIMEOUT_MS = 12_000;
  export const FALLBACK_TIMEOUT_MS = 18_000;
  ```
- **Error Classifier (`parseUpstreamError`):**
  - Identifies timeouts from `AbortController`, `DEADLINE_EXCEEDED`, and network socket hang-ups.
  - Distinguishes network/transient timeouts (`isTimeout` / `isNetworkTimeout`) from schema errors (`isSchemaError`) and rate limits (`isRateLimit`).
- **Eligibility Helper (`isEligibleForFallback`):**
  ```ts
  export function isEligibleForFallback(details: UpstreamErrorDetails): boolean {
    if (details.isAuth || details.isRateLimit || details.status === 400 || details.isSchemaError) {
      return false;
    }
    return details.isUnavailable || details.isTimeout || details.isNetworkTimeout;
  }
  ```
- **Timeout-Aware Invoker (`callSingleModel`):**
  - Accepts `timeoutMs` parameter (`PRIMARY_TIMEOUT_MS` or `FALLBACK_TIMEOUT_MS`).
  - Passes `AbortSignal` to `@google/genai` request config.
  - Clears timers deterministically; attaches `isTimeout: true` to abort exceptions.
- **Failover Orchestrator (`generatePlanWithFallback`):**
  - Executes `gemini-3.8-flash` with 12s budget.
  - On eligible failure (503, timeout, network drop), applies bounded jitter delay (300–600ms) and calls `gemini-3.6-flash` with 18s budget.
  - Returns `modelUsed` (`"gemini-3.8-flash"` or `"gemini-3.6-flash"`).
  - If both models fail, returns appropriate `HTTP 503` or `HTTP 504`.

### B. UI Layer (`components/tabs/AIAssistantTab.tsx`)
- Explicitly catches `HTTP 504` in addition to `HTTP 503`, `429`, and `403`.
- Displays an accessible alert banner (`role="alert"`):
  > *"The AI generation request timed out. Your event details are safely preserved — please click Retry to try again."*
- Preserves all entered event data in the client store; keeps manual retry enabled.

### C. Test Suite (`__tests__/model-resilience.test.ts`)
- Added tests verifying:
  - Primary timeout (`isTimeout: true`) triggers fallback to `gemini-3.6-flash`.
  - Primary network timeout (`ETIMEDOUT`) triggers fallback to `gemini-3.6-flash`.
  - Both models timing out cleanly returns `HTTP 504`.
  - Both models returning 503 cleanly returns `HTTP 503`.

---

## 3. Automated Test Results

Ran `vitest` unit and integration test suite:

```
> eventpilot-ai@0.1.0 test
> vitest run

 ✓ __tests__/budget.test.ts (23 tests)
 ✓ __tests__/api-contract.test.ts (17 tests)
 ✓ __tests__/timeline.test.ts (25 tests)
 ✓ __tests__/model-resilience.test.ts (22 tests)

 Test Files  4 passed (4)
      Tests  87 passed (87)
```

**Quality Audit:**
- `npx tsc --noEmit`: 0 errors (clean)
- `npm run lint`: 0 errors / 0 warnings (clean)
- `npm run build`: Next.js production build succeeded with Turbopack in 488ms

---

## 4. Live Verification Result

Exactly one genuine request was sent through `POST http://localhost:3000/api/generate-plan`:

- **Event:** Elegant Garden Wedding (Bhimavaram, Andhra Pradesh, India; 200 guests; Budget ₹200,000 INR; Traditional with modern elegance).
- **Execution Telemetry:**
  - **Latency:** `13,894 ms` (13.89s total round-trip).
  - **Primary Model Attempt:** `gemini-3.8-flash` was given its 12s budget. Upstream Google servers did not respond within 12s, triggering an `AbortError`.
  - **Failover Trigger:** Primary timeout was correctly detected as eligible for fallback. Jitter delay was applied (~400ms).
  - **Fallback Model Attempt:** `gemini-3.6-flash` was invoked at $t \approx 12.4\text{s}$.
  - **Upstream Response:** Upstream Google API for `gemini-3.6-flash` returned `HTTP 503 UNAVAILABLE` (*"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later."*).
  - **HTTP Status Code:** `HTTP 503 Server Unavailable`.
  - **Response Payload:** `{"error":"Service Unavailable","message":"The AI service is currently experiencing high demand. Please try again in a few moments."}`.
- **Failover Validation:**
  - The timeout-aware failover activated as designed: when primary timed out at 12s, the route did **not** hang for 30s or fail with 504. It seamlessly fell over to `gemini-3.6-flash`.
  - Because Google's upstream API returned 503 on the fallback model as well, the application stopped cleanly per instructions (*"If both models fail, stop and document the upstream issue. Do not run independent model probes or repeated generation attempts"*).

---

## 5. UI Verification Result

- Next.js application running at `http://localhost:3000`.
- In `AIAssistantTab`:
  - The HTTP 503 error is caught and rendered in the alert banner with `role="alert"`.
  - No synthetic demo data was substituted; data authenticity was strictly preserved.
  - Event details (name, date, location, guest count, budget, theme) remain intact in the client store.
  - The "Generate AI Plan" / retry button remains fully responsive for manual re-invocation.

---

## 6. Summary of Resilience Model

| Parameter | Primary (`gemini-3.8-flash`) | Fallback (`gemini-3.6-flash`) |
|---|---|---|
| **Timeout Budget** | 12 seconds | 18 seconds |
| **Trigger Conditions** | Initial attempt | Primary 503, primary timeout, or network timeout |
| **Max Attempts** | 1 | 1 |
| **Backoff Delay** | N/A | 300–600ms with jitter |
| **Total Max Budget** | $\le 12\text{s}$ | $\le 18\text{s}$ (Total $\le 30.5\text{s}$) |

---

## 7. Remaining Blockers

1. **Google Upstream Gemini API Capacity:**
   - Both `gemini-3.8-flash` (latency queue / hang) and `gemini-3.6-flash` (HTTP 503 high demand spike) were experiencing upstream capacity constraints during this test run.
   - The application failover and timeout mechanisms are verified by automated tests and live execution.
2. **Deployment Gate:**
   - As per project guidelines, deployment remains on hold until upstream capacity clears and an actual Gemini-generated plan is visually confirmed in the UI.

