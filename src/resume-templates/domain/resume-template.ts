import type { ComponentType } from "react";
import type { Resume } from "../../resume/domain/generated/resume";

export const templateIds = ["editorial", "minimal", "professional"] as const;
export type TemplateId = (typeof templateIds)[number];
export type ResumeTemplateProps = { resume: Resume };
export type ResumeTemplateComponent = ComponentType<ResumeTemplateProps>;
