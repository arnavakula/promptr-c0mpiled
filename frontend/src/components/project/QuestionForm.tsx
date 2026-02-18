"use client";

import { useState } from "react";
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

export function QuestionForm({ projectId, questions, onSubmitted }: QuestionFormProps) {
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
      await api.patch(`/api/projects/${projectId}/respond`, { answers: answersText });
      onSubmitted();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Failed to submit answers. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">
        Answer these to help us understand your project better.
      </p>

      {questions.map((q) => (
        <div
          key={q.number}
          className="rounded-xl bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.1)]"
        >
          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">
            {q.topic}
          </div>
          <p className="text-sm text-gray-900">{q.text}</p>

          {q.options.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {q.options.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleOptionClick(q.number, opt)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                    answers[q.number] === opt
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          <textarea
            placeholder="Type your answer..."
            value={answers[q.number] || ""}
            onChange={(e) =>
              setAnswers((prev) => ({ ...prev, [q.number]: e.target.value }))
            }
            rows={2}
            className="mt-3 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      ))}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-blue-600 active:scale-[0.98] disabled:opacity-50"
      >
        {loading ? "Submitting..." : "Submit answers"}
      </button>
    </div>
  );
}
