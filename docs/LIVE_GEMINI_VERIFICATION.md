# EventPilot AI — Live Gemini API Verification Report

**Date:** 2026-11-01  
**Environment:** Local Development (`http://localhost:3000`)  
**Workspace:** `C:\Users\pavan\.gemini\antigravity\scratch\eventpilot-ai`  
**Evaluation Standard:** AI Evaluation Workflow / Security Auditor / Systematic Debugging Protocol  

---

## Executive Summary

A live smoke test was conducted against the `POST /api/generate-plan` endpoint of EventPilot AI to verify end-to-end integration with the Google Gemini API using actual server credentials.

- **Credentials:** Verified present, non-empty, valid format, and unexposed.
- **Request Type:** Exactly one live API request made via the application's actual endpoint.
- **Upstream Result:** Upstream Google Gemini API returned `503 UNAVAILABLE` (*"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later."*).
- **Security Check:** Zero credentials, keys, or internal tokens were leaked or displayed. `.env.local` remains untouched.
- **Verification Conclusion:** **FAIL / BLOCKED BY UPSTREAM CAPACITY (503)**. In accordance with testing constraints, success is not claimed until an actual Gemini response is generated and rendered in the UI. Deployment must remain on hold until capacity clears.

---

## Verification Criteria & Results

| # | Item | Required State | Observed Result | Status |
|---|---|---|---|---|
| 1 | **Key Configuration** | Present, non-empty, not placeholder in `.env.local` | Verified server-side: 53-character key, format `AQ.A...`, non-placeholder | **PASS** |
| 2 | **Security & Masking** | Never log, print, or expose the key | Zero key leaks in logs, stdout, or UI payloads; `.env.local` unmodified | **PASS** |
| 3 | **Model Identifier** | `gemini-3.8-flash` | Configured in `route.ts`; confirmed active in Google GenAI model catalog | **PASS** |
| 4 | **Request Contract** | Matches `GeneratePlanRequestSchema` | Validated by Zod server-side with test payload | **PASS** |
| 5 | **API HTTP Result** | HTTP 200 OK with live generation | `HTTP 500 Internal Server Error` (Wrapping Upstream `503 UNAVAILABLE`) | **FAIL (Upstream)** |
| 6 | **Demo Mode Bypass** | `isDemo === false` | Verified: Server recognized valid key, bypassed demo stub, called Gemini | **PASS** |
| 7 | **Response Latency** | Recorded round-trip time | `22,367 ms` (includes upstream timeouts and internal retry backoff) | **MEASURED** |
| 8 | **Schema Validation** | `AIGeneratedPlanSchema.safeParse` passes | Not evaluated: generation halted prior to receiving response JSON | **N/A** |
| 9 | **UI Integration** | Generated plan rendered on `localhost:3000` | UI rendered error banner cleanly; no false demo data substituted | **OBSERVED** |

---

## Detailed Findings

### 1. Configuration Verification
- **File:** `.env.local` (Last modified: 11/1/2026 8:24:24 PM).
- **Presence:** `process.env.GEMINI_API_KEY` is present.
- **Length:** 53 characters.
- **Integrity Check:** The key prefix conforms to standard Google AI Studio issued developer tokens (`AQ.A...`).
- **Placeholder Check:** Contains no generic placeholders (`your_key`, `CHANGEME`, `AIzaSy...`, `TODO`).

### 2. API Contract & Test Payload
The test request was structured strictly according to `lib/schemas.ts`:
```json
{
  "event": {
    "id": "live-test-bhimavaram-01",
    "name": "Elegant Garden Wedding",
    "type": "wedding",
    "date": "2027-05-15",
    "location": "Bhimavaram, Andhra Pradesh, India",
    "guestCount": 200,
    "budget": 200000,
    "currency": "INR",
    "themePreference": "Traditional with modern elegance",
    "requirements": "Traditional South Indian coastal Andhra wedding with modern elegant decor and local catering",
    "createdAt": "2026-11-01T15:00:00.000Z",
    "updatedAt": "2026-11-01T15:00:00.000Z"
  }
}
```

### 3. Model & Upstream Behavior
- The server route `app/api/generate-plan/route.ts` specifies:
  ```ts
  const MODEL = "gemini-3.8-flash";
  ```
- Direct query to `@google/genai` model registry confirmed `models/gemini-3.8-flash` is the recommended production model. In contrast, invoking `gemini-2.5-flash` returned:
  > *"This model models/gemini-2.5-flash is no longer available to new users. Please update your code to use models/gemini-3.8-flash for the latest features and improvements."*
- During the smoke test, Google's API returned:
  ```json
  {
    "error": {
      "code": 503,
      "message": "This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.",
      "status": "UNAVAILABLE"
    }
  }
  ```
- Next.js server intercepted the upstream 503 across retry attempts and responded with HTTP 500, correctly sanitizing the error payload to prevent credential exposure.

### 4. UI Behavior Verification
- Server running at `http://localhost:3000`.
- In `AIAssistantTab.tsx`, an error response does not crash the application.
- The UI properly displays an alert notice with `role="alert"` informing the user that generation failed.
- The application did **not** silently fall back to `isDemo: true` data when a real key was supplied, preserving data truthfulness.

---

## Remaining Issues & Precise Corrective Actions

1. **Upstream 503 Capacity Spike on `gemini-3.8-flash`**:
   - **Root Cause:** Transient server load on Google's `gemini-3.8-flash` cluster.
   - **Corrective Action:**
     - Add a fallback model configuration or secondary attempt against `gemini-3.5-flash` or `gemini-flash-latest` when receiving a 503 status code from the primary model.
     - Increase jitter on the exponential backoff in `callGeminiWithRetry` (`route.ts`).
     - Provide an explicit "Service temporarily busy, click to retry" button with cooldown in the UI rather than a generic error.

2. **Deployment Gate**:
   - **Status:** **BLOCKED**.
   - As per task requirements, do not deploy until capacity clears and a live, verified plan response is received and rendered in the UI.

