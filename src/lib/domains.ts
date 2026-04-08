function stripWrapping(value: string) {
  return value.trim().replace(/^['"]|['"]$/g, "");
}

export function normalizeDomain(value: string | null | undefined) {
  if (!value) return null;

  let normalized = stripWrapping(value).toLowerCase();
  if (!normalized) return null;

  normalized = normalized.replace(/[<>]/g, "");
  normalized = normalized.replace(/^[a-z]+:\/\//, "");

  if (normalized.includes("@")) {
    const emailParts = normalized.split("@");
    normalized = emailParts[emailParts.length - 1] ?? "";
  }

  normalized = normalized.split("/")[0] ?? normalized;
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
