// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ResumeWorkspace } from "../../src/resume-editor/ui/ResumeWorkspace";
import { AjvResumeValidator } from "../../src/resume-editor/adapters/validation/ajv-resume-validator";
import type { StoredDraft } from "../../src/resume-editor/application/ports/draft-repository";

vi.mock("../../src/resume-editor/ui/JsonEditor", () => ({
  JsonEditor: ({
    value,
    onChange,
  }: {
    value: string;
    onChange(value: string): void;
  }) => (
    <textarea
      aria-label="JSON editor"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

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

describe("ResumeWorkspace", () => {
  afterEach(() => cleanup());
  beforeEach(() => localStorage.clear());

  it("shows valid preview, switches templates, and exposes actions", async () => {
    render(<ResumeWorkspace />);
    fireEvent.change(screen.getByLabelText("JSON editor"), {
      target: { value: '{"basics":{"name":"Alex Morgan"}}' },
    });
    expect(await screen.findByText("Alex Morgan")).not.toBeNull();
    fireEvent.click(screen.getByRole("radio", { name: "Minimal" }));
    expect(
      screen.getByTestId("resume-preview").querySelector(".theme-minimal"),
    ).not.toBeNull();
    expect(
      (
        screen.getByRole("button", {
          name: "Export JSON",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false);
    expect(
      (
        screen.getByRole("button", {
          name: "Save as PDF",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false);
  });

  it("keeps stale preview visible and disables output actions", async () => {
    render(<ResumeWorkspace />);
    fireEvent.change(screen.getByLabelText("JSON editor"), {
      target: { value: '{"basics":{"name":"Alex"}}' },
    });
    fireEvent.change(screen.getByLabelText("JSON editor"), {
      target: { value: "{" },
    });
    expect(
      await screen.findByText("Preview shows the last valid version."),
    ).not.toBeNull();
    expect(
      (
        screen.getByRole("button", {
          name: "Export JSON",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(
      (
        screen.getByRole("button", {
          name: "Save as PDF",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });
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
