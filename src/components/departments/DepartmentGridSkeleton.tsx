import { cardSurfaceClass } from "../ui/formStyles";

export function DepartmentGridSkeleton() {
  return (
    <section className={`${cardSurfaceClass} p-5 animate-pulse`}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[...Array(6)].map((_, index) => (
          <div key={index} className="rounded-2xl border border-hr-border p-4">
            <div className="mb-3 h-[100px] max-w-[280px] rounded-2xl bg-hr-border" />
            <div className="mb-2 h-5 w-32 rounded bg-hr-border" />
            <div className="mb-1 h-4 w-40 rounded bg-hr-border" />
            <div className="h-4 w-36 rounded bg-hr-border" />
          </div>
        ))}
      </div>
    </section>
  );
}
