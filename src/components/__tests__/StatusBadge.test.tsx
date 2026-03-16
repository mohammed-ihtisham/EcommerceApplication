// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import StatusBadge from "../StatusBadge";

describe("StatusBadge", () => {
  it("renders 'Paid' for paid status", () => {
    render(<StatusBadge status="paid" />);
    expect(screen.getByText("Paid")).toBeInTheDocument();
  });

  it("renders 'Failed' for payment_failed status", () => {
    render(<StatusBadge status="payment_failed" />);
    expect(screen.getByText("Failed")).toBeInTheDocument();
  });

  it("renders 'Processing' for payment_processing status", () => {
    render(<StatusBadge status="payment_processing" />);
    expect(screen.getByText("Processing")).toBeInTheDocument();
  });

  it("renders 'Rejected' for fraud_rejected status", () => {
    render(<StatusBadge status="fraud_rejected" />);
    expect(screen.getByText("Rejected")).toBeInTheDocument();
  });

  it("renders 'Draft' for checkout_draft status", () => {
    render(<StatusBadge status="checkout_draft" />);
    expect(screen.getByText("Draft")).toBeInTheDocument();
  });

  it("renders 'Pending Payment' for pending_payment status", () => {
    render(<StatusBadge status="pending_payment" />);
    expect(screen.getByText("Pending Payment")).toBeInTheDocument();
  });

  it("renders 'Cancelled' for cancelled status", () => {
    render(<StatusBadge status="cancelled" />);
    expect(screen.getByText("Cancelled")).toBeInTheDocument();
  });

  it("renders raw status for unknown status", () => {
    render(<StatusBadge status="something_custom" />);
    expect(screen.getByText("something_custom")).toBeInTheDocument();
  });

  it("applies green classes for paid status", () => {
    render(<StatusBadge status="paid" />);
    const badge = screen.getByText("Paid");
    expect(badge.className).toContain("bg-green-100");
  });

  it("applies red classes for payment_failed status", () => {
    render(<StatusBadge status="payment_failed" />);
    const badge = screen.getByText("Failed");
    expect(badge.className).toContain("bg-red-100");
  });
});
