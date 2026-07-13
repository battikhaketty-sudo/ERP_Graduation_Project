import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useToast } from "../context/ToastContext";
import { useTranslation } from "../i18n";
import { getAccessStats } from "../services/access";
import { getThrownErrorMessage } from "../utils/apiResponse";
import {
  AccessPageHeader,
  AccessViewTabs,
  type AccessTab,
} from "../components/access/AccessPageHeader";
import { AccessStatsCards } from "../components/access/AccessStatsCards";
import { PermissionsTab } from "../components/access/PermissionsTab";
import { RolesTab } from "../components/access/RolesTab";
import { UsersTab } from "../components/access/UsersTab";
import { alertErrorClass } from "../components/ui/formStyles";

const VALID_TABS: AccessTab[] = ["users", "roles", "permissions"];

export function AccessManagementPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab") as AccessTab | null;
  const activeTab: AccessTab =
    tabParam && VALID_TABS.includes(tabParam) ? tabParam : "users";

  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [stats, setStats] = useState({
    membersCount: 0,
    tasksCount: 0,
    departmentsCount: 0,
    pendingInvitationsCount: 0,
  });

  const loadStats = useCallback(async () => {
    try {
      setStats(await getAccessStats());
    } catch (err) {
      setNotice(getThrownErrorMessage(err, t("access.errors.loadStats")));
    }
  }, [t]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const setActiveTab = (tab: AccessTab) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", tab);
    setSearchParams(next);
    setSearch("");
    setNotice(null);
  };

  const searchPlaceholder = useMemo(() => {
    if (activeTab === "roles") return t("access.roles.searchPlaceholder");
    if (activeTab === "permissions") return t("access.permissions.searchPlaceholder");
    return t("access.users.searchPlaceholder");
  }, [activeTab, t]);

  const handleDataChanged = () => {
    void loadStats();
    showToast(t("access.toast.saved"));
  };

  return (
    <div className="min-w-0 overflow-x-hidden p-4 sm:p-6">
      <AccessPageHeader
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={searchPlaceholder}
      />

      <AccessStatsCards stats={stats} />
      <AccessViewTabs activeTab={activeTab} onChange={setActiveTab} />

      {notice ? <p className={`mb-4 ${alertErrorClass}`}>{notice}</p> : null}

      {activeTab === "users" ? (
        <UsersTab search={search} onNotice={setNotice} onDataChanged={handleDataChanged} />
      ) : null}
      {activeTab === "roles" ? (
        <RolesTab search={search} onNotice={setNotice} onDataChanged={handleDataChanged} />
      ) : null}
      {activeTab === "permissions" ? (
        <PermissionsTab search={search} onNotice={setNotice} onDataChanged={handleDataChanged} />
      ) : null}
    </div>
  );
}
