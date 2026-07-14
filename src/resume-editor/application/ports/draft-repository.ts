import type { TemplateId } from "../../../resume-templates/domain/resume-template";

export type StoredDraft = {
  version: 1;
  rawText: string;
  selectedTemplate: TemplateId;
};

export interface DraftRepository {
  load(): StoredDraft | null;
  save(draft: StoredDraft): void;
  clear(): void;
}
