function stripWrapping(value: string) {
  return value.trim().replace(/^['"]|['"]$/g, "");
}

export function normalizeDomain(value: string | null | undefined): string | null {
  if (!value) return null;

  const cleaned = stripWrapping(value).toLowerCase().replace(/[<>]/g, "");
  if (!cleaned) return null;

  // Handle email addresses: extract only the domain portion after @
  const atIdx = cleaned.indexOf("@");
  const candidate = atIdx !== -1 ? (cleaned.slice(atIdx + 1) || "") : cleaned;
  if (!candidate) return null;

  // Use the URL API for robust parsing (handles protocols, ports, paths, queries, hashes)
  const withProtocol = /^[a-z][a-z\d+\-.]*:\/\//.test(candidate)
    ? candidate
    : `https://${candidate}`;
  try {
    const { hostname } = new URL(withProtocol);
    if (hostname) {
      return hostname.replace(/^www\./, "").replace(/\.$/, "") || null;
    }
  } catch {
    // URL parsing failed (invalid chars, malformed input) — fall through to manual parse
  }

  // Manual fallback for edge cases the URL constructor won't accept
  let normalized = candidate.split("/")[0] ?? candidate;
  normalized = normalized.split("?")[0] ?? normalized;
  normalized = normalized.split("#")[0] ?? normalized;
  normalized = normalized.split(":")[0] ?? normalized;
  normalized = normalized.replace(/^www\./, "").replace(/\.$/, "");

  return normalized || null;
}

export function extractDomainsFromInput(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[,\n]/)
        .map((entry) => normalizeDomain(entry))
        .filter((entry): entry is string => Boolean(entry)),
    ),
  );
}

export function mergeCompetitorDomains(options: {
  website?: string | null;
  domains?: string[] | null;
}) {
  const merged = new Set<string>();
  const websiteDomain = normalizeDomain(options.website ?? null);

  if (websiteDomain) {
    merged.add(websiteDomain);
  }

  for (const domain of options.domains ?? []) {
    const normalized = normalizeDomain(domain);
    if (normalized) {
      merged.add(normalized);
    }
  }

  return Array.from(merged);
}

export function inferCompetitorName(options: {
  senderName?: string | null;
  senderDomain?: string | null;
}) {
  const senderName = options.senderName?.trim();
  if (senderName && senderName.length > 1 && !senderName.includes("@")) {
    return senderName;
  }

  const domain = normalizeDomain(options.senderDomain ?? null);
  if (!domain) return "New competitor";

  const parts = domain.split(".").filter(Boolean);
  const base =
    parts.length >= 2
      ? parts[Math.max(0, parts.length - 2)] ?? domain
      : parts[0] ?? domain;

  return base
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
