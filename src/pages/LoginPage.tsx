import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { ROUTES } from "../constants/routes";

export function LoginPage() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from =
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ||
    ROUTES.projects;
  const sessionExpiredMessage = (
    location.state as { sessionExpired?: boolean; message?: string } | null
  )?.message;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(sessionExpiredMessage ?? "");
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("يرجى إدخال البريد الإلكتروني وكلمة المرور.");
      return;
    }

    setLoading(true);
    try {
      await login({ email: email.trim(), password });
      navigate(from, { replace: true });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : (err as { message?: string })?.message || "فشل تسجيل الدخول. تحقق من البيانات.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-hr-bg px-4 py-10" dir="rtl">
      <div className="w-full max-w-[420px]">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div
            className="flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-[#EB5757] via-white to-[#2F80ED] p-[3px]"
            aria-hidden
          >
            <div className="flex size-full items-center justify-center rounded-full bg-white">
              <div className="size-10 rounded-full bg-gradient-to-br from-[#EB5757] to-[#2F80ED]" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-hr-text">HR System</h1>
            <p className="mt-1 text-sm text-hr-muted">نظام إدارة الموارد البشرية</p>
          </div>
        </div>

        <div className="rounded-2xl border border-hr-border bg-white p-8 shadow-card">
          <h2 className="mb-1 text-center text-xl font-bold text-hr-text">تسجيل الدخول</h2>
          <p className="mb-6 text-center text-sm text-hr-muted">أدخل بياناتك للوصول إلى لوحة التحكم</p>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-hr-text">
                البريد الإلكتروني
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 w-full rounded-xl border border-hr-border bg-white px-4 text-sm text-hr-text outline-none transition placeholder:text-hr-muted focus:border-hr-primary focus:ring-2 focus:ring-hr-primary/20"
                placeholder="name@example.com"
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-hr-text">
                  كلمة المرور
                </label>
                <Link
                  to="#"
                  className="text-sm font-medium text-hr-primary hover:text-hr-primary-hover"
                  onClick={(e) => e.preventDefault()}
                >
                  نسيت كلمة المرور؟
                </Link>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 w-full rounded-xl border border-hr-border bg-white px-4 text-sm text-hr-text outline-none transition placeholder:text-hr-muted focus:border-hr-primary focus:ring-2 focus:ring-hr-primary/20"
                placeholder="••••••••"
              />
            </div>

            <label className="flex cursor-pointer select-none items-center gap-2">
              <input
                type="checkbox"
                className="size-4 rounded border-hr-border text-hr-primary focus:ring-hr-primary/30"
              />
              <span className="text-sm text-hr-muted">تذكرني على هذا الجهاز</span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="h-11 w-full rounded-xl bg-hr-primary text-sm font-bold text-white transition hover:bg-hr-primary-hover disabled:pointer-events-none disabled:opacity-60"
            >
              {loading ? "جاري الدخول…" : "دخول"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-hr-muted">
            ليس لديك حساب؟{" "}
            <a
              href="#"
              className="font-semibold text-hr-primary hover:text-hr-primary-hover"
              onClick={(e) => e.preventDefault()}
            >
              تواصل مع الإدارة
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
