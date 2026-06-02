import { cn } from "@/lib/utils";
import type { Light } from "@shared/types";

export const SIGNAL_LABEL: Record<Light, string> = {
  green: "Healthy signal",
  yellow: "Caution signal",
  red: "Weak signal",
  neutral: "No signal",
};

const DOT: Record<Light, string> = {
  green: "bg-signal-green",
  yellow: "bg-signal-yellow",
  red: "bg-signal-red",
  neutral: "bg-signal-neutral",
};

const SIZE = { sm: "size-2.5", md: "size-3.5", lg: "size-6" } as const;

export function SignalDot({
  light,
  size = "md",
  className,
}: {
  light: Light;
  size?: keyof typeof SIZE;
  className?: string;
}) {
  return (
    <span
      role="img"
      aria-label={SIGNAL_LABEL[light]}
      data-light={light}
      className={cn("inline-block shrink-0 rounded-full", SIZE[size], DOT[light], className)}
    />
  );
}
