type MaybeError = {
  message?: string | null;
  details?: string | null;
} | null | undefined;

export function isTransientNavigationFetchError(error: MaybeError) {
  const combined = [error?.message, error?.details]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" ");

  if (!/Failed to fetch|NetworkError|Load failed|AbortError/i.test(combined)) {
    return false;
  }

  return typeof document !== "undefined" && document.visibilityState === "hidden";
}
