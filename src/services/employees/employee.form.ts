import type { Employee } from "../../types/employee";
import { DEFAULT_EMPLOYEE_PASSWORD } from "../../constants/defaults";
import {
  getBirthDateIssue,
  normalizeBirthDateValue,
} from "../../utils/employeeDates";
import { toApiGender } from "./employee.mapper";

const toBlob = async (base64Image: string) => {
  const response = await fetch(base64Image);
  return response.blob();
};

const appendImageIfDataUrl = async (
  formData: FormData,
  fieldName: string,
  value: string | undefined,
  fileNameBase: string,
) => {
  if (!value?.startsWith("data:")) return;
  const blob = await toBlob(value);
  const mime = blob.type || "image/jpeg";
  const extension =
    mime === "image/png"
      ? "png"
      : mime === "image/webp"
        ? "webp"
        : mime === "image/gif"
          ? "gif"
          : "jpg";
  // File (not bare Blob) binds more reliably to ASP.NET IFormFile.
  const file = new File([blob], `${fileNameBase}.${extension}`, { type: mime });
  formData.append(fieldName, file);
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
    const normalized = normalizeBirthDateValue(data.birthDate);
    if (!normalized || getBirthDateIssue(normalized)) {
      throw new Error("INVALID_BIRTH_DATE");
    }
    // Noon UTC avoids day-shift when the browser is behind/ahead of UTC.
    formData.append("PersonalInfo.Birthday", `${normalized}T12:00:00.000Z`);
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
    "avatar",
  );
  await appendImageIfDataUrl(
    formData,
    "CitizenshipInfo.IdCardFrontImage",
    data.idCardFrontImage,
    "id-front",
  );
  await appendImageIfDataUrl(
    formData,
    "CitizenshipInfo.IdCardBackImage",
    data.idCardBackImage,
    "id-back",
  );

  return formData;
};
