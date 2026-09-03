import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { AuthShell } from "../components/auth/AuthShell";
import { PasswordInput } from "../components/ui/PasswordInput";
import { inputClass } from "../components/ui/formStyles";
import { ROUTES } from "../constants/routes";
import { useAuth } from "../hooks/useAuth";
import { useTranslation } from "../i18n";
import { forgotPassword, resetPassword } from "../services/authApi";
import { getThrownErrorCode, getThrownErrorMessage, needsEmailConfirmationCta } from "../utils/apiResponse";

const RESEND_SECONDS = 60;

export function ResetPasswordPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();

  const email = useMemo(() => {
    const fromQuery = searchParams.get("email")?.trim() ?? "";
    const fromState = (location.state as { email?: string } | null)?.email?.trim() ?? "";
    return fromQuery || fromState;
  }, [location.state, searchParams]);

  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [resendLeft, setResendLeft] = useState(RESEND_SECONDS);
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

  if (!email) {
    return <Navigate to={ROUTES.forgotPassword} replace />;
  }

  const handleResend = async () => {
    if (resendLeft > 0 || resending) return;
    setError("");
    setErrorCode("");
    setResending(true);
    try {
      await forgotPassword(email);
      setResendLeft(RESEND_SECONDS);
    } catch (err) {
      setError(getThrownErrorMessage(err, t("auth.resendFailed")));
      setErrorCode(getThrownErrorCode(err));
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const code = otpCode.trim();

    if (!code) {
      setError(t("auth.codeRequired"));
      setErrorCode("");
      return;
    }
    if (newPassword.length < 8) {
      setError(t("auth.passwordTooShort"));
      setErrorCode("");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t("auth.passwordMismatch"));
      setErrorCode("");
      return;
    }

    setError("");
    setErrorCode("");
    setLoading(true);
    try {
      await resetPassword({ email, otpCode: code, newPassword });
      setDone(true);
    } catch (err) {
      setError(getThrownErrorMessage(err, t("auth.resetFailed")));
      setErrorCode(getThrownErrorCode(err));
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <AuthShell title={t("auth.resetSuccessTitle")} subtitle={t("auth.resetSuccessSubtitle")}>
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
      title={t("auth.resetTitle")}
      subtitle={t("auth.resetSubtitle", { email })}
      backToLogin
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {error ? (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
          >
            {error}
            {needsEmailConfirmationCta(errorCode, error) ? (
              <Link
                to={`${ROUTES.confirmEmail}?email=${encodeURIComponent(email)}`}
                className="mt-2 block font-medium text-hr-primary hover:text-hr-primary-hover"
              >
                {t("auth.confirmEmailNow")}
              </Link>
            ) : null}
          </div>
        ) : null}

        <div>
          <label htmlFor="reset-code" className="mb-2 block text-sm font-medium text-hr-text">
            {t("auth.verificationCode")}
          </label>
          <input
            id="reset-code"
            name="otpCode"
            inputMode="numeric"
            autoComplete="one-time-code"
            dir="ltr"
            value={otpCode}
            onChange={(event) => setOtpCode(event.target.value.replace(/\s/g, ""))}
            className={`${inputClass} tracking-[0.35em]`}
            placeholder="••••••"
          />
        </div>

        <div>
          <label htmlFor="reset-password" className="mb-2 block text-sm font-medium text-hr-text">
            {t("auth.newPassword")}
          </label>
          <PasswordInput
            id="reset-password"
            name="newPassword"
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            className={inputClass}
            placeholder="••••••••"
          />
          <p className="mt-1.5 text-xs text-hr-muted">{t("auth.passwordHintRule")}</p>
        </div>

        <div>
          <label htmlFor="reset-confirm" className="mb-2 block text-sm font-medium text-hr-text">
            {t("auth.confirmPassword")}
          </label>
          <PasswordInput
            id="reset-confirm"
            name="confirmPassword"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className={inputClass}
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="h-11 w-full rounded-xl bg-hr-primary text-sm font-bold text-white transition hover:bg-hr-primary-hover disabled:pointer-events-none disabled:opacity-60"
        >
          {loading ? t("auth.resetting") : t("auth.resetPassword")}
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
          <span className="mx-2 text-hr-border">·</span>
          <Link to={ROUTES.forgotPassword} className="font-medium text-hr-primary hover:text-hr-primary-hover">
            {t("auth.changeEmail")}
          </Link>
        </div>
      </form>
    </AuthShell>
  );
}
