import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckSquare, BarChart3, Users, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { IntroAnimation } from "@/components/IntroAnimation";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  component: Landing,
});

function Landing() {
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = sessionStorage.getItem("taskhive_intro_seen");
    if (!seen) setShowIntro(true);
  }, []);

  const handleIntroDone = () => {
    sessionStorage.setItem("taskhive_intro_seen", "1");
    setShowIntro(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {showIntro && <IntroAnimation onDone={handleIntroDone} />}
      <header className="border-b bg-card">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">T</div>
            <span className="font-semibold">TaskHive</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild><Link to="/auth">Sign in</Link></Button>
            <Button asChild><Link to="/auth" search={{ mode: "signup" }}>Get started</Link></Button>
          </div>
        </div>
      </header>

      <section className="container mx-auto px-6 py-24 text-center">
        <span className="inline-flex items-center rounded-full border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          Built for high-performing teams
        </span>
        <h1 className="mt-6 text-5xl font-bold tracking-tight text-foreground sm:text-6xl">
          The task manager your team<br/>actually wants to use.
        </h1>
        <p className="mt-6 mx-auto max-w-2xl text-lg text-muted-foreground">
          Plan projects, assign work with role-based access, and track progress with a real-time dashboard. Everything your team needs in one professional workspace.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button size="lg" asChild><Link to="/auth" search={{ mode: "signup" }}>Start free</Link></Button>
          <Button size="lg" variant="outline" asChild><Link to="/auth">Sign in</Link></Button>
        </div>
      </section>

      <section className="container mx-auto px-6 pb-24 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: CheckSquare, title: "Kanban tasks", desc: "Drag-free status updates with priority and due dates." },
          { icon: Users, title: "Team management", desc: "Invite members, assign roles, control access per project." },
          { icon: Shield, title: "Role-based access", desc: "Admins manage; members execute. Backed by row-level security." },
          { icon: BarChart3, title: "Live dashboard", desc: "Completed, pending, overdue tasks with team productivity charts." },
        ].map((f) => (
          <div key={f.title} className="rounded-lg border bg-card p-6">
            <f.icon className="h-6 w-6 text-primary" />
            <h3 className="mt-4 font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </section>

      <footer className="border-t bg-card">
        <div className="container mx-auto px-6 py-6 text-sm text-muted-foreground">
          © {new Date().getFullYear()} TaskHive. Built with Lovable.
        </div>
      </footer>
    </div>
  );
}
