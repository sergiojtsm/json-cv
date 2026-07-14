import { templateIds } from "../../resume-templates/domain/resume-template";
import type { StoredDraft } from "./ports/draft-repository";

export const parseStoredDraft = (value: unknown): StoredDraft | null => {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  if (record.version !== 1 || typeof record.rawText !== "string") return null;
  if (!templateIds.includes(record.selectedTemplate as never)) return null;

  return {
    version: 1,
    rawText: record.rawText,
    selectedTemplate:
      record.selectedTemplate as StoredDraft["selectedTemplate"],
  };
};
