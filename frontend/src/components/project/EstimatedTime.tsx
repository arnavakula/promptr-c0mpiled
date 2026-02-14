"use client";

import { useEffect, useState, useRef } from "react";

/**
 * Estimated durations per stage (seconds), based on observed averages.
 * planning = architect (~25s) + synthesizer (~125s) + critic (~10s) + refine (~125s) + critic2 (~7s)
 * The whole pipeline runs as one task, but we give stage-level estimates
 * so the user sees progress even when status doesn't change.
 */
const STAGE_ESTIMATES: Record<string, { total: number; label: string }> = {
  planning: { total: 300, label: "Generating architecture & prompts" },
  synthesizing: { total: 150, label: "Writing prompts" },
  critiquing: { total: 20, label: "Reviewing quality" },
  refining: { total: 140, label: "Refining prompts" },
};

function formatTime(seconds: number): string {
  if (seconds <= 0) return "almost done...";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m > 0) return `~${m}m ${s}s`;
  return `~${s}s`;
}

interface EstimatedTimeProps {
  status: string;
}

export function EstimatedTime({ status }: EstimatedTimeProps) {
  const estimate = STAGE_ESTIMATES[status];
  const [remaining, setRemaining] = useState(estimate?.total ?? 0);
  const startRef = useRef<string>(status);

  // Reset timer when status changes
  useEffect(() => {
    if (status !== startRef.current) {
      startRef.current = status;
      const est = STAGE_ESTIMATES[status];
      if (est) setRemaining(est.total);
    }
  }, [status]);

  // Initialize on mount
  useEffect(() => {
    const est = STAGE_ESTIMATES[status];
    if (est) setRemaining(est.total);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Countdown
  useEffect(() => {
    if (!estimate) return;
    const interval = setInterval(() => {
      setRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [estimate, status]);

  if (!estimate) return null;

  // Progress bar percentage (never quite reaches 100%)
  const elapsed = estimate.total - remaining;
  const pct = Math.min(95, (elapsed / estimate.total) * 100);

  return (
    <div className="mt-4 w-full max-w-xs space-y-2">
      {/* Progress bar */}
      <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-blue-500/60 transition-all duration-1000 ease-linear"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Time estimate */}
      <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <svg
          className="h-3 w-3 shrink-0"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M8 4.5V8L10.5 9.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span>{formatTime(remaining)}</span>
      </div>
    </div>
  );
}
