import type { MouseEvent, ReactNode } from "react";
import { Link } from "react-router-dom";

type EntityLinkProps = {
  to?: string | null;
  children: ReactNode;
  className?: string;
  title?: string;
};

export const entityLinkClass =
  "font-medium text-hr-primary hover:underline underline-offset-2";

export function EntityLink({ to, children, className, title }: EntityLinkProps) {
  if (!to) {
    return (
      <span className={className} title={title}>
        {children}
      </span>
    );
  }

  return (
    <Link
      to={to}
      title={title}
      onClick={(event: MouseEvent) => event.stopPropagation()}
      className={[entityLinkClass, className].filter(Boolean).join(" ")}
    >
      {children}
    </Link>
  );
}
