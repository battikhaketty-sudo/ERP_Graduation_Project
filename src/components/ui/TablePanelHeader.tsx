import { Plus } from "lucide-react";

type TablePanelHeaderProps = {
  title: string;
  addLabel?: string;
  onAddClick?: () => void;
};

const addButtonClass =
  "inline-flex h-9 shrink-0 items-center gap-2 rounded-xl bg-hr-primary px-4 text-sm font-bold text-white transition hover:bg-hr-primary-hover";

export function TablePanelHeader({ title, addLabel, onAddClick }: TablePanelHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hr-border px-5 py-4">
      <h2 className="text-base font-bold text-hr-primary">{title}</h2>
      {addLabel && onAddClick ? (
        <button type="button" onClick={onAddClick} className={addButtonClass}>
          <Plus className="size-4" strokeWidth={2.5} />
          {addLabel}
        </button>
      ) : null}
    </div>
  );
}
