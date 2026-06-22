import { Check, Copy } from "lucide-react";
import { useState, type MouseEvent } from "react";
import { truncateMiddle } from "../../utils/truncateMiddle";

type CopyableIdCellProps = {
  value?: string;
  head?: number;
  tail?: number;
};

export function CopyableIdCell({ value = "", head = 3, tail = 3 }: CopyableIdCellProps) {
  const [copied, setCopied] = useState(false);

  if (!value) {
    return <span className="text-hr-muted">—</span>;
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
      <span>{display}</span>
      <button
        type="button"
        onClick={handleCopy}
        aria-label="نسخ المعرف"
        className="rounded p-0.5 text-hr-muted transition hover:bg-gray-100 hover:text-hr-primary"
      >
        {copied ? <Check className="size-3.5 text-green-600" /> : <Copy className="size-3.5" />}
      </button>
    </span>
  );
}
