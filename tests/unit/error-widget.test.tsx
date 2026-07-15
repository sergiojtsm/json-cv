// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ErrorWidget } from "../../src/resume-editor/ui/ErrorWidget";

afterEach(() => cleanup());

const syntax = { path: "/", keyword: "syntax", message: "Bad token", line: 4 };

describe("ErrorWidget", () => {
  it("hides the badge and reports the empty summary when clean", () => {
    render(
      <ErrorWidget
        diagnostics={[]}
        importError={null}
        persistenceFailed={false}
        onNavigate={() => {}}
      />,
    );
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByRole("status").textContent).toBe("Sin errores");
  });

  it("opens the dropdown and navigates, then closes", async () => {
    const onNavigate = vi.fn();
    render(
      <ErrorWidget
        diagnostics={[syntax]}
        importError={null}
        persistenceFailed={false}
        onNavigate={onNavigate}
      />,
    );
    expect(screen.getByRole("status").textContent).toBe(
      "1 error de validación",
    );
    await userEvent.click(screen.getByRole("button", { name: /Ver 1/ }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: /Bad token/ }));
    expect(onNavigate).toHaveBeenCalledWith(4);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("auto-closes and hides when problems clear", async () => {
    const { rerender } = render(
      <ErrorWidget
        diagnostics={[syntax]}
        importError={null}
        persistenceFailed={false}
        onNavigate={() => {}}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /Ver 1/ }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    rerender(
      <ErrorWidget
        diagnostics={[]}
        importError={null}
        persistenceFailed={false}
        onNavigate={() => {}}
      />,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
