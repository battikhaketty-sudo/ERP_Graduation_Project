import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ROUTES } from "../constants/routes";

type ProtectedRouteProps = {
  children: React.ReactNode;
};

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.login} state={{ from: location }} replace />;
  }

  return children;
}
