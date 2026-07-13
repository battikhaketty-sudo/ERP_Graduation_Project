import { Plus } from "lucide-react";
import type { ReactNode } from "react";
import { accentBtnClass } from "./formStyles";

type TableToolbarProps = {
  addLabel: string;
  onAddClick: () => void;
  children?: ReactNode;
  className?: string;
  addClassName?: string;
};

export function TableToolbar({
  addLabel,
  onAddClick,
  children,
  className = "mb-4",
  addClassName = accentBtnClass,
}: TableToolbarProps) {
  return (
    <div className={`flex w-full flex-wrap items-center gap-3 ${className}`}>
      {children ? <div className="min-w-0 flex-1">{children}</div> : null}
      <button type="button" onClick={onAddClick} className={`inline-flex items-center gap-2 ${addClassName}`}>
        <Plus className="size-4" />
        {addLabel}
      </button>
    </div>
  );
}

export function TableAddButton({
  label,
  onClick,
  className = accentBtnClass,
}: {
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <div className="flex w-full justify-end">
      <button type="button" onClick={onClick} className={`inline-flex items-center gap-2 ${className}`}>
        <Plus className="size-4" />
        {label}
      </button>
    </div>
  );
}
