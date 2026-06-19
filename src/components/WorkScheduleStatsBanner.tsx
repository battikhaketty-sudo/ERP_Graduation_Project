import { Briefcase, CalendarDays } from "lucide-react";

export type WorkScheduleStatsSnapshot = {
  title: string;
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
      <div className="flex size-14 items-center justify-center rounded-full border-4 border-[#7FC9E4] bg-white text-lg font-bold text-[#3FB4E5]">
        {value}
      </div>
      <p className="mt-2 max-w-[88px] text-center text-xs leading-5 text-hr-muted">{label}</p>
    </div>
  );
}

export function WorkScheduleStatsBanner({ stats }: WorkScheduleStatsBannerProps) {
  const snapshot = stats ?? {
    title: "إحصائيات جداول العمل",
    workingDaysCount: 0,
    periodsCount: 0,
    totalWeeklyHours: 0,
    totalDailyHours: 0,
  };

  return (
    <div className="grid grid-cols-1 items-center gap-4 rounded-2xl border border-hr-border bg-[#FAFCFE] px-5 py-4 sm:grid-cols-[minmax(0,1fr)_170px]">
      <div>
        <p className="mb-3 text-base font-bold text-hr-text">{snapshot.title}</p>
        <div className="flex flex-wrap gap-6 sm:gap-8">
          <StatCircle value={snapshot.workingDaysCount} label="عدد أيام العمل" />
          <StatCircle value={snapshot.periodsCount} label="عدد الفترات" />
          <StatCircle value={snapshot.totalWeeklyHours} label="إجمالي ساعات العمل الأسبوعي" />
          <StatCircle value={snapshot.totalDailyHours} label="إجمالي ساعات العمل اليومي" />
        </div>
      </div>
      <div className="hidden items-center justify-center sm:flex">
        <div className="relative flex h-[140px] w-[170px] items-end justify-center rounded-2xl bg-gradient-to-b from-[#E8F6FC] to-[#D4EEF9] pb-4">
          <CalendarDays className="absolute end-4 top-4 size-8 text-[#5BB8E8]/60" />
          <Briefcase className="size-16 text-[#3FB4E5]/80" />
        </div>
      </div>
    </div>
  );
}
