import { describe, expect, it } from "vitest";
import { evaluateResumeDraft } from "../../src/resume-editor/application/evaluate-resume-draft";
import { AjvResumeValidator } from "../../src/resume-editor/adapters/validation/ajv-resume-validator";

describe("evaluateResumeDraft", () => {
  const validator = new AjvResumeValidator();

  it("classifies whitespace as empty", () => {
    expect(evaluateResumeDraft("  \n", validator)).toEqual({
      status: "empty",
      diagnostics: [],
    });
  });

  it("returns a location-aware syntax diagnostic", () => {
    const result = evaluateResumeDraft(
      '{\n  "basics": {\n    "name": "Alex"\n  ',
      validator,
    );
    expect(result.status).toBe("invalid");
    if (result.status !== "invalid") throw new Error("Expected invalid result");
    expect(result.reason).toBe("syntax");
    expect(result.diagnostics[0]).toEqual(
      expect.objectContaining({
        keyword: "syntax",
        path: "/",
        line: expect.any(Number),
        column: expect.any(Number),
      }),
    );
  });

  it("returns every AJV schema diagnostic", () => {
    const result = evaluateResumeDraft(
      '{"basics":{"email":"bad"},"work":[{"startDate":"March"}]}',
      validator,
    );
    expect(result.status).toBe("invalid");
    if (result.status !== "invalid") throw new Error("Expected invalid result");
    expect(result.reason).toBe("schema");
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "/basics/email", keyword: "format" }),
        expect.objectContaining({
          path: "/work/0/startDate",
          keyword: "pattern",
        }),
      ]),
    );
  });

  it("returns a typed resume when parsing and validation succeed", () => {
    const result = evaluateResumeDraft(
      '{"basics":{"name":"Alex Morgan"}}',
      validator,
    );
    expect(result).toEqual({
      status: "valid",
      diagnostics: [],
      resume: { basics: { name: "Alex Morgan" } },
    });
  });
});
