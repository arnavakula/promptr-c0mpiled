"use client";

const STEPS = [
  { key: "eliciting", label: "Questions" },
  { key: "awaiting_answers", label: "Your Answers" },
  { key: "planning", label: "Architecture" },
  { key: "synthesizing", label: "Prompts" },
  { key: "critiquing", label: "Review" },
  { key: "completed", label: "Done" },
];

const STATUS_INDEX: Record<string, number> = {
  eliciting: 0,
  awaiting_answers: 1,
  planning: 2,
  awaiting_approval: 2,
  synthesizing: 3,
  critiquing: 4,
  refining: 4,
  completed: 5,
  failed: -1,
};

export function WorkflowStepper({ status }: { status: string }) {
  const currentIdx = STATUS_INDEX[status] ?? -1;

  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-2">
      {STEPS.map((step, i) => {
        const isActive = i === currentIdx;
        const isDone = currentIdx > i;
        const isFailed = status === "failed";

        let dotClass = "bg-muted";
        let labelClass = "text-muted-foreground";

        if (isFailed && i === 0) {
          dotClass = "bg-red-500";
          labelClass = "text-red-600 font-medium";
        } else if (isDone) {
          dotClass = "bg-green-500";
          labelClass = "text-foreground";
        } else if (isActive) {
          dotClass = "bg-blue-500 animate-pulse";
          labelClass = "text-foreground font-medium";
        }

        return (
          <div key={step.key} className="flex items-center gap-1">
            {i > 0 && (
              <div
                className={`h-0.5 w-6 ${isDone ? "bg-green-500" : "bg-muted"}`}
              />
            )}
            <div className="flex flex-col items-center gap-1">
              <div className={`h-2.5 w-2.5 rounded-full ${dotClass}`} />
              <span className={`whitespace-nowrap text-[10px] ${labelClass}`}>
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
