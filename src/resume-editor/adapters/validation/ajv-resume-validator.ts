import Ajv, { type ErrorObject, type ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import resumeSchema from "@jsonresume/schema/schema.json";
import type { Resume } from "../../../resume/domain/generated/resume";
import type { ResumeValidator } from "../../application/ports/resume-validator";
import type { ResumeValidationResult, ValidationDiagnostic } from "../../domain/validation-result";

const toDiagnostic = (error: ErrorObject): ValidationDiagnostic => ({
  path: error.instancePath || "/",
  keyword: error.keyword,
  message: error.message ?? "Invalid value",
});

export class AjvResumeValidator implements ResumeValidator {
  private readonly validateSchema: ValidateFunction<Resume>;

  constructor() {
    const ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(ajv);
    this.validateSchema = ajv.compile<Resume>(resumeSchema);
  }

  validate(candidate: unknown): ResumeValidationResult {
    if (this.validateSchema(candidate)) {
      return { ok: true, value: candidate };
    }

    return {
      ok: false,
      diagnostics: (this.validateSchema.errors ?? []).map(toDiagnostic),
    };
  }
}
