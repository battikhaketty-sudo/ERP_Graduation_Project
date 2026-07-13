import type { ReactNode } from "react";
import { ModalCloseButton } from "./ModalCloseButton";
import { modalHeaderClass } from "./formStyles";

type ModalTitleBarProps = {
  title: ReactNode;
  onClose: () => void;
  disabled?: boolean;
  variant?: "plain" | "bordered";
  subtitle?: ReactNode;
  trailing?: ReactNode;
  hideCloseButton?: boolean;
};

export function ModalTitleBar({
  title,
  onClose,
  disabled,
  variant = "plain",
  subtitle,
  trailing,
  hideCloseButton = false,
}: ModalTitleBarProps) {
  const wrapperClass = hideCloseButton
    ? "relative shrink-0 border-b border-hr-border px-6 py-5 text-center"
    : modalHeaderClass;

  const headingClass =
    variant === "bordered" ? "text-xl font-bold text-hr-primary" : "text-2xl font-bold text-hr-primary";

  return (
    <div className={wrapperClass}>
      {hideCloseButton ? null : (
        <ModalCloseButton onClick={onClose} disabled={disabled} />
      )}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <div>
          <h3 className={headingClass}>{title}</h3>
          {subtitle ? <p className="mt-1 text-sm text-hr-muted">{subtitle}</p> : null}
        </div>
        {trailing}
      </div>
    </div>
  );
}
