"use client";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  checkout_draft: { label: "Draft", color: "bg-gray-100 text-gray-700" },
  pending_payment: { label: "Pending Payment", color: "bg-yellow-100 text-yellow-800" },
  payment_processing: { label: "Processing", color: "bg-blue-100 text-blue-800" },
  paid: { label: "Paid", color: "bg-green-100 text-green-800" },
  payment_failed: { label: "Failed", color: "bg-red-100 text-red-800" },
  fraud_rejected: { label: "Rejected", color: "bg-red-100 text-red-800" },
  cancelled: { label: "Cancelled", color: "bg-gray-100 text-gray-700" },
};

export default function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    color: "bg-gray-100 text-gray-700",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${config.color}`}
    >
      {config.label}
    </span>
  );
}
