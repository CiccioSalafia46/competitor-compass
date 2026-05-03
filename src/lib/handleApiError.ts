import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";

/**
 * Standardized API error handler — logs to console and shows a toast.
 * Use in hooks and event handlers instead of bare `console.error`.
 */
export function handleApiError(
  error: unknown,
  options: {
    title?: string;
    fallbackMessage?: string;
    onRetry?: () => void;
  } = {},
) {
  const message = getErrorMessage(error) || options.fallbackMessage || "Something went wrong";

  console.error("[API Error]", error);

  toast.error(options.title || "Error", {
    description: message,
    action: options.onRetry
      ? { label: "Retry", onClick: options.onRetry }
      : undefined,
  });
}
