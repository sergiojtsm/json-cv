// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useResumeEditor } from "../../src/resume-editor/application/use-resume-editor";
import { AjvResumeValidator } from "../../src/resume-editor/adapters/validation/ajv-resume-validator";
import type { StoredDraft } from "../../src/resume-editor/application/ports/draft-repository";

const dependencies = () => ({
  validator: new AjvResumeValidator(),
  draftRepository: {
    load: vi.fn<() => StoredDraft | null>(() => null),
    save: vi.fn<(draft: StoredDraft) => void>(),
    clear: vi.fn<() => void>(),
  },
  fileGateway: {
    read: vi.fn<(file: File) => Promise<string>>(),
    download: vi.fn<(resume: unknown) => void>(),
  },
  printGateway: { print: vi.fn<() => void>() },
});

describe("useResumeEditor", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("restores, validates, and debounces raw drafts", () => {
    const deps = dependencies();
    deps.draftRepository.load.mockReturnValue({
      version: 1,
      rawText: '{"basics":{"name":"Alex"}}',
      selectedTemplate: "minimal",
    });
    const { result } = renderHook(() => useResumeEditor(deps));
    expect(result.current.state.status).toBe("valid");
    expect(result.current.state.selectedTemplate).toBe("minimal");
    act(() => result.current.changeDraft("{"));
    act(() => vi.advanceTimersByTime(300));
    expect(deps.draftRepository.save).toHaveBeenCalledWith({
      version: 1,
      rawText: "{",
      selectedTemplate: "minimal",
    });
    expect(result.current.state.previewStale).toBe(true);
  });

  it("disables export and print for invalid current text", () => {
    const deps = dependencies();
    const { result } = renderHook(() => useResumeEditor(deps));
    act(() => result.current.changeDraft("{"));
    act(() => result.current.exportJson());
    act(() => result.current.print());
    expect(deps.fileGateway.download).not.toHaveBeenCalled();
    expect(deps.printGateway.print).not.toHaveBeenCalled();
  });

  it("imports text, exports valid JSON, and clears persisted data", async () => {
    const deps = dependencies();
    deps.fileGateway.read.mockResolvedValue(
      '{"basics":{"name":"Imported"}}',
    );
    const { result } = renderHook(() => useResumeEditor(deps));
    await act(() => result.current.importFile(new File(["x"], "resume.json")));
    act(() => result.current.exportJson());
    act(() => result.current.print());
    expect(deps.fileGateway.download).toHaveBeenCalledWith({
      basics: { name: "Imported" },
    });
    expect(deps.printGateway.print).toHaveBeenCalledOnce();
    act(() => result.current.clear());
    act(() => vi.advanceTimersByTime(300));
    expect(deps.draftRepository.clear).toHaveBeenCalledOnce();
    expect(deps.draftRepository.save).not.toHaveBeenCalled();
    expect(result.current.state.status).toBe("empty");
  });

  it("surfaces import failures without replacing the current draft", async () => {
    const deps = dependencies();
    deps.fileGateway.read.mockRejectedValue(new Error("Unreadable file"));
    const { result } = renderHook(() => useResumeEditor(deps));
    await act(() => result.current.importFile(new File(["x"], "resume.json")));
    expect(result.current.importError).toBe("Unreadable file");
    expect(result.current.state.status).toBe("empty");
  });

  it("continues in memory when browser storage fails", () => {
    const deps = dependencies();
    deps.draftRepository.save.mockImplementation(() => {
      throw new Error("quota");
    });
    const { result } = renderHook(() => useResumeEditor(deps));
    act(() =>
      result.current.changeDraft('{"basics":{"name":"In memory"}}'),
    );
    act(() => vi.advanceTimersByTime(300));
    expect(result.current.state.status).toBe("valid");
    expect(result.current.state.persistenceStatus).toBe("failed");
  });
});
