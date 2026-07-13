import type { Employee } from "../../types/employee";
import { DEFAULT_EMPLOYEE_PASSWORD } from "../../constants/defaults";
import { toApiGender } from "./employee.mapper";

const toBlob = async (base64Image: string) => {
  const response = await fetch(base64Image);
  return response.blob();
};

const appendImageIfDataUrl = async (
  formData: FormData,
  fieldName: string,
  value: string | undefined,
  fileName: string,
) => {
  if (!value?.startsWith("data:")) return;
  const blob = await toBlob(value);
  formData.append(fieldName, blob, fileName);
};

export const buildEmployeeFormData = async (
  data: Omit<Employee, "id">,
  mode: "create" | "update" = "create",
) => {
  const formData = new FormData();

  formData.append("Email", data.email.trim());
  if (mode === "create") {
    formData.append("Password", data.password || DEFAULT_EMPLOYEE_PASSWORD);
  } else if (data.password?.trim()) {
    formData.append("Password", data.password.trim());
  }
  formData.append("PersonalInfo.LegalName", data.name.trim());
  formData.append("PersonalInfo.Gender", toApiGender(data.gender));
  formData.append("PersonalInfo.MobileNumber", data.phone.trim());

  if (data.birthDate) {
    formData.append("PersonalInfo.Birthday", new Date(data.birthDate).toISOString());
  }

  formData.append("WorkInfo.DepartmentId", data.departmentId || "");
  formData.append("WorkInfo.ManagerId", data.managerId || "");
  formData.append("WorkInfo.ContractTypeId", data.contractTypeId || "");
  formData.append("WorkInfo.WorkMobileNumber", data.phone.trim());
  formData.append("WorkInfo.Wage", String(data.wage ?? 0));
  formData.append("WorkInfo.Salary", String(data.salary ?? 0));

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

  await appendImageIfDataUrl(
    formData,
    "PersonalInfo.ProfileImage",
    data.avatar,
    "avatar.jpg",
  );
  await appendImageIfDataUrl(
    formData,
    "CitizenshipInfo.IdCardFrontImage",
    data.idCardFrontImage,
    "id-front.jpg",
  );
  await appendImageIfDataUrl(
    formData,
    "CitizenshipInfo.IdCardBackImage",
    data.idCardBackImage,
    "id-back.jpg",
  );

  return formData;
};
