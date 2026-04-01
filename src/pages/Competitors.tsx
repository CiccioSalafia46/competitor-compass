import { useState, useEffect } from "react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useRoles } from "@/hooks/useRoles";
import { useUsage } from "@/hooks/useUsage";
import { useAuditLog } from "@/hooks/useAuditLog";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { useToast } from "@/hooks/use-toast";
import { Plus, Users, Globe, Trash2 } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Competitor = Database["public"]["Tables"]["competitors"]["Row"];

export default function Competitors() {
  const { currentWorkspace } = useWorkspace();
  const { canManageCompetitors } = useRoles();
  const { isAtLimit, trackUsage } = useUsage();
  const { log } = useAuditLog();
  const { toast } = useToast();
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Competitor | null>(null);
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCompetitors = async () => {
    if (!currentWorkspace) return;
    setLoading(true);
    const { data } = await supabase
      .from("competitors")
      .select("*")
      .eq("workspace_id", currentWorkspace.id)
      .order("name");
    setCompetitors(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchCompetitors();
  }, [currentWorkspace]);

  const handleCreate = async () => {
    if (!currentWorkspace || !name.trim()) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("competitors").insert({
        workspace_id: currentWorkspace.id,
        name: name.trim(),
        website: website.trim() || null,
        description: description.trim() || null,
      });
      if (error) throw error;
      toast({ title: "Competitor added" });
      setName("");
      setWebsite("");
      setDescription("");
      setDialogOpen(false);
      fetchCompetitors();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("competitors").delete().eq("id", deleteTarget.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setCompetitors((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      toast({ title: "Competitor removed" });
    }
    setDeleteTarget(null);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Competitors</h1>
          <p className="text-sm text-muted-foreground mt-1">Companies you're tracking</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add competitor
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Competitor</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Company name *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Corp" />
              </div>
              <div className="space-y-2">
                <Label>Website</Label>
                <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://acme.com" />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Key things to track..." />
              </div>
              <Button onClick={handleCreate} disabled={isSubmitting || !name.trim()} className="w-full">
                {isSubmitting ? "Adding..." : "Add competitor"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {competitors.length === 0 ? (
        <Card className="shadow-raised border">
          <CardContent className="py-12 text-center">
            <Users className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm font-medium text-foreground">No competitors tracked yet</p>
            <p className="text-sm text-muted-foreground mt-1">Add the companies you want to monitor</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {competitors.map((c) => (
            <Card key={c.id} className="shadow-raised border group">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{c.name}</p>
                    {c.website && (
                      <a
                        href={c.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                      >
                        <Globe className="h-3 w-3" />
                        {c.website.replace(/^https?:\/\//, "")}
                      </a>
                    )}
                    {c.description && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{c.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => setDeleteTarget(c)}
                    className="text-muted-foreground/0 group-hover:text-muted-foreground hover:text-destructive transition-colors p-1"
                    aria-label={`Delete ${c.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete competitor</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{deleteTarget?.name}</strong>? This won't delete
              associated newsletters or analyses, but they will no longer be linked to this competitor.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
