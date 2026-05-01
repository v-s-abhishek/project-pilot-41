import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export const Route = createFileRoute("/_app/team")({
  component: Team,
});

function Team() {
  const { data: people } = useQuery({
    queryKey: ["team"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("full_name");
      if (error) throw error;
      return data;
    },
  });

  return (
    <AppShell title="Team">
      <p className="text-sm text-muted-foreground mb-4">People you share at least one project with.</p>
      {!people?.length ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">No teammates yet.</CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {people.map((p) => (
            <Card key={p.id} className="p-4 flex items-center gap-3">
              <Avatar><AvatarFallback>{(p.full_name || p.email || "?")[0]?.toUpperCase()}</AvatarFallback></Avatar>
              <div className="min-w-0">
                <div className="font-medium truncate">{p.full_name || "Unnamed"}</div>
                <div className="text-xs text-muted-foreground truncate">{p.email}</div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}
