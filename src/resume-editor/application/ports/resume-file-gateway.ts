import type { Resume } from "../../../resume/domain/generated/resume";

export interface ResumeFileGateway {
  read(file: File): Promise<string>;
  download(resume: Resume): void;
}
