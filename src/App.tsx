import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ROUTES } from "./constants/routes";
import { AppLayout } from "./layouts/AppLayout";
import { DashboardPage } from "./pages/DashboardPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { EmployeesPage } from "./pages/EmployeesPage";
import { DepartmentsPage } from "./pages/DepartmentsPage";
import { HrPage } from "./pages/HrPage";
import { LoginPage } from "./pages/LoginPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { AccessManagementPage } from "./pages/AccessManagementPage";

export default function App() {
  return (
    <Routes>
      <Route path={ROUTES.login} element={<LoginPage />} />

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path={ROUTES.projects} element={<ProjectsPage />} />
        <Route path={ROUTES.employees} element={<EmployeesPage />} />
        <Route path={ROUTES.departments} element={<DepartmentsPage />} />
        <Route path={ROUTES.access} element={<AccessManagementPage />} />
        <Route path={ROUTES.hr} element={<HrPage />} />
        <Route path={ROUTES.notifications} element={<NotificationsPage />} />
      </Route>

      <Route path="*" element={<Navigate to={ROUTES.dashboard} replace />} />
    </Routes>
  );
}
