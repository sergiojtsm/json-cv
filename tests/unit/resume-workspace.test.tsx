// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ResumeWorkspace } from "../../src/resume-editor/ui/ResumeWorkspace";
import { AjvResumeValidator } from "../../src/resume-editor/adapters/validation/ajv-resume-validator";
import type { StoredDraft } from "../../src/resume-editor/application/ports/draft-repository";

const deps = (rawText: string) => ({
  validator: new AjvResumeValidator(),
  draftRepository: {
    load: vi.fn<() => StoredDraft | null>(() => ({
      version: 1,
      rawText,
      selectedTemplate: "editorial",
    })),
    save: vi.fn(),
    clear: vi.fn(),
  },
  fileGateway: { read: vi.fn(), download: vi.fn() },
  printGateway: { print: vi.fn() },
});

describe("ResumeWorkspace error surface", () => {
  afterEach(() => cleanup());
  it("shows the error badge for invalid JSON and no legacy panel", () => {
    render(<ResumeWorkspace dependencies={deps("{")} />);
    expect(
      screen.getByRole("button", { name: /Ver 1 problemas/ }),
    ).toBeTruthy();
    expect(document.querySelector(".validation-panel")).toBeNull();
  });

  it("hides the badge for valid JSON", () => {
    render(<ResumeWorkspace dependencies={deps('{"basics":{"name":"Ok"}}')} />);
    expect(
      screen.queryByRole("button", { name: /Ver .* problemas/ }),
    ).toBeNull();
  });
});
