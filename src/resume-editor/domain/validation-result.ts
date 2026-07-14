import type { Resume } from "../../resume/domain/generated/resume";

export type ValidationDiagnostic = {
  path: string;
  keyword: string;
  message: string;
  line?: number;
  column?: number;
};

export type ResumeValidationResult =
  | { ok: true; value: Resume }
  | { ok: false; diagnostics: ValidationDiagnostic[] };
