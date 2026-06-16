import { useEffect, useState } from "react";
import { REFERENCE_DATA_LIMIT } from "../constants/defaults";
import { getContractTypes, getDepartments } from "../services/hrApi";
import { getEmployees } from "../services/employees";

export type DepartmentOption = {
  id: string;
  name: string;
  managerId: string;
  managerName?: string;
};

export type SelectOption = {
  id: string;
  name: string;
};

export type EmployeeOption = {
  id: string;
  name: string;
};

type ReferenceScope = {
  departments?: boolean;
  contractTypes?: boolean;
  employees?: boolean;
};

type ReferenceOptionsState = {
  departments: DepartmentOption[];
  contractTypes: SelectOption[];
  employees: EmployeeOption[];
  loading: boolean;
  error: string | null;
};

const emptyState: ReferenceOptionsState = {
  departments: [],
  contractTypes: [],
  employees: [],
  loading: false,
  error: null,
};

export function useReferenceOptions(enabled: boolean, scope: ReferenceScope = {}) {
  const loadDepartments = scope.departments ?? true;
  const loadContractTypes = scope.contractTypes ?? true;
  const loadEmployees = scope.employees ?? true;

  const [state, setState] = useState<ReferenceOptionsState>(emptyState);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    setState((previous) => ({ ...previous, loading: true, error: null }));

    const requests: Promise<unknown>[] = [];

    if (loadDepartments) {
      requests.push(getDepartments({ page: 1, limit: REFERENCE_DATA_LIMIT }));
    }

    if (loadContractTypes) {
      requests.push(getContractTypes(1, REFERENCE_DATA_LIMIT));
    }

    if (loadEmployees) {
      requests.push(getEmployees(1, REFERENCE_DATA_LIMIT));
    }

    Promise.all(requests)
      .then((results) => {
        if (cancelled) return;

        let index = 0;
        const nextState: ReferenceOptionsState = {
          ...emptyState,
          loading: false,
          error: null,
        };

        if (loadDepartments) {
          const departmentsResult = results[index++] as Awaited<
            ReturnType<typeof getDepartments>
          >;
          nextState.departments = departmentsResult.records.map((department) => ({
            id: department.id,
            name: department.name,
            managerId: department.managerId,
            managerName: department.managerName,
          }));
        }

        if (loadContractTypes) {
          const contractTypes = results[index++] as Awaited<ReturnType<typeof getContractTypes>>;
          nextState.contractTypes = contractTypes.map((contractType) => ({
            id: contractType.id,
            name: contractType.name,
          }));
        }

        if (loadEmployees) {
          const employeesResult = results[index++] as Awaited<ReturnType<typeof getEmployees>>;
          nextState.employees = employeesResult.data.map((employee) => ({
            id: employee.id,
            name: employee.name,
          }));
        }

        setState(nextState);
      })
      .catch(() => {
        if (cancelled) return;

        setState({
          ...emptyState,
          loading: false,
          error: "تعذر تحميل البيانات المرجعية.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, loadContractTypes, loadDepartments, loadEmployees]);

  return state;
}
