import type { ComponentType } from "react";
import type { Resume } from "../../resume/domain/generated/resume";

export type ResumeTemplateProps = { resume: Resume };
export type ResumeTemplateComponent = ComponentType<ResumeTemplateProps>;
