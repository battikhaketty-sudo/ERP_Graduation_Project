export function EmployeeTableSkeleton() {
  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-card animate-pulse">
      <div className="overflow-x-auto p-1">
        <table className="w-full min-w-[920px]">
          <thead>
            <tr className="bg-[#F5FAFD]">
              {[...Array(8)].map((_, index) => (
                <th key={index} className="px-3 py-3">
                  <div className="mx-auto h-4 w-16 rounded bg-gray-200" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, row) => (
              <tr key={row} className={row % 2 ? "bg-[#FAFCFE]" : "bg-white"}>
                <td className="px-3 py-3 text-center">
                  <div className="mx-auto size-4 rounded bg-gray-200" />
                </td>
                <td className="px-3 py-3 text-center">
                  <div className="mx-auto size-10 rounded-full bg-gray-200" />
                </td>
                {[...Array(6)].map((_, col) => (
                  <td key={col} className="px-3 py-3">
                    <div className="h-4 rounded bg-gray-200" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-center gap-2 border-t border-hr-border px-4 py-4">
        {[...Array(5)].map((_, index) => (
          <div key={index} className="size-9 rounded-lg bg-gray-200" />
        ))}
      </div>
    </section>
  );
}
