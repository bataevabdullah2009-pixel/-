import { describe, expect, it, vi } from "vitest";
import {
  ExternalServiceError,
  getErrorLogMeta,
  logger
} from "../apps/bot/src/utils/logger";

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

  it("redacts secrets inside external response bodies while preserving HTTP diagnostics", () => {
    const error = new ExternalServiceError({
      service: "stt",
      message: "STT request failed.",
      httpStatus: 401,
      responseBody: '{"error":"unauthorized","token":"visible-token","api_key":"visible-key"}'
    });

    const meta = getErrorLogMeta(error);

    expect(meta).toMatchObject({
      errorName: "ExternalServiceError",
      errorMessage: "STT request failed.",
      httpStatus: 401,
      service: "stt"
    });
    expect(meta.responseBody).toContain("unauthorized");
    expect(meta.responseBody).not.toContain("visible-token");
    expect(meta.responseBody).not.toContain("visible-key");
  });

  it("keeps the nested network cause without exposing its credentials", () => {
    const cause = Object.assign(new Error("connect token=hidden"), { code: "ENOTFOUND" });
    const error = new TypeError("fetch failed", { cause });

    expect(getErrorLogMeta(error)).toMatchObject({
      errorName: "TypeError",
      errorMessage: "fetch failed",
      errorCode: "ENOTFOUND",
      causeName: "Error",
      causeMessage: "connect token=[REDACTED]"
    });
  });
});
