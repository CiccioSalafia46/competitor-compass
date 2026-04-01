import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useRoles } from "@/hooks/useRoles";
import { useUsage, PLAN_LIMITS } from "@/hooks/useUsage";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";
import { User, Building2, CreditCard, Shield } from "lucide-react";
import GmailConnect from "@/components/GmailConnect";

export default function SettingsPage() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const { isAdmin, roles } = useRoles();
  const { usage, currentPlan, limits, getUsagePercent } = useUsage();
  const navigate = useNavigate();

  return (
    <div className="p-6 lg:p-8 max-w-2xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account and workspace</p>
      </div>

      {/* Account */}
      <Card className="shadow-raised border">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Account</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Email</span>
            <span className="text-foreground">{user?.email}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Your roles</span>
            <div className="flex gap-1">
              {roles.length > 0 ? (
                roles.map((r) => (
                  <Badge key={r} variant="outline" className="capitalize text-xs">{r}</Badge>
                ))
              ) : (
                <span className="text-muted-foreground text-xs">No roles assigned</span>
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
              <CardTitle className="text-base">Workspace</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Name</span>
              <span className="text-foreground">{currentWorkspace.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Slug</span>
              <span className="text-foreground font-mono text-xs">{currentWorkspace.slug}</span>
            </div>
            {isAdmin && (
              <>
                <Separator />
                <Button variant="outline" size="sm" onClick={() => navigate("/settings/team")}>
                  Manage team
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
              <CardTitle className="text-base">Plan & Usage</CardTitle>
            </div>
            <Badge variant="outline" className="capitalize">
              {PLAN_LIMITS[currentPlan].label}
            </Badge>
          </div>
          <CardDescription>Current billing period usage</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Seats</span>
                <span>{usage.seats_used} / {limits.seats}</span>
              </div>
              <Progress value={getUsagePercent("seats_used")} className="h-1.5" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Competitors</span>
                <span>{usage.competitors} / {limits.competitors === -1 ? "∞" : limits.competitors}</span>
              </div>
              {limits.competitors !== -1 && (
                <Progress value={getUsagePercent("competitors")} className="h-1.5" />
              )}
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Newsletters</span>
                <span>{usage.newsletters_this_month} / {limits.newsletters_per_month.toLocaleString()}</span>
              </div>
              <Progress value={getUsagePercent("newsletters_this_month")} className="h-1.5" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Analyses</span>
                <span>{usage.analyses_this_month} / {limits.analyses_per_month.toLocaleString()}</span>
              </div>
              <Progress value={getUsagePercent("analyses_this_month")} className="h-1.5" />
            </div>
          </div>

          <Separator />

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/settings/usage")}>
              View full usage
            </Button>
            {isAdmin && (
              <Button size="sm" onClick={() => navigate("/settings/billing")}>
                Manage billing
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
            <CardTitle className="text-base">Security</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Button variant="outline" size="sm" onClick={() => navigate("/forgot-password")}>
            Change password
          </Button>
        </CardContent>
      </Card>

      {/* Gmail Integration */}
      <GmailConnect />
    </div>
  );
}
