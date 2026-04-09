import { useEffect, useState } from "react";
import { useGmailConnection } from "@/hooks/useGmailConnection";
import { useRoles } from "@/hooks/useRoles";
import { useEmailVerification } from "@/hooks/useEmailVerification";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Mail, RefreshCw, Unplug, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { getErrorMessage } from "@/lib/errors";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function GmailConnect() {
  const { connection, loading, syncing, error, connect, disconnect, sync, isConnected } = useGmailConnection();
  const { isAdmin } = useRoles();
  const { requireVerification } = useEmailVerification();
  const { toast } = useToast();
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("gmail_connected") === "true") {
      toast({ title: "Gmail connected", description: "Your Gmail account has been connected successfully." });
    }

    const gmailError = params.get("gmail_error");
    if (gmailError) {
      toast({
        title: "Gmail connection failed",
        description:
          gmailError === "token_exchange_failed"
            ? "Failed to exchange the authorization code. Please try again."
            : `Connection error: ${gmailError}`,
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleConnect = async () => {
    if (!requireVerification("connect Gmail")) return;

    setConnecting(true);
    try {
      await connect();
    } catch (connectError) {
      toast({ title: "Error", description: getErrorMessage(connectError), variant: "destructive" });
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      toast({ title: "Gmail disconnected" });
    } catch (disconnectError) {
      toast({ title: "Error", description: getErrorMessage(disconnectError), variant: "destructive" });
    }
    setDisconnectOpen(false);
  };

  const handleSync = async () => {
    try {
      const result = await sync();
      if (result) {
        toast({
          title: result.status === "completed_with_issues" ? "Sync completed with issues" : "Sync complete",
          description: result.message,
          variant: result.status === "completed_with_issues" ? "destructive" : "default",
        });
      }
    } catch (syncError) {
      toast({ title: "Sync failed", description: getErrorMessage(syncError), variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <Card className="border shadow-raised">
        <CardContent className="flex items-center gap-2 p-4">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-muted-foreground">Loading Gmail status...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border shadow-raised">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Gmail Integration</CardTitle>
            </div>
            {isConnected ? (
              <Badge variant="default" className="gap-1">
                <CheckCircle className="h-3 w-3" />
                Connected
              </Badge>
            ) : (
              <Badge variant="secondary">Not connected</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isConnected && connection ? (
            <>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Account</span>
                  <span className="font-medium">{connection.email_address}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Last synced</span>
                  <span>{connection.last_sync_at ? new Date(connection.last_sync_at).toLocaleString() : "Never"}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Status</span>
                  <span className="capitalize">{connection.sync_status}</span>
                </div>
                {connection.sync_error && (
                  <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {connection.sync_error}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSync}
                  disabled={syncing}
                  className="gap-2"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
                  {syncing ? "Syncing..." : "Sync now"}
                </Button>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDisconnectOpen(true)}
                    className="gap-2 text-muted-foreground"
                  >
                    <Unplug className="h-3.5 w-3.5" />
                    Disconnect
                  </Button>
                )}
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Connect your Gmail to automatically import competitor newsletters. We request{" "}
                <strong>read-only</strong> access so the app never sends email or modifies your inbox.
              </p>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>- Read-only access to Gmail messages</p>
                <p>- Newsletters are classified and organized automatically</p>
                <p>- Disconnect anytime from settings</p>
              </div>
              {error && (
                <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                  {error}
                </div>
              )}
              {isAdmin ? (
                <Button onClick={handleConnect} disabled={connecting} className="gap-2">
                  <Mail className="h-4 w-4" />
                  {connecting ? "Redirecting..." : "Connect Gmail"}
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground">Ask a workspace admin to connect Gmail.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={disconnectOpen} onOpenChange={setDisconnectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Gmail?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the Gmail connection and stop importing new newsletters. Previously imported newsletters
              will remain in your inbox.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisconnect}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
