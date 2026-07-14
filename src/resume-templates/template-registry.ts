import type { ComponentType } from "react";
import type { Resume } from "../resume/domain/generated/resume";
import type { TemplateId } from "./domain/resume-template";
import { EditorialTemplate } from "./editorial/EditorialTemplate";
import { MinimalTemplate } from "./minimal/MinimalTemplate";
import { ProfessionalTemplate } from "./professional/ProfessionalTemplate";

export type ResumeTemplateProps = { resume: Resume };
export type ResumeTemplateComponent = ComponentType<ResumeTemplateProps>;

export const templateRegistry: Record<TemplateId, ResumeTemplateComponent> = {
  editorial: EditorialTemplate,
  minimal: MinimalTemplate,
  professional: ProfessionalTemplate,
};
