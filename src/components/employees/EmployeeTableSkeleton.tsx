export function EmployeeTableSkeleton() {
  return (
    <section className="hr-card animate-pulse">
      <div className="min-w-0 p-1">
        <table className="w-full border-collapse">
          <thead>
            <tr className="hr-table-head">
              {[...Array(8)].map((_, index) => (
                <th key={index} className="px-3 py-3">
                  <div className="mx-auto h-4 w-14 rounded bg-hr-border" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, row) => (
              <tr key={row} className={row % 2 ? "hr-table-row-alt" : "hr-table-row"}>
                <td className="px-3 py-3 text-center">
                  <div className="mx-auto size-4 rounded bg-hr-border" />
                </td>
                <td className="px-3 py-3 text-center">
                  <div className="mx-auto h-4 w-6 rounded bg-hr-border" />
                </td>
                <td className="px-3 py-3 text-center">
                  <div className="mx-auto h-4 w-16 rounded bg-hr-border" />
                </td>
                <td className="px-3 py-3 text-center">
                  <div className="mx-auto flex w-fit items-center gap-2">
                    <div className="size-9 shrink-0 rounded-full bg-hr-border" />
                    <div className="h-4 w-24 rounded bg-hr-border" />
                  </div>
                </td>
                {[...Array(4)].map((_, col) => (
                  <td key={col} className="px-3 py-3 text-center">
                    <div className="mx-auto h-4 w-20 rounded bg-hr-border" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-center gap-2 border-t border-hr-border px-4 py-4">
        {[...Array(5)].map((_, index) => (
          <div key={index} className="size-9 rounded-lg bg-hr-border" />
        ))}
      </div>
    </section>
  );
}
