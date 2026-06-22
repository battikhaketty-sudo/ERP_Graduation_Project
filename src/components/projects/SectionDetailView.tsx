import { Pencil, Plus, Trash2 } from "lucide-react";
import { DetailBackButton } from "../ui/DetailBackButton";
import { useMemo, useState } from "react";
import type { Project, ProjectSection, ProjectTask } from "../../types/project";
import { Pagination } from "../Pagination";
import { CopyableIdCell } from "../ui/CopyableIdCell";
import { TableRowIndex } from "../ui/TableRowIndex";
import { PriorityBadge } from "./ProjectBadges";

export const SECTION_TASKS_PAGE_SIZE = 5;

type SectionDetailViewProps = {
  project: Project;
  section: ProjectSection;
  onBack: () => void;
  onEditSection: () => void;
  onDeleteSection: () => void;
  onAddTask: () => void;
  onDeleteTask: (task: ProjectTask) => void;
};

export function SectionDetailView({
  project,
  section,
  onBack,
  onEditSection,
  onDeleteSection,
  onAddTask,
  onDeleteTask,
}: SectionDetailViewProps) {
  const [page, setPage] = useState(1);

  const sectionTasks = useMemo(
    () => project.tasks.filter((task) => task.sectionId === section.id),
    [project.tasks, section.id],
  );

  const totalPages = Math.max(1, Math.ceil(sectionTasks.length / SECTION_TASKS_PAGE_SIZE));
  const paginatedTasks = sectionTasks.slice(
    (page - 1) * SECTION_TASKS_PAGE_SIZE,
    page * SECTION_TASKS_PAGE_SIZE,
  );

  return (
    <main className="min-w-0 flex-1 overflow-y-auto bg-hr-bg px-4 py-4 sm:px-6 sm:py-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-hr-primary px-5 py-4 text-white">
        <div className="flex flex-col gap-2">
          <DetailBackButton
            variant="onPrimary"
            label="العودة إلى المشروع"
            onClick={onBack}
            className="mb-0 self-start"
          />
          <h1 className="text-xl font-bold">معلومات القسم {section.name}</h1>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onEditSection}
            className="rounded-xl bg-white px-5 py-2 text-sm font-bold text-hr-primary"
          >
            تعديل
          </button>
          <button
            type="button"
            onClick={onDeleteSection}
            className="rounded-xl bg-white px-5 py-2 text-sm font-bold text-red-500"
          >
            حذف
          </button>
        </div>
      </div>

      <section className="rounded-2xl bg-white shadow-card">
        <div className="flex justify-end px-4 pt-4 sm:px-5">
          <button
            type="button"
            onClick={onAddTask}
            className="inline-flex items-center gap-2 rounded-xl border border-[#9FD4EF] bg-[#E9F6FC] px-4 py-2 text-sm font-bold text-[#1B91C4]"
          >
            <Plus className="size-4" />
            إضافة مهمة جديدة
          </button>
        </div>

        <div className="overflow-x-auto px-2 pb-2 pt-3 sm:px-4">
          <table className="min-w-[1200px] w-full text-sm">
            <thead className="text-hr-muted">
              <tr>
                <th className="px-3 py-3 text-center font-medium">#</th>
                <th className="px-3 py-3 text-center font-medium">id</th>
              <th className="px-3 py-3 text-center font-medium">رقم المهمة</th>
                <th className="px-3 py-3 text-center font-medium">اسم القسم</th>
                <th className="px-3 py-3 text-center font-medium">الأولوية</th>
                <th className="px-3 py-3 text-center font-medium">عنوان المهمة</th>
                <th className="px-3 py-3 text-center font-medium">وصف المهمة</th>
                <th className="px-3 py-3 text-center font-medium">عدد الساعات المتوقعة</th>
                <th className="px-3 py-3 text-center font-medium">تاريخ الإنشاء</th>
                <th className="px-3 py-3 text-center font-medium">تاريخ الاستحقاق</th>
                <th className="px-3 py-3 text-center font-medium">عدد المستلمين</th>
                <th className="px-3 py-3 text-center font-medium">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTasks.length ? (
                paginatedTasks.map((task, index) => (
                  <tr key={task.id} className={index % 2 ? "bg-[#FAFCFE]" : "bg-white"}>
                    <td className="px-3 py-3 text-center text-hr-muted">
                      <TableRowIndex
                        index={index}
                        page={page}
                        pageSize={SECTION_TASKS_PAGE_SIZE}
                      />
                    </td>
                    <td className="px-3 py-3 text-center">
                      <CopyableIdCell value={task.id} />
                    </td>
                    <td className="px-3 py-3 text-center">{task.number}</td>
                    <td className="px-3 py-3 text-center">{section.name}</td>
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
                  <td colSpan={11} className="px-3 py-10 text-center text-hr-muted">
                    لا توجد مهام في هذا القسم
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        )}
      </section>
    </main>
  );
}
