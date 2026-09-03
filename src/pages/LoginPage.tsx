import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthShell } from "../components/auth/AuthShell";
import { inputClass } from "../components/ui/formStyles";
import { ROUTES } from "../constants/routes";
import { useAuth } from "../hooks/useAuth";
import { useTranslation } from "../i18n";
import { getThrownErrorCode, getThrownErrorMessage, needsEmailConfirmationCta } from "../utils/apiResponse";

export function LoginPage() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const from =
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ||
    ROUTES.dashboard;
  const sessionExpiredMessage = (
    location.state as { sessionExpired?: boolean; message?: string } | null
  )?.message;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(sessionExpiredMessage ?? "");
  const [errorCode, setErrorCode] = useState("");
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const showConfirmEmail = needsEmailConfirmationCta(errorCode, error);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setErrorCode("");

    if (!email.trim() || !password) {
      setError(t("auth.credentialsRequired"));
      return;
    }

    setLoading(true);
    try {
      await login({ email: email.trim(), password });
      navigate(from, { replace: true });
    } catch (err) {
      setError(getThrownErrorMessage(err, t("auth.loginFailed")));
      setErrorCode(getThrownErrorCode(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title={t("auth.login")} subtitle={t("auth.loginSubtitle")}>
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {error ? (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
          >
            {error}
            {showConfirmEmail ? (
              <Link
                to={`${ROUTES.confirmEmail}?email=${encodeURIComponent(email.trim())}`}
                className="mt-2 block font-medium text-hr-primary hover:text-hr-primary-hover"
              >
                {t("auth.confirmEmailNow")}
              </Link>
            ) : null}
          </div>
        ) : null}

        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-medium text-hr-text">
            {t("auth.email")}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            dir="ltr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder="name@example.com"
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <label htmlFor="password" className="block text-sm font-medium text-hr-text">
              {t("auth.password")}
            </label>
            <Link
              to={ROUTES.forgotPassword}
              className="text-sm font-medium text-hr-primary hover:text-hr-primary-hover"
            >
              {t("auth.forgotPassword")}
            </Link>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            placeholder="••••••••"
          />
        </div>

        <label className="flex cursor-pointer select-none items-center gap-2">
          <input
            type="checkbox"
            className="size-4 rounded border-hr-border text-hr-primary focus:ring-hr-primary/30"
          />
          <span className="text-sm text-hr-muted">{t("auth.rememberMe")}</span>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="h-11 w-full rounded-xl bg-hr-primary text-sm font-bold text-white transition hover:bg-hr-primary-hover disabled:pointer-events-none disabled:opacity-60"
        >
          {loading ? t("auth.signingIn") : t("auth.signIn")}
        </button>

        <p className="text-center text-sm text-hr-muted">
          {t("auth.needConfirm")}{" "}
          <Link
            to={
              email.trim()
                ? `${ROUTES.confirmEmail}?email=${encodeURIComponent(email.trim())}`
                : ROUTES.confirmEmail
            }
            className="font-medium text-hr-primary hover:text-hr-primary-hover"
          >
            {t("auth.confirmEmail")}
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
