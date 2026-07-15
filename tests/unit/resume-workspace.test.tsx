// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ResumeWorkspace } from "../../src/resume-editor/ui/ResumeWorkspace";

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
