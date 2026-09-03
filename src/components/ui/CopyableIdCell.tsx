import { Check, Copy } from "lucide-react";
import { useState, type MouseEvent } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "../../i18n";
import { truncateMiddle } from "../../utils/truncateMiddle";
import { iconBtnClass } from "./formStyles";

type CopyableIdCellProps = {
  value?: string;
  head?: number;
  tail?: number;
  /** When set, the truncated id opens this details page. Copy still works. */
  to?: string | null;
};

export function CopyableIdCell({
  value = "",
  head = 3,
  tail = 3,
  to,
}: CopyableIdCellProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  if (!value) {
    return <span className="text-hr-muted">{t("common.dash")}</span>;
  }

  const display = truncateMiddle(value, head, tail);

  const handleCopy = async (event: MouseEvent) => {
    event.stopPropagation();

    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <span className="inline-flex items-center justify-center gap-1.5 font-mono text-xs" title={value}>
      {to ? (
        <Link
          to={to}
          onClick={(event) => event.stopPropagation()}
          className="text-hr-primary hover:underline"
          title={value}
        >
          {display}
        </Link>
      ) : (
        <span>{display}</span>
      )}
      <button
        type="button"
        onClick={handleCopy}
        aria-label={t("common.copyId")}
        className={`${iconBtnClass} p-0.5 hover:text-hr-primary`}
      >
        {copied ? <Check className="size-3.5 text-green-600" /> : <Copy className="size-3.5" />}
      </button>
    </span>
  );
}
