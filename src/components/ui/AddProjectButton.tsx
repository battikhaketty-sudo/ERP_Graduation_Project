import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../constants/routes";
import { useTranslation } from "../../i18n";

type AddProjectButtonProps = {
  className?: string;
};

const defaultClassName =
  "ms-auto inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-hr-primary px-4 text-sm font-bold text-white transition hover:bg-hr-primary-hover";

export function AddProjectButton({ className = defaultClassName }: AddProjectButtonProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <button
      type="button"
      onClick={() => navigate(`${ROUTES.projects}?add=1`)}
      className={className}
    >
      <Plus className="size-4" strokeWidth={2.5} />
      {t("pages.projects.addProject")}
    </button>
  );
}
