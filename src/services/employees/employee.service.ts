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
import { buildEmployeeFormData } from "./employee.form";
import { normalizeEmployee } from "./employee.mapper";

export const getEmployees = async (page = 1, limit = 10) => {
  const response = await api.get("/employees", { params: { Page: page, Limit: limit } });
  const meta = unwrapPagedMeta(response.data);
  const data = unwrapPage<Record<string, unknown>>(response.data).map((item) =>
    normalizeEmployee(item),
  );

  return { data, totalPages: meta.totalPages, totalCount: meta.totalItems };
};

export const getEmployeeCount = async () => {
  const { totalCount } = await getEmployees(1, 1);
  return totalCount || 0;
};

export const getEmployeeById = async (id: string) => {
  const response = await api.get(`/employees/${id}`);
  return normalizeEmployee(unwrapEntity(response.data) as Record<string, unknown>, true);
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
  const formData = await buildEmployeeFormData({ ...data, id } as Omit<Employee, "id">);
  const response = await api.put(`/employees/${id}`, formData);
  assertSuccess(response.data);
  return getEmployeeById(id);
};

export const deleteEmployee = async (id: string) => {
  try {
    const response = await api.post(`/employees/${id}/archive`);
    assertMutationSuccess(response.data, "فشل حذف الموظف من السيرفر.");
    return { success: true as const };
  } catch (error: unknown) {
    const message =
      error && typeof error === "object" && "message" in error
        ? String((error as { message?: unknown }).message || "")
        : "";

    if (message.includes("500") || message.includes("entity changes")) {
      throw {
        message:
          "لا يمكن حذف الموظف لوجود بيانات مرتبطة به. يرجى حذف البيانات المرتبطة أولاً.",
      };
    }

    throw error;
  }
};
