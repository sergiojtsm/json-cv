import { describe, expect, it } from "vitest";
import { AjvResumeValidator } from "../../src/resume-editor/adapters/validation/ajv-resume-validator";

describe("AjvResumeValidator", () => {
  const validator = new AjvResumeValidator();

  it("accepts a resume matching the pinned official schema", () => {
    const result = validator.validate({
      basics: { name: "Alex Morgan", email: "alex@example.com" },
      work: [{ name: "Acme", startDate: "2022-03" }],
    });

    expect(result.ok).toBe(true);
  });

  it("returns every schema diagnostic with a JSON path", () => {
    const result = validator.validate({
      basics: { email: "not-an-email" },
      work: [{ startDate: "March 2022" }],
    });

    expect(result).toEqual({
      ok: false,
      diagnostics: expect.arrayContaining([
        expect.objectContaining({ path: "/basics/email", keyword: "format" }),
        expect.objectContaining({ path: "/work/0/startDate", keyword: "pattern" }),
      ]),
    });
  });
});
