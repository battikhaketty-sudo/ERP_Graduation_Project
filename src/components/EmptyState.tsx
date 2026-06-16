import { Users } from "lucide-react";

type EmptyStateProps = {
  title?: string;
  message?: string;
};

export function EmptyState({
  title = "لا توجد بيانات",
  message = "لا توجد نتائج مطابقة. جرب البحث عن شيء آخر أو أضف عنصراً جديداً.",
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12">
      <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-gray-100">
        <Users className="size-8 text-gray-400" strokeWidth={1.5} />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-hr-text">{title}</h3>
      <p className="max-w-sm text-center text-sm text-hr-muted">{message}</p>
    </div>
  );
}
