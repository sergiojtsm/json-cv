import {
  templateIds,
  type TemplateId,
} from "../../resume-templates/domain/resume-template";
const names: Record<TemplateId, string> = {
  editorial: "Editorial",
  minimal: "Minimal",
  professional: "Professional",
};
type Props = { value: TemplateId; onChange(template: TemplateId): void };
export function TemplateSelector({ value, onChange }: Props) {
  return (
    <fieldset className="template-selector">
      <legend>Template</legend>
      {templateIds.map((template) => (
        <label key={template}>
          <input
            type="radio"
            name="template"
            checked={value === template}
            onChange={() => onChange(template)}
          />
          {names[template]}
        </label>
      ))}
    </fieldset>
  );
}
