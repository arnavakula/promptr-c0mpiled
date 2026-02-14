"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import api from "@/lib/api-client";

interface Question {
  number: number;
  topic: string;
  text: string;
  options: string[];
}

interface QuestionFormProps {
  projectId: number;
  questions: Question[];
  onSubmitted: () => void;
}

export function QuestionForm({
  projectId,
  questions,
  onSubmitted,
}: QuestionFormProps) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleOptionClick = (qNum: number, option: string) => {
    setAnswers((prev) => ({
      ...prev,
      [qNum]: prev[qNum] === option ? "" : option,
    }));
  };

  const handleSubmit = async () => {
    setError("");
    setLoading(true);

    // Build a text block from answers
    const answersText = questions
      .map((q) => {
        const ans = answers[q.number] || "";
        return `Q${q.number} (${q.topic}): ${ans}`;
      })
      .join("\n");

    if (!answersText.trim() || Object.keys(answers).length === 0) {
      setError("Please answer at least one question.");
      setLoading(false);
      return;
    }

    try {
      await api.patch(`/api/projects/${projectId}/respond`, {
        answers: answersText,
      });
      onSubmitted();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Failed to submit answers";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Answer these questions to help us understand your project better.
      </p>

      {questions.map((q) => (
        <Card key={q.number}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {q.number}. {q.topic}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">{q.text}</p>

            {q.options.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {q.options.map((opt) => (
                  <Button
                    key={opt}
                    variant={answers[q.number] === opt ? "default" : "outline"}
                    size="sm"
                    type="button"
                    onClick={() => handleOptionClick(q.number, opt)}
                  >
                    {opt}
                  </Button>
                ))}
              </div>
            )}

            <Textarea
              placeholder="Type your answer..."
              value={answers[q.number] || ""}
              onChange={(e) =>
                setAnswers((prev) => ({
                  ...prev,
                  [q.number]: e.target.value,
                }))
              }
              rows={2}
            />
          </CardContent>
        </Card>
      ))}

      {error && <p className="text-sm text-red-500">{error}</p>}

      <Button onClick={handleSubmit} disabled={loading} className="w-full">
        {loading ? "Submitting..." : "Submit Answers"}
      </Button>
    </div>
  );
}
