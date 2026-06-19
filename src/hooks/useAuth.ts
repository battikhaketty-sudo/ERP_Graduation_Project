import { useCallback } from "react";
import { useNavigate, useRevalidator, useRouteLoaderData } from "react-router-dom";
import { login as loginSession, logout as logoutSession, type RootAuthData } from "../auth";
import { ROUTES } from "../constants/routes";
import type { LoginCredentials } from "../types/auth";

export function useAuth() {
  const { user } = useRouteLoaderData("root") as RootAuthData;
  const revalidator = useRevalidator();
  const navigate = useNavigate();

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      await loginSession(credentials);
      revalidator.revalidate();
    },
    [revalidator],
  );

  const logout = useCallback(() => {
    void logoutSession().finally(() => {
      revalidator.revalidate();
      navigate(ROUTES.login, { replace: true });
    });
  }, [navigate, revalidator]);

  return {
    user: user ?? null,
    isAuthenticated: Boolean(user),
    login,
    logout,
  };
}
