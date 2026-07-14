import { parseStoredDraft } from "../../application/parse-stored-draft";
import type {
  DraftRepository,
  StoredDraft,
} from "../../application/ports/draft-repository";

export class LocalStorageDraftRepository implements DraftRepository {
  constructor(
    private readonly storage: Storage,
    private readonly key = "json-cv:draft",
  ) {}

  load(): StoredDraft | null {
    const raw = this.storage.getItem(this.key);
    if (!raw) return null;

    try {
      return parseStoredDraft(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  save(draft: StoredDraft): void {
    this.storage.setItem(this.key, JSON.stringify(draft));
  }

  clear(): void {
    this.storage.removeItem(this.key);
  }
}
