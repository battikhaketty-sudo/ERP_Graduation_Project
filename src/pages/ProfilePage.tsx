import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Briefcase, Building2, KeyRound, Mail, Phone, Shield } from "lucide-react";
import { yesNoBadgeClass } from "../components/access/access-ui";
import { EmployeeAvatar } from "../components/employees/EmployeeAvatar";
import { FormField } from "../components/ui/FormField";
import { PasswordInput } from "../components/ui/PasswordInput";
import { StatusBanner } from "../components/ui/StatusBanner";
import { inputClass } from "../components/ui/formStyles";
import { ROUTES } from "../constants/routes";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../hooks/useAuth";
import { useTranslation } from "../i18n";
import { changePassword } from "../services/authApi";
import { getEmployeeById, getEmployees } from "../services/employees";
import { getUsers } from "../services/users";
import type { Employee } from "../types/employee";
import type { UserAccount } from "../types/user";
import { getThrownErrorMessage } from "../utils/apiResponse";

const valueOrEmpty = (value?: string) => {
  const trimmed = value?.trim() ?? "";
  return trimmed && trimmed !== "-" ? trimmed : "";
};

function StatTile({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-2xl border border-hr-border bg-hr-surface px-4 py-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-hr-accent-bg text-hr-primary">
        {icon}
      </span>
      <div className="min-w-0 text-start">
        <p className="text-xs font-medium text-hr-muted">{label}</p>
        <p className="mt-1 truncate text-sm font-semibold text-hr-text" title={value}>
          {value}
        </p>
      </div>
    </div>
  );
}

export function ProfilePage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { user } = useAuth();
  const [account, setAccount] = useState<UserAccount | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  const email = user?.email?.trim() ?? "";
  const displayName = employee?.name?.trim() || user?.name?.trim() || email;
  const dash = t("common.dash");
  const shortInfoRows = useMemo(() => {
    if (!employee) return [];

    return [
      [t("employees.detail.fields.fullName"), valueOrEmpty(employee.name)],
      [t("employees.detail.fields.department"), valueOrEmpty(employee.department)],
      [t("employees.detail.fields.phone"), valueOrEmpty(employee.phone)],
      [t("employees.detail.fields.workPhone"), valueOrEmpty(employee.workPhone)],
      [t("employees.detail.fields.nationality"), valueOrEmpty(employee.nationality)],
      [t("employees.detail.fields.contractType"), valueOrEmpty(employee.contractTypeName)],
      [t("employees.detail.fields.manager"), valueOrEmpty(employee.managerName)],
      [t("employees.detail.resumeLineFields.description"), valueOrEmpty(employee.bio)],
    ].filter(([, value]) => Boolean(value)) as Array<[string, string]>;
  }, [employee, t]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!email) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const [usersResult, employeesResult] = await Promise.allSettled([
        getUsers({ page: 1, limit: 10, email }),
        getEmployees(1, 100),
      ]);

      if (cancelled) return;

      const emailKey = email.toLowerCase();
      let matchedAccount: UserAccount | null = null;

      if (usersResult.status === "fulfilled") {
        matchedAccount =
          usersResult.value.records.find(
            (item) => item.email.trim().toLowerCase() === emailKey,
          ) ??
          usersResult.value.records[0] ??
          null;
      }

      setAccount(matchedAccount);

      let matchedEmployee: Employee | null = null;
      if (employeesResult.status === "fulfilled") {
        matchedEmployee =
          employeesResult.value.data.find((item) => {
            const itemEmail = item.email.trim().toLowerCase();
            const sameEmail = itemEmail === emailKey;
            const sameUser =
              Boolean(matchedAccount?.id) &&
              (item.userId === matchedAccount?.id || item.id === matchedAccount?.id);
            return sameEmail || sameUser;
          }) ?? null;
      }

      if (matchedEmployee?.id) {
        try {
          matchedEmployee = await getEmployeeById(matchedEmployee.id);
        } catch {
          // Keep the list record if the detail request fails.
        }
      }

      if (cancelled) return;
      setEmployee(matchedEmployee);

      if (usersResult.status === "rejected" && employeesResult.status === "rejected") {
        setError(getThrownErrorMessage(usersResult.reason, t("profile.loadError")));
      }

      setLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [email, t]);

  const handlePasswordSave = async (event: FormEvent) => {
    event.preventDefault();
    if (!oldPassword.trim() || !newPassword.trim()) {
      setPasswordError(t("profile.passwordRequired"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t("profile.passwordMismatch"));
      return;
    }

    setSavingPassword(true);
    setPasswordError(null);
    try {
      await changePassword({ oldPassword, newPassword });
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showToast(t("profile.passwordUpdated"), "success");
    } catch (err) {
      setPasswordError(getThrownErrorMessage(err, t("profile.passwordRequired")));
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <main className="box-border min-h-full flex-1 bg-hr-bg p-4 sm:p-6 lg:p-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="text-start">
          <h1 className="text-2xl font-bold tracking-tight text-hr-text">{t("profile.title")}</h1>
        </header>

        {error ? <StatusBanner variant="error" message={error} className="" /> : null}

        {loading ? (
          <p className="py-16 text-center text-hr-muted">{t("common.loading")}</p>
        ) : (
          <>
            <section className="overflow-hidden rounded-2xl bg-hr-surface shadow-card">
              <div className="h-28 bg-gradient-to-br from-hr-primary via-hr-primary/75 to-hr-primary/25 sm:h-36" />
              <div className="flex flex-col items-center px-5 pb-6 text-center sm:px-8 sm:pb-8">
                <div className="relative -mt-14 shrink-0 sm:-mt-16">
                  <EmployeeAvatar
                    src={employee?.avatar}
                    name={displayName}
                    alt=""
                    className="size-28 rounded-full object-cover ring-4 ring-hr-surface sm:size-32"
                  />
                  <span
                    className="absolute bottom-1 end-1 size-3.5 rounded-full bg-emerald-500 ring-2 ring-hr-surface"
                    title={t("header.online")}
                  />
                </div>
                <h2 className="mt-4 max-w-xl text-xl font-bold text-hr-text sm:text-2xl">
                  {displayName}
                </h2>
                <p className="mt-1 max-w-xl break-all text-sm text-hr-muted">{email || dash}</p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  {account ? (
                    <span
                      className={[
                        "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
                        yesNoBadgeClass(account.isActive),
                      ].join(" ")}
                    >
                      {account.isActive ? t("profile.active") : t("profile.inactive")}
                    </span>
                  ) : null}
                  {employee ? (
                    <Link
                      to={`${ROUTES.employees}?id=${encodeURIComponent(employee.id)}`}
                      className="inline-flex rounded-xl border border-hr-border px-3 py-1.5 text-xs font-semibold text-hr-text transition hover:bg-hr-hover"
                    >
                      {t("profile.openEmployee")}
                    </Link>
                  ) : null}
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatTile
                icon={<Mail className="size-4" />}
                label={t("profile.fields.email")}
                value={email || dash}
              />
              <StatTile
                icon={<Building2 className="size-4" />}
                label={t("profile.fields.department")}
                value={employee?.department || dash}
              />
              <StatTile
                icon={<Phone className="size-4" />}
                label={t("profile.fields.phone")}
                value={employee?.phone || dash}
              />
              <StatTile
                icon={<Shield className="size-4" />}
                label={t("profile.fields.rolesCount")}
                value={account ? String(account.rolesCount) : dash}
              />
            </section>

            <section className="grid gap-6 lg:grid-cols-2 lg:items-stretch">
              <article className="flex flex-col rounded-2xl bg-hr-surface p-5 shadow-card sm:p-6">
                <div className="mb-5 flex items-center gap-3 text-start">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-hr-accent-bg text-hr-primary">
                    <Briefcase className="size-4" />
                  </span>
                  <div>
                    <h3 className="text-base font-semibold text-hr-text">
                      {t("profile.fields.shortInfo")}
                    </h3>
                  </div>
                </div>
                {shortInfoRows.length ? (
                  <dl className="divide-y divide-hr-border rounded-xl border border-hr-border">
                    {shortInfoRows.map(([label, value]) => (
                      <div
                        key={label}
                        className="grid gap-1 px-4 py-3 text-start sm:grid-cols-[minmax(0,11rem)_1fr] sm:items-center sm:gap-4"
                      >
                        <dt className="text-xs font-medium text-hr-muted">{label}</dt>
                        <dd className="text-sm font-medium text-hr-text">{value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-hr-border px-4 py-10 text-center text-sm text-hr-muted">
                    {t("profile.noEmployee")}
                  </p>
                )}
              </article>

              <article className="flex flex-col rounded-2xl bg-hr-surface p-5 shadow-card sm:p-6">
                <div className="mb-5 flex items-center gap-3 text-start">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-hr-accent-bg text-hr-primary">
                    <KeyRound className="size-4" />
                  </span>
                  <div>
                    <h3 className="text-base font-semibold text-hr-text">
                      {t("profile.editPassword")}
                    </h3>
                    <p className="mt-0.5 text-xs text-hr-muted">{t("profile.passwordHint")}</p>
                  </div>
                </div>
                <form onSubmit={handlePasswordSave} className="flex flex-1 flex-col">
                  {passwordError ? (
                    <p className="mb-3 text-sm text-red-600" role="alert">
                      {passwordError}
                    </p>
                  ) : null}
                  <FormField label={t("profile.fields.currentPassword")}>
                    <PasswordInput
                      name="current-password"
                      value={oldPassword}
                      onChange={(event) => setOldPassword(event.target.value)}
                      className={inputClass}
                    />
                  </FormField>
                  <FormField label={t("profile.fields.newPassword")}>
                    <PasswordInput
                      name="new-password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      className={inputClass}
                    />
                  </FormField>
                  <FormField label={t("profile.fields.confirmPassword")}>
                    <PasswordInput
                      name="confirm-password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      className={inputClass}
                    />
                  </FormField>
                  <button
                    type="submit"
                    disabled={savingPassword}
                    className="mt-auto h-11 rounded-xl bg-hr-primary px-5 text-sm font-bold text-white transition hover:bg-hr-primary-hover disabled:opacity-60"
                  >
                    {savingPassword ? t("common.saving") : t("profile.savePassword")}
                  </button>
                </form>
              </article>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
