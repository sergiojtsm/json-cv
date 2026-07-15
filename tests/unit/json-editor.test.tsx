// @vitest-environment jsdom
import { createRef } from "react";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  JsonEditor,
  type JsonEditorHandle,
} from "../../src/resume-editor/ui/JsonEditor";

describe("JsonEditor", () => {
  it("exposes an imperative scrollToLine handle", () => {
    const ref = createRef<JsonEditorHandle>();
    render(
      <JsonEditor
        ref={ref}
        value={'{\n  "a": 1\n}'}
        diagnostics={[]}
        onChange={() => {}}
      />,
    );
    expect(typeof ref.current?.scrollToLine).toBe("function");
    expect(() => ref.current?.scrollToLine(2)).not.toThrow();
  });
});
