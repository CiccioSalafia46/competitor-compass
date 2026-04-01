import { useState, useEffect } from "react";
import { useGmailConnection } from "@/hooks/useGmailConnection";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useRoles } from "@/hooks/useRoles";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Mail, RefreshCw, Unplug, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
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
  const { connection, loading, syncing, connect, disconnect, sync, isConnected } = useGmailConnection();
  const { isAdmin } = useRoles();
  const { toast } = useToast();
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [connecting, setConnecting] = useState(false);

  // Check URL params for OAuth result
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("gmail_connected") === "true") {
      toast({ title: "Gmail connected", description: "Your Gmail account has been connected successfully." });
    }
    const error = params.get("gmail_error");
    if (error) {
      toast({
        title: "Gmail connection failed",
        description: error === "token_exchange_failed"
          ? "Failed to exchange authorization code. Please try again."
          : `Connection error: ${error}`,
        variant: "destructive",
      });
    }
  }, []);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      await connect();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      toast({ title: "Gmail disconnected" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setDisconnectOpen(false);
  };

  const handleSync = async () => {
    try {
      const result = await sync();
      if (result) {
        toast({
          title: "Sync complete",
          description: `Imported ${result.imported} newsletters, skipped ${result.skipped} duplicates.`,
        });
      }
    } catch (err: any) {
      toast({ title: "Sync failed", description: err.message, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <Card className="shadow-raised border">
        <CardContent className="p-4 flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-muted-foreground">Loading Gmail status...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="shadow-raised border">
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
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Account</span>
                  <span className="font-medium">{connection.email_address}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last synced</span>
                  <span>
                    {connection.last_sync_at
                      ? new Date(connection.last_sync_at).toLocaleString()
                      : "Never"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className="capitalize">{connection.sync_status}</span>
                </div>
                {connection.sync_error && (
                  <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                    <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
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
                Connect your Gmail to automatically import competitor newsletters.
                We request <strong>read-only</strong> access — we never send emails or modify your inbox.
              </p>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>• Read-only access to Gmail messages</p>
                <p>• Newsletters are classified and organized automatically</p>
                <p>• Disconnect anytime from settings</p>
              </div>
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
              This will remove the Gmail connection and stop importing new newsletters.
              Previously imported newsletters will remain in your inbox.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDisconnect} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
