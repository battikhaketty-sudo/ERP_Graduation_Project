import type { Employee } from "../../types/employee";
import { DEFAULT_EMPLOYEE_PASSWORD } from "../../constants/defaults";
import { toApiGender } from "./employee.mapper";

const toBlob = async (base64Image: string) => {
  const response = await fetch(base64Image);
  return response.blob();
};

export const buildEmployeeFormData = async (data: Omit<Employee, "id">) => {
  const formData = new FormData();

  formData.append("Email", data.email.trim());
  formData.append("Password", data.password || DEFAULT_EMPLOYEE_PASSWORD);
  formData.append("PersonalInfo.LegalName", data.name.trim());
  formData.append("PersonalInfo.Gender", toApiGender(data.gender));
  formData.append("PersonalInfo.MobileNumber", data.phone.trim());

  if (data.birthDate) {
    formData.append("PersonalInfo.Birthday", new Date(data.birthDate).toISOString());
  }

  formData.append("WorkInfo.DepartmentId", data.departmentId || "");
  formData.append("WorkInfo.ManagerId", data.managerId || "");
  formData.append("WorkInfo.ContractTypeId", data.contractTypeId || "");
  formData.append("WorkInfo.Wage", String(data.salary || 0));
  formData.append("WorkInfo.Salary", String(data.salary || 0));

  if (data.joiningDate && data.contractEndDate) {
    formData.append(
      "WorkInfo.ContractTimeRangeFrom",
      new Date(data.joiningDate).toISOString(),
    );
    formData.append(
      "WorkInfo.ContractTimeRangeTo",
      new Date(data.contractEndDate).toISOString(),
    );
  }

  if (data.nationality) {
    formData.append("CitizenshipInfo.Nationality", data.nationality);
  }

  if (data.idNumber) {
    formData.append("CitizenshipInfo.IdentificationNo", data.idNumber);
  }

  if (data.avatar?.startsWith("data:")) {
    const blob = await toBlob(data.avatar);
    formData.append("PersonalInfo.ProfileImage", blob, "avatar.jpg");
  }

  return formData;
};
