const HAS_EXPLICIT_TIMEZONE_RE = /(Z|[+-]\d{2}:?\d{2})$/i;

const normalizeRawTimestamp = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.includes("T")) return trimmed;
  return trimmed.replace(" ", "T");
};

export const normalizeBackendTimestamp = (value?: string | null): string => {
  if (!value) return "";
  const normalized = normalizeRawTimestamp(value);
  if (!normalized) return "";
  if (HAS_EXPLICIT_TIMEZONE_RE.test(normalized)) return normalized;
  return `${normalized}Z`;
};

export const parseBackendTimestamp = (value?: string | null): Date => {
  const normalized = normalizeBackendTimestamp(value);
  return normalized ? new Date(normalized) : new Date(NaN);
};
