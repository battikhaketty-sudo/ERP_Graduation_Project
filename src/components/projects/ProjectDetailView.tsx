import { useMemo, useState } from "react";
import { ArrowRight, Pencil, Plus, Trash2 } from "lucide-react";
import type { Project, ProjectTask, TaskStats } from "../../types/project";
import { PriorityBadge, ProjectStatusBadge } from "./ProjectBadges";
import { TaskStatsCards } from "./ProjectStatsCards";
import { PROJECT_STATUS_LABELS } from "./project-ui";

type ProjectDetailViewProps = {
  project: Project;
  taskStats: TaskStats;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddTask: () => void;
  onAddSection: () => void;
  onDeleteTask: (task: ProjectTask) => void;
};

type DetailTab = "general" | "goals" | "tasks";

export function ProjectDetailView({
  project,
  taskStats,
  onBack,
  onEdit,
  onDelete,
  onAddTask,
  onAddSection,
  onDeleteTask,
}: ProjectDetailViewProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>("general");

  const tabs: Array<{ key: DetailTab; label: string }> = [
    { key: "general", label: "معلومات عامة" },
    { key: "goals", label: "الأهداف" },
    { key: "tasks", label: "قائمة المهام" },
  ];

  const sectionCards = useMemo(
    () =>
      project.sections.map((section) => ({
        ...section,
        tasks: project.tasks.filter((task) => task.sectionId === section.id),
      })),
    [project],
  );

  return (
    <main className="min-w-0 flex-1 overflow-y-auto bg-hr-bg px-4 py-4 sm:px-6 sm:py-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-hr-primary px-5 py-4 text-white">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg bg-white/15 p-2 transition hover:bg-white/25"
            aria-label="رجوع"
          >
            <ArrowRight className="size-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold">{project.name}</h1>
            <p className="text-sm text-white/80">رقم المشروع: {project.number}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-xl bg-white px-5 py-2 text-sm font-bold text-hr-primary"
          >
            تعديل
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-xl border border-white px-5 py-2 text-sm font-bold text-white"
          >
            حذف
          </button>
        </div>
      </div>

      <TaskStatsCards stats={taskStats} />

      <div className="mb-5 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={[
              "rounded-xl px-5 py-2.5 text-sm font-bold transition",
              activeTab === tab.key
                ? "bg-hr-primary text-white"
                : "bg-white text-hr-muted shadow-card hover:text-hr-text",
            ].join(" ")}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "general" && (
        <section className="mb-5 rounded-2xl bg-white p-5 shadow-card">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <InfoItem label="الاسم" value={project.name} />
            <InfoItem label="التقييم" value={String(project.rating || "—")} />
            <InfoItem label="الميزانية" value={`${project.budget.toLocaleString("ar-SY")} ريال`} />
            <InfoItem label="تاريخ البداية" value={project.startDate} />
            <InfoItem label="تاريخ النهاية" value={project.endDate} />
            <InfoItem label="المدير" value={project.managerName} />
            <InfoItem label="الموظف المكلف" value={project.assignedEmployeeName} />
            <div>
              <p className="mb-1 text-xs text-hr-muted">الحالة</p>
              <ProjectStatusBadge status={project.status} />
            </div>
            <InfoItem label="الوصف" value={project.description} />
          </div>
        </section>
      )}

      {activeTab === "goals" && (
        <section className="mb-5 rounded-2xl bg-white p-5 shadow-card">
          {project.goals.length ? (
            <ul className="space-y-3">
              {project.goals.map((goal) => (
                <li
                  key={goal}
                  className="rounded-xl border border-hr-border bg-[#FAFCFE] px-4 py-3 text-sm"
                >
                  {goal}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center text-sm text-hr-muted">لا توجد أهداف محددة بعد</p>
          )}
        </section>
      )}

      {activeTab === "tasks" && (
        <section className="rounded-2xl bg-white p-5 shadow-card">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-bold text-hr-text">مهام المشروع</h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onAddSection}
                className="rounded-xl border border-hr-primary px-4 py-2 text-sm font-bold text-hr-primary"
              >
                + إضافة قسم
              </button>
              <button
                type="button"
                onClick={onAddTask}
                className="inline-flex items-center gap-2 rounded-xl bg-hr-primary px-4 py-2 text-sm font-bold text-white"
              >
                <Plus className="size-4" />
                إضافة مهمة جديدة
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-hr-border">
            <table className="min-w-[1100px] w-full text-sm">
              <thead className="bg-[#F5FAFD] text-hr-muted">
                <tr>
                  <th className="px-3 py-3 text-center font-medium">رقم المهمة</th>
                  <th className="px-3 py-3 text-center font-medium">اسم المهمة</th>
                  <th className="px-3 py-3 text-center font-medium">الأولوية</th>
                  <th className="px-3 py-3 text-center font-medium">عنوان المهمة</th>
                  <th className="px-3 py-3 text-center font-medium">وصف المهمة</th>
                  <th className="px-3 py-3 text-center font-medium">عدد الساعات المتوقعة</th>
                  <th className="px-3 py-3 text-center font-medium">تاريخ البدء</th>
                  <th className="px-3 py-3 text-center font-medium">تاريخ الاستحقاق</th>
                  <th className="px-3 py-3 text-center font-medium">عدد الموظفين</th>
                  <th className="px-3 py-3 text-center font-medium">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {project.tasks.length ? (
                  project.tasks.map((task, index) => (
                    <tr key={task.id} className={index % 2 ? "bg-[#FAFCFE]" : "bg-white"}>
                      <td className="px-3 py-3 text-center">{task.number}</td>
                      <td className="px-3 py-3 text-center">{task.name}</td>
                      <td className="px-3 py-3 text-center">
                        <PriorityBadge priority={task.priority} />
                      </td>
                      <td className="px-3 py-3 text-center font-medium">{task.title}</td>
                      <td className="max-w-[220px] truncate px-3 py-3 text-center text-hr-muted">
                        {task.description}
                      </td>
                      <td className="px-3 py-3 text-center">{task.expectedHours}</td>
                      <td className="px-3 py-3 text-center">{task.startDate}</td>
                      <td className="px-3 py-3 text-center">{task.dueDate}</td>
                      <td className="px-3 py-3 text-center">{task.assigneeNames.length}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button type="button" className="text-amber-500" aria-label="تعديل">
                            <Pencil className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteTask(task)}
                            className="text-red-400"
                            aria-label="حذف"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="px-3 py-8 text-center text-hr-muted">
                      لا توجد مهام في هذا المشروع
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {sectionCards.map((section) => (
          <div key={section.id} className="rounded-2xl bg-white p-4 shadow-card">
            <h3 className="mb-3 text-sm font-bold text-hr-text">{section.name}</h3>
            <ul className="space-y-2">
              {section.tasks.slice(0, 3).map((task) => (
                <li key={task.id} className="rounded-lg bg-[#FAFCFE] px-3 py-2 text-xs text-hr-muted">
                  {task.title}
                </li>
              ))}
              {!section.tasks.length && (
                <li className="text-xs text-hr-muted">لا توجد مهام</li>
              )}
            </ul>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-hr-muted">
        الحالة: {PROJECT_STATUS_LABELS[project.status]}
      </p>
    </main>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-hr-border bg-[#FAFCFE] px-4 py-3">
      <p className="mb-1 text-xs text-hr-muted">{label}</p>
      <p className="text-sm font-medium text-hr-text">{value}</p>
    </div>
  );
}
