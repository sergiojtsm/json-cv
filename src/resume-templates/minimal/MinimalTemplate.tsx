import type { ResumeTemplateProps } from "../domain/resume-template";
import { ResumeDocument } from "../shared/ResumeDocument";

export const MinimalTemplate = ({ resume }: ResumeTemplateProps) => (
  <div className="resume-page theme-minimal">
    <ResumeDocument resume={resume} />
  </div>
);
