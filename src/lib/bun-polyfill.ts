import * as fs from "fs";
import * as pathModule from "path";
import * as os from "os";

// Polyfill Bun APIs used by @henrylabs-interview/payments SDK
// The SDK uses Bun.file() and Bun.write() for its internal store.
// When bundled by webpack, import.meta.url resolves to /_next/... paths
// that don't exist on disk, so we redirect storage to a temp directory.

const globalAny = globalThis as Record<string, unknown>;

const STORE_DIR = pathModule.join(os.tmpdir(), "virellio-payment-store");

function resolveStorePath(filePath: string | URL): string {
  const raw = filePath instanceof URL ? filePath.pathname : String(filePath);
  // If the path looks like a webpack-bundled path or doesn't exist in a writable location,
  // redirect to our temp store directory using just the filename
  const basename = pathModule.basename(raw);
  return pathModule.join(STORE_DIR, basename);
}

if (!globalAny.Bun) {
  // Ensure store directory exists synchronously at startup
  try {
    fs.mkdirSync(STORE_DIR, { recursive: true });
  } catch {
    // ignore
  }

  globalAny.Bun = {
    file: (filePath: string | URL) => {
      const resolvedPath = resolveStorePath(filePath);
      return {
        exists: async () => {
          try {
            await fs.promises.access(resolvedPath);
            return true;
          } catch {
            return false;
          }
        },
        text: async () => {
          try {
            return await fs.promises.readFile(resolvedPath, "utf-8");
          } catch {
            return "";
          }
        },
      };
    },
    write: async (filePath: string | URL, content: string) => {
      const resolvedPath = resolveStorePath(filePath);
      await fs.promises.mkdir(pathModule.dirname(resolvedPath), { recursive: true });
      await fs.promises.writeFile(resolvedPath, content, "utf-8");
    },
  };
}
