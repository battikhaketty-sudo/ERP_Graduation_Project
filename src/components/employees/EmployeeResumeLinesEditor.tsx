import { Plus, Trash2 } from "lucide-react";
import { useTranslation } from "../../i18n";
import type { EmployeeResumeLine } from "../../types/employee";
import type { ResumeLineTypeOption } from "../../services/resumes/resume.service";
import { SearchableSelect } from "../ui/SearchableSelect";
import { ManualDateInput } from "../ui/ManualDateInput";
import { EmployeeField, inputClass } from "./employee-ui";

type EmployeeResumeLinesEditorProps = {
  lines: EmployeeResumeLine[];
  onChange: (lines: EmployeeResumeLine[]) => void;
  lineTypes: ResumeLineTypeOption[];
  loading?: boolean;
  disabled?: boolean;
};

export const createEmptyResumeLine = (
  lineTypes: ResumeLineTypeOption[] = [],
): EmployeeResumeLine => ({
  id: `local-${crypto.randomUUID()}`,
  title: "",
  description: "",
  type: lineTypes[0]?.id ?? 0,
  typeName: lineTypes[0]?.name ?? "",
  fromDate: "",
  toDate: "",
});

export function EmployeeResumeLinesEditor({
  lines,
  onChange,
  lineTypes,
  loading = false,
  disabled = false,
}: EmployeeResumeLinesEditorProps) {
  const { t } = useTranslation();

  const typeOptions = lineTypes.map((entry) => ({
    value: String(entry.id),
    label: entry.name,
  }));

  const updateLine = (index: number, patch: Partial<EmployeeResumeLine>) => {
    const next = [...lines];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  const locked = disabled || loading;

  return (
    <div className="space-y-3">
      {lines.length ? (
        lines.map((line, index) => (
          <article
            key={line.id}
            className="space-y-3 rounded-xl border border-hr-border bg-hr-table-alt p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <h4 className="text-sm font-semibold text-hr-text">
                {t("employees.detail.resumeLineItem", { index: String(index + 1) })}
              </h4>
              <button
                type="button"
                disabled={locked}
                onClick={() => onChange(lines.filter((_, i) => i !== index))}
                className="rounded-lg p-2 text-red-400 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-50 dark:hover:bg-red-950/30"
                aria-label={t("employees.detail.deleteResumeLine")}
              >
                <Trash2 className="size-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <EmployeeField
                label={t("employees.detail.resumeLineFields.title")}
                required
                htmlFor={`resume-line-title-${index}`}
              >
                <input
                  id={`resume-line-title-${index}`}
                  value={line.title}
                  disabled={locked}
                  onChange={(event) =>
                    updateLine(index, { title: event.target.value })
                  }
                  className={inputClass}
                  placeholder={t("employees.detail.resumeLineFields.titlePlaceholder")}
                />
              </EmployeeField>

              <EmployeeField label={t("employees.detail.resumeLineFields.type")} required>
                <SearchableSelect
                  value={line.type ? String(line.type) : ""}
                  disabled={locked}
                  loading={loading}
                  options={typeOptions}
                  placeholder={t("employees.detail.resumeLineFields.selectType")}
                  onChange={(value) => {
                    const selected = lineTypes.find(
                      (entry) => String(entry.id) === value,
                    );
                    updateLine(index, {
                      type: selected?.id ?? 0,
                      typeName: selected?.name ?? "",
                    });
                  }}
                />
              </EmployeeField>

              <EmployeeField label={t("employees.detail.resumeLineFields.fromDate")} required>
                <ManualDateInput
                  value={line.fromDate || ""}
                  disabled={locked}
                  max={line.toDate || undefined}
                  onChange={(fromDate) => updateLine(index, { fromDate })}
                />
              </EmployeeField>

              <EmployeeField label={t("employees.detail.resumeLineFields.toDate")}>
                <ManualDateInput
                  value={line.toDate || ""}
                  disabled={locked}
                  min={line.fromDate || undefined}
                  onChange={(toDate) => updateLine(index, { toDate })}
                />
              </EmployeeField>
            </div>

            <EmployeeField
              label={t("employees.detail.resumeLineFields.description")}
              htmlFor={`resume-line-desc-${index}`}
            >
              <textarea
                id={`resume-line-desc-${index}`}
                value={line.description || ""}
                disabled={locked}
                rows={3}
                onChange={(event) =>
                  updateLine(index, { description: event.target.value })
                }
                className={inputClass}
                placeholder={t(
                  "employees.detail.resumeLineFields.descriptionPlaceholder",
                )}
              />
            </EmployeeField>
          </article>
        ))
      ) : (
        <p className="text-sm text-hr-muted">{t("employees.detail.resumeLinesEmpty")}</p>
      )}

      <button
        type="button"
        disabled={locked || lineTypes.length === 0}
        onClick={() => onChange([...lines, createEmptyResumeLine(lineTypes)])}
        className="inline-flex items-center gap-2 rounded-xl border border-dashed border-hr-border px-4 py-2 text-sm text-hr-primary transition hover:border-hr-primary hover:bg-hr-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Plus className="size-4" />
        {t("employees.detail.addResumeLine")}
      </button>
    </div>
  );
}
