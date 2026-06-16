export type AttendanceRecord = {
  id: string;
  employeeId: string;
  employeeName: string;
  checkIn: string;
  checkOut: string;
  checkInRaw?: string;
  checkOutRaw?: string;
  status: string;
  totalWorkHours?: number;
  requiredWorkHours?: number;
};

export type AttendanceFilters = {
  page?: number;
  limit?: number;
  employeeName?: string;
  from?: string;
  to?: string;
  status?: number;
};

export type AttendancePayload = {
  employeeId: string;
  checkin: string;
  checkout?: string;
};
