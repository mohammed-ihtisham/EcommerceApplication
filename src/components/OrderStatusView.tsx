"use client";

import { useEffect, useState, useRef } from "react";
import StatusBadge from "./StatusBadge";
import { formatMoney } from "@/lib/money";

interface OrderData {
  publicOrderId: string;
  status: string;
  currency: string;
  subtotalAmount: number;
  items: {
    productName: string;
    productImage: string;
    unitAmount: number;
    currency: string;
    quantity: number;
    lineTotal: number;
  }[];
  createdAt: string;
}

const STATUS_MESSAGES: Record<string, { title: string; subtitle: string; description: string }> = {
  paid: {
    title: "ORDER CONFIRMED",
    subtitle: "Thank you! Your order has been placed successfully.",
    description: "A confirmation email has been sent to the email address provided during checkout. If you have any questions, please contact us at support@virellio.com.",
  },
  payment_processing: {
    title: "PROCESSING PAYMENT",
    subtitle: "We are securely processing your transaction.",
    description: "Please do not refresh or close this page. A confirmation email will be sent to you as soon as the payment clears.",
  },
  payment_failed: {
    title: "PAYMENT FAILED",
    subtitle: "We couldn't complete your transaction.",
    description: "No charges were made. Please try placing your order again with a different payment method.",
  },
  fraud_rejected: {
    title: "PAYMENT REJECTED",
    subtitle: "Your payment was declined.",
    description: "For your security, this transaction was rejected. Please contact your bank or try an alternative payment method.",
  },
  pending_payment: {
    title: "PENDING PAYMENT",
    subtitle: "Waiting for payment authorization.",
    description: "Your order is created and we are waiting for the payment provider to authorize the transaction.",
  }
};

export default function OrderStatusView({ publicOrderId }: { publicOrderId: string }) {
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [slowProcessing, setSlowProcessing] = useState(false);
  const [downloadingReceipt, setDownloadingReceipt] = useState(false);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const slowTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchOrder() {
      try {
        const res = await fetch(`/api/orders/${publicOrderId}`);
        if (!res.ok) {
          setError("Order not found");
          setLoading(false);
          return;
        }
        const data = await res.json();
        if (cancelled) return;

        setOrder(data);
        setLoading(false);

        // Poll if still processing
        if (data.status === "payment_processing" || data.status === "pending_payment") {
          pollRef.current = setTimeout(fetchOrder, 5000);
        }
      } catch {
        if (!cancelled) {
          setError("Failed to load order status");
          setLoading(false);
        }
      }
    }

    fetchOrder();

    // Show slow processing message after 15s
    slowTimerRef.current = setTimeout(() => {
      if (!cancelled) setSlowProcessing(true);
    }, 15000);

    return () => {
      cancelled = true;
      if (pollRef.current) clearTimeout(pollRef.current);
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    };
  }, [publicOrderId]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[#FCFCFC]">
        <svg className="h-6 w-6 animate-spin text-gray-400" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center bg-[#FCFCFC] text-center px-6">
        <p className="text-[13px] text-gray-500">{error || "Order not found"}</p>
        <a href="/" className="mt-6 text-[11px] font-medium uppercase tracking-widest text-gray-900 underline underline-offset-4">
          Back to shop
        </a>
      </div>
    );
  }

  const statusInfo = STATUS_MESSAGES[order.status] || {
    title: "ORDER STATUS",
    subtitle: "Viewing order details.",
    description: "If you have any questions regarding your order, please contact our support team."
  };
  
  const isProcessing = order.status === "payment_processing" || order.status === "pending_payment";
  const formattedDate = new Date(order.createdAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
  });

  async function handleDownloadReceipt() {
    if (!order || downloadingReceipt) return;

    setDownloadingReceipt(true);
    try {
      const [{ jsPDF }] = await Promise.all([import("jspdf")]);
      const doc = new jsPDF({ unit: "pt", format: "a4" });

      const pageWidth = doc.internal.pageSize.getWidth();
      const marginX = 48;
      let y = 56;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("Receipt", marginX, y);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      y += 18;
      doc.text("Virellio", marginX, y);

      doc.setFontSize(10);
      doc.text(`Order: #${order.publicOrderId}`, pageWidth - marginX, 56, { align: "right" });
      doc.text(`Placed on: ${formattedDate}`, pageWidth - marginX, 72, { align: "right" });
      doc.text(`Status: ${order.status.replaceAll("_", " ")}`, pageWidth - marginX, 88, { align: "right" });

      y += 22;
      doc.setDrawColor(230);
      doc.line(marginX, y, pageWidth - marginX, y);
      y += 22;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("Order Summary", marginX, y);
      y += 18;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);

      const colQtyX = pageWidth - marginX - 120;
      const colTotalX = pageWidth - marginX;
      const lineHeight = 14;

      for (const item of order.items) {
        if (y > 760) {
          doc.addPage();
          y = 56;
        }

        const nameLines = doc.splitTextToSize(item.productName, colQtyX - marginX - 12);
        doc.text(nameLines, marginX, y);

        doc.text(`Qty: ${item.quantity}`, colQtyX, y, { align: "left" });
        doc.text(formatMoney(item.lineTotal, item.currency), colTotalX, y, { align: "right" });

        y += Math.max(lineHeight, nameLines.length * lineHeight) + 8;
        doc.setDrawColor(245);
        doc.line(marginX, y - 6, pageWidth - marginX, y - 6);
      }

      const taxAmount = 0;
      const shippingLabel = "Free";
      const totalAmount = order.subtotalAmount;

      y += 10;
      if (y > 760) {
        doc.addPage();
        y = 56;
      }

      const labelX = pageWidth - marginX - 180;
      const valueX = pageWidth - marginX;

      doc.setFont("helvetica", "normal");
      doc.text("Subtotal", labelX, y, { align: "left" });
      doc.text(formatMoney(order.subtotalAmount, order.currency), valueX, y, { align: "right" });
      y += 16;

      doc.text("Shipping", labelX, y, { align: "left" });
      doc.text(shippingLabel, valueX, y, { align: "right" });
      y += 16;

      doc.text("Tax", labelX, y, { align: "left" });
      doc.text(formatMoney(taxAmount, order.currency), valueX, y, { align: "right" });
      y += 18;

      doc.setDrawColor(230);
      doc.line(labelX, y, valueX, y);
      y += 18;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Total", labelX, y, { align: "left" });
      doc.text(formatMoney(totalAmount, order.currency), valueX, y, { align: "right" });

      doc.save(`receipt-${order.publicOrderId}.pdf`);
    } finally {
      setDownloadingReceipt(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#FCFCFC] font-sans">
      <div className="mx-auto max-w-[1200px] px-6 py-12 lg:px-10 lg:py-16">
        
        {/* Breadcrumbs */}
        <div className="mb-12 flex items-center gap-3 text-[10px] font-medium uppercase tracking-[0.2em] text-gray-400">
          <a href="/shop" className="transition-colors hover:text-gray-900">Shop</a>
          <span>&gt;</span>
          <span className="text-gray-900">{statusInfo.title}</span>
        </div>

        <div className="grid grid-cols-1 gap-16 lg:grid-cols-12 lg:gap-24">
          
          {/* LEFT COLUMN: Order Status & Details */}
          <div className="lg:col-span-7">
            
            {/* Header Messaging */}
            <div className="mb-12">
              <h1 className="font-serif text-3xl tracking-wide text-gray-900 sm:text-[34px] uppercase">
                {statusInfo.title}
              </h1>
              <p className="mt-6 text-[15px] text-gray-900">
                {statusInfo.subtitle}
              </p>
              <p className="mt-4 text-[13px] leading-relaxed text-gray-500 max-w-[540px]">
                {statusInfo.description}
              </p>
              
              {isProcessing && slowProcessing && (
                <p className="mt-4 text-[12px] text-amber-600 bg-amber-50 p-3 rounded-sm inline-block">
                  This is taking longer than usual. Your payment may still complete.
                </p>
              )}
              
              {(order.status === "payment_failed" || order.status === "fraud_rejected") && (
                <div className="mt-8">
                  <a
                    href="/checkout"
                    className="inline-flex items-center justify-center bg-[#1A1A1A] px-8 py-4 text-[11px] font-medium uppercase tracking-[0.15em] text-white transition-colors hover:bg-black"
                  >
                    Try Again
                  </a>
                </div>
              )}
            </div>

            {/* Information Blocks */}
            <div className="space-y-10">
              {/* Order Information */}
              <div>
                <h3 className="mb-5 text-[11px] font-medium uppercase tracking-[0.15em] text-gray-900">
                  Order Information
                </h3>
                <div className="border border-gray-100 bg-white p-6 space-y-4">
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-gray-500">Order</span>
                    <span className="font-medium text-gray-900">#{order.publicOrderId}</span>
                  </div>
                  <div className="h-px w-full bg-gray-50" />
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-gray-500">Placed on</span>
                    <span className="text-gray-900">{formattedDate}</span>
                  </div>
                  <div className="h-px w-full bg-gray-50" />
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-gray-500">Status</span>
                    <span className="text-gray-900 capitalize flex items-center gap-2">
                      <StatusBadge status={order.status} />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Order Summary */}
          <div className="lg:col-span-5">
            <div className="sticky top-10">
              <div className="mb-5 flex items-center justify-between gap-4">
                <h3 className="text-[11px] font-medium uppercase tracking-[0.15em] text-gray-900">
                  Order Summary
                </h3>
                <button
                  type="button"
                  onClick={handleDownloadReceipt}
                  disabled={downloadingReceipt}
                  className="shrink-0 text-[10px] font-medium uppercase tracking-[0.2em] text-gray-900 underline underline-offset-4 disabled:opacity-50"
                >
                  {downloadingReceipt ? "Preparing..." : "Download receipt"}
                </button>
              </div>
              
              <div className="space-y-6">
                {order.items.map((item, i) => (
                  <div key={i} className="flex gap-5">
                    <div className="relative h-[88px] w-[88px] shrink-0 bg-[#F4F4F4]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.productImage}
                        alt={item.productName}
                        className="absolute inset-0 h-full w-full object-contain p-2 mix-blend-multiply"
                      />
                    </div>
                    
                    <div className="flex flex-1 flex-col justify-between py-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="truncate text-[13px] text-gray-900">{item.productName}</p>
                          <p className="mt-1 text-[12px] text-gray-500">
                            Qty: {item.quantity}
                          </p>
                        </div>
                        <span className="text-[13px] text-gray-900">
                          {formatMoney(item.lineTotal, item.currency)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-10 border-t border-gray-100 pt-6">
                <div className="space-y-3 text-[13px] text-gray-600">
                  <div className="flex items-center justify-between">
                    <span>Subtotal</span>
                    <span className="text-gray-900">{formatMoney(order.subtotalAmount, order.currency)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Shipping</span>
                    <span className="text-gray-900">Free</span>
                  </div>
                  {/* Tax placeholder to match visual design */}
                  <div className="flex items-center justify-between">
                    <span>Tax</span>
                    <span className="text-gray-900">{formatMoney(0, order.currency)}</span>
                  </div>
                </div>

                <div className="mt-8 flex items-baseline justify-between">
                  <span className="text-[17px] text-gray-900">Total</span>
                  <span className="text-[19px] text-gray-900">
                    {formatMoney(order.subtotalAmount, order.currency)}
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}