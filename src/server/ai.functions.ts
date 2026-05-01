import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

const InputSchema = z.object({
  projectId: z.string().uuid().optional(),
  question: z.string().min(1).max(2000),
  history: z.array(MessageSchema).max(20).default([]),
});

type AnalysisContext = {
  project?: { title: string; description: string | null } | null;
  tasks: Array<{
    title: string;
    status: string;
    priority: string;
    due_date: string | null;
    assigned_to: string | null;
  }>;
  members: Array<{ name: string; email: string; role: string }>;
};

export const askProjectAi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    if (!LOVABLE_API_KEY) {
      return { reply: "AI is not configured. Please enable Lovable AI.", error: true };
    }

    let ctx: AnalysisContext = { project: null, tasks: [], members: [] };

    if (data.projectId) {
      const [{ data: project }, { data: tasks }, { data: members }] = await Promise.all([
        supabase.from("projects").select("title,description").eq("id", data.projectId).maybeSingle(),
        supabase.from("tasks").select("title,status,priority,due_date,assigned_to").eq("project_id", data.projectId),
        supabase.from("project_members").select("user_id,role").eq("project_id", data.projectId),
      ]);

      let memberRows: AnalysisContext["members"] = [];
      if (members && members.length) {
        const ids = members.map((m: any) => m.user_id);
        const { data: profs } = await supabase.from("profiles").select("id,full_name,email").in("id", ids);
        memberRows = members.map((m: any) => {
          const p = profs?.find((x: any) => x.id === m.user_id);
          return { name: p?.full_name || p?.email || "Unknown", email: p?.email || "", role: m.role };
        });
      }

      ctx = { project: project ?? null, tasks: tasks ?? [], members: memberRows };
    }

    const now = new Date();
    const overdue = ctx.tasks.filter(
      (t) => t.due_date && new Date(t.due_date) < now && t.status !== "done"
    ).length;
    const byStatus = ctx.tasks.reduce<Record<string, number>>((acc, t) => {
      acc[t.status] = (acc[t.status] ?? 0) + 1;
      return acc;
    }, {});

    const systemPrompt = `You are TaskHive AI, a helpful assistant inside a team task management web app called TaskHive.
You help users understand their projects, tasks, team workload, and answer general questions about how to use the app.
Be concise, friendly, and actionable. Use markdown lists when helpful.

App features the user can use:
- Projects: create projects, view a Kanban board (To Do, In Progress, Review, Done).
- Tasks: create with title, description, priority (low/medium/high/urgent), due date, assignee.
- Team: project owners/admins can add members by email (the member must have signed up first).
- Roles: owner, admin, member. Admins can add members and delete any task.
- Dashboard: stats and charts for productivity.

${ctx.project ? `### Current Project Context
Title: ${ctx.project.title}
Description: ${ctx.project.description || "(none)"}
Total tasks: ${ctx.tasks.length}
By status: ${JSON.stringify(byStatus)}
Overdue tasks: ${overdue}
Members (${ctx.members.length}): ${ctx.members.map((m) => `${m.name} [${m.role}]`).join(", ") || "none"}

Recent tasks:
${ctx.tasks.slice(0, 20).map((t) => `- [${t.status}] (${t.priority}) ${t.title}${t.due_date ? ` — due ${t.due_date}` : ""}`).join("\n") || "(no tasks yet)"}
` : "No specific project context — answer general questions about the app."}`;

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            ...data.history,
            { role: "user", content: data.question },
          ],
        }),
      });

      if (res.status === 429) return { reply: "Rate limit reached. Please try again in a moment.", error: true };
      if (res.status === 402) return { reply: "AI credits exhausted. Add credits in Workspace Settings.", error: true };
      if (!res.ok) {
        const t = await res.text();
        console.error("AI gateway error:", res.status, t);
        return { reply: "AI service error. Please try again.", error: true };
      }

      const json = await res.json();
      const reply = json?.choices?.[0]?.message?.content ?? "No response.";
      return { reply, error: false };
    } catch (e) {
      console.error("askProjectAi failed:", e);
      return { reply: "Failed to reach AI service.", error: true };
    }
  });
