import React, { useEffect } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import MainLayoutAdminMaster from "./layouts/MainLayoutAdminMaster";
import AuthLayout from "./layouts/AuthLayout";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Auth/Login";
import ExameDetalhes from "./pages/Exames/ExameDetalhes";
import CriarLaudo from "./pages/Laudos/CriarLaudo";
import Usuarios from "./pages/Usuarios/ListaUsuarios";
import LaudosDashboard from "./pages/Laudos/LaudosDashboard";
import ListaPacientes from "./pages/Pacientes/ListaPacientes";
import CriarPaciente from "./pages/Pacientes/CriarPaciente";
import CriarUsuario from "./pages/Usuarios/CriarUsuario";
import CriarExame from "./pages/Exames/CriarExame";
import DetalhesLaudo from "./pages/Laudos/DetalhesLaudo";
import DashboardExames from "./pages/Exames/DashboardExames";
import Relatorios from "./pages/Admin/Relatorios";
import VisualizacaoPublicaLaudo from "./pages/Laudos/VisualizacaoPublicaLaudo";
import Auditoria from "./pages/Admin/Auditoria";
import EsqueciSenha from "./pages/Auth/EsqueciSenha";
import ResetarSenha from "./pages/Auth/ResetarSenha";
import RequireAuth from "./components/RequireAuth";
import RequireRole from "./components/RequireRole";
import RequireFinanceiroPermission from "./components/RequireFinanceiroPermission";
import PaginaErro from "./pages/PaginaErro";
import TermosDeUso from "./pages/TermosDeUso";
import PoliticaDePrivacidade from "./pages/PoliticaDePrivacidade";
import AdminMasterDashboard from "./pages/AdminMaster/Dashboard";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import TenantList from "./pages/AdminMaster/Tenant/TenantList";
import TenantForm from "./pages/AdminMaster/Tenant/TenantForm";
import UsuarioList from "./pages/AdminMaster/Usuarios/UsuarioList";
import UsuarioForm from "./pages/AdminMaster/Usuarios/UsuarioForm";
import Configuracoes from "./pages/AdminMaster/Configuracoes";
import AuditLogList from "./pages/AdminMaster/AuditLogs/AuditLogList";
import ExamesList from "./pages/AdminMaster/Exames/ExamesList";
import LaudosList from "./pages/AdminMaster/Laudos/LaudosList";
import RelatoriosAdminMaster from "./pages/AdminMaster/Relatorios/Relatorios";
import PagamentosLaudoTenant from "./pages/Financeiro/PagamentosLaudoTenant";
import HistoricoPagamentos from "./pages/Financeiro/HistoricoPagamentos";
import ConfigurarValores from "./pages/Financeiro/ConfigurarValores";
import PagamentosLaudo from "./pages/AdminMaster/Financeiro/PagamentosLaudo";
import MeusPagamentos from "./pages/Medico/MeusPagamentos";
import GerenciarCertificados from "./pages/Medico/GerenciarCertificados";
import TemplatePDFPage from "./pages/TemplatePDF/TemplatePDFPage";

// Componente para rotas autenticadas
function AuthenticatedApp() {
  const navigate = useNavigate();
  const { isAdminMaster } = useAuth();

  return (
    <Routes>
      {/* Rotas autenticadas */}
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <MainLayout>
              <Dashboard />
            </MainLayout>
          </RequireAuth>
        }
      />

      <Route
        path="/exames"
        element={
          <RequireAuth>
            <MainLayout>
              <DashboardExames />
            </MainLayout>
          </RequireAuth>
        }
      />

      <Route
        path="/exames/novo"
        element={
          <RequireAuth>
            <RequireRole roles={["tecnico", "admin", "recepcionista"]}>
              <MainLayout>
                <CriarExame />
              </MainLayout>
            </RequireRole>
          </RequireAuth>
        }
      />

      {/* Rota de edição de exame */}
      <Route
        path="/exames/editar/:id"
        element={
          <RequireAuth>
            <RequireRole roles={["tecnico", "admin", "recepcionista"]}>
              <MainLayout>
                <CriarExame />
              </MainLayout>
            </RequireRole>
          </RequireAuth>
        }
      />

      <Route
        path="/exames/:id"
        element={
          <RequireAuth>
            <MainLayout>
              <ExameDetalhes />
            </MainLayout>
          </RequireAuth>
        }
      />

      <Route
        path="/laudos"
        element={
          <RequireAuth>
            <MainLayout>
              <LaudosDashboard />
            </MainLayout>
          </RequireAuth>
        }
      />

      <Route
        path="/laudos/novo"
        element={
          <RequireAuth>
            <RequireRole roles={["medico"]}>
              <MainLayout>
                <CriarLaudo />
              </MainLayout>
            </RequireRole>
          </RequireAuth>
        }
      />

      <Route
        path="/laudos/:id"
        element={
          <RequireAuth>
            <MainLayout>
              <DetalhesLaudo />
            </MainLayout>
          </RequireAuth>
        }
      />

      <Route
        path="/pacientes"
        element={
          <RequireAuth>
            <MainLayout>
              <ListaPacientes />
            </MainLayout>
          </RequireAuth>
        }
      />

      <Route
        path="/pacientes/novo"
        element={
          <RequireAuth>
            <MainLayout>
              <CriarPaciente />
            </MainLayout>
          </RequireAuth>
        }
      />

      <Route
        path="/pacientes/editar/:id"
        element={
          <RequireAuth>
            <MainLayout>
              <CriarPaciente />
            </MainLayout>
          </RequireAuth>
        }
      />

      <Route
        path="/usuarios"
        element={
          <RequireAuth>
            <RequireRole roles={["admin"]}>
              <MainLayout>
                <Usuarios />
              </MainLayout>
            </RequireRole>
          </RequireAuth>
        }
      />

      <Route
        path="/usuarios/novo"
        element={
          <RequireAuth>
            <RequireRole roles={["admin"]}>
              <MainLayout>
                <CriarUsuario />
              </MainLayout>
            </RequireRole>
          </RequireAuth>
        }
      />

      <Route
        path="/usuarios/editar/:id"
        element={
          <RequireAuth>
            <RequireRole roles={["admin"]}>
              <MainLayout>
                <CriarUsuario />
              </MainLayout>
            </RequireRole>
          </RequireAuth>
        }
      />

      <Route
        path="/relatorios"
        element={
          <RequireAuth>
            <RequireRole roles={["admin", "recepcionista"]}>
              <MainLayout>
                <Relatorios />
              </MainLayout>
            </RequireRole>
          </RequireAuth>
        }
      />

      <Route
        path="/auditoria"
        element={
          <RequireAuth>
            <RequireRole roles={["admin"]}>
              <MainLayout>
                <Auditoria />
              </MainLayout>
            </RequireRole>
          </RequireAuth>
        }
      />

      <Route
        path="/template-pdf"
        element={
          <RequireAuth>
            <RequireRole roles={["admin", "gerente"]}>
              <MainLayout>
                <TemplatePDFPage />
              </MainLayout>
            </RequireRole>
          </RequireAuth>
        }
      />

      <Route
        path="/adminmaster/dashboard"
        element={
          <RequireAuth>
            <RequireRole roles={["adminMaster"]}>
              <MainLayoutAdminMaster>
                <AdminMasterDashboard />
              </MainLayoutAdminMaster>
            </RequireRole>
          </RequireAuth>
        }
      />
      <Route
        path="/adminmaster/empresas"
        element={
          <RequireAuth>
            <RequireRole roles={["adminMaster"]}>
              <MainLayoutAdminMaster>
                <TenantList />
              </MainLayoutAdminMaster>
            </RequireRole>
          </RequireAuth>
        }
      />
      <Route
        path="/adminmaster/empresas/novo"
        element={
          <RequireAuth>
            <RequireRole roles={["adminMaster"]}>
              <MainLayoutAdminMaster>
                <TenantForm />
              </MainLayoutAdminMaster>
            </RequireRole>
          </RequireAuth>
        }
      />

      <Route
        path="/adminmaster/empresas/editar/:id"
        element={
          <RequireAuth>
            <RequireRole roles={["adminMaster"]}>
              <MainLayoutAdminMaster>
                <TenantForm />
              </MainLayoutAdminMaster>
            </RequireRole>
          </RequireAuth>
        }
      />

      <Route
        path="/adminmaster/configuracoes"
        element={
          <RequireAuth>
            <RequireRole roles={["adminMaster"]}>
              <MainLayoutAdminMaster>
                <Configuracoes />
              </MainLayoutAdminMaster>
            </RequireRole>
          </RequireAuth>
        }
      />

      <Route
        path="/adminmaster/usuarios"
        element={
          <RequireAuth>
            <RequireRole roles={["adminMaster"]}>
              <MainLayoutAdminMaster>
                <UsuarioList />
              </MainLayoutAdminMaster>
            </RequireRole>
          </RequireAuth>
        }
      />

      <Route
        path="/adminmaster/usuarios/novo"
        element={
          <RequireAuth>
            <RequireRole roles={["adminMaster"]}>
              <MainLayoutAdminMaster>
                <UsuarioForm />
              </MainLayoutAdminMaster>
            </RequireRole>
          </RequireAuth>
        }
      />

      <Route
        path="/adminmaster/usuarios/editar/:id"
        element={
          <RequireAuth>
            <RequireRole roles={["adminMaster"]}>
              <MainLayoutAdminMaster>
                <UsuarioForm />
              </MainLayoutAdminMaster>
            </RequireRole>
          </RequireAuth>
        }
      />

      <Route
        path="/adminmaster/exames"
        element={
          <RequireAuth>
            <MainLayoutAdminMaster>
              <ExamesList />
            </MainLayoutAdminMaster>
          </RequireAuth>
        }
      />

      <Route
        path="/adminmaster/exames/novo"
        element={
          <RequireAuth>
            <MainLayoutAdminMaster>
              <CriarExame />
            </MainLayoutAdminMaster>
          </RequireAuth>
        }
      />

      {/* Rota de edição de exame para AdminMaster */}
      <Route
        path="/adminmaster/exames/editar/:id"
        element={
          <RequireAuth>
            <MainLayoutAdminMaster>
              <CriarExame />
            </MainLayoutAdminMaster>
          </RequireAuth>
        }
      />

      <Route
        path="/adminmaster/exames/:id"
        element={
          <RequireAuth>
            <MainLayoutAdminMaster>
              <ExameDetalhes />
            </MainLayoutAdminMaster>
          </RequireAuth>
        }
      />

      <Route
        path="/adminmaster/laudos"
        element={
          <RequireAuth>
            <MainLayoutAdminMaster>
              <LaudosList />
            </MainLayoutAdminMaster>
          </RequireAuth>
        }
      />

      <Route
        path="/adminmaster/laudos/novo"
        element={
          <RequireAuth>
            <MainLayoutAdminMaster>
              <CriarLaudo />
            </MainLayoutAdminMaster>
          </RequireAuth>
        }
      />

      <Route
        path="/adminmaster/laudos/:id"
        element={
          <RequireAuth>
            <MainLayoutAdminMaster>
              <DetalhesLaudo />
            </MainLayoutAdminMaster>
          </RequireAuth>
        }
      />

      <Route
        path="/adminmaster/pacientes"
        element={
          <RequireAuth>
            <MainLayoutAdminMaster>
              <ListaPacientes />
            </MainLayoutAdminMaster>
          </RequireAuth>
        }
      />

      <Route
        path="/adminmaster/pacientes/novo"
        element={
          <RequireAuth>
            <MainLayoutAdminMaster>
              <CriarPaciente />
            </MainLayoutAdminMaster>
          </RequireAuth>
        }
      />

      <Route
        path="/adminmaster/pacientes/editar/:id"
        element={
          <RequireAuth>
            <MainLayoutAdminMaster>
              <CriarPaciente />
            </MainLayoutAdminMaster>
          </RequireAuth>
        }
      />

      <Route
        path="/adminmaster/logs"
        element={
          <RequireAuth>
            <RequireRole roles={["adminMaster"]}>
              <MainLayoutAdminMaster>
                <AuditLogList />
              </MainLayoutAdminMaster>
            </RequireRole>
          </RequireAuth>
        }
      />

      <Route
        path="/adminmaster/relatorios"
        element={
          <RequireAuth>
            <RequireRole roles={["adminMaster"]}>
              <MainLayoutAdminMaster>
                <RelatoriosAdminMaster />
              </MainLayoutAdminMaster>
            </RequireRole>
          </RequireAuth>
        }
      />

      {/* AdminMaster Financial - Only Payment Monitoring */}
      <Route
        path="/adminmaster/financeiro/pagamentos"
        element={
          <RequireAuth>
            <RequireRole roles={["adminMaster"]}>
              <MainLayoutAdminMaster>
                <PagamentosLaudo />
              </MainLayoutAdminMaster>
            </RequireRole>
          </RequireAuth>
        }
      />

      {/* Tenant Financial Routes */}
      <Route
        path="/financeiro/pagamentos"
        element={
          <RequireAuth>
            <RequireRole roles={["admin", "recepcionista"]}>
              <RequireFinanceiroPermission>
                <MainLayout>
                  <PagamentosLaudoTenant />
                </MainLayout>
              </RequireFinanceiroPermission>
            </RequireRole>
          </RequireAuth>
        }
      />

      <Route
        path="/financeiro/historico-pagamentos"
        element={
          <RequireAuth>
            <RequireRole roles={["admin", "recepcionista"]}>
              <RequireFinanceiroPermission>
                <MainLayout>
                  <HistoricoPagamentos />
                </MainLayout>
              </RequireFinanceiroPermission>
            </RequireRole>
          </RequireAuth>
        }
      />

      <Route
        path="/financeiro/configurar-valores"
        element={
          <RequireAuth>
            <RequireRole roles={["admin", "recepcionista"]}>
              <RequireFinanceiroPermission>
                <MainLayout>
                  <ConfigurarValores />
                </MainLayout>
              </RequireFinanceiroPermission>
            </RequireRole>
          </RequireAuth>
        }
      />

      {/* Rota para médicos visualizarem seus próprios pagamentos */}
      <Route
        path="/meus-pagamentos"
        element={
          <RequireAuth>
            <RequireRole roles={["medico"]}>
              <MainLayout>
                <MeusPagamentos />
              </MainLayout>
            </RequireRole>
          </RequireAuth>
        }
      />

      {/* Rota para médicos gerenciarem seus certificados digitais */}
      <Route
        path="/certificados"
        element={
          <RequireAuth>
            <RequireRole roles={["medico"]}>
              <MainLayout>
                <GerenciarCertificados />
              </MainLayout>
            </RequireRole>
          </RequireAuth>
        }
      />

      {/* Rotas de autenticação dentro do contexto autenticado */}
      <Route
        path="/"
        element={
          <AuthLayout>
            <Login />
          </AuthLayout>
        }
      />
      <Route
        path="/login"
        element={
          <AuthLayout>
            <Login />
          </AuthLayout>
        }
      />
      <Route
        path="/esqueci-senha"
        element={
          <AuthLayout>
            <EsqueciSenha />
          </AuthLayout>
        }
      />
      <Route
        path="/resetar-senha"
        element={
          <AuthLayout>
            <ResetarSenha />
          </AuthLayout>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <Routes>
      {/* Rotas públicas - SEM AuthProvider */}
      <Route path="/publico/:id" element={<VisualizacaoPublicaLaudo />} />
      <Route path="/termos" element={<TermosDeUso />} />
      <Route path="/privacidade" element={<PoliticaDePrivacidade />} />
      <Route path="/erro" element={<PaginaErro />} />
      
      {/* Todas as outras rotas - COM AuthProvider */}
      <Route path="/*" element={
        <AuthProvider>
          <AuthenticatedApp />
        </AuthProvider>
      } />
    </Routes>
  );
}

export default App;
