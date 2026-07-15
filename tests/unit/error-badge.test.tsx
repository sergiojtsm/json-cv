// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ErrorBadge } from "../../src/resume-editor/ui/ErrorBadge";

describe("ErrorBadge", () => {
  afterEach(() => cleanup());
  it("shows the capped count and wires aria state", () => {
    render(<ErrorBadge count={150} open controls="dd" onToggle={() => {}} />);
    const button = screen.getByRole("button");
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(button.getAttribute("aria-controls")).toBe("dd");
    expect(screen.getByText("99+")).toBeTruthy();
  });

  it("hides the number when count is zero but stays operable", async () => {
    const onToggle = vi.fn();
    render(
      <ErrorBadge count={0} open={false} controls="dd" onToggle={onToggle} />,
    );
    expect(screen.queryByText("0")).toBeNull();
    await userEvent.click(screen.getByRole("button"));
    expect(onToggle).toHaveBeenCalledOnce();
  });
});
