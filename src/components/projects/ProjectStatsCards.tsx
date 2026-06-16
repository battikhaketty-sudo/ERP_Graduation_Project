import type { ProjectStats, TaskStats } from "../../types/project";

type ProjectStatsCardsProps = {
  stats: ProjectStats;
};

export function ProjectStatsCards({ stats }: ProjectStatsCardsProps) {
  const cards = [
    { label: "عدد المشاريع", value: stats.projectsCount, border: "border-[#5BB8E8]", text: "text-[#2F80ED]" },
    { label: "عدد المهمات", value: stats.tasksCount, border: "border-[#F5A623]", text: "text-[#E8940A]" },
    { label: "عدد الأقسام", value: stats.sectionsCount, border: "border-[#7ED321]", text: "text-[#5BA818]" },
    {
      label: "عدد الموظفين المكلفين",
      value: stats.assignedEmployeesCount,
      border: "border-[#FF6B6B]",
      text: "text-[#E04545]",
    },
  ];

  return (
    <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`rounded-2xl border-b-4 bg-white p-4 shadow-card ${card.border}`}
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
  const cards = [
    { label: "إجمالي المهام", value: stats.total, className: "bg-[#E8F4FD] text-[#2F80ED]" },
    { label: "قيد التنفيذ", value: stats.inProgress, className: "bg-[#FFF3E0] text-[#F5A623]" },
    { label: "تم الإنجاز", value: stats.completed, className: "bg-[#E8F5E9] text-[#43A047]" },
    { label: "متأخرة", value: stats.late, className: "bg-[#FFEBEE] text-[#E53935]" },
  ];

  return (
    <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className={`rounded-2xl p-4 ${card.className}`}>
          <p className="text-2xl font-bold">{card.value}</p>
          <p className="mt-1 text-sm opacity-80">{card.label}</p>
        </div>
      ))}
    </div>
  );
}
