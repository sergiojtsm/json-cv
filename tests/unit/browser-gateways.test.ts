// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { BrowserPrintGateway } from "../../src/resume-editor/adapters/browser/browser-print-gateway";
import { BrowserResumeFileGateway } from "../../src/resume-editor/adapters/browser/browser-resume-file-gateway";

describe("BrowserResumeFileGateway", () => {
  describe("read", () => {
    it("reads a local file as text", async () => {
      const gateway = new BrowserResumeFileGateway(document, URL);

      await expect(
        gateway.read(new File(['{"basics":{}}'], "resume.json")),
      ).resolves.toBe('{"basics":{}}');
    });
  });

  describe("download", () => {
    it("serializes the resume as UTF-8 two-space-indented JSON with a trailing newline", async () => {
      let blob: Blob | undefined;
      const createObjectURL = vi.fn((value: Blob) => {
        blob = value;
        return "blob:resume";
      });
      const revokeObjectURL = vi.fn();
      const click = vi
        .spyOn(HTMLAnchorElement.prototype, "click")
        .mockImplementation(() => undefined);
      const gateway = new BrowserResumeFileGateway(document, {
        createObjectURL,
        revokeObjectURL,
      });

      try {
        gateway.download({ basics: { name: "Alex" } });

        expect(blob?.type).toBe("application/json");
        await expect(blob?.text()).resolves.toBe(
          '{\n  "basics": {\n    "name": "Alex"\n  }\n}\n',
        );
      } finally {
        click.mockRestore();
      }
    });

    it("downloads under the resume.json filename and revokes the object URL", () => {
      const createObjectURL = vi.fn(() => "blob:resume");
      const revokeObjectURL = vi.fn();
      const click = vi
        .spyOn(HTMLAnchorElement.prototype, "click")
        .mockImplementation(() => undefined);
      const gateway = new BrowserResumeFileGateway(document, {
        createObjectURL,
        revokeObjectURL,
      });

      try {
        gateway.download({ basics: { name: "Alex" } });

        expect(createObjectURL).toHaveBeenCalledOnce();
        expect(click).toHaveBeenCalledOnce();
        const anchor = click.mock
          .instances[0] as unknown as HTMLAnchorElement;
        expect(anchor.download).toBe("resume.json");
        expect(anchor.href).toBe("blob:resume");
        expect(revokeObjectURL).toHaveBeenCalledWith("blob:resume");
      } finally {
        click.mockRestore();
      }
    });

    it("revokes the object URL even when the anchor click throws", () => {
      const createObjectURL = vi.fn(() => "blob:resume");
      const revokeObjectURL = vi.fn();
      const clickError = new Error("click failed");
      const click = vi
        .spyOn(HTMLAnchorElement.prototype, "click")
        .mockImplementation(() => {
          throw clickError;
        });
      const gateway = new BrowserResumeFileGateway(document, {
        createObjectURL,
        revokeObjectURL,
      });

      try {
        expect(() => gateway.download({ basics: {} })).toThrow(clickError);
        expect(revokeObjectURL).toHaveBeenCalledWith("blob:resume");
      } finally {
        click.mockRestore();
      }
    });
  });
});

describe("BrowserPrintGateway", () => {
  it("delegates printing to the browser", () => {
    const print = vi.fn();

    new BrowserPrintGateway({ print }).print();

    expect(print).toHaveBeenCalledOnce();
  });

  it("propagates errors thrown by the browser print call", () => {
    const printError = new Error("print failed");
    const print = vi.fn(() => {
      throw printError;
    });

    expect(() => new BrowserPrintGateway({ print }).print()).toThrow(
      printError,
    );
  });
});
