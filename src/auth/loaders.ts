import { redirect } from "react-router-dom";
import { ROUTES } from "../constants/routes";
import type { AuthUser } from "../types/auth";
import { getSession } from "./session";

export type RootAuthData = {
  user: AuthUser | null;
};

export function rootAuthLoader(): RootAuthData {
  return { user: getSession()?.user ?? null };
}

export function requireAuthLoader() {
  const session = getSession();
  if (!session) {
    throw redirect(ROUTES.login);
  }
  return session;
}

export function guestLoader() {
  if (getSession()) {
    throw redirect(ROUTES.dashboard);
  }
  return null;
}
