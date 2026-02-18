"use client";

import { useEffect, useState, useRef } from "react";

const STAGES = [
  { key: "planning", label: "Architecting spec" },
  { key: "synthesizing", label: "Synthesizing prompts" },
  { key: "critiquing", label: "Critiquing quality" },
  { key: "refining", label: "Refining output" },
] as const;

const STAGE_INDEX: Record<string, number> = {
  planning: 0,
  awaiting_approval: 0,
  synthesizing: 1,
  critiquing: 2,
  refining: 3,
};

const STAGE_ESTIMATES: Record<string, { total: number }> = {
  planning: { total: 300 },
  synthesizing: { total: 150 },
  critiquing: { total: 20 },
  refining: { total: 140 },
};

function formatTime(seconds: number): string {
  if (seconds <= 0) return "Wrapping up...";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m > 0) return `~${m}m ${s}s remaining`;
  return `~${s}s remaining`;
}

export function EstimatedTime({ status }: { status: string }) {
  const estimate = STAGE_ESTIMATES[status];
  const [remaining, setRemaining] = useState(estimate?.total ?? 0);
  const startRef = useRef(status);
  const currentIdx = STAGE_INDEX[status] ?? -1;

  useEffect(() => {
    if (status !== startRef.current) {
      startRef.current = status;
      const est = STAGE_ESTIMATES[status];
      if (est) setRemaining(est.total);
    }
  }, [status]);

  useEffect(() => {
    const est = STAGE_ESTIMATES[status];
    if (est) setRemaining(est.total);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!estimate) return;
    const interval = setInterval(() => {
      setRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [estimate, status]);

  if (!estimate) return null;

  const elapsed = estimate.total - remaining;
  const pct = Math.min(92, (elapsed / estimate.total) * 100);

  return (
    <div className="mt-5 w-full max-w-[280px] space-y-3">
      {/* Agent pipeline */}
      <div className="space-y-1">
        {STAGES.map((stage, i) => {
          const isDone = currentIdx > i;
          const isActive = currentIdx === i;

          return (
            <div key={stage.key} className="flex items-center gap-2">
              {isDone ? (
                <svg className="h-3.5 w-3.5 shrink-0 text-blue-500" viewBox="0 0 14 14" fill="none">
                  <path d="M3 7L6 10L11 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : isActive ? (
                <div className="flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                  <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
                </div>
              ) : (
                <div className="flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                  <div className="h-1.5 w-1.5 rounded-full bg-gray-200" />
                </div>
              )}
              <span
                className={`text-xs ${
                  isActive
                    ? "font-medium text-gray-700"
                    : isDone
                      ? "text-gray-400 line-through"
                      : "text-gray-300"
                }`}
              >
                {stage.label}{isActive ? "..." : ""}
              </span>
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="h-1 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-blue-500/50 transition-all duration-1000 ease-linear"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-center text-xs text-gray-400">{formatTime(remaining)}</p>
    </div>
  );
}
