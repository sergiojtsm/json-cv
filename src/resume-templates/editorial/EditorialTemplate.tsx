import type { ResumeTemplateProps } from "../template-registry";
import { ResumeDocument } from "../shared/ResumeDocument";

export const EditorialTemplate = ({ resume }: ResumeTemplateProps) => (
  <div className="resume-page theme-editorial">
    <ResumeDocument resume={resume} />
  </div>
);
