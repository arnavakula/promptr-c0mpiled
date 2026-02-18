"use client";

const STEPS = [
  { key: "questions", label: "Questions" },
  { key: "answers", label: "Your answers" },
  { key: "architecture", label: "Architecture" },
  { key: "prompts", label: "Prompt generation" },
  { key: "review", label: "Quality review" },
  { key: "done", label: "Complete" },
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
  const isFailed = status === "failed";

  return (
    <div className="space-y-1">
      {STEPS.map((step, i) => {
        const isDone = currentIdx > i;
        const isActive = i === currentIdx;

        return (
          <div key={step.key} className="flex items-start gap-3">
            {/* Vertical line + circle */}
            <div className="flex flex-col items-center">
              {/* Circle */}
              <div className="relative flex h-6 w-6 shrink-0 items-center justify-center">
                {isDone ? (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500">
                    <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
                      <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                ) : isActive && !isFailed ? (
                  <div className="relative">
                    <div className="h-5 w-5 rounded-full bg-blue-500" />
                    <div className="absolute inset-0 h-5 w-5 animate-ping rounded-full bg-blue-500 opacity-20" />
                  </div>
                ) : isFailed && i === 0 ? (
                  <div className="h-5 w-5 rounded-full bg-red-500" />
                ) : (
                  <div className="h-5 w-5 rounded-full border-2 border-gray-200" />
                )}
              </div>
              {/* Connecting line */}
              {i < STEPS.length - 1 && (
                <div className={`w-px h-4 ${isDone ? "bg-blue-500" : "bg-gray-200"}`} />
              )}
            </div>

            {/* Label */}
            <span
              className={`pt-0.5 text-sm leading-tight ${
                isDone
                  ? "text-gray-900"
                  : isActive && !isFailed
                    ? "font-medium text-gray-900"
                    : "text-gray-400"
              }`}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
