import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthShell } from "../components/auth/AuthShell";
import { inputClass } from "../components/ui/formStyles";
import { ROUTES } from "../constants/routes";
import { useAuth } from "../hooks/useAuth";
import { useTranslation } from "../i18n";
import { forgotPassword } from "../services/authApi";
import { getThrownErrorMessage } from "../utils/apiResponse";

export function ForgotPasswordPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to={ROUTES.dashboard} replace />;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      setError(t("auth.emailRequired"));
      return;
    }

    setError("");
    setLoading(true);
    try {
      await forgotPassword(trimmed);
      navigate(`${ROUTES.resetPassword}?email=${encodeURIComponent(trimmed)}`, {
        replace: true,
        state: { email: trimmed },
      });
    } catch (err) {
      setError(getThrownErrorMessage(err, t("auth.forgotFailed")));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title={t("auth.forgotTitle")}
      subtitle={t("auth.forgotSubtitle")}
      backToLogin
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {error ? (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
          >
            {error}
          </div>
        ) : null}

        <div>
          <label htmlFor="forgot-email" className="mb-2 block text-sm font-medium text-hr-text">
            {t("auth.email")}
          </label>
          <input
            id="forgot-email"
            name="email"
            type="email"
            autoComplete="email"
            dir="ltr"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={inputClass}
            placeholder="name@example.com"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="h-11 w-full rounded-xl bg-hr-primary text-sm font-bold text-white transition hover:bg-hr-primary-hover disabled:pointer-events-none disabled:opacity-60"
        >
          {loading ? t("auth.sendingCode") : t("auth.sendResetCode")}
        </button>
      </form>
    </AuthShell>
  );
}
