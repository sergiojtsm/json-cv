import type { Resume } from "../../resume/domain/generated/resume";
import type { ValidationDiagnostic } from "./validation-result";

export type DraftEvaluation =
  | { status: "empty"; diagnostics: [] }
  | { status: "valid"; diagnostics: []; resume: Resume }
  | {
      status: "invalid";
      reason: "syntax" | "schema";
      diagnostics: ValidationDiagnostic[];
    };
