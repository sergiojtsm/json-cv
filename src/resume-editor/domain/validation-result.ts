import type { Resume } from "../../resume/domain/generated/resume";

export type ValidationDiagnostic = {
  path: string;
  keyword: string;
  message: string;
};

export type ResumeValidationResult =
  | { ok: true; value: Resume }
  | { ok: false; diagnostics: ValidationDiagnostic[] };
