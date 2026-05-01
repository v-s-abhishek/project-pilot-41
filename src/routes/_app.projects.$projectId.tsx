import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, ArrowLeft, UserPlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type Status = "todo" | "in_progress" | "review" | "done";
type Priority = "low" | "medium" | "high" | "urgent";

const STATUSES: { id: Status; label: string }[] = [
  { id: "todo", label: "To Do" },
  { id: "in_progress", label: "In Progress" },
  { id: "review", label: "Review" },
  { id: "done", label: "Done" },
];

const PRIORITY_TONE: Record<Priority, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-info/15 text-info",
  high: "bg-warning/20 text-warning-foreground",
  urgent: "bg-destructive/15 text-destructive",
};

export const Route = createFileRoute("/_app/projects/$projectId")({
  component: ProjectDetail,
});

function ProjectDetail() {
  const { projectId } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").eq("id", projectId).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: tasks } = useQuery({
    queryKey: ["tasks", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks").select("*").eq("project_id", projectId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: members } = useQuery({
    queryKey: ["members", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from("project_members").select("*").eq("project_id", projectId);
      if (error) throw error;
      const ids = data.map((m) => m.user_id);
      if (!ids.length) return [];
      const { data: profs } = await supabase.from("profiles").select("id,full_name,email").in("id", ids);
      return data.map((m) => ({ ...m, profile: profs?.find((p) => p.id === m.user_id) }));
    },
  });

  const myMembership = members?.find((m) => m.user_id === user?.id);
  const isAdmin = myMembership?.role === "owner" || myMembership?.role === "admin";

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Status }) => {
      const { error } = await supabase.from("tasks").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks", projectId] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tasks", projectId] }); toast.success("Task deleted"); },
  });

  return (
    <AppShell title={project?.title ?? "Project"}>
      <div className="mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/projects"><ArrowLeft className="h-4 w-4 mr-1" /> Back to projects</Link>
        </Button>
      </div>

      {project?.description && (
        <p className="text-sm text-muted-foreground mb-6 max-w-3xl">{project.description}</p>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Board</h2>
        <div className="flex gap-2">
          {isAdmin && <AddMemberDialog projectId={projectId} />}
          <NewTaskDialog projectId={projectId} members={members ?? []} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {STATUSES.map((col) => {
          const colTasks = tasks?.filter((t) => t.status === col.id) ?? [];
          return (
            <div key={col.id} className="rounded-lg bg-secondary/50 p-3">
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-sm font-medium">{col.label}</h3>
                <span className="text-xs text-muted-foreground">{colTasks.length}</span>
              </div>
              <div className="space-y-2 min-h-32">
                {colTasks.map((t) => {
                  const assignee = members?.find((m) => m.user_id === t.assigned_to)?.profile;
                  const overdue = t.due_date && new Date(t.due_date) < new Date() && t.status !== "done";
                  return (
                    <Card key={t.id} className="p-3 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium line-clamp-2">{t.title}</p>
                        {(isAdmin || t.created_by === user?.id) && (
                          <button onClick={() => deleteTask.mutate(t.id)} className="text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      {t.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.description}</p>}
                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        <Badge className={PRIORITY_TONE[t.priority as Priority]} variant="secondary">{t.priority}</Badge>
                        {overdue && <Badge variant="destructive" className="text-xs">Overdue</Badge>}
                        {t.due_date && <span className="text-xs text-muted-foreground">{new Date(t.due_date).toLocaleDateString()}</span>}
                      </div>
                      <div className="flex items-center justify-between mt-3 gap-2">
                        {assignee ? (
                          <div className="flex items-center gap-1.5">
                            <Avatar className="h-5 w-5"><AvatarFallback className="text-[10px]">{(assignee.full_name || assignee.email)[0]?.toUpperCase()}</AvatarFallback></Avatar>
                            <span className="text-xs text-muted-foreground truncate max-w-24">{assignee.full_name || assignee.email}</span>
                          </div>
                        ) : <span className="text-xs text-muted-foreground">Unassigned</span>}
                        <Select value={t.status} onValueChange={(v) => updateStatus.mutate({ id: t.id, status: v as Status })}>
                          <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {STATUSES.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <Card className="mt-8">
        <CardHeader><CardTitle className="text-base">Team members</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {members?.map((m) => (
            <div key={m.id} className="flex items-center justify-between border-b last:border-0 py-2">
              <div className="flex items-center gap-2">
                <Avatar className="h-7 w-7"><AvatarFallback>{(m.profile?.full_name || m.profile?.email || "?")[0]?.toUpperCase()}</AvatarFallback></Avatar>
                <div>
                  <div className="text-sm font-medium">{m.profile?.full_name || m.profile?.email}</div>
                  <div className="text-xs text-muted-foreground">{m.profile?.email}</div>
                </div>
              </div>
              <Badge variant="outline">{m.role}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </AppShell>
  );
}

function NewTaskDialog({ projectId, members }: { projectId: string; members: Array<{ user_id: string; profile?: { full_name: string; email: string } }> }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [assignee, setAssignee] = useState<string>("none");
  const [dueDate, setDueDate] = useState<string>("");

  const create = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("Title required");
      const { error } = await supabase.from("tasks").insert({
        project_id: projectId,
        title: title.trim(), description: desc.trim() || null,
        priority, status: "todo",
        assigned_to: assignee === "none" ? null : assignee,
        due_date: dueDate || null,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks", projectId] });
      setOpen(false); setTitle(""); setDesc(""); setDueDate(""); setAssignee("none"); setPriority("medium");
      toast.success("Task created");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> New task</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Create task</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} /></div>
          <div className="space-y-2"><Label>Description</Label><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={1000} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Due date</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Assign to</Label>
            <Select value={assignee} onValueChange={setAssignee}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.user_id} value={m.user_id}>{m.profile?.full_name || m.profile?.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => create.mutate()} disabled={create.isPending}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddMemberDialog({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");

  const add = useMutation({
    mutationFn: async () => {
      const { data: profs, error: e1 } = await supabase.from("profiles").select("id,email").eq("email", email.trim().toLowerCase()).limit(1);
      if (e1) throw e1;
      if (!profs?.length) throw new Error("No user with that email. They must sign up first.");
      const { error } = await supabase.from("project_members").insert({
        project_id: projectId, user_id: profs[0].id, role,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["members", projectId] });
      setOpen(false); setEmail("");
      toast.success("Member added");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline"><UserPlus className="h-4 w-4 mr-1" /> Add member</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add team member</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" /></div>
          <div className="space-y-2">
            <Label>Project role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as "admin" | "member")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => add.mutate()} disabled={add.isPending}>Add</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
