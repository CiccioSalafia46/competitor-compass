const DEFAULT_LOCAL_ORIGINS = [
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

function normalizeOrigin(value: string | null | undefined) {
  if (!value) return null;

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function configuredOrigins() {
  const configuredValues = [
    Deno.env.get("APP_URL"),
    ...(Deno.env.get("ALLOWED_APP_ORIGINS") || "").split(","),
  ];

  const normalizedConfigured = configuredValues
    .map((entry) => normalizeOrigin(entry))
    .filter((entry): entry is string => Boolean(entry));

  const values = normalizedConfigured.length > 0
    ? normalizedConfigured
    : DEFAULT_LOCAL_ORIGINS;

  return new Set(
    values
      .map((entry) => normalizeOrigin(entry))
      .filter((entry): entry is string => Boolean(entry)),
  );
}

export function resolveSafeAppOrigin(req: Request) {
  const allowedOrigins = configuredOrigins();
  const requestOrigin = normalizeOrigin(req.headers.get("origin"));

  if (requestOrigin && allowedOrigins.has(requestOrigin)) {
    return requestOrigin;
  }

  const refererOrigin = normalizeOrigin(req.headers.get("referer"));
  if (refererOrigin && allowedOrigins.has(refererOrigin)) {
    return refererOrigin;
  }

  const configuredPrimary = normalizeOrigin(Deno.env.get("APP_URL"));
  if (configuredPrimary) {
    return configuredPrimary;
  }

  return DEFAULT_LOCAL_ORIGINS[0];
}

export function sanitizeRedirectUrl(req: Request, redirectUrl?: string | null) {
  const safeOrigin = resolveSafeAppOrigin(req);
  if (redirectUrl) {
    try {
      const candidate = new URL(redirectUrl);
      if (configuredOrigins().has(candidate.origin)) {
        return `${candidate.origin}${candidate.pathname}${candidate.search}`;
      }
    } catch {
      // Ignore malformed redirect URLs and fall back to the safe origin.
    }
  }

  return safeOrigin;
}
