export const ROUTES = {
  EDITOR: "editor/",
  FAVICON: "favicon.svg",
  FEASIBILITY: (template: string, fixture: string) =>
    `feasibility/${template}/${fixture}/`,
} as const;
