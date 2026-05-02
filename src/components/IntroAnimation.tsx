import { useEffect, useState } from "react";

const TOTAL_MS = 20000;
const PHASES = [
  { at: 0, title: "Welcome to TaskHive", sub: "The workspace your team will love." },
  { at: 4000, title: "Plan Projects", sub: "Organize work with clarity and structure." },
  { at: 8000, title: "Assign Tasks", sub: "Role-based access for every team member." },
  { at: 12000, title: "Track Progress", sub: "Live dashboards and real-time updates." },
  { at: 16000, title: "Let's Get Started", sub: "Your productive workspace awaits." },
];

export function IntroAnimation({ onDone }: { onDone: () => void }) {
  const [elapsed, setElapsed] = useState(0);
  const [skipping, setSkipping] = useState(false);

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const e = Date.now() - start;
      setElapsed(e);
      if (e >= TOTAL_MS) {
        clearInterval(interval);
        setSkipping(true);
        setTimeout(onDone, 600);
      }
    }, 50);
    return () => clearInterval(interval);
  }, [onDone]);

  const handleSkip = () => {
    setSkipping(true);
    setTimeout(onDone, 400);
  };

  const progress = Math.min(100, (elapsed / TOTAL_MS) * 100);
  const currentPhase = [...PHASES].reverse().find((p) => elapsed >= p.at) ?? PHASES[0];

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-background transition-opacity duration-500 ${
        skipping ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Animated gradient backdrop */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,hsl(var(--primary)/0.25),transparent_50%),radial-gradient(circle_at_80%_70%,hsl(var(--primary)/0.18),transparent_55%)]" />
      <div className="absolute inset-0 opacity-30">
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary/30 blur-3xl animate-pulse" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-primary/20 blur-3xl animate-pulse [animation-delay:1s]" />
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 18 }).map((_, i) => (
          <div
            key={i}
            className="absolute h-1.5 w-1.5 rounded-full bg-primary/60 animate-pulse"
            style={{
              left: `${(i * 53) % 100}%`,
              top: `${(i * 37) % 100}%`,
              animationDelay: `${(i % 6) * 0.3}s`,
              animationDuration: `${2 + (i % 4)}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-2xl">
        {/* Logo */}
        <div className="mb-8 flex items-center gap-3 animate-[scale-in_0.8s_ease-out]">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-3xl font-bold shadow-2xl shadow-primary/40">
            T
          </div>
          <span className="text-4xl font-bold tracking-tight">TaskHive</span>
        </div>

        {/* Rotating phase text */}
        <div key={currentPhase.at} className="animate-[fade-in_0.6s_ease-out] min-h-[140px]">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
            {currentPhase.title}
          </h2>
          <p className="text-lg text-muted-foreground">{currentPhase.sub}</p>
        </div>

        {/* Progress bar */}
        <div className="mt-10 w-full max-w-md">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-gradient-to-r from-primary/70 to-primary transition-[width] duration-100 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-3 flex justify-between text-xs text-muted-foreground">
            <span>Loading your workspace…</span>
            <span>{Math.ceil((TOTAL_MS - elapsed) / 1000)}s</span>
          </div>
        </div>

        {/* Skip button */}
        <button
          onClick={handleSkip}
          className="mt-8 text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
        >
          Skip intro →
        </button>
      </div>
    </div>
  );
}
