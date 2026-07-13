import { X } from "lucide-react";
import { useTranslation } from "../../i18n";
import { closeBtnClass } from "./formStyles";

type ModalCloseButtonProps = {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
};

export function ModalCloseButton({ onClick, disabled, className }: ModalCloseButtonProps) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={t("common.close")}
      className={["absolute right-1 top-1 z-10 sm:right-2 sm:top-2", closeBtnClass, className]
        .filter(Boolean)
        .join(" ")}
    >
      <X className="size-6" strokeWidth={2.5} />
    </button>
  );
}
