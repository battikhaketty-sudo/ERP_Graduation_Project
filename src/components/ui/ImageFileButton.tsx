import { Upload } from "lucide-react";
import { useRef } from "react";
import { createPortal } from "react-dom";

type ImageFileButtonProps = {
  label: string;
  disabled?: boolean;
  onFile: (file: File) => void;
};

/**
 * Native file pickers break when the input is clipped by a modal
 * (`overflow: hidden`, 1px sr-only inputs). Keep the real input on
 * `document.body` and open it from a type=button click.
 */
export function ImageFileButton({
  label,
  disabled,
  onFile,
}: ImageFileButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      {createPortal(
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          tabIndex={-1}
          disabled={disabled}
          aria-hidden
          className="pointer-events-none fixed bottom-0 start-0 h-11 w-48 opacity-0"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) onFile(file);
          }}
        />,
        document.body,
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-2 rounded-lg border border-hr-border bg-hr-surface px-4 py-2 text-sm font-medium text-hr-text transition hover:border-hr-primary disabled:opacity-60"
      >
        <Upload className="size-4" />
        {label}
      </button>
    </>
  );
}
