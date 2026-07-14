import type { DraftEvaluation } from "../domain/draft-evaluation";
import type { ResumeValidator } from "./ports/resume-validator";

const positionFromMessage = (message: string, source: string) => {
  const explicit = message.match(/line\s+(\d+)\s+column\s+(\d+)/i);
  if (explicit)
    return { line: Number(explicit[1]), column: Number(explicit[2]) };
  const position = Number(message.match(/position\s+(\d+)/i)?.[1]);
  if (!Number.isFinite(position)) return { line: 1, column: 1 };
  const before = source.slice(0, position);
  const lines = before.split("\n");
  return { line: lines.length, column: (lines.at(-1)?.length ?? 0) + 1 };
};

export const evaluateResumeDraft = (
  rawText: string,
  validator: ResumeValidator,
): DraftEvaluation => {
  if (!rawText.trim()) return { status: "empty", diagnostics: [] };

  let candidate: unknown;
  try {
    candidate = JSON.parse(rawText);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid JSON";
    return {
      status: "invalid",
      reason: "syntax",
      diagnostics: [
        {
          path: "/",
          keyword: "syntax",
          message,
          ...positionFromMessage(message, rawText),
        },
      ],
    };
  }

  const result = validator.validate(candidate);
  return result.ok
    ? { status: "valid", diagnostics: [], resume: result.value }
    : { status: "invalid", reason: "schema", diagnostics: result.diagnostics };
};
