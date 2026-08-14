import { useTranslation } from "../../i18n";
import type { ProjectDetailStats, ProjectStats, TaskStats } from "../../types/project";
import { STATUS_BADGE_CLASS } from "../ui/formStyles";

type ProjectStatsCardsProps = {
  stats: ProjectStats;
};

export function ProjectStatsCards({ stats }: ProjectStatsCardsProps) {
  const { t } = useTranslation();

  const cards = [
    {
      key: "projectsCount",
      label: t("projects.stats.projectsCount"),
      value: stats.projectsCount,
      border: "border-[#5BB8E8]",
      text: "text-[#2F80ED]",
    },
    {
      key: "tasksCount",
      label: t("projects.stats.tasksCount"),
      value: stats.tasksCount,
      border: "border-[#F5A623]",
      text: "text-[#E8940A]",
    },
    {
      key: "sectionsCount",
      label: t("projects.stats.sectionsCount"),
      value: stats.sectionsCount,
      border: "border-[#7ED321]",
      text: "text-[#5BA818]",
    },
    {
      key: "assignedEmployees",
      label: t("projects.stats.assignedEmployees"),
      value: stats.assignedEmployeesCount,
      border: "border-[#FF6B6B]",
      text: "text-[#E04545]",
    },
  ];

  return (
    <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.key}
          className={`rounded-2xl border-b-4 bg-hr-surface p-4 shadow-card ${card.border}`}
        >
          <p className={`text-2xl font-bold ${card.text}`}>{card.value}</p>
          <p className="mt-1 text-sm text-hr-muted">{card.label}</p>
        </div>
      ))}
    </div>
  );
}

type ProjectDetailStatsCardsProps = {
  stats: ProjectDetailStats;
};

export function ProjectDetailStatsCards({ stats }: ProjectDetailStatsCardsProps) {
  const { t } = useTranslation();

  const cards = [
    {
      key: "membersCount",
      label: t("projects.stats.membersCount"),
      value: stats.membersCount,
      border: "border-[#5BB8E8]",
      text: "text-[#2F80ED]",
    },
    {
      key: "tasksCount",
      label: t("projects.stats.tasksCount"),
      value: stats.tasksCount,
      border: "border-[#7ED321]",
      text: "text-[#5BA818]",
    },
    {
      key: "sectionsCount",
      label: t("projects.stats.sectionsCount"),
      value: stats.sectionsCount,
      border: "border-[#F5A623]",
      text: "text-[#E8940A]",
    },
    {
      key: "lateTasks",
      label: t("projects.stats.late"),
      value: stats.lateTasksCount,
      border: "border-[#FF6B6B]",
      text: "text-[#E04545]",
    },
  ];

  return (
    <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.key}
          className={`rounded-2xl border-b-4 bg-hr-surface p-4 shadow-card ${card.border}`}
        >
          <p className={`text-2xl font-bold ${card.text}`}>{card.value}</p>
          <p className="mt-1 text-sm text-hr-muted">{card.label}</p>
        </div>
      ))}
    </div>
  );
}

type TaskStatsCardsProps = {
  stats: TaskStats;
};

export function TaskStatsCards({ stats }: TaskStatsCardsProps) {
  const { t } = useTranslation();

  const cards = [
    {
      key: "totalTasks",
      label: t("projects.stats.totalTasks"),
      value: stats.total,
      className: STATUS_BADGE_CLASS.info,
    },
    {
      key: "late",
      label: t("projects.stats.late"),
      value: stats.late,
      className: STATUS_BADGE_CLASS.error,
    },
  ];

  return (
    <div className="mb-5 grid grid-cols-2 gap-3">
      {cards.map((card) => (
        <div key={card.key} className={`rounded-2xl p-4 ${card.className}`}>
          <p className="text-2xl font-bold">{card.value}</p>
          <p className="mt-1 text-sm opacity-80">{card.label}</p>
        </div>
      ))}
    </div>
  );
}
