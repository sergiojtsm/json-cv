import { describe, expect, it } from "vitest";
import {
  evaluateResumeDraft,
  getJsonSyntaxErrorLocation,
} from "../../src/resume-editor/application/evaluate-resume-draft";
import { AjvResumeValidator } from "../../src/resume-editor/adapters/validation/ajv-resume-validator";
import type { ResumeValidator } from "../../src/resume-editor/application/ports/resume-validator";
import type { ValidationDiagnostic } from "../../src/resume-editor/domain/validation-result";

describe("getJsonSyntaxErrorLocation", () => {
  it("reads explicit Chromium-style line and column coordinates", () => {
    expect(
      getJsonSyntaxErrorLocation(
        "Expected property name or '}' in JSON at line 3 column 7",
        "ignored",
      ),
    ).toEqual({ line: 3, column: 7 });
  });

  it("derives multiline coordinates from a Node position", () => {
    expect(
      getJsonSyntaxErrorLocation(
        "Unexpected token 'x' in JSON at position 8",
        "{\n  \"a\":x",
      ),
    ).toEqual({ line: 2, column: 7 });
  });

  it("derives multiline EOF coordinates from the source length", () => {
    expect(
      getJsonSyntaxErrorLocation("Unexpected end of JSON input", '{\n  "a": '),
    ).toEqual({ line: 2, column: 8 });
  });

  it("omits coordinates for unrecognized message formats", () => {
    expect(getJsonSyntaxErrorLocation("Invalid JSON", "{")).toEqual({});
  });
});

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
        line: 4,
        column: 3,
      }),
    );
    expect(result.diagnostics[0]).not.toEqual(
      expect.objectContaining({ line: 1, column: 1 }),
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

  it("returns the validator diagnostics unchanged", () => {
    const diagnostics: ValidationDiagnostic[] = [
      { path: "/basics/email", keyword: "format", message: "bad email" },
      { path: "/work/0/startDate", keyword: "pattern", message: "bad date" },
    ];
    const stubValidator: ResumeValidator = {
      validate: () => ({ ok: false, diagnostics }),
    };

    const result = evaluateResumeDraft("{}", stubValidator);

    expect(result.status).toBe("invalid");
    if (result.status !== "invalid") throw new Error("Expected invalid result");
    expect(result.reason).toBe("schema");
    expect(result.diagnostics).toBe(diagnostics);
    expect(result.diagnostics).toEqual(diagnostics);
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
