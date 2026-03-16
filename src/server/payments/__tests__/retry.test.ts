import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { retryWithBackoff } from "../retry";

describe("retryWithBackoff", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns immediately when shouldRetry returns false", async () => {
    const fn = vi.fn().mockResolvedValue({ ok: true });
    const result = await retryWithBackoff(fn, {
      shouldRetry: () => false,
    });
    expect(result).toEqual({ ok: true });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries when shouldRetry returns true", async () => {
    const fn = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, retryable: true })
      .mockResolvedValueOnce({ ok: false, retryable: true })
      .mockResolvedValueOnce({ ok: true });

    const promise = retryWithBackoff(fn, {
      shouldRetry: (r: { ok: boolean }) => !r.ok,
      maxRetries: 3,
      baseDelayMs: 100,
    });

    // Advance past delays
    await vi.advanceTimersByTimeAsync(10000);

    const result = await promise;
    expect(result).toEqual({ ok: true });
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("returns last result when max retries exhausted", async () => {
    const fn = vi.fn().mockResolvedValue({ ok: false });

    const promise = retryWithBackoff(fn, {
      shouldRetry: () => true,
      maxRetries: 2,
      baseDelayMs: 100,
    });

    await vi.advanceTimersByTimeAsync(10000);

    const result = await promise;
    expect(result).toEqual({ ok: false });
    // 1 initial + 2 retries = 3
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("calls onRetry with correct arguments", async () => {
    const onRetry = vi.fn();
    const fn = vi
      .fn()
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: true });

    const promise = retryWithBackoff(fn, {
      shouldRetry: (r: { ok: boolean }) => !r.ok,
      maxRetries: 3,
      baseDelayMs: 100,
      onRetry,
    });

    await vi.advanceTimersByTimeAsync(10000);
    await promise;

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(1, { ok: false });
  });

  it("respects maxRetries: 0 (no retries)", async () => {
    const fn = vi.fn().mockResolvedValue({ ok: false });

    const result = await retryWithBackoff(fn, {
      shouldRetry: () => true,
      maxRetries: 0,
    });

    expect(result).toEqual({ ok: false });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("defaults maxRetries to 3", async () => {
    const fn = vi.fn().mockResolvedValue({ ok: false });

    const promise = retryWithBackoff(fn, {
      shouldRetry: () => true,
      baseDelayMs: 10,
    });

    await vi.advanceTimersByTimeAsync(100000);
    await promise;

    // 1 initial + 3 retries = 4
    expect(fn).toHaveBeenCalledTimes(4);
  });
});
