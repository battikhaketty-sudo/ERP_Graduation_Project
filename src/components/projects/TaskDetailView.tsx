import { useEffect, useState } from "react";
import { useTranslation } from "../../i18n";
import {
  employeePath,
  projectSectionPath,
  projectTaskPath,
} from "../../constants/entityPaths";
import { getProjectTaskById } from "../../services/projects";
import type { Project, ProjectTask, ProjectTaskDetail } from "../../types/project";
import { getThrownErrorMessage } from "../../utils/apiResponse";
import { DetailBackButton } from "../ui/DetailBackButton";
import { StatusBanner } from "../ui/StatusBanner";
import { cardSurfaceClass, subtlePanelClass } from "../ui/formStyles";
import { CopyableIdCell } from "../ui/CopyableIdCell";
import { EntityLink } from "../ui/EntityLink";
import { PriorityBadge } from "./ProjectBadges";

type TaskDetailViewProps = {
  project: Project;
  taskId: string;
  onBack: () => void;
  onOpenTask: (taskId: string) => void;
  onEdit?: (task: ProjectTask) => void;
  onDelete?: (task: ProjectTask) => void;
};

const dependencyTypeKey = (type: string) =>
  `projects.taskDetail.dependencyTypes.${type}` as const;

export function TaskDetailView({
  project,
  taskId,
  onBack,
  onOpenTask,
  onEdit,
  onDelete,
}: TaskDetailViewProps) {
  const { t } = useTranslation();
  const [task, setTask] = useState<ProjectTaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const detail = await getProjectTaskById(taskId, project.id);
        if (!cancelled) setTask(detail);
      } catch (err) {
        if (!cancelled) {
          setTask(null);
          setError(getThrownErrorMessage(err, t("projects.taskDetail.loadError")));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [project.id, t, taskId]);

  if (loading) {
    return (
      <main className="min-w-0 flex-1 bg-hr-bg px-4 py-4 sm:px-6 sm:py-6">
        <DetailBackButton label={t("projects.taskDetail.backLabel")} onClick={onBack} />
        <div className={`${cardSurfaceClass} p-10 text-center text-sm text-hr-muted`}>
          {t("common.loading")}
        </div>
      </main>
    );
  }

  if (!task) {
    return (
      <main className="min-w-0 flex-1 bg-hr-bg px-4 py-4 sm:px-6 sm:py-6">
        <DetailBackButton label={t("projects.taskDetail.backLabel")} onClick={onBack} />
        <StatusBanner
          variant="error"
          message={error || t("projects.taskDetail.loadError")}
        />
      </main>
    );
  }

  const sectionName =
    task.sectionName ||
    project.sections.find((section) => section.id === task.sectionId)?.name ||
    t("common.dash");

  return (
    <main className="min-w-0 flex-1 bg-hr-bg px-4 py-4 sm:px-6 sm:py-6">
      <DetailBackButton label={t("projects.taskDetail.backLabel")} onClick={onBack} />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-hr-primary px-5 py-4 text-white">
        <div>
          <p className="text-xs text-white/70">{t("projects.taskDetail.title")}</p>
          <h1 className="text-xl font-bold">{task.title}</h1>
        </div>
        <div className="flex gap-2">
          {onEdit ? (
            <button
              type="button"
              onClick={() => onEdit(task)}
              className="rounded-xl bg-hr-surface px-5 py-2 text-sm font-bold text-hr-primary"
            >
              {t("common.edit")}
            </button>
          ) : null}
          {onDelete ? (
            <button
              type="button"
              onClick={() => onDelete(task)}
              className="rounded-xl bg-hr-surface px-5 py-2 text-sm font-bold text-red-500"
            >
              {t("common.delete")}
            </button>
          ) : null}
        </div>
      </div>

      {error ? <StatusBanner variant="error" message={error} className="mb-4" /> : null}

      <section className={`mb-5 ${cardSurfaceClass} p-5`}>
        <h2 className="mb-4 text-base font-bold text-hr-text">
          {t("projects.taskDetail.sections.general")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoItem label={t("projects.taskDetail.fields.id")} value={task.id} copyable />
          <InfoItem label={t("projects.taskDetail.fields.title")} value={task.title} />
          <InfoItem
            label={t("projects.taskDetail.fields.description")}
            value={task.description || t("common.dash")}
          />
          <div className={subtlePanelClass}>
            <p className="mb-1 text-xs text-hr-muted">
              {t("projects.taskDetail.fields.priority")}
            </p>
            <PriorityBadge priority={task.priority} />
          </div>
          <InfoItem
            label={t("projects.taskDetail.fields.section")}
            value={sectionName}
            to={projectSectionPath(project.id, task.sectionId)}
          />
          <InfoItem
            label={t("projects.taskDetail.fields.expectedHours")}
            value={String(task.expectedHours)}
          />
          <InfoItem
            label={t("projects.taskDetail.fields.startDate")}
            value={task.startDate || t("common.dash")}
          />
          <InfoItem
            label={t("projects.taskDetail.fields.dueDate")}
            value={task.dueDate || t("common.dash")}
          />
          <InfoItem
            label={t("projects.taskDetail.fields.createdAt")}
            value={task.createdAt || t("common.dash")}
          />
        </div>
      </section>

      <section className={`mb-5 ${cardSurfaceClass}`}>
        <div className="border-b border-hr-border px-5 py-4">
          <h2 className="text-base font-bold text-hr-text">
            {t("projects.taskDetail.sections.dependencies")}
          </h2>
        </div>
        <div className="overflow-hidden">
          <table className="w-full table-fixed border-collapse text-sm">
            <thead>
              <tr className="hr-table-head">
                <th className="px-3 py-3 text-center font-medium">
                  {t("projects.taskDetail.dependencyColumns.id")}
                </th>
                <th className="px-3 py-3 text-center font-medium">
                  {t("projects.taskDetail.dependencyColumns.title")}
                </th>
                <th className="px-3 py-3 text-center font-medium">
                  {t("projects.taskDetail.dependencyColumns.type")}
                </th>
                <th className="px-3 py-3 text-center font-medium">
                  {t("projects.taskDetail.dependencyColumns.createdAt")}
                </th>
              </tr>
            </thead>
            <tbody>
              {task.dependencies.length ? (
                task.dependencies.map((dependency, index) => (
                  <tr
                    key={`${dependency.taskId}-${index}`}
                    className={`${index % 2 ? "hr-table-row-alt" : "hr-table-row"} cursor-pointer hover:bg-hr-hover`}
                    onClick={() => onOpenTask(dependency.taskId)}
                  >
                    <td className="px-3 py-3 text-center">
                      <CopyableIdCell
                        value={dependency.taskId}
                        to={projectTaskPath(project.id, dependency.taskId)}
                      />
                    </td>
                    <td className="truncate px-3 py-3 text-center font-medium">
                      <EntityLink to={projectTaskPath(project.id, dependency.taskId)}>
                        {dependency.taskTitle}
                      </EntityLink>
                    </td>
                    <td className="px-3 py-3 text-center">
                      {t(dependencyTypeKey(dependency.dependencyType))}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {dependency.createdAt || t("common.dash")}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-3 py-10 text-center text-hr-muted">
                    {t("projects.taskDetail.emptyDependencies")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className={`mb-5 ${cardSurfaceClass}`}>
        <div className="border-b border-hr-border px-5 py-4">
          <h2 className="text-base font-bold text-hr-text">
            {t("projects.taskDetail.sections.assignees")}
          </h2>
        </div>
        <div className="overflow-hidden">
          <table className="w-full table-fixed border-collapse text-sm">
            <thead>
              <tr className="hr-table-head">
                <th className="px-3 py-3 text-center font-medium">
                  {t("projects.taskDetail.assigneeColumns.memberId")}
                </th>
                <th className="px-3 py-3 text-center font-medium">
                  {t("projects.taskDetail.assigneeColumns.employeeId")}
                </th>
                <th className="px-3 py-3 text-center font-medium">
                  {t("projects.taskDetail.assigneeColumns.employeeName")}
                </th>
                <th className="px-3 py-3 text-center font-medium">
                  {t("projects.taskDetail.assigneeColumns.assignedAt")}
                </th>
              </tr>
            </thead>
            <tbody>
              {task.assignments.length ? (
                task.assignments.map((assignment, index) => (
                  <tr
                    key={`${assignment.memberId}-${index}`}
                    className={index % 2 ? "hr-table-row-alt" : "hr-table-row"}
                  >
                    <td className="px-3 py-3 text-center">
                      <CopyableIdCell value={assignment.memberId} />
                    </td>
                    <td className="px-3 py-3 text-center">
                      {assignment.employeeId ? (
                        <CopyableIdCell
                          value={assignment.employeeId}
                          to={employeePath(assignment.employeeId)}
                        />
                      ) : (
                        t("common.dash")
                      )}
                    </td>
                    <td className="truncate px-3 py-3 text-center font-medium">
                      <EntityLink to={employeePath(assignment.employeeId)}>
                        {assignment.employeeName}
                      </EntityLink>
                    </td>
                    <td className="px-3 py-3 text-center">
                      {assignment.assignedAt || t("common.dash")}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-3 py-10 text-center text-hr-muted">
                    {t("projects.taskDetail.emptyAssignees")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className={`mb-5 ${cardSurfaceClass}`}>
        <div className="border-b border-hr-border px-5 py-4">
          <h2 className="text-base font-bold text-hr-text">
            {t("projects.taskDetail.sections.transitions")}
          </h2>
        </div>
        <div className="overflow-hidden">
          <table className="w-full table-fixed border-collapse text-sm">
            <thead>
              <tr className="hr-table-head">
                <th className="px-3 py-3 text-center font-medium">
                  {t("projects.taskDetail.transitionColumns.fromSection")}
                </th>
                <th className="px-3 py-3 text-center font-medium">
                  {t("projects.taskDetail.transitionColumns.toSection")}
                </th>
                <th className="px-3 py-3 text-center font-medium">
                  {t("projects.taskDetail.transitionColumns.actorId")}
                </th>
                <th className="px-3 py-3 text-center font-medium">
                  {t("projects.taskDetail.transitionColumns.actorName")}
                </th>
                <th className="px-3 py-3 text-center font-medium">
                  {t("projects.taskDetail.transitionColumns.createdAt")}
                </th>
              </tr>
            </thead>
            <tbody>
              {task.transitions.length ? (
                task.transitions.map((transition, index) => (
                  <tr
                    key={transition.id}
                    className={index % 2 ? "hr-table-row-alt" : "hr-table-row"}
                  >
                    <td className="px-3 py-3 text-center">
                      {transition.fromSectionName || transition.fromSectionId ? (
                        <EntityLink
                          to={projectSectionPath(project.id, transition.fromSectionId)}
                        >
                          {transition.fromSectionName || transition.fromSectionId}
                        </EntityLink>
                      ) : (
                        t("common.dash")
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {transition.toSectionName || transition.toSectionId ? (
                        <EntityLink
                          to={projectSectionPath(project.id, transition.toSectionId)}
                        >
                          {transition.toSectionName || transition.toSectionId}
                        </EntityLink>
                      ) : (
                        t("common.dash")
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {transition.memberId ? (
                        <CopyableIdCell
                          value={transition.memberId}
                          to={employeePath(transition.memberId)}
                        />
                      ) : (
                        t("common.dash")
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <EntityLink to={employeePath(transition.memberId)}>
                        {transition.memberName || t("common.dash")}
                      </EntityLink>
                    </td>
                    <td className="px-3 py-3 text-center">
                      {transition.createdAtUtc
                        ? transition.createdAtUtc.slice(0, 10)
                        : t("common.dash")}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-3 py-10 text-center text-hr-muted">
                    {t("projects.taskDetail.emptyTransitions")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function InfoItem({
  label,
  value,
  copyable,
  to,
}: {
  label: string;
  value: string;
  copyable?: boolean;
  to?: string;
}) {
  return (
    <div className={subtlePanelClass}>
      <p className="mb-1 text-xs text-hr-muted">{label}</p>
      {copyable ? (
        <CopyableIdCell value={value} to={to} />
      ) : to ? (
        <EntityLink to={to}>{value}</EntityLink>
      ) : (
        <p className="text-sm font-medium text-hr-text">{value}</p>
      )}
    </div>
  );
}
