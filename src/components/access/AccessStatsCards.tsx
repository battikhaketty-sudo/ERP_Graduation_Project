import { useTranslation } from "../../i18n";
import type { AccessStats } from "../../services/access";

type AccessStatsCardsProps = {
  stats: AccessStats;
};

export function AccessStatsCards({ stats }: AccessStatsCardsProps) {
  const { t } = useTranslation();

  const cards = [
    {
      key: "membersCount",
      label: t("access.stats.membersCount"),
      value: stats.membersCount,
      border: "border-[#5BB8E8]",
      text: "text-[#2F80ED]",
    },
    {
      key: "tasksCount",
      label: t("access.stats.tasksCount"),
      value: stats.tasksCount,
      border: "border-[#7ED321]",
      text: "text-[#5BA818]",
    },
    {
      key: "departmentsCount",
      label: t("access.stats.departmentsCount"),
      value: stats.departmentsCount,
      border: "border-[#F5A623]",
      text: "text-[#E8940A]",
    },
    {
      key: "pendingInvitationsCount",
      label: t("access.stats.pendingInvitationsCount"),
      value: stats.pendingInvitationsCount,
      border: "border-[#FF6B6B]",
      text: "text-[#E04545]",
    },
  ];

  return (
    <section className="mb-5">
      <h2 className="mb-3 text-sm font-semibold text-hr-muted">{t("access.statsTitle")}</h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.key}
            className={`rounded-2xl border-b-4 bg-hr-surface p-4 shadow-card ${card.border}`}
          >
            <p className={`text-2xl font-bold ${card.text}`}>{card.value}</p>
            <p className="mt-1 text-sm text-hr-muted">{card.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
