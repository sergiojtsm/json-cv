// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ErrorDropdown } from "../../src/resume-editor/ui/ErrorDropdown";

const baseProps = {
  id: "dd",
  importError: null,
  persistenceFailed: false,
  onNavigate: () => {},
  onClose: () => {},
};

describe("ErrorDropdown", () => {
  afterEach(() => cleanup());
  it("renders notice rows for import and persistence failures", () => {
    render(
      <ErrorDropdown
        {...baseProps}
        importError="Unable to import this file."
        persistenceFailed
        diagnostics={[]}
      />,
    );
    expect(screen.getByText("Unable to import this file.")).toBeTruthy();
    expect(screen.getByText(/Local saving failed/)).toBeTruthy();
  });

  it("navigates when a lined diagnostic is clicked", async () => {
    const onNavigate = vi.fn();
    render(
      <ErrorDropdown
        {...baseProps}
        onNavigate={onNavigate}
        diagnostics={[
          { path: "/", keyword: "syntax", message: "Bad token", line: 4 },
        ]}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /Bad token/ }));
    expect(onNavigate).toHaveBeenCalledWith(4);
  });

  it("renders lineless schema errors as non-interactive rows", () => {
    render(
      <ErrorDropdown
        {...baseProps}
        diagnostics={[
          { path: "/basics/name", keyword: "required", message: "is required" },
        ]}
      />,
    );
    expect(screen.getByText("/basics/name")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /is required/ })).toBeNull();
  });

  it("calls onClose from the close button", async () => {
    const onClose = vi.fn();
    render(<ErrorDropdown {...baseProps} onClose={onClose} diagnostics={[]} />);
    await userEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
