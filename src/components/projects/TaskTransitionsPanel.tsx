import { ArrowRightLeft } from "lucide-react";
import { useTranslation } from "../../i18n";
import { employeePath } from "../../constants/entityPaths";
import type { TaskTransition } from "../../types/project";
import { CopyableIdCell } from "../ui/CopyableIdCell";
import { EntityLink } from "../ui/EntityLink";

type TaskTransitionsPanelProps = {
  transitions: TaskTransition[];
};

const formatUtc = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export function TaskTransitionsPanel({ transitions }: TaskTransitionsPanelProps) {
  const { t } = useTranslation();

  return (
    <div className="rounded-xl border border-hr-border">
      <div className="flex items-center gap-2 border-b border-hr-border px-4 py-3">
        <ArrowRightLeft className="size-4 text-hr-primary" />
        <h3 className="text-sm font-bold text-hr-text">
          {t("projects.modals.addTask.transitions.title")}
        </h3>
        <span className="ms-auto text-xs text-hr-muted">
          {t("projects.modals.addTask.transitions.count", {
            count: transitions.length,
          })}
        </span>
      </div>

      {!transitions.length ? (
        <p className="px-4 py-6 text-center text-sm text-hr-muted">
          {t("projects.modals.addTask.transitions.empty")}
        </p>
      ) : (
        <ul className="max-h-56 divide-y divide-hr-border overflow-y-auto">
          {transitions.map((item) => (
            <li key={item.id} className="px-4 py-3">
              <div className="mb-1 flex flex-wrap items-center gap-2 text-sm font-medium text-hr-text">
                <span className="rounded-md bg-hr-table-alt px-2 py-0.5">
                  {item.fromSectionName || item.fromSectionId}
                </span>
                <span className="text-hr-muted">→</span>
                <span className="rounded-md bg-hr-primary/10 px-2 py-0.5 text-hr-primary">
                  {item.toSectionName || item.toSectionId}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-hr-muted">
                <span className="inline-flex flex-wrap items-center gap-1">
                  {t("projects.modals.addTask.transitions.by", { name: "" }).trim()}
                  <EntityLink to={employeePath(item.memberId)}>
                    {item.memberName || item.memberId}
                  </EntityLink>
                </span>
                <span>{formatUtc(item.createdAtUtc)}</span>
                <CopyableIdCell value={item.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
