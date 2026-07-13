import { useEffect, useState } from "react";
import { getAllSkillTypes } from "../services/hrApi";
import type { SkillGroup } from "../types/skill";
import { useTranslation } from "../i18n";

type SkillCatalogState = {
  skillGroups: SkillGroup[];
  loading: boolean;
  error: string | null;
};

const emptyState: SkillCatalogState = {
  skillGroups: [],
  loading: false,
  error: null,
};

export function useSkillCatalog(enabled: boolean) {
  const { t } = useTranslation();
  const [state, setState] = useState<SkillCatalogState>(emptyState);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    setState((previous) => ({ ...previous, loading: true, error: null }));

    getAllSkillTypes()
      .then((skillGroups) => {
        if (cancelled) return;
        setState({ skillGroups, loading: false, error: null });
      })
      .catch(() => {
        if (cancelled) return;
        setState({
          ...emptyState,
          loading: false,
          error: t("employees.modal.skills.loadError"),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, t]);

  return state;
}
