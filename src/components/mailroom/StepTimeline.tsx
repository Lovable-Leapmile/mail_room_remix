import { useEffect, useRef, type ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type TimelineStep = { key: string; short: string };

/** Vertical accordion timeline: numbered rail + expanding body for the active step. */
export function StepTimeline({
  steps,
  activeIndex,
  renderBody,
  className,
}: {
  steps: TimelineStep[];
  activeIndex: number;
  renderBody: (key: string) => ReactNode;
  className?: string;
}) {
  const stripRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = stripRef.current?.querySelector<HTMLElement>(`[data-step="${activeIndex}"]`);
    const t = setTimeout(() => el?.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
    return () => clearTimeout(t);
  }, [activeIndex]);

  return (
    <div ref={stripRef} className={className}>
      {steps.map((s, i) => {
        const done = i < activeIndex;
        const active = i === activeIndex;
        const last = i === steps.length - 1;
        return (
          <div key={s.key} data-step={i} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all duration-300",
                  done && "bg-green-500 text-white",
                  active && "brand-gradient text-white shadow-[0_8px_20px_-8px_rgba(53,28,117,0.8)] scale-105",
                  !done && !active && "bg-muted text-muted-foreground",
                )}
              >
                {done ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </div>
              {!last && (
                <div className={cn("w-px flex-1 my-1 transition-colors duration-500", done ? "bg-green-400" : "bg-border")} />
              )}
            </div>
            <div className="flex-1 min-w-0 pb-4">
              <p
                className={cn(
                  "text-[15px] font-semibold leading-8 transition-colors",
                  active ? "text-foreground" : done ? "text-green-700" : "text-muted-foreground",
                )}
              >
                {s.short}
              </p>
              <div
                className={cn(
                  "grid transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
                  active ? "grid-rows-[1fr] opacity-100 mt-2" : "grid-rows-[0fr] opacity-0",
                )}
              >
                <div className="overflow-hidden">{active && renderBody(s.key)}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
