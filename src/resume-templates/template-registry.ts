import type { ResumeTemplateComponent } from "./adapters/resume-template-component";
import type { TemplateId } from "./domain/resume-template";
import { EditorialTemplate } from "./editorial/EditorialTemplate";
import { MinimalTemplate } from "./minimal/MinimalTemplate";
import { ProfessionalTemplate } from "./professional/ProfessionalTemplate";

export const templateRegistry: Record<TemplateId, ResumeTemplateComponent> = {
  editorial: EditorialTemplate,
  minimal: MinimalTemplate,
  professional: ProfessionalTemplate,
};
