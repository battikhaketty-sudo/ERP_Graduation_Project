export type Department = {
  id: string;
  name: string;
  managerId: string;
  parentId: string;
  parentName?: string;
  managerName?: string;
  description: string;
};

export type DepartmentFilters = {
  page?: number;
  limit?: number;
  name?: string;
  parentName?: string;
  managerName?: string;
};

export type DepartmentFormPayload = {
  name: string;
  managerId: string;
  parentId?: string;
  description?: string;
};
