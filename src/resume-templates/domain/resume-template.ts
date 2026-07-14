export const templateIds = ["editorial", "minimal", "professional"] as const;
export type TemplateId = (typeof templateIds)[number];
