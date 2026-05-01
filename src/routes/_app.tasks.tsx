import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_app/tasks")({
  component: MyTasks,
});

function MyTasks() {
  const { user } = useAuth();
  const { data: tasks } = useQuery({
    queryKey: ["my-tasks", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*, projects(title)")
        .eq("assigned_to", user!.id)
        .order("due_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <AppShell title="My Tasks">
      {!tasks?.length ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">No tasks assigned to you.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {tasks.map((t) => {
            const overdue = t.due_date && new Date(t.due_date) < new Date() && t.status !== "done";
            return (
              <Link key={t.id} to="/projects/$projectId" params={{ projectId: t.project_id }}>
                <Card className="p-4 hover:border-primary/50 transition-colors">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{t.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {(t.projects as { title: string } | null)?.title} · {t.status.replace("_", " ")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline">{t.priority}</Badge>
                      {overdue && <Badge variant="destructive">Overdue</Badge>}
                      {t.due_date && <span className="text-xs text-muted-foreground">{new Date(t.due_date).toLocaleDateString()}</span>}
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
