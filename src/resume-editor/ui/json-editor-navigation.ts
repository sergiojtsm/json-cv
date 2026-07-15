import { EditorView } from "@codemirror/view";

export const scrollViewToLine = (view: EditorView, line: number): void => {
  const lineNumber = Math.min(Math.max(line, 1), view.state.doc.lines);
  const info = view.state.doc.line(lineNumber);
  view.dispatch({
    selection: { anchor: info.from },
    effects: EditorView.scrollIntoView(info.from, { y: "center" }),
  });
};
