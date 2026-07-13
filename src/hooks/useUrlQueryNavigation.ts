import { useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

type UseUrlQueryNavigationOptions = {
  param: string;
};

export function useUrlQueryNavigation({ param }: UseUrlQueryNavigationOptions) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const value = searchParams.get(param);

  const pushValue = useCallback(
    (nextValue: string) => {
      const next = new URLSearchParams(searchParams);
      next.set(param, nextValue);
      setSearchParams(next);
    },
    [param, searchParams, setSearchParams],
  );

  const removeValue = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    next.delete(param);
    setSearchParams(next, { replace: true });
  }, [param, searchParams, setSearchParams]);

  const goBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  return {
    value,
    isOpen: Boolean(value),
    pushValue,
    removeValue,
    goBack,
  };
}
