import { resolveTableRowIndex } from "../../utils/tableRowNumber";

type TableRowIndexProps = {
  index?: number;
  page?: number;
  pageSize?: number;
};

export function TableRowIndex({ index = 0, page = 1, pageSize = 10 }: TableRowIndexProps) {
  return (
    <span className="text-hr-muted">{resolveTableRowIndex(index, page, pageSize)}</span>
  );
}
