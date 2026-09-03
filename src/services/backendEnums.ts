/**
 * Numeric values must match the backend C# enums exactly.
 * Do not renumber — the API stores and filters these integers.
 */

export const PriorityApi = {
  Low: 1,
  Medium: 2,
  High: 3,
  Critical: 4,
} as const;

export const AttendenceStatusApi = {
  Approved: 1,
  Refused: 2,
  Pending: 3,
} as const;

export const ResumeLineTypeApi = {
  Education: 1,
  Training: 2,
  Experience: 3,
  Certificate: 4,
  Other: 5,
} as const;

export const ProjectInvitationStatusApi = {
  Pending: 0,
  Accepted: 1,
  Rejected: 2,
  Expired: 3,
  Cancelled: 4,
} as const;

export const ProjectMemberRoleApi = {
  Manager: 0,
  Member: 1,
  Observer: 2,
} as const;

export const ProjectStatusApi = {
  NotStarted: 0,
  InProgress: 1,
  Completed: 2,
} as const;

export const PeriodTypeApi = {
  Working: 1,
  Break: 2,
} as const;

export const DependencyTypeApi = {
  StartToStart: 1,
  StartToFinish: 2,
  FinishToStart: 3,
  FinishToFinish: 4,
} as const;

export const ATTENDENCE_STATUS_BY_API: Record<number, string> = {
  [AttendenceStatusApi.Approved]: "Approved",
  [AttendenceStatusApi.Refused]: "Refused",
  [AttendenceStatusApi.Pending]: "Pending",
};

export const RESUME_LINE_TYPE_BY_API: Record<number, string> = {
  [ResumeLineTypeApi.Education]: "Education",
  [ResumeLineTypeApi.Training]: "Training",
  [ResumeLineTypeApi.Experience]: "Experience",
  [ResumeLineTypeApi.Certificate]: "Certificate",
  [ResumeLineTypeApi.Other]: "Other",
};
