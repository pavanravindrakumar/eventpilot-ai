"use client";
import { useState } from "react";
import { useAppStore } from "@/store/appStore";
import { EventTypeSchema, CurrencySchema } from "@/lib/schemas";
import { eventTypeLabel } from "@/lib/utils";
import { PlusCircle, Sparkles } from "lucide-react";

const EVENT_TYPES = EventTypeSchema.options;
const CURRENCIES = CurrencySchema.options;

type FormData = {
  name: string;
  type: string;
  date: string;
  location: string;
  guestCount: string;
  budget: string;
  currency: string;
  themePreference: string;
  requirements: string;
};

const initialForm: FormData = {
  name: "",
  type: "wedding",
  date: "",
  location: "",
  guestCount: "100",
  budget: "10000",
  currency: "USD",
  themePreference: "",
  requirements: "",
};

type FieldError = Partial<Record<keyof FormData, string>>;

function validateForm(data: FormData): FieldError {
  const errors: FieldError = {};
  if (!data.name.trim()) errors.name = "Event name is required.";
  if (!data.date) errors.date = "Event date is required.";
  else if (new Date(data.date) < new Date()) errors.date = "Event date must be in the future.";
  if (!data.location.trim()) errors.location = "Location is required.";
  const guests = parseInt(data.guestCount);
  if (isNaN(guests) || guests < 1) errors.guestCount = "At least 1 guest required.";
  if (guests > 10000) errors.guestCount = "Maximum 10,000 guests.";
  const budget = parseFloat(data.budget);
  if (isNaN(budget) || budget <= 0) errors.budget = "Budget must be a positive number.";
  return errors;
}

export default function CreateEventTab() {
  const { createEvent, setActiveTab } = useAppStore();
  const [form, setForm] = useState<FormData>(initialForm);
  const [errors, setErrors] = useState<FieldError>({});
  const [submitted, setSubmitted] = useState(false);

  const update = (field: keyof FormData, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fieldErrors = validateForm(form);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      // Focus error summary
      document.getElementById("error-summary")?.focus();
      return;
    }
    createEvent({
      name: form.name.trim(),
      type: form.type as "wedding" | "birthday" | "community" | "custom",
      date: form.date,
      location: form.location.trim(),
      guestCount: parseInt(form.guestCount),
      budget: parseFloat(form.budget),
      currency: form.currency as "USD" | "EUR" | "GBP" | "INR" | "CAD" | "AUD" | "SGD",
      themePreference: form.themePreference.trim(),
      requirements: form.requirements.trim(),
    });
    setSubmitted(true);
    setActiveTab("ai");
  };

  const errorCount = Object.keys(errors).length;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h2
          className="text-2xl font-bold mb-2"
          style={{ fontFamily: "'Playfair Display', serif", color: "var(--foreground)" }}
        >
          Create Your Event
        </h2>
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          Tell us about your celebration and we'll build a personalized plan.
        </p>
      </div>

      {/* Error summary for accessibility */}
      {errorCount > 0 && (
        <div
          id="error-summary"
          tabIndex={-1}
          className="mb-6 p-4 rounded-xl"
          style={{ background: "#fef2f2", border: "1px solid #fca5a5" }}
          role="alert"
          aria-live="assertive"
        >
          <p className="text-sm font-semibold text-red-800 mb-2">
            Please fix {errorCount} error{errorCount > 1 ? "s" : ""}:
          </p>
          <ul className="list-disc list-inside space-y-1">
            {Object.entries(errors).map(([field, msg]) => (
              <li key={field} className="text-sm text-red-700">
                <a href={`#field-${field}`} className="underline">
                  {msg}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* Event Type */}
        <fieldset>
          <legend className="text-sm font-semibold mb-3" style={{ color: "var(--foreground)" }}>
            Event Type <span className="text-red-500" aria-hidden="true">*</span>
          </legend>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {EVENT_TYPES.map((type) => (
              <label
                key={type}
                className="flex flex-col items-center gap-2 p-3 rounded-xl cursor-pointer transition-all"
                style={{
                  background: form.type === type ? "var(--accent)" : "white",
                  border: `2px solid ${form.type === type ? "var(--primary)" : "var(--border)"}`,
                }}
              >
                <input
                  type="radio"
                  name="eventType"
                  value={type}
                  checked={form.type === type}
                  onChange={() => update("type", type)}
                  className="sr-only"
                />
                <span className="text-sm font-medium text-center" style={{ color: form.type === type ? "var(--primary-dark)" : "var(--foreground)" }}>
                  {eventTypeLabel(type)}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Event Name */}
        <Field id="field-name" label="Event Name" required error={errors.name}>
          <input
            id="field-name"
            type="text"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="e.g. Sarah & James Wedding"
            maxLength={100}
            aria-required="true"
            aria-describedby={errors.name ? "field-name-error" : undefined}
            aria-invalid={!!errors.name}
            className="w-full px-3 py-2.5 rounded-lg text-sm"
            style={{
              border: `1px solid ${errors.name ? "var(--destructive)" : "var(--border)"}`,
              background: "white",
              color: "var(--foreground)",
              outline: "none",
            }}
          />
        </Field>

        {/* Date & Location */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field id="field-date" label="Event Date" required error={errors.date}>
            <input
              id="field-date"
              type="date"
              value={form.date}
              onChange={(e) => update("date", e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              aria-required="true"
              aria-invalid={!!errors.date}
              className="w-full px-3 py-2.5 rounded-lg text-sm"
              style={{
                border: `1px solid ${errors.date ? "var(--destructive)" : "var(--border)"}`,
                background: "white",
                color: "var(--foreground)",
                outline: "none",
              }}
            />
          </Field>

          <Field id="field-location" label="Location / Venue" required error={errors.location}>
            <input
              id="field-location"
              type="text"
              value={form.location}
              onChange={(e) => update("location", e.target.value)}
              placeholder="City, Venue Name"
              maxLength={200}
              aria-required="true"
              aria-invalid={!!errors.location}
              className="w-full px-3 py-2.5 rounded-lg text-sm"
              style={{
                border: `1px solid ${errors.location ? "var(--destructive)" : "var(--border)"}`,
                background: "white",
                color: "var(--foreground)",
                outline: "none",
              }}
            />
          </Field>
        </div>

        {/* Guests & Budget */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field id="field-guestCount" label="Guest Count" required error={errors.guestCount}>
            <input
              id="field-guestCount"
              type="number"
              value={form.guestCount}
              onChange={(e) => update("guestCount", e.target.value)}
              min={1}
              max={10000}
              aria-required="true"
              aria-invalid={!!errors.guestCount}
              className="w-full px-3 py-2.5 rounded-lg text-sm"
              style={{
                border: `1px solid ${errors.guestCount ? "var(--destructive)" : "var(--border)"}`,
                background: "white",
                color: "var(--foreground)",
                outline: "none",
              }}
            />
          </Field>

          <Field id="field-budget" label="Total Budget" required error={errors.budget}>
            <input
              id="field-budget"
              type="number"
              value={form.budget}
              onChange={(e) => update("budget", e.target.value)}
              min={1}
              step={100}
              aria-required="true"
              aria-invalid={!!errors.budget}
              className="w-full px-3 py-2.5 rounded-lg text-sm"
              style={{
                border: `1px solid ${errors.budget ? "var(--destructive)" : "var(--border)"}`,
                background: "white",
                color: "var(--foreground)",
                outline: "none",
              }}
            />
          </Field>

          <Field id="field-currency" label="Currency">
            <select
              id="field-currency"
              value={form.currency}
              onChange={(e) => update("currency", e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg text-sm"
              style={{
                border: "1px solid var(--border)",
                background: "white",
                color: "var(--foreground)",
                outline: "none",
              }}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {/* Theme */}
        <Field id="field-themePreference" label="Theme Preference (optional)">
          <input
            id="field-themePreference"
            type="text"
            value={form.themePreference}
            onChange={(e) => update("themePreference", e.target.value)}
            placeholder="e.g. Rustic Garden, Modern Elegance, Tropical Paradise"
            maxLength={500}
            className="w-full px-3 py-2.5 rounded-lg text-sm"
            style={{
              border: "1px solid var(--border)",
              background: "white",
              color: "var(--foreground)",
              outline: "none",
            }}
          />
        </Field>

        {/* Requirements */}
        <Field id="field-requirements" label="Special Requirements (optional)">
          <textarea
            id="field-requirements"
            value={form.requirements}
            onChange={(e) => update("requirements", e.target.value)}
            placeholder="Dietary restrictions, accessibility needs, cultural traditions, etc."
            maxLength={2000}
            rows={3}
            className="w-full px-3 py-2.5 rounded-lg text-sm resize-none"
            style={{
              border: "1px solid var(--border)",
              background: "white",
              color: "var(--foreground)",
              outline: "none",
            }}
          />
        </Field>

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-sm"
            style={{ background: "var(--primary)", color: "white" }}
          >
            <PlusCircle className="w-4 h-4" aria-hidden="true" />
            Create Event
          </button>
          <p className="text-xs self-center" style={{ color: "var(--muted-foreground)" }}>
            AI plan will be generated on the next step
          </p>
        </div>
      </form>
    </div>
  );
}

function Field({
  id,
  label,
  required,
  error,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-medium mb-1.5"
        style={{ color: "var(--foreground)" }}
      >
        {label}
        {required && (
          <span className="text-red-500 ml-1" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children}
      {error && (
        <p
          id={`${id}-error`}
          className="text-xs mt-1"
          style={{ color: "var(--destructive)" }}
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}

