import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

/**
 * Componente para proteger rotas que requerem permissão financeira
 * Verifica se o usuário possui a permissão necessária e, caso contrário, redireciona para o dashboard
 * Usuários adminMaster têm acesso a todas as rotas, independente de permissões específicas
 */
const RequireFinanceiroPermission = ({ children }) => {
  const { usuario } = useAuth();

  // Verifica se o usuário está autenticado e tem permissão financeira
  if (!usuario) {
    return <Navigate to="/" replace />;
  }

  // AdminMaster tem acesso a tudo
  if (usuario.isAdminMaster) {
    return children;
  }

  // Verifica se o usuário tem permissão financeira
  if (!usuario.permissaoFinanceiro) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default RequireFinanceiroPermission;
