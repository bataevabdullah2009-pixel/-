type LogMeta = Record<string, unknown>;

const SENSITIVE_KEY_PATTERN = /(api[_-]?key|authorization|password|secret|service[_-]?role|token)/i;

export function redactSensitiveText(value: string) {
  return value
    .replace(/(bearer\s+)[^\s"']+/gi, "$1[REDACTED]")
    .replace(/((?:api[_-]?key|token|secret|password)=)[^&\s"']+/gi, "$1[REDACTED]");
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
