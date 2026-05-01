import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Clock, AlertCircle, FolderKanban } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, CartesianGrid } from "recharts";

export const Route = createFileRoute("/_app/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [{ data: tasks }, { data: projects }] = await Promise.all([
        supabase.from("tasks").select("id,status,priority,due_date,completed_at,created_at"),
        supabase.from("projects").select("id"),
      ]);
      const t = tasks ?? [];
      const now = new Date();
      const completed = t.filter((x) => x.status === "done").length;
      const pending = t.filter((x) => x.status !== "done").length;
      const overdue = t.filter((x) => x.status !== "done" && x.due_date && new Date(x.due_date) < now).length;
      const byStatus = ["todo", "in_progress", "review", "done"].map((s) => ({
        status: s.replace("_", " "),
        count: t.filter((x) => x.status === s).length,
      }));
      const byPriority = ["urgent", "high", "medium", "low"].map((p) => ({
        name: p,
        value: t.filter((x) => x.priority === p).length,
      }));
      return {
        totalProjects: projects?.length ?? 0,
        totalTasks: t.length,
        completed, pending, overdue, byStatus, byPriority,
      };
    },
  });

  const cards = [
    { label: "Projects", value: stats?.totalProjects ?? 0, icon: FolderKanban, tone: "text-info" },
    { label: "Completed tasks", value: stats?.completed ?? 0, icon: CheckCircle2, tone: "text-success" },
    { label: "Pending tasks", value: stats?.pending ?? 0, icon: Clock, tone: "text-warning" },
    { label: "Overdue tasks", value: stats?.overdue ?? 0, icon: AlertCircle, tone: "text-destructive" },
  ];

  const COLORS = ["var(--chart-4)", "var(--chart-3)", "var(--chart-1)", "var(--chart-2)"];

  return (
    <AppShell title="Dashboard">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {cards.map((c) => (
            <Card key={c.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
                <c.icon className={`h-4 w-4 ${c.tone}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{c.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Tasks by status</CardTitle></CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.byStatus ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="status" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                  <Bar dataKey="count" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Priority distribution</CardTitle></CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats?.byPriority ?? []} dataKey="value" nameKey="name" outerRadius={90} label>
                    {(stats?.byPriority ?? []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
