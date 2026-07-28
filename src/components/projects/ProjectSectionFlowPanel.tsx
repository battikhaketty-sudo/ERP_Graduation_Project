import { useState } from "react";
import { useTranslation } from "../../i18n";
import type { Project, ProjectSection } from "../../types/project";
import { cardSurfaceClass } from "../ui/formStyles";
import { TableAddButton } from "../ui/TableToolbar";
import {
  SectionDependencyFlow,
  type SectionFlowFilter,
} from "./SectionDependencyFlow";

type ProjectSectionFlowPanelProps = {
  project: Project;
  onAddSection?: () => void;
  onEditSection?: (section: ProjectSection) => void;
  onDeleteSection?: (section: ProjectSection) => void;
};

const FILTERS: SectionFlowFilter[] = ["all", "ready", "blocked", "completed"];

export function ProjectSectionFlowPanel({
  project,
  onAddSection,
  onEditSection,
  onDeleteSection,
}: ProjectSectionFlowPanelProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<SectionFlowFilter>("all");

  return (
    <section className={`mb-5 ${cardSurfaceClass} overflow-hidden`}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-hr-border bg-hr-table-alt px-5 py-4">
        <div>
          <h3 className="text-base font-bold text-hr-text">
            {t("projects.detail.sectionFlow.title")}
          </h3>
          <p className="mt-1 text-sm text-hr-muted">
            {t("projects.detail.sectionFlow.subtitle")}
          </p>
        </div>
        {onAddSection ? (
          <TableAddButton
            label={t("projects.detail.sectionFlow.addSection")}
            onClick={onAddSection}
          />
        ) : null}
      </div>

      <div className="space-y-4 px-5 py-4">
        <p className="text-xs text-hr-muted">
          {t("projects.detail.sectionFlow.graphHint")}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("projects.detail.sectionFlow.searchPlaceholder")}
            className="h-10 min-w-[200px] flex-1 rounded-xl border border-hr-border bg-hr-input-bg px-3 text-sm text-hr-text outline-none focus:border-hr-primary"
          />
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={[
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition",
                  filter === key
                    ? "bg-hr-primary text-white"
                    : "bg-hr-table-alt text-hr-muted hover:text-hr-text",
                ].join(" ")}
              >
                {t(`projects.detail.sectionFlow.filters.${key}`)}
              </button>
            ))}
          </div>
        </div>

        {!project.sections.length ? (
          <div className="flex h-[280px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-hr-border bg-hr-table-alt px-4 text-center">
            <p className="text-sm text-hr-muted">
              {t("projects.detail.sectionFlow.noSections")}
            </p>
            {onAddSection ? (
              <TableAddButton
                label={t("projects.detail.sectionFlow.addFirstSection")}
                onClick={onAddSection}
              />
            ) : null}
          </div>
        ) : (
          <SectionDependencyFlow
            project={project}
            filter={filter}
            search={search}
            onEditSection={onEditSection ?? (() => undefined)}
            onDeleteSection={onDeleteSection ?? (() => undefined)}
          />
        )}
      </div>
    </section>
  );
}
