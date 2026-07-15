// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import { LocalStorageDraftRepository } from "../../src/resume-editor/adapters/persistence/local-storage-draft-repository";
import { parseStoredDraft } from "../../src/resume-editor/application/parse-stored-draft";

describe("parseStoredDraft", () => {
  it("rejects arrays with assigned draft fields", () => {
    const value = [] as unknown as Record<string, unknown>;
    value.version = 1;
    value.rawText = "{}";
    value.selectedTemplate = "minimal";

    expect(parseStoredDraft(value)).toBeNull();
  });

  it("rejects records whose required fields are inherited", () => {
    const value = Object.create({
      version: 1,
      rawText: "{}",
      selectedTemplate: "minimal",
    });

    expect(parseStoredDraft(value)).toBeNull();
  });
});

describe("LocalStorageDraftRepository", () => {
  beforeEach(() => localStorage.clear());

  it("round-trips a versioned draft while preserving invalid raw text", () => {
    const repository = new LocalStorageDraftRepository(localStorage);

    repository.save({
      version: 1,
      rawText: "{",
      selectedTemplate: "professional",
    });

    expect(repository.load()).toEqual({
      version: 1,
      rawText: "{",
      selectedTemplate: "professional",
    });
  });

  it.each([
    ["malformed JSON", "bad"],
    ["an unsupported version", '{"version":2}'],
    [
      "an unknown template",
      '{"version":1,"rawText":"{}","selectedTemplate":"unknown"}',
    ],
  ])("ignores %s", (_case, value) => {
    const repository = new LocalStorageDraftRepository(localStorage);

    localStorage.setItem("json-cv:draft", value);

    expect(repository.load()).toBeNull();
  });

  it("returns only supported draft fields", () => {
    const repository = new LocalStorageDraftRepository(localStorage);
    localStorage.setItem(
      "json-cv:draft",
      '{"version":1,"rawText":"{}","selectedTemplate":"minimal","extra":true}',
    );

    expect(repository.load()).toEqual({
      version: 1,
      rawText: "{}",
      selectedTemplate: "minimal",
    });
  });

  it("clears only the editor key", () => {
    const repository = new LocalStorageDraftRepository(localStorage);
    localStorage.setItem("other", "keep");
    repository.save({
      version: 1,
      rawText: "{}",
      selectedTemplate: "editorial",
    });

    repository.clear();

    expect(repository.load()).toBeNull();
    expect(localStorage.getItem("other")).toBe("keep");
  });

  it.each([
    ["load", (repository: LocalStorageDraftRepository) => repository.load()],
    [
      "save",
      (repository: LocalStorageDraftRepository) =>
        repository.save({
          version: 1,
          rawText: "{}",
          selectedTemplate: "editorial",
        }),
    ],
    ["clear", (repository: LocalStorageDraftRepository) => repository.clear()],
  ])("propagates storage exceptions from %s", (_method, invoke) => {
    const storageError = new Error("Storage unavailable");
    const storage = {
      getItem: () => {
        throw storageError;
      },
      setItem: () => {
        throw storageError;
      },
      removeItem: () => {
        throw storageError;
      },
    } as unknown as Storage;
    const repository = new LocalStorageDraftRepository(storage);

    expect(() => invoke(repository)).toThrow(storageError);
  });
});
