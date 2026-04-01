import { useEmailVerification } from "@/hooks/useEmailVerification";
import { AlertCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmailVerificationBanner() {
  const { isVerified, resendVerification, resending } = useEmailVerification();

  if (isVerified) return null;

  return (
    <div className="bg-warning/10 border border-warning/30 rounded-lg px-4 py-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <AlertCircle className="h-4 w-4 text-warning shrink-0" />
        <p className="text-sm text-foreground">
          <span className="font-medium">Verify your email</span>{" "}
          <span className="text-muted-foreground">to unlock all features. Check your inbox for the verification link.</span>
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="shrink-0 gap-1.5 text-xs"
        onClick={resendVerification}
        disabled={resending}
      >
        <Mail className="h-3 w-3" />
        {resending ? "Sending…" : "Resend"}
      </Button>
    </div>
  );
}
