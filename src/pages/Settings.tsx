import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useRoles } from "@/hooks/useRoles";
import { useUsage, PLAN_LIMITS } from "@/hooks/useUsage";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useNavigate, useSearchParams } from "react-router-dom";
import { User, Building2, CreditCard, Shield, Download, Moon, MailCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { exportToCSV } from "@/lib/export-csv";
import { toast } from "sonner";
import GmailConnect from "@/components/GmailConnect";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { getErrorMessage } from "@/lib/errors";

export default function SettingsPage() {
  const { t } = useTranslation("settings");
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const { isAdmin, roles } = useRoles();
  const { usage, currentPlan, limits, getUsagePercent } = useUsage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const showVerifyBanner = searchParams.get("verify") === "email";
  const [exporting, setExporting] = useState(false);

  const handleExport = async (type: "newsletters" | "insights") => {
    if (!currentWorkspace) return;
    setExporting(true);
    try {
      if (type === "newsletters") {
        const { data, error } = await supabase
          .from("newsletter_inbox")
          .select("from_name, from_email, subject, received_at, is_read, is_starred, tags")
          .eq("workspace_id", currentWorkspace.id)
          .eq("is_newsletter", true)
          .order("received_at", { ascending: false })
          .limit(5000);
        if (error) throw error;
        exportToCSV(data || [], `newsletters-${currentWorkspace.slug}`);
        toast.success(t("exportNewslettersSuccess"));
      } else {
        const { data, error } = await supabase
          .from("insights")
          .select("title, category, campaign_type, impact_area, priority_level, main_message, strategic_takeaway, cta_primary, offer_discount_percentage, offer_coupon_code, offer_urgency, product_categories, confidence, created_at")
          .eq("workspace_id", currentWorkspace.id)
          .order("created_at", { ascending: false })
          .limit(5000);
        if (error) throw error;
        exportToCSV(data || [], `insights-${currentWorkspace.slug}`);
        toast.success(t("exportInsightsSuccess"));
      }
    } catch (error) {
      toast.error(getErrorMessage(error, t("exportFailed")));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-2xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("subtitle")}</p>
      </div>

      {/* Email verification banner */}
      {showVerifyBanner && (
        <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/40 p-4 text-sm">
          <MailCheck className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-blue-900 dark:text-blue-100">{t("verifyEmail")}</p>
            <p className="text-blue-700 dark:text-blue-300 mt-0.5">
              {t("verifyEmailDesc", { email: user?.email })} {t("checkInbox")}
            </p>
          </div>
        </div>
      )}

      {/* Account */}
      <Card className="shadow-raised border">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">{t("account")}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("email")}</span>
            <span className="text-foreground">{user?.email}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("yourRoles")}</span>
            <div className="flex gap-1">
              {roles.length > 0 ? (
                roles.map((r) => (
                  <Badge key={r} variant="outline" className="capitalize text-xs">{r}</Badge>
                ))
              ) : (
                <span className="text-muted-foreground text-xs">{t("noRolesAssigned")}</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workspace */}
      {currentWorkspace && (
        <Card className="shadow-raised border">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">{t("workspace")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("name")}</span>
              <span className="text-foreground">{currentWorkspace.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("slug")}</span>
              <span className="text-foreground font-mono text-xs">{currentWorkspace.slug}</span>
            </div>
            {isAdmin && (
              <>
                <Separator />
                <Button variant="outline" size="sm" onClick={() => navigate("/settings/team")}>
                  {t("manageTeam")}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Plan & Usage Summary */}
      <Card className="shadow-raised border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">{t("planUsage")}</CardTitle>
            </div>
            <Badge variant="outline" className="capitalize">
              {PLAN_LIMITS[currentPlan].label}
            </Badge>
          </div>
          <CardDescription>{t("billingPeriodUsage")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">{t("seats")}</span>
                <span>{usage.seats_used} / {limits.seats}</span>
              </div>
              <Progress value={getUsagePercent("seats_used")} className="h-1.5" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">{t("competitors")}</span>
                <span>{usage.competitors} / {limits.competitors === -1 ? "∞" : limits.competitors}</span>
              </div>
              {limits.competitors !== -1 && (
                <Progress value={getUsagePercent("competitors")} className="h-1.5" />
              )}
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">{t("dataImports")}</span>
                <span>{usage.newsletters_this_month} / {limits.newsletters_per_month.toLocaleString()}</span>
              </div>
              <Progress value={getUsagePercent("newsletters_this_month")} className="h-1.5" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">{t("analyses")}</span>
                <span>{usage.analyses_this_month} / {limits.analyses_per_month.toLocaleString()}</span>
              </div>
              <Progress value={getUsagePercent("analyses_this_month")} className="h-1.5" />
            </div>
          </div>

          <Separator />

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/settings/usage")}>
              {t("viewFullUsage")}
            </Button>
            {isAdmin && (
              <Button size="sm" onClick={() => navigate("/settings/billing")}>
                {t("manageBilling")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card className="shadow-raised border">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">{t("security")}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Button variant="outline" size="sm" onClick={() => navigate("/forgot-password")}>
            {t("changePassword")}
          </Button>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card className="shadow-raised border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Moon className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">{t("appearance")}</CardTitle>
            </div>
            <DarkModeToggle />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">{t("appearanceDesc")}</p>
        </CardContent>
      </Card>

      {/* Data Export */}
      {currentWorkspace && (
        <Card className="shadow-raised border">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Download className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">{t("exportData")}</CardTitle>
            </div>
            <CardDescription>{t("downloadWorkspaceData")}</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleExport("newsletters")} disabled={exporting}>
              {exporting ? t("exporting") : t("exportNewsletters")}
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport("insights")} disabled={exporting}>
              {exporting ? t("exporting") : t("exportInsights")}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Gmail Integration */}
      <GmailConnect />
    </div>
  );
}
