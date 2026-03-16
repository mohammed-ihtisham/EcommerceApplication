import { vi } from "vitest";

// Set test env vars
process.env.PAYMENT_API_KEY = "test-key-for-tests";
process.env.DATABASE_URL = "file:./test.db";

// Mock logger globally to suppress output
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));
