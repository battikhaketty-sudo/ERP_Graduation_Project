import api from "../api";
import type { Employee } from "../../types/employee";
import {
  assertMutationSuccess,
  assertSuccess,
  unwrapData,
  unwrapEntity,
  unwrapPage,
  unwrapPagedMeta,
} from "../../utils/apiResponse";
import { extractRowNumber } from "../../utils/tableRowNumber";
import { sortNewestFirst } from "../../utils/listOrder";
import { buildEmployeeFormData } from "./employee.form";
import { normalizeEmployee } from "./employee.mapper";
import {
  getArchivedEmployeeIds,
  isLocallyArchived,
} from "../../utils/archivedEmployeesStore";

export const getEmployees = async (
  page = 1,
  limit = 10,
  options?: { archived?: boolean },
) => {
  const response = await api.get("/employees", {
    params: { Page: page, Limit: limit },
  });
  const meta = unwrapPagedMeta(response.data);
  let data = sortNewestFirst(
    unwrapPage<Record<string, unknown>>(response.data).map((item) => {
      const employee = normalizeEmployee(item);
      return {
        ...employee,
        rowNumber: extractRowNumber(item),
      };
    }),
  );

  if (options?.archived === true) {
    data = data.filter(
      (employee) => employee.isArchived || isLocallyArchived(employee.id),
    );
  } else {
    const archivedIds = getArchivedEmployeeIds();
    data = data.filter(
      (employee) =>
        !employee.isArchived &&
        !archivedIds.has(employee.id) &&
        !isLocallyArchived(employee.id),
    );
  }

  return { data, totalPages: meta.totalPages, totalCount: meta.totalItems };
};

export const getEmployeeCount = async () => {
  const { totalCount } = await getEmployees(1, 1);
  return totalCount || 0;
};

export const getEmployeeById = async (id: string) => {
  const response = await api.get(`/employees/${id}`);
  return normalizeEmployee(
    unwrapEntity(response.data) as Record<string, unknown>,
    true,
  );
};

export const addEmployee = async (data: Omit<Employee, "id">) => {
  const formData = await buildEmployeeFormData(data);
  const response = await api.post("/employees", formData);
  assertSuccess(response.data);

  const created = unwrapData<Record<string, unknown> | string>(response.data);

  if (created && typeof created === "object") {
    return normalizeEmployee(created, true);
  }

  if (typeof created === "string" && created.trim()) {
    try {
      return await getEmployeeById(created);
    } catch {
      return normalizeEmployee({
        id: created,
        legalName: data.name,
        email: data.email,
        workMobileNumber: data.phone,
      });
    }
  }

  return normalizeEmployee({
    id: crypto.randomUUID(),
    legalName: data.name,
    email: data.email,
    workMobileNumber: data.phone,
  });
};

export const updateEmployee = async (id: string, data: Partial<Employee>) => {
  const formData = await buildEmployeeFormData({ ...data, id } as Omit<
    Employee,
    "id"
  >, "update");
  const response = await api.put(`/employees/${id}`, formData);
  assertSuccess(response.data);
  return getEmployeeById(id);
};

export const archiveEmployee = async (id: string) => {
  const response = await api.post(`/employees/${id}/archive`);
  assertMutationSuccess(response.data, "فشل أرشفة الموظف.");
  return { success: true as const };
};

export const unarchiveEmployee = async (id: string) => {
  const response = await api.post(`/employees/${id}/unarchive`);
  assertMutationSuccess(response.data, "فشل إلغاء أرشفة الموظف.");
  return { success: true as const };
};

/** @deprecated Use archiveEmployee */
export const deleteEmployee = archiveEmployee;
