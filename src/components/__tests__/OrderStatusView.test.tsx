// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import OrderStatusView from "../OrderStatusView";

const mockFetch = vi.fn();

const PAID_ORDER = {
  publicOrderId: "VIR-ABC123",
  status: "paid",
  currency: "USD",
  subtotalAmount: 3250,
  items: [
    {
      productName: "Noir Gold Sneaker",
      productImage: "https://example.com/img.jpg",
      unitAmount: 3250,
      currency: "USD",
      quantity: 1,
      lineTotal: 3250,
    },
  ],
  createdAt: "2024-01-01T00:00:00.000Z",
};

describe("OrderStatusView", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
    mockFetch.mockReset();
  });

  it("shows loading spinner initially", () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    const { container } = render(<OrderStatusView publicOrderId="VIR-ABC123" />);
    const spinner = container.querySelector("svg.animate-spin");
    expect(spinner).toBeTruthy();
  });

  it("shows 'ORDER CONFIRMED' for paid status", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(PAID_ORDER),
    });

    render(<OrderStatusView publicOrderId="VIR-ABC123" />);

    await waitFor(() => {
      const nodes = screen.getAllByText("ORDER CONFIRMED");
      expect(nodes.length).toBeGreaterThan(0);
    });
  });

  it("shows confirmation ID for paid order", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(PAID_ORDER),
    });

    render(<OrderStatusView publicOrderId="VIR-ABC123" />);

    await waitFor(() => {
      expect(screen.getByText(/VIR-ABC123/)).toBeInTheDocument();
    });
  });

  it("shows 'PAYMENT FAILED' for payment_failed status", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ...PAID_ORDER, status: "payment_failed" }),
    });

    render(<OrderStatusView publicOrderId="VIR-ABC123" />);

    await waitFor(() => {
      const nodes = screen.getAllByText("PAYMENT FAILED");
      expect(nodes.length).toBeGreaterThan(0);
    });
  });

  it("shows Try Again link for payment_failed", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ...PAID_ORDER, status: "payment_failed" }),
    });

    render(<OrderStatusView publicOrderId="VIR-ABC123" />);

    await waitFor(() => {
      expect(screen.getByText("Try Again")).toBeInTheDocument();
    });
  });

  it("shows error on fetch failure", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    render(<OrderStatusView publicOrderId="VIR-ABC123" />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load order status")).toBeInTheDocument();
    });
  });

  it("shows error for 404 response", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404 });

    render(<OrderStatusView publicOrderId="VIR-NOTFOUND" />);

    await waitFor(() => {
      expect(screen.getByText("Order not found")).toBeInTheDocument();
    });
  });

  it("shows 'PROCESSING PAYMENT' for payment_processing status", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ...PAID_ORDER, status: "payment_processing" }),
    });

    render(<OrderStatusView publicOrderId="VIR-ABC123" />);

    await waitFor(() => {
      const nodes = screen.getAllByText("PROCESSING PAYMENT");
      expect(nodes.length).toBeGreaterThan(0);
    });
  });

  it("shows slow processing warning after 15s", async () => {
    vi.useFakeTimers();

    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ ...PAID_ORDER, status: "payment_processing" }),
      })
    );

    render(<OrderStatusView publicOrderId="VIR-ABC123" />);

    // Flush the fetch microtask
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    // Now advance to trigger the 15s slow timer
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15000);
    });

    expect(screen.getByText(/taking longer than usual/)).toBeInTheDocument();

    vi.useRealTimers();
  });

  it("shows order items", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(PAID_ORDER),
    });

    render(<OrderStatusView publicOrderId="VIR-ABC123" />);

    await waitFor(() => {
      expect(screen.getByText("Noir Gold Sneaker")).toBeInTheDocument();
      expect(screen.getByText("Qty: 1")).toBeInTheDocument();
    });
  });
});
