import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import { guestLoader, requireAuthLoader, rootAuthLoader } from "../auth/loaders";
import { ROUTES } from "../constants/routes";
import { AppLayout } from "../layouts/AppLayout";
import { AccessManagementPage } from "../pages/AccessManagementPage";
import { DepartmentsPage } from "../pages/DepartmentsPage";
import { EmployeesPage } from "../pages/EmployeesPage";
import { HrPage } from "../pages/HrPage";
import { LoginPage } from "../pages/LoginPage";
import { NotificationsPage } from "../pages/NotificationsPage";
import { ProjectsPage } from "../pages/ProjectsPage";
import { bindAppRouter } from "./navigation";

export const router = createBrowserRouter([
  {
    id: "root",
    element: <Outlet />,
    loader: rootAuthLoader,
    children: [
      {
        path: ROUTES.login,
        loader: guestLoader,
        element: <LoginPage />,
      },
      {
        loader: requireAuthLoader,
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to={ROUTES.projects} replace /> },
          { path: ROUTES.projects, element: <ProjectsPage /> },
          { path: ROUTES.employees, element: <EmployeesPage /> },
          { path: ROUTES.departments, element: <DepartmentsPage /> },
          { path: ROUTES.access, element: <AccessManagementPage /> },
          { path: ROUTES.hr, element: <HrPage /> },
          { path: ROUTES.notifications, element: <NotificationsPage /> },
        ],
      },
      { path: "*", element: <Navigate to={ROUTES.projects} replace /> },
    ],
  },
]);

bindAppRouter(router);
