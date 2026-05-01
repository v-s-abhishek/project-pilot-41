import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { askProjectAi } from "@/lib/ai.functions";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Send, Loader2, Bot, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Analyze this project's progress",
  "Which tasks are at risk?",
  "How should I prioritize today?",
  "How do I add a team member?",
];

function normalizeAssistantMessage(content: unknown): string {
  if (typeof content === "string") {
    const cleaned = content.trim();
    return cleaned || "I couldn't generate a visible reply. Please try again.";
  }

  if (Array.isArray(content)) {
    const cleaned = content.map(normalizeAssistantMessage).join("\n").trim();
    return cleaned || "I couldn't generate a visible reply. Please try again.";
  }

  if (content && typeof content === "object") {
    const record = content as Record<string, unknown>;
    return normalizeAssistantMessage(record.text ?? record.content ?? record.output_text ?? "");
  }

  return "I couldn't generate a visible reply. Please try again.";
}

export function ProjectAiPanel({ projectId }: { projectId?: string }) {
  const [open, setOpen] = useState(true);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const { session, loading } = useAuth();
  const askFn = useServerFn(askProjectAi);
  const scrollRef = useRef<HTMLDivElement>(null);

  const ask = useMutation({
    mutationFn: async (q: string) => {
      if (!session?.access_token) {
        throw new Error("Your session is not ready yet. Please wait a moment and try again.");
      }

      const history = messages.slice(-10);
      const res = await askFn({
        data: { projectId, question: q, history },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      return { ...res, reply: normalizeAssistantMessage(res?.reply) };
    },
    onSuccess: (res) => {
      setMessages((m) => [...m, { role: "assistant", content: res.reply }]);
      if (res.error) toast.error(res.reply);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "AI failed"),
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, ask.isPending]);

  const send = (text: string) => {
    const q = text.trim();
    if (!q || ask.isPending || loading) return;

    if (!session?.access_token) {
      toast.error("Please sign in again to use the AI assistant.");
      return;
    }

    setMessages((m) => [...m, { role: "user", content: q }]);
    setInput("");
    ask.mutate(q);
  };

  return (
    <Card className="mt-8">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          AI Project Assistant
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => setOpen((o) => !o)}>
          {open ? "Hide" : "Show"}
        </Button>
      </CardHeader>
      {open && (
        <CardContent className="space-y-3">
          <div
            ref={scrollRef}
            className="max-h-80 overflow-y-auto space-y-3 rounded-md border bg-muted/30 p-3"
          >
            {messages.length === 0 && (
              <div className="text-sm text-muted-foreground">
                Ask anything about this project, your tasks, the team, or how to use TaskHive.
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : ""}`}>
                {m.role === "assistant" && (
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div
                  className={`rounded-lg px-3 py-2 text-sm max-w-[80%] break-words ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground whitespace-pre-wrap"
                      : "bg-card border text-foreground"
                  }`}
                >
                  {m.role === "assistant" ? (
                    <div className="space-y-2 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 [&_strong]:font-semibold [&_h1]:text-base [&_h1]:font-semibold [&_h2]:text-sm [&_h2]:font-semibold [&_h3]:text-sm [&_h3]:font-semibold [&_code]:bg-muted [&_code]:px-1 [&_code]:rounded [&_code]:text-xs [&_a]:text-primary [&_a]:underline">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                    </div>
                  ) : (
                    m.content
                  )}
                </div>
                {m.role === "user" && (
                  <div className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center shrink-0">
                    <UserIcon className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}
            {ask.isPending && (
              <div className="flex gap-2 items-center text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Thinking…
              </div>
            )}
          </div>

          {messages.length === 0 && (
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <Button key={s} variant="outline" size="sm" onClick={() => send(s)} disabled={ask.isPending}>
                  {s}
                </Button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about this project, tasks, or how the app works…"
              disabled={ask.isPending || loading || !session?.access_token}
              maxLength={2000}
            />
            <Button type="submit" size="icon" disabled={ask.isPending || loading || !session?.access_token || !input.trim()}>
              {ask.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </CardContent>
      )}
    </Card>
  );
}
