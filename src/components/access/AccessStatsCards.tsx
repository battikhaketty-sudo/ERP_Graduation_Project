import { useTranslation } from "../../i18n";
import type { AccessStats } from "../../services/access";

type AccessStatsCardsProps = {
  stats: AccessStats;
};

export function AccessStatsCards({ stats }: AccessStatsCardsProps) {
  const { t } = useTranslation();

  const cards = [
    {
      key: "usersCount",
      label: t("access.stats.usersCount"),
      value: stats.usersCount,
      border: "border-[#5BB8E8]",
      text: "text-[#2F80ED]",
    },
    {
      key: "rolesCount",
      label: t("access.stats.rolesCount"),
      value: stats.rolesCount,
      border: "border-[#7ED321]",
      text: "text-[#5BA818]",
    },
    {
      key: "permissionsCount",
      label: t("access.stats.permissionsCount"),
      value: stats.permissionsCount,
      border: "border-[#F5A623]",
      text: "text-[#E8940A]",
    },
  ];

  return (
    <section className="mb-5">
      <h2 className="mb-3 text-sm font-semibold text-hr-muted">{t("access.statsTitle")}</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
