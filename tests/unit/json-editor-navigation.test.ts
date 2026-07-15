import { describe, expect, it, vi } from "vitest";
import type { EditorView } from "@codemirror/view";
import { scrollViewToLine } from "../../src/resume-editor/ui/json-editor-navigation";

const fakeView = (lines: number, from: number) => {
  const dispatch = vi.fn();
  const view = {
    state: { doc: { lines, line: vi.fn(() => ({ from })) } },
    dispatch,
  } as unknown as EditorView;
  return {
    view,
    dispatch,
    lineFn: view.state.doc.line as unknown as ReturnType<typeof vi.fn>,
  };
};

describe("scrollViewToLine", () => {
  it("dispatches a selection at the requested line start", () => {
    const { view, dispatch, lineFn } = fakeView(10, 42);
    scrollViewToLine(view, 3);
    expect(lineFn).toHaveBeenCalledWith(3);
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch.mock.calls[0]![0]).toMatchObject({
      selection: { anchor: 42 },
    });
  });

  it("clamps the line number to the document bounds", () => {
    const { view, lineFn } = fakeView(5, 0);
    scrollViewToLine(view, 99);
    expect(lineFn).toHaveBeenCalledWith(5);
    scrollViewToLine(view, -4);
    expect(lineFn).toHaveBeenCalledWith(1);
  });
});
