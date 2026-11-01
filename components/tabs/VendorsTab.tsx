"use client";
import { useState } from "react";
import { useAppStore } from "@/store/appStore";
import { bookingStatusColor, bookingStatusLabel, formatCurrency } from "@/lib/utils";
import { BookingStatus } from "@/lib/schemas";
import Modal from "@/components/ui/Modal";
import {
  Plus,
  Users,
  Trash2,
  ChevronDown,
  ChevronUp,
  Phone,
  Check,
} from "lucide-react";

const BOOKING_STATUSES: BookingStatus[] = [
  "not_contacted",
  "contacted",
  "quote_received",
  "booked",
  "cancelled",
];

export default function VendorsTab() {
  const { currentPlan, addVendor, updateVendorStatus, updateVendor, deleteVendor, toggleVendorChecklistItem } =
    useAppStore();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newVendor, setNewVendor] = useState({
    name: "",
    category: "",
    estimatedCost: "",
    contactNotes: "",
  });

  if (!currentPlan) {
    return <div className="text-center py-20" style={{ color: "var(--muted-foreground)" }}>No event selected.</div>;
  }

  if (currentPlan.vendors.length === 0) {
    return <EmptyVendors onAdd={() => setShowAddForm(true)} showAddForm={showAddForm} setShowAddForm={setShowAddForm} newVendor={newVendor} setNewVendor={setNewVendor} onSubmit={handleAdd} />;
  }

  function handleAdd() {
    if (!newVendor.name.trim() || !newVendor.category.trim()) return;
    addVendor({
      name: newVendor.name.trim(),
      category: newVendor.category.trim(),
      estimatedCost: parseFloat(newVendor.estimatedCost) || 0,
      contactNotes: newVendor.contactNotes.trim(),
      bookingStatus: "not_contacted",
      checklistItems: [],
    });
    setNewVendor({ name: "", category: "", estimatedCost: "", contactNotes: "" });
    setShowAddForm(false);
  }

  const byCategory = currentPlan.vendors.reduce(
    (acc, v) => {
      if (!acc[v.category]) acc[v.category] = [];
      acc[v.category].push(v);
      return acc;
    },
    {} as Record<string, typeof currentPlan.vendors>
  );

  const totalEstimated = currentPlan.vendors.reduce((s, v) => s + v.estimatedCost, 0);
  const bookedCount = currentPlan.vendors.filter((v) => v.bookingStatus === "booked").length;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2
            className="text-2xl font-bold mb-2"
            style={{ fontFamily: "'Playfair Display', serif", color: "var(--foreground)" }}
          >
            Vendor Manager
          </h2>
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            Track vendors across categories. Vendor names shown here are not verified or endorsed.
          </p>
        </div>
        <button
          onClick={() => setShowAddForm((s) => !s)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium flex-shrink-0"
          style={{ background: "var(--primary)", color: "white" }}
          aria-expanded={showAddForm}
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          Add Vendor
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl p-4 text-center" style={{ background: "white", border: "1px solid var(--border)" }}>
          <p className="text-xl font-bold" style={{ color: "var(--foreground)" }}>{currentPlan.vendors.length}</p>
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>Total Vendors</p>
        </div>
        <div className="rounded-xl p-4 text-center" style={{ background: "white", border: "1px solid var(--border)" }}>
          <p className="text-xl font-bold" style={{ color: "var(--success)" }}>{bookedCount}</p>
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>Booked</p>
        </div>
        <div className="rounded-xl p-4 text-center" style={{ background: "white", border: "1px solid var(--border)" }}>
          <p className="text-xl font-bold" style={{ color: "var(--primary)" }}>
            {formatCurrency(totalEstimated, currentPlan.event.currency)}
          </p>
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>Est. Total Cost</p>
        </div>
      </div>

      {/* Add vendor form */}
      {/* Accessible Add Vendor Modal with Focus Trap */}
      <Modal
        isOpen={showAddForm}
        onClose={() => setShowAddForm(false)}
        title="Add New Vendor"
        description="Track vendor candidates, estimates, and booking milestones."
        maxWidth="lg"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAdd();
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="v-name"
                className="block text-xs font-semibold mb-1"
                style={{ color: "var(--foreground)" }}
              >
                Vendor Name *
              </label>
              <input
                id="v-name"
                required
                value={newVendor.name}
                onChange={(e) => setNewVendor((v) => ({ ...v, name: e.target.value }))}
                placeholder="e.g. Bloom & Petal Florals"
                className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                style={{ borderColor: "var(--border)", background: "var(--background)", color: "var(--foreground)" }}
              />
            </div>
            <div>
              <label
                htmlFor="v-category"
                className="block text-xs font-semibold mb-1"
                style={{ color: "var(--foreground)" }}
              >
                Category *
              </label>
              <input
                id="v-category"
                required
                value={newVendor.category}
                onChange={(e) => setNewVendor((v) => ({ ...v, category: e.target.value }))}
                placeholder="e.g. Florals, Catering, Photography"
                className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                style={{ borderColor: "var(--border)", background: "var(--background)", color: "var(--foreground)" }}
              />
            </div>
            <div>
              <label
                htmlFor="v-cost"
                className="block text-xs font-semibold mb-1"
                style={{ color: "var(--foreground)" }}
              >
                Estimated Cost
              </label>
              <input
                id="v-cost"
                type="number"
                value={newVendor.estimatedCost}
                onChange={(e) => setNewVendor((v) => ({ ...v, estimatedCost: e.target.value }))}
                placeholder="0"
                min={0}
                className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                style={{ borderColor: "var(--border)", background: "var(--background)", color: "var(--foreground)" }}
              />
            </div>
            <div>
              <label
                htmlFor="v-notes"
                className="block text-xs font-semibold mb-1"
                style={{ color: "var(--foreground)" }}
              >
                Contact Notes
              </label>
              <input
                id="v-notes"
                value={newVendor.contactNotes}
                onChange={(e) => setNewVendor((v) => ({ ...v, contactNotes: e.target.value }))}
                placeholder="Contact info, notes..."
                className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                style={{ borderColor: "var(--border)", background: "var(--background)", color: "var(--foreground)" }}
              />
            </div>
          </div>

          <div
            className="flex justify-end gap-2 pt-3 border-t"
            style={{ borderColor: "var(--border)" }}
          >
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
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
              Add Vendor
            </button>
          </div>
        </form>
      </Modal>

      {/* Vendor list grouped by category */}
      <div className="space-y-6">
        {Object.entries(byCategory).map(([category, vendors]) => (
          <div key={category}>
            <h3 className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: "var(--muted-foreground)" }}>
              {category} ({vendors.length})
            </h3>
            <div className="space-y-3">
              {vendors.map((vendor) => (
                <div
                  key={vendor.id}
                  className="rounded-xl overflow-hidden"
                  style={{ border: "1px solid var(--border)", background: "white" }}
                >
                  {/* Vendor header */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                          {vendor.name}
                        </p>
                        {vendor.name.startsWith("[Add") && (
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}>
                            Suggested — fill in your vendor
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                          {formatCurrency(vendor.estimatedCost, currentPlan.event.currency)}
                        </span>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{
                            background:
                              vendor.bookingStatus === "booked"
                                ? "#dcfce7"
                                : vendor.bookingStatus === "cancelled"
                                ? "#fee2e2"
                                : "var(--muted)",
                            color:
                              vendor.bookingStatus === "booked"
                                ? "var(--success)"
                                : vendor.bookingStatus === "cancelled"
                                ? "var(--destructive)"
                                : "var(--muted-foreground)",
                          }}
                        >
                          {bookingStatusLabel(vendor.bookingStatus)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <select
                        value={vendor.bookingStatus}
                        onChange={(e) => updateVendorStatus(vendor.id, e.target.value as BookingStatus)}
                        className="text-xs px-2 py-1.5 rounded-lg"
                        style={{ border: "1px solid var(--border)", outline: "none" }}
                        aria-label={`Booking status for ${vendor.name}`}
                      >
                        {BOOKING_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {bookingStatusLabel(s)}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => setExpanded(expanded === vendor.id ? null : vendor.id)}
                        className="p-1.5 rounded-lg ml-1"
                        style={{ color: "var(--muted-foreground)" }}
                        aria-label={expanded === vendor.id ? `Collapse ${vendor.name}` : `Expand ${vendor.name}`}
                        aria-expanded={expanded === vendor.id}
                      >
                        {expanded === vendor.id ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => deleteVendor(vendor.id)}
                        className="p-1.5 rounded-lg"
                        style={{ color: "var(--destructive)" }}
                        aria-label={`Delete ${vendor.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {expanded === vendor.id && (
                    <div
                      className="px-4 pb-4 border-t space-y-3"
                      style={{ borderColor: "var(--border)" }}
                    >
                      {vendor.contactNotes && (
                        <div className="mt-3">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Phone className="w-3 h-3" style={{ color: "var(--muted-foreground)" }} aria-hidden="true" />
                            <span className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>Contact Notes</span>
                          </div>
                          <p className="text-sm" style={{ color: "var(--foreground)" }}>{vendor.contactNotes}</p>
                        </div>
                      )}
                      {vendor.checklistItems && vendor.checklistItems.length > 0 && (
                        <div>
                          <p className="text-xs font-medium mb-2" style={{ color: "var(--muted-foreground)" }}>Checklist</p>
                          <div className="space-y-1">
                            {vendor.checklistItems.map((item) => (
                              <div key={item} className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded border flex items-center justify-center" style={{ border: "1px solid var(--primary)", background: "var(--accent)" }}>
                                  <div className="w-2 h-2 rounded-full" style={{ background: "var(--primary)" }} />
                                </div>
                                <span className="text-xs" style={{ color: "var(--foreground)" }}>{item}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <p className="text-xs italic" style={{ color: "var(--muted-foreground)" }}>
                        ⚠ Vendor information not verified. Always independently research and confirm vendor details.
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyVendors({ onAdd, showAddForm, setShowAddForm, newVendor, setNewVendor, onSubmit }: {
  onAdd: () => void;
  showAddForm: boolean;
  setShowAddForm: (v: boolean) => void;
  newVendor: { name: string; category: string; estimatedCost: string; contactNotes: string };
  setNewVendor: React.Dispatch<React.SetStateAction<typeof newVendor>>;
  onSubmit: () => void;
}) {
  const { setActiveTab } = useAppStore();
  return (
    <div className="text-center py-20">
      <Users className="w-12 h-12 mx-auto mb-4" style={{ color: "var(--muted-foreground)" }} />
      <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--foreground)" }}>
        No Vendors Yet
      </h3>
      <p className="text-sm mb-6" style={{ color: "var(--muted-foreground)" }}>
        Generate an AI plan to get suggested vendor categories, or add vendors manually.
      </p>
      <div className="flex gap-3 justify-center">
        <button onClick={() => setActiveTab("ai")} className="px-6 py-3 rounded-xl font-medium text-sm" style={{ background: "var(--primary)", color: "white" }}>
          Generate Plan
        </button>
        <button onClick={onAdd} className="px-6 py-3 rounded-xl font-medium text-sm" style={{ background: "white", color: "var(--foreground)", border: "1px solid var(--border)" }}>
          Add Manually
        </button>
      </div>
    </div>
  );
}

