// src/components/RequireAuth.jsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const RequireAuth = ({ children }) => {
  const { usuario, isLoading } = useAuth();

  if (isLoading) return <div>Carregando...</div>;
  if (!usuario) return <Navigate to="/login" replace />;

  return children;
};

export default RequireAuth;
