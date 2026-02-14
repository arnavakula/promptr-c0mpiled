"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface SpecPreviewProps {
  specMd: string;
  techStack?: Record<string, string[]>;
}

export function SpecPreview({ specMd, techStack }: SpecPreviewProps) {
  const [expanded, setExpanded] = useState(false);

  const displayText = expanded ? specMd : specMd.slice(0, 800);
  const needsTruncation = specMd.length > 800;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          Generated Specification
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {techStack && Object.keys(techStack).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {Object.entries(techStack).map(([category, techs]) => {
              const items = Array.isArray(techs) ? techs : [String(techs)];
              return items.map((tech) => (
                <span
                  key={`${category}-${tech}`}
                  className="inline-block rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700"
                >
                  {tech}
                </span>
              ));
            })}
          </div>
        )}

        <pre className="whitespace-pre-wrap rounded-md bg-muted p-4 text-sm leading-relaxed">
          {displayText}
          {needsTruncation && !expanded && "..."}
        </pre>

        {needsTruncation && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "Show less" : "Show full spec"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
