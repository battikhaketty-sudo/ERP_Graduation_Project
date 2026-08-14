import type { Employee } from "../../types/employee";
import { DEFAULT_EMPLOYEE_PASSWORD } from "../../constants/defaults";
import {
  getBirthDateIssue,
  normalizeBirthDateValue,
} from "../../utils/employeeDates";
import { toApiGender } from "./employee.mapper";

/** Convert a data-URL to a File without relying on fetch(data:) quirks. */
const dataUrlToFile = (dataUrl: string, fileNameBase: string) => {
  const comma = dataUrl.indexOf(",");
  if (comma < 0) {
    throw new Error("INVALID_IMAGE_DATA");
  }
  const header = dataUrl.slice(0, comma);
  const base64 = dataUrl.slice(comma + 1);
  const mimeMatch = /data:(.*?);/i.exec(header);
  const mime = mimeMatch?.[1] || "image/jpeg";
  const extension =
    mime === "image/png"
      ? "png"
      : mime === "image/webp"
        ? "webp"
        : mime === "image/gif"
          ? "gif"
          : "jpg";

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new File([bytes], `${fileNameBase}.${extension}`, { type: mime });
};

const appendImageIfDataUrl = async (
  formData: FormData,
  fieldNames: string[],
  value: string | undefined,
  fileNameBase: string,
) => {
  if (!value?.startsWith("data:")) return;
  const file = dataUrlToFile(value, fileNameBase);
  // ASP.NET binders differ — send the documented nested name plus a flat alias.
  for (const fieldName of fieldNames) {
    formData.append(fieldName, file);
  }
};

export const buildEmployeeFormData = async (
  data: Omit<Employee, "id">,
  mode: "create" | "update" = "create",
) => {
  const formData = new FormData();

  formData.append("Email", data.email.trim());
  // Some binders accept lowercase; UpdateEmployee docs omit Email, but create uses it.
  if (mode === "update") {
    formData.append("email", data.email.trim());
  }
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
    const from = new Date(data.joiningDate);
    const to = new Date(data.contractEndDate);
    if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime())) {
      const start = from.getTime() <= to.getTime() ? from : to;
      const end = from.getTime() <= to.getTime() ? to : from;
      formData.append("WorkInfo.ContractTimeRangeFrom", start.toISOString());
      formData.append("WorkInfo.ContractTimeRangeTo", end.toISOString());
    }
  }

  if (data.nationality) {
    formData.append("CitizenshipInfo.Nationality", data.nationality);
  }

  if (data.idNumber) {
    formData.append("CitizenshipInfo.IdentificationNo", data.idNumber);
  }

  // Extra personal fields from the product design. Sent under PersonalInfo;
  // ignored harmlessly if the current API binder does not map them yet.
  if (data.maritalStatus?.trim()) {
    formData.append("PersonalInfo.MaritalStatus", data.maritalStatus.trim());
    formData.append("CitizenshipInfo.MaritalStatus", data.maritalStatus.trim());
  }
  if (data.degreeLevel?.trim()) {
    formData.append("PersonalInfo.DegreeLevel", data.degreeLevel.trim());
    formData.append("PersonalInfo.CertificateLevel", data.degreeLevel.trim());
  }
  if (data.fieldOfStudy?.trim()) {
    formData.append("PersonalInfo.FieldOfStudy", data.fieldOfStudy.trim());
    formData.append("PersonalInfo.StudyField", data.fieldOfStudy.trim());
  }

  await appendImageIfDataUrl(
    formData,
    ["PersonalInfo.ProfileImage", "ProfileImage"],
    data.avatar,
    "avatar",
  );
  await appendImageIfDataUrl(
    formData,
    ["CitizenshipInfo.IdCardFrontImage", "IdCardFrontImage"],
    data.idCardFrontImage,
    "id-front",
  );
  await appendImageIfDataUrl(
    formData,
    ["CitizenshipInfo.IdCardBackImage", "IdCardBackImage"],
    data.idCardBackImage,
    "id-back",
  );

  return formData;
};
