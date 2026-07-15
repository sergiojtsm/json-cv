import type { Resume } from "../../../resume/domain/generated/resume";
import type { ResumeFileGateway } from "../../application/ports/resume-file-gateway";

type UrlApi = Pick<typeof URL, "createObjectURL" | "revokeObjectURL">;

export class BrowserResumeFileGateway implements ResumeFileGateway {
  constructor(
    private readonly document: Document,
    private readonly url: UrlApi,
  ) {}

  read(file: File): Promise<string> {
    return file.text();
  }

  download(resume: Resume): void {
    const href = this.url.createObjectURL(
      new Blob([`${JSON.stringify(resume, null, 2)}\n`], {
        type: "application/json",
      }),
    );
    try {
      const anchor = this.document.createElement("a");
      anchor.href = href;
      anchor.download = "resume.json";
      anchor.click();
    } finally {
      this.url.revokeObjectURL(href);
    }
  }
}
