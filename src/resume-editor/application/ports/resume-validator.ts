import type { ResumeValidationResult } from "../../domain/validation-result";

export interface ResumeValidator {
  validate(candidate: unknown): ResumeValidationResult;
}
