import type { ResumeTemplateProps } from "../adapters/resume-template-component";
import { ResumeDocument } from "../shared/ResumeDocument";

export const MinimalTemplate = ({ resume }: ResumeTemplateProps) => (
  <div className="resume-page theme-minimal">
    <ResumeDocument resume={resume} />
  </div>
);
