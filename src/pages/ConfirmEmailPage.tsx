import { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { AuthShell } from "../components/auth/AuthShell";
import { inputClass } from "../components/ui/formStyles";
import { ROUTES } from "../constants/routes";
import { useAuth } from "../hooks/useAuth";
import { useTranslation } from "../i18n";
import { confirmEmail, resendEmailConfirmCode } from "../services/authApi";
import { getThrownErrorMessage } from "../utils/apiResponse";

const RESEND_SECONDS = 60;

export function ConfirmEmailPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();

  const initialEmail = useMemo(() => {
    const fromQuery = searchParams.get("email")?.trim() ?? "";
    const fromState = (location.state as { email?: string } | null)?.email?.trim() ?? "";
    return fromQuery || fromState;
  }, [location.state, searchParams]);

  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [resendLeft, setResendLeft] = useState(initialEmail ? RESEND_SECONDS : 0);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (resendLeft <= 0) return;
    const timer = window.setInterval(() => {
      setResendLeft((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendLeft]);

  if (isAuthenticated) {
    return <Navigate to={ROUTES.dashboard} replace />;
  }

  const handleResend = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setError(t("auth.emailRequired"));
      return;
    }
    if (resendLeft > 0 || resending) return;

    setError("");
    setResending(true);
    try {
      await resendEmailConfirmCode(trimmed);
      setResendLeft(RESEND_SECONDS);
    } catch (err) {
      setError(getThrownErrorMessage(err, t("auth.resendFailed")));
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedEmail = email.trim();
    const trimmedCode = code.trim();

    if (!trimmedEmail) {
      setError(t("auth.emailRequired"));
      return;
    }
    if (!trimmedCode) {
      setError(t("auth.codeRequired"));
      return;
    }

    setError("");
    setLoading(true);
    try {
      await confirmEmail({ email: trimmedEmail, code: trimmedCode });
      setDone(true);
    } catch (err) {
      setError(getThrownErrorMessage(err, t("auth.confirmFailed")));
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <AuthShell title={t("auth.confirmSuccessTitle")} subtitle={t("auth.confirmSuccessSubtitle")}>
        <div className="flex flex-col items-center text-center">
          <CheckCircle2 className="mb-4 size-12 text-emerald-500" />
          <button
            type="button"
            onClick={() => navigate(ROUTES.login, { replace: true })}
            className="h-11 w-full rounded-xl bg-hr-primary text-sm font-bold text-white transition hover:bg-hr-primary-hover"
          >
            {t("auth.backToLogin")}
          </button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={t("auth.confirmTitle")}
      subtitle={t("auth.confirmSubtitle")}
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
          <label htmlFor="confirm-email" className="mb-2 block text-sm font-medium text-hr-text">
            {t("auth.email")}
          </label>
          <input
            id="confirm-email"
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

        <div>
          <label htmlFor="confirm-code" className="mb-2 block text-sm font-medium text-hr-text">
            {t("auth.verificationCode")}
          </label>
          <input
            id="confirm-code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            dir="ltr"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\s/g, ""))}
            className={`${inputClass} tracking-[0.35em]`}
            placeholder="••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="h-11 w-full rounded-xl bg-hr-primary text-sm font-bold text-white transition hover:bg-hr-primary-hover disabled:pointer-events-none disabled:opacity-60"
        >
          {loading ? t("auth.confirming") : t("auth.confirmEmail")}
        </button>

        <div className="text-center text-sm text-hr-muted">
          {resendLeft > 0 ? (
            <span>{t("auth.resendIn", { seconds: resendLeft })}</span>
          ) : (
            <button
              type="button"
              onClick={() => void handleResend()}
              disabled={resending}
              className="font-medium text-hr-primary hover:text-hr-primary-hover disabled:opacity-60"
            >
              {resending ? t("auth.sendingCode") : t("auth.resendCode")}
            </button>
          )}
        </div>
      </form>
    </AuthShell>
  );
}
