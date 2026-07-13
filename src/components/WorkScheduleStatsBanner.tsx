import hrWorkSchedulesIllustration from "../assets/images/hr-work-schedules.png";
import { useTranslation } from "../i18n";

export type WorkScheduleStatsSnapshot = {
  workingDaysCount: number;
  periodsCount: number;
  totalWeeklyHours: number;
  totalDailyHours: number;
};

type WorkScheduleStatsBannerProps = {
  stats: WorkScheduleStatsSnapshot | null;
};

function StatCircle({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex size-14 items-center justify-center rounded-full border-4 border-[#7FC9E4] bg-hr-surface text-lg font-bold text-[#3FB4E5]">
        {value}
      </div>
      <p className="mt-2 max-w-[88px] text-center text-xs leading-5 text-hr-muted">{label}</p>
    </div>
  );
}

export function WorkScheduleStatsBanner({ stats }: WorkScheduleStatsBannerProps) {
  const { t } = useTranslation();

  const snapshot = stats ?? {
    workingDaysCount: 0,
    periodsCount: 0,
    totalWeeklyHours: 0,
    totalDailyHours: 0,
  };

  return (
    <div className="grid grid-cols-1 items-center gap-4 rounded-2xl border border-hr-border bg-hr-table-alt px-5 py-4 sm:grid-cols-[minmax(0,1fr)_170px]">
      <div>
        <p className="mb-3 text-base font-bold text-hr-text">
          {t("hr.workSchedule.stats.title")}
        </p>
        <div className="flex flex-wrap gap-6 sm:gap-8">
          <StatCircle
            value={snapshot.workingDaysCount}
            label={t("hr.workSchedule.stats.workingDays")}
          />
          <StatCircle
            value={snapshot.periodsCount}
            label={t("hr.workSchedule.stats.periods")}
          />
          <StatCircle
            value={snapshot.totalWeeklyHours}
            label={t("hr.workSchedule.stats.weeklyHours")}
          />
          <StatCircle
            value={snapshot.totalDailyHours}
            label={t("hr.workSchedule.stats.dailyHours")}
          />
        </div>
      </div>
      <div className="hidden items-center justify-center sm:flex">
        <div className="relative h-[140px] w-[170px] overflow-hidden rounded-2xl bg-gradient-to-b from-[#E8F6FC] to-[#D4EEF9]">
          <img
            src={hrWorkSchedulesIllustration}
            alt=""
            className="size-full object-contain object-bottom p-1"
          />
        </div>
      </div>
    </div>
  );
}
