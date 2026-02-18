"use client";

import { useState } from "react";

interface ParsedPrompt {
  number: number;
  title: string;
  content: string;
}

export function PromptCard({ prompt }: { prompt: ParsedPrompt }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(prompt.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Extract bullet points from content for the summary
  const lines = prompt.content.split("\n").filter((l) => l.trim());
  const summaryItems = lines
    .filter((l) => l.trim().startsWith("- ") || l.trim().startsWith("* "))
    .slice(0, 4)
    .map((l) => l.replace(/^[\s]*[-*]\s*/, "").replace(/\*\*/g, ""));

  // 2-line preview
  const preview = lines
    .filter((l) => !l.startsWith("#") && !l.startsWith("---") && l.trim().length > 0)
    .slice(0, 2)
    .join(" ")
    .slice(0, 140);

  return (
    <div className="rounded-xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.1)] transition-all duration-200">
      {/* Header - always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-start gap-4 p-6 text-left"
      >
        {/* Number badge */}
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-500 text-xs font-semibold text-white">
          {prompt.number}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-semibold text-gray-900">
            {prompt.title}
          </h3>

          {!expanded && (
            <>
              {summaryItems.length > 0 ? (
                <div className="mt-2 space-y-1">
                  {summaryItems.map((item, i) => (
                    <p key={i} className="flex items-start gap-1.5 text-xs text-gray-500">
                      <span className="mt-0.5 text-emerald-500 shrink-0">&#10003;</span>
                      <span className="line-clamp-1">{item}</span>
                    </p>
                  ))}
                </div>
              ) : (
                <p className="mt-1.5 line-clamp-2 text-sm text-gray-500">
                  {preview}...
                </p>
              )}
            </>
          )}
        </div>

        {/* Expand indicator */}
        <svg
          className={`h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          viewBox="0 0 16 16"
          fill="none"
        >
          <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-gray-100 px-6 pb-6">
          <pre className="mt-4 whitespace-pre-wrap font-mono text-[13px] leading-relaxed text-gray-700">
            {prompt.content}
          </pre>

          {/* Actions */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleCopy}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 transition-all duration-200 hover:bg-gray-100 hover:text-gray-700"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
