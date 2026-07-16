type LogMeta = Record<string, unknown>;

const SENSITIVE_KEY_PATTERN = /(api[_-]?key|authorization|password|secret|service[_-]?role|token)/i;
const MAX_ERROR_BODY_LENGTH = 2_000;

export class ExternalServiceError extends Error {
  readonly service: string;
  readonly httpStatus: number;
  readonly responseBody: string | null;

  constructor(params: {
    service: string;
    message: string;
    httpStatus: number;
    responseBody?: string | null;
  }) {
    super(params.message);
    this.name = "ExternalServiceError";
    this.service = params.service;
    this.httpStatus = params.httpStatus;
    this.responseBody = params.responseBody ?? null;
  }
}

export function redactSensitiveText(value: string) {
  return value
    .replace(/(bearer\s+)[^\s"']+/gi, "$1[REDACTED]")
    .replace(/((?:api[_-]?key|token|secret|password)=)[^&\s"']+/gi, "$1[REDACTED]")
    .replace(
      /(["']?(?:api[_-]?key|authorization|password|secret|service[_-]?role|token)["']?\s*:\s*["'])[^"']+(["'])/gi,
      "$1[REDACTED]$2"
    );
}

export function formatResponseBodyForLog(value: string) {
  return redactSensitiveText(value).slice(0, MAX_ERROR_BODY_LENGTH);
}

export function formatErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return redactSensitiveText(error.message);
  }

  if (error && typeof error === "object") {
    const source = error as Record<string, unknown>;
    const fields = ["code", "message", "details", "hint"]
      .map((key) => source[key] ? `${key}=${String(source[key])}` : "")
      .filter(Boolean);

    if (fields.length) {
      return redactSensitiveText(fields.join("; "));
    }
  }

  return redactSensitiveText(String(error));
}

function readErrorField(error: unknown, field: string) {
  if (!error || typeof error !== "object") {
    return undefined;
  }

  return (error as Record<string, unknown>)[field];
}

function normalizeHttpStatus(error: unknown) {
  const status = readErrorField(error, "httpStatus") ?? readErrorField(error, "status");
  return typeof status === "number" && Number.isFinite(status) ? status : null;
}

function normalizeResponseBody(error: unknown) {
  const body = readErrorField(error, "responseBody");

  if (typeof body !== "string" || !body.trim()) {
    return null;
  }

  return formatResponseBodyForLog(body);
}

export function getErrorLogMeta(error: unknown) {
  const cause = readErrorField(error, "cause");
  const name = error instanceof Error
    ? error.name
    : String(readErrorField(error, "name") ?? "Error");
  const errorCode = readErrorField(error, "code") ?? readErrorField(cause, "code");

  return {
    errorName: name,
    errorMessage: formatErrorMessage(error),
    errorCode: errorCode === undefined ? null : String(errorCode),
    httpStatus: normalizeHttpStatus(error),
    responseBody: normalizeResponseBody(error),
    service: String(readErrorField(error, "service") ?? "") || null,
    causeName: cause instanceof Error
      ? cause.name
      : String(readErrorField(cause, "name") ?? "") || null,
    causeMessage: cause ? formatErrorMessage(cause) : null
  };
}

function redactValue(value: unknown, key?: string): unknown {
  if (key && SENSITIVE_KEY_PATTERN.test(key)) {
    return "[REDACTED]";
  }

  if (typeof value === "string") {
    return redactSensitiveText(value);
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: redactSensitiveText(value.message)
    };
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([entryKey, entryValue]) => [
        entryKey,
        redactValue(entryValue, entryKey)
      ])
    );
  }

  return value;
}

export function redactLogMeta(meta: LogMeta | undefined) {
  return meta ? (redactValue(meta) as LogMeta) : undefined;
}

function write(level: "info" | "warn" | "error", message: string, meta?: LogMeta) {
  const payload = {
    level,
    message: redactSensitiveText(message),
    meta: redactLogMeta(meta),
    time: new Date().toISOString()
  };

  if (level === "error") {
    console.error(JSON.stringify(payload));
    return;
  }

  if (level === "warn") {
    console.warn(JSON.stringify(payload));
    return;
  }

  console.log(JSON.stringify(payload));
}

export const logger = {
  info: (message: string, meta?: LogMeta) => write("info", message, meta),
  warn: (message: string, meta?: LogMeta) => write("warn", message, meta),
  error: (message: string, meta?: LogMeta) => write("error", message, meta)
};
