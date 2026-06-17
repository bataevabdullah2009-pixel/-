import { describe, expect, it, vi } from "vitest";
import { logger } from "../apps/bot/src/utils/logger";

describe("logger redaction", () => {
  it("does not print API keys, bearer tokens or secrets", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    logger.info("request Bearer visible-token", {
      apiKey: "api-key-value",
      nested: { authorization: "Bearer nested-token", safe: "ok" }
    });

    const output = String(log.mock.calls[0]?.[0]);
    expect(output).not.toContain("visible-token");
    expect(output).not.toContain("api-key-value");
    expect(output).not.toContain("nested-token");
    expect(output).toContain("[REDACTED]");
    expect(output).toContain("ok");

    log.mockRestore();
  });
});
