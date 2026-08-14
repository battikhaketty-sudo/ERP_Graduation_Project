import type { UserAccount } from "./user";

export type WorkRole = "Test" | "Front_end" | "UI_UX" | "Back_end";

export type EmployeeResumeLine = {
  id: string;
  title: string;
  description?: string;
  /** API ResumeLineType enum value. */
  type: number;
  typeName: string;
  fromDate?: string;
  toDate?: string;
};

export type EmployeeResumeSkill = {
  /** Resume-skill row id (for update/delete). */
  id?: string;
  skillId: string;
  skillLevelId: string;
  name: string;
  type: string;
  level: string;
};

export type Employee = {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: WorkRole;
  address: string;
  avatar: string;
  rowNumber?: number;
  birthDate?: string;
  gender?: "male" | "female";
  genderName?: string;
  nationality?: string;
  /** Marital / social status (e.g. أعزب). */
  maritalStatus?: string;
  /** Degree / certificate level (e.g. خريج). */
  degreeLevel?: string;
  /** Field of study (e.g. كلية هندسة معلوماتية). */
  fieldOfStudy?: string;
  employeeId?: string;
  userId?: string;
  department?: string;
  departmentId?: string;
  contractTypeId?: string;
  contractTypeName?: string;
  managerId?: string;
  managerName?: string;
  joiningDate?: string;
  contractEndDate?: string;
  salary?: number;
  /** Monthly salary increment amount (WorkInfo.Wage). */
  wage?: number;
  contractType?: "full-time" | "part-time" | "contract";
  bio?: string;
  skills?: string;
  experience?: string;
  idNumber?: string;
  idCardFrontImage?: string;
  idCardBackImage?: string;
  socialSecurity?: string;
  bankInfo?: string;
  password?: string;
  resumeId?: string;
  resumeLines?: EmployeeResumeLine[];
  resumeSkills?: EmployeeResumeSkill[];
  isArchived?: boolean;
  userAccount?: UserAccount;
};

export type EmployeeFormData = Omit<Employee, "id">;
