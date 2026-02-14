"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ParsedPrompt {
  number: number;
  title: string;
  content: string;
}

export function PromptCard({ prompt }: { prompt: ParsedPrompt }) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(prompt.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayContent = expanded
    ? prompt.content
    : prompt.content.slice(0, 500);
  const needsTruncation = prompt.content.length > 500;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-medium">
            Prompt {prompt.number}: {prompt.title}
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="shrink-0"
          >
            {copied ? "Copied!" : "Copy"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <pre className="whitespace-pre-wrap rounded-md bg-muted p-4 text-xs leading-relaxed">
          {displayContent}
          {needsTruncation && !expanded && "..."}
        </pre>
        {needsTruncation && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "Show less" : "Show full prompt"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
