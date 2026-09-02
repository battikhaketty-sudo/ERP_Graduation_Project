import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "../../i18n";

type PasswordInputProps = {
  id?: string;
  value: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  name?: string;
  readOnly?: boolean;
  disabled?: boolean;
  autoComplete?: string;
  className?: string;
  placeholder?: string;
};

export function PasswordInput({
  id,
  value,
  onChange,
  name,
  readOnly = false,
  disabled = false,
  autoComplete,
  className = "",
  placeholder,
}: PasswordInputProps) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? "text" : "password"}
        name={name}
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        disabled={disabled}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className={[className, "pe-10"].filter(Boolean).join(" ")}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        className="absolute end-3 top-1/2 -translate-y-1/2 text-hr-muted transition hover:text-hr-text"
        aria-label={visible ? t("common.hidePassword") : t("common.showPassword")}
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}
