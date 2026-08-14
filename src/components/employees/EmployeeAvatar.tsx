import { useEffect, useState } from "react";

type EmployeeAvatarProps = {
  src?: string | null;
  name?: string;
  alt?: string;
  className?: string;
};

/** Initials for local fallback (avoids embedding the full name as image text). */
export const getEmployeeInitials = (name?: string) => {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) {
    return Array.from(parts[0]).slice(0, 2).join("").toUpperCase() || "?";
  }
  const first = Array.from(parts[0])[0] || "";
  const last = Array.from(parts[parts.length - 1])[0] || "";
  return `${first}${last}`.toUpperCase() || "?";
};

/**
 * Avatar with a local initials fallback when the remote file is missing or fails.
 * Do not put the employee name in `alt` when the name is already shown beside the photo —
 * broken images would otherwise paint the name over/above the image area.
 */
export function EmployeeAvatar({
  src,
  name,
  alt = "",
  className,
}: EmployeeAvatarProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const showImage = Boolean(src?.trim()) && !failed;

  if (!showImage) {
    return (
      <span
        className={[
          "inline-flex items-center justify-center bg-hr-accent-bg font-bold text-hr-primary",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        role={alt ? "img" : undefined}
        aria-label={alt || undefined}
        aria-hidden={alt ? undefined : true}
      >
        <span className="text-[0.65em] leading-none tracking-wide">
          {getEmployeeInitials(name)}
        </span>
      </span>
    );
  }

  return (
    <img
      src={src!}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
