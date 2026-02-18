"use client";

import { useState } from "react";

interface SpecPreviewProps {
  specMd: string;
  techStack?: Record<string, string[]>;
}

export function SpecPreview({ specMd, techStack }: SpecPreviewProps) {
  const [expanded, setExpanded] = useState(false);
  const displayText = expanded ? specMd : specMd.slice(0, 600);
  const needsTruncation = specMd.length > 600;

  return (
    <div className="rounded-xl bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.1)]">
      <div className="mb-4 text-xs font-medium uppercase tracking-wide text-gray-400">
        Generated specification
      </div>

      {techStack && Object.keys(techStack).length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {Object.entries(techStack).map(([category, techs]) => {
            const items = Array.isArray(techs) ? techs : [String(techs)];
            return items.map((tech) => (
              <span
                key={`${category}-${tech}`}
                className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600"
              >
                {tech}
              </span>
            ));
          })}
        </div>
      )}

      <pre className="whitespace-pre-wrap font-mono text-[13px] leading-relaxed text-gray-700">
        {displayText}
        {needsTruncation && !expanded && "..."}
      </pre>

      {needsTruncation && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 text-sm text-gray-500 transition-colors duration-200 hover:text-gray-900"
        >
          {expanded ? "Show less" : "Show full spec"}
        </button>
      )}
    </div>
  );
}
