import { ExternalLink, Plus, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ROUTES } from "../../constants/routes";
import { useTranslation } from "../../i18n";
import type { SkillGroup, SkillLevel } from "../../types/skill";
import { sortSkillLevelsByRank } from "../../utils/skillLevels";
import { SearchableSelect } from "../ui/SearchableSelect";
import { alertErrorClass } from "../ui/modalStyles";
import { EmployeeField } from "./employee-ui";
import {
  emptyEmployeeSkillRow,
  isEmployeeSkillRowComplete,
  type EmployeeSkillRow,
} from "./employeeSkills";

type EmployeeResumeSkillsEditorProps = {
  skills: EmployeeSkillRow[];
  onChange: (skills: EmployeeSkillRow[]) => void;
  skillGroups: SkillGroup[];
  loading: boolean;
  error?: string | null;
};

const skillTypePillClasses = [
  "bg-pink-100 text-pink-700 dark:bg-pink-950/50 dark:text-pink-300",
  "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300",
  "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300",
  "bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300",
  "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
];

const getSkillTypeClass = (index: number) =>
  skillTypePillClasses[index % skillTypePillClasses.length];

const sortLevels = (levels: SkillLevel[]) => sortSkillLevelsByRank(levels);

const skillKey = (skill: { id?: string; name: string }) => skill.id ?? skill.name;

function SkillLevelPicker({
  levels,
  value,
  disabled,
  onChange,
}: {
  levels: SkillLevel[];
  value: string;
  disabled: boolean;
  onChange: (levelId: string, levelName: string) => void;
}) {
  const { t } = useTranslation();

  if (disabled) {
    return (
      <p className="rounded-lg border border-dashed border-hr-border px-3 py-2 text-sm text-hr-muted">
        {t("employees.modal.skills.selectCategoryFirst")}
      </p>
    );
  }

  if (levels.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-hr-border px-3 py-2 text-sm text-hr-muted">
        {t("employees.modal.skills.levelsEmpty")}
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2" role="listbox" aria-label={t("employees.modal.fields.skillLevel")}>
      {sortLevels(levels).map((level) => {
        const levelId = skillKey(level);
        const selected = value === levelId;

        return (
          <button
            key={levelId}
            type="button"
            role="option"
            aria-selected={selected}
            title={t("employees.modal.skills.progressHint", {
              progress: String(level.progress),
            })}
            onClick={() => onChange(levelId, level.name)}
            className={[
              "rounded-full px-3 py-1.5 text-sm font-medium transition",
              selected
                ? "bg-hr-primary text-white shadow-sm"
                : "bg-hr-accent-bg text-hr-accent-text hover:opacity-90",
            ].join(" ")}
          >
            {level.name}
          </button>
        );
      })}
    </div>
  );
}

export function EmployeeResumeSkillsEditor({
  skills,
  onChange,
  skillGroups,
  loading,
  error,
}: EmployeeResumeSkillsEditorProps) {
  const { t } = useTranslation();

  const categoryOptions = useMemo(
    () =>
      skillGroups.map((group) => ({
        value: group.id,
        label: group.name,
        description: t("employees.modal.skills.skillsCount", {
          count: String(group.skills.length),
        }),
      })),
    [skillGroups, t],
  );

  const completedSkills = useMemo(
    () => skills.filter(isEmployeeSkillRowComplete),
    [skills],
  );

  const updateRow = (index: number, patch: Partial<EmployeeSkillRow>) => {
    const next = [...skills];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  const handleCategoryChange = (index: number, typeId: string) => {
    const group = skillGroups.find((entry) => entry.id === typeId);
    updateRow(index, {
      typeId,
      type: group?.name ?? "",
      skillId: "",
      name: "",
      levelId: "",
      level: "",
    });
  };

  const handleSkillChange = (index: number, skillId: string, group: SkillGroup) => {
    const skill = group.skills.find((entry) => skillKey(entry) === skillId);
    updateRow(index, {
      skillId,
      name: skill?.name ?? "",
      levelId: "",
      level: "",
    });
  };

  const handleQuickCategory = (typeId: string) => {
    const group = skillGroups.find((entry) => entry.id === typeId);
    if (!group) return;

    const incompleteIndex = skills.findIndex((row) => !isEmployeeSkillRowComplete(row));
    if (incompleteIndex >= 0) {
      handleCategoryChange(incompleteIndex, typeId);
      return;
    }

    onChange([
      ...skills,
      {
        ...emptyEmployeeSkillRow(),
        typeId,
        type: group.name,
      },
    ]);
  };

  const isDuplicate = (index: number, row: EmployeeSkillRow) => {
    if (!isEmployeeSkillRowComplete(row)) return false;

    return skills.some(
      (entry, entryIndex) =>
        entryIndex !== index &&
        entry.typeId === row.typeId &&
        entry.skillId === row.skillId &&
        entry.levelId === row.levelId,
    );
  };

  const canAddRow =
    skills.length === 0 ||
    skills.every((row) => isEmployeeSkillRowComplete(row));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-hr-border bg-hr-hover/40 px-4 py-3">
        <p className="text-sm text-hr-muted">{t("employees.modal.skills.linkedHint")}</p>
        <Link
          to={`${ROUTES.hr}?section=skills`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-hr-primary transition hover:text-hr-primary-hover"
        >
          {t("employees.modal.skills.manageLink")}
          <ExternalLink className="size-3.5" />
        </Link>
      </div>

      {error ? <p className={alertErrorClass}>{error}</p> : null}

      {completedSkills.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-hr-muted">
            {t("employees.modal.skills.selectedSummary")}
          </p>
          <div className="flex flex-wrap gap-2">
            {completedSkills.map((row, index) => (
              <span
                key={`${row.typeId}-${row.skillId}-${row.levelId}-${index}`}
                className="inline-flex items-center gap-1 rounded-full bg-hr-accent-bg px-3 py-1 text-xs font-medium text-hr-accent-text"
              >
                <span>{row.name}</span>
                <span className="text-hr-muted">·</span>
                <span>{row.level}</span>
                <span className="text-hr-muted">({row.type})</span>
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {skillGroups.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-hr-muted">
            {t("employees.modal.skills.quickCategories")}
          </p>
          <div className="flex flex-wrap gap-2">
            {skillGroups.map((group, index) => {
              const selected = skills.some((row) => row.typeId === group.id);
              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => handleQuickCategory(group.id)}
                  disabled={loading}
                  className={[
                    "rounded-full px-3 py-1.5 text-sm font-medium transition",
                    getSkillTypeClass(index),
                    selected ? "ring-2 ring-hr-primary ring-offset-1" : "opacity-90 hover:opacity-100",
                    loading ? "cursor-not-allowed opacity-60" : "",
                  ].join(" ")}
                >
                  {group.name}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="space-y-3">
        {skills.map((row, index) => {
          const group = skillGroups.find((entry) => entry.id === row.typeId);
          const skillOptions =
            group?.skills.map((skill) => ({
              value: skillKey(skill),
              label: skill.name,
            })) ?? [];
          const duplicate = isDuplicate(index, row);

          return (
            <div
              key={index}
              className={[
                "space-y-4 rounded-xl border p-4",
                duplicate ? "border-red-400/70 bg-red-50/40 dark:bg-red-950/20" : "border-hr-border",
              ].join(" ")}
            >
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr_auto]">
                <EmployeeField label={t("employees.modal.fields.skillCategory")}>
                  <SearchableSelect
                    value={row.typeId}
                    onChange={(value) => handleCategoryChange(index, value)}
                    options={categoryOptions}
                    placeholder={t("employees.modal.placeholders.selectSkillCategory")}
                    loading={loading}
                    emptyMessage={t("employees.modal.skills.categoryEmpty")}
                  />
                </EmployeeField>

                <EmployeeField label={t("employees.modal.fields.skillName")}>
                  <SearchableSelect
                    value={row.skillId}
                    onChange={(value) => {
                      if (!group) return;
                      handleSkillChange(index, value, group);
                    }}
                    options={skillOptions}
                    placeholder={t("employees.modal.placeholders.selectSkill")}
                    disabled={!row.typeId}
                    loading={loading}
                    emptyMessage={
                      row.typeId
                        ? t("employees.modal.skills.skillsEmpty")
                        : t("employees.modal.skills.selectCategoryFirst")
                    }
                  />
                </EmployeeField>

                <div className="flex items-end justify-end">
                  <button
                    type="button"
                    onClick={() => onChange(skills.filter((_, rowIndex) => rowIndex !== index))}
                    className="mb-1 rounded-lg p-2 text-red-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30"
                    aria-label={t("employees.modal.deleteSkill")}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>

              <EmployeeField label={t("employees.modal.fields.skillLevel")}>
                <SkillLevelPicker
                  levels={group?.levels ?? []}
                  value={row.levelId}
                  disabled={!row.typeId}
                  onChange={(levelId, levelName) =>
                    updateRow(index, { levelId, level: levelName })
                  }
                />
              </EmployeeField>

              {duplicate ? (
                <p className="text-sm text-red-500">{t("employees.modal.skills.duplicateSkill")}</p>
              ) : null}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        disabled={!canAddRow || loading}
        onClick={() => onChange([...skills, emptyEmployeeSkillRow()])}
        className="inline-flex items-center gap-2 rounded-xl border border-dashed border-hr-border px-4 py-2 text-sm text-hr-primary transition hover:border-hr-primary hover:bg-hr-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Plus className="size-4" />
        {t("employees.modal.addSkill")}
      </button>
    </div>
  );
}
