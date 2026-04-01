import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";

export function useEmailVerification() {
  const { user } = useAuth();
  const [resending, setResending] = useState(false);

  const isVerified = !!user?.email_confirmed_at;

  const resendVerification = async () => {
    if (!user?.email) return;
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: user.email,
      });
      if (error) throw error;
      toast.success("Verification email sent. Please check your inbox.");
    } catch (e: any) {
      toast.error(e.message || "Failed to resend verification email");
    } finally {
      setResending(false);
    }
  };

  /**
   * Call before any critical action. Returns true if verified.
   * If not verified, shows a toast and returns false.
   */
  const requireVerification = (actionName = "this action"): boolean => {
    if (isVerified) return true;
    toast.error(`Please verify your email to ${actionName}.`, {
      description: "Check your inbox for the verification link, or resend it from the banner above.",
      duration: 6000,
    });
    return false;
  };

  return { isVerified, resendVerification, resending, requireVerification };
}
