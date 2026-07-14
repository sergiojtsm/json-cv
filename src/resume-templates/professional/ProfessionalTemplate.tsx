import type { ResumeTemplateProps } from "../template-registry";
import { ResumeDocument } from "../shared/ResumeDocument";

export const ProfessionalTemplate = ({ resume }: ResumeTemplateProps) => (
  <div className="resume-page theme-professional">
    <ResumeDocument resume={resume} />
  </div>
);
