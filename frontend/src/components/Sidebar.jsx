import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useSidebar } from "../contexts/SidebarContext";
import {
  FiHome,
  FiFileText,
  FiUsers,
  FiUser,
  FiPieChart,
  FiDatabase,
  FiX,
  FiLogOut,
  FiPlusCircle,
  FiActivity,
  FiClipboard,
  FiChevronDown,
  FiChevronRight,
  FiCreditCard,
  FiDollarSign,
  FiCalendar,
  FiBarChart2,
  FiShield,
  FiEdit3,
} from "react-icons/fi";

const Sidebar = () => {
  const { usuario, logout, permissaoFinanceiro, isAdminMaster, temAlgumaRole, temRole } = useAuth();
  const { isOpen, close } = useSidebar();
  const location = useLocation();

  const isActive = (path) => location.pathname.startsWith(path);

  // Grupos de menus para melhor organização
  const menuGroups = [
    {
      title: "Principal",
      items: [
        { path: "/dashboard", icon: FiHome, label: "Dashboard" },
        {
          path: "/exames",
          icon: FiFileText,
          label: "Exames",
          roles: ["tecnico", "medico", "admin", "recepcionista"],
        },
        {
          path: "/laudos",
          icon: FiClipboard,
          label: "Laudos",
          roles: ["tecnico", "medico", "admin", "recepcionista"],
        },
        { path: "/pacientes", icon: FiUsers, label: "Pacientes" },
      ],
    },
    {
      title: "Área Médica",
      items: [
        {
          path: "/meus-pagamentos",
          icon: FiCreditCard,
          label: "Meus Pagamentos",
        },
        {
          path: "/certificados",
          icon: FiShield,
          label: "Assinaturas e Certificados",
        },
      ],
      roles: ["medico"], // Seção só aparece para quem tem role de médico
    },
    {
      title: "Gerenciamento",
      items: [
        {
          path: "/usuarios",
          icon: FiUser,
          label: "Usuários",
          roles: ["admin"],
        },
        {
          path: "/template-pdf",
          icon: FiEdit3,
          label: "Template PDF",
          roles: ["admin", "gerente"],
        },
        {
          path: "/relatorios",
          icon: FiPieChart,
          label: "Relatórios",
          roles: ["admin", "recepcionista"],
        },
        {
          path: "/auditoria",
          icon: FiDatabase,
          label: "Logs de Auditoria",
          roles: ["admin"],
        },
      ],
      roles: ["admin", "recepcionista", "gerente"],
    },
    {
      title: "Financeiro",
      items: [
        {
          path: "/financeiro/pagamentos",
          icon: FiDollarSign,
          label: "Registrar Pagamentos",
        },
        {
          path: "/financeiro/configurar-valores",
          icon: FiCreditCard,
          label: "Configurar Valores",
        },
        {
          path: "/financeiro/historico-pagamentos",
          icon: FiCalendar,
          label: "Histórico de Pagamentos",
        },
      ],
      requirePermission: "financeiro",
    },
  ];

  return (
    <>
      {/* Backdrop overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={close}
        />
      )}

      {/* Sidebar minimalista e moderno */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-white shadow-lg z-50 md:z-30 transform transition-all duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 lg:top-16 lg:h-[calc(100vh-4rem)] border-r border-gray-100`}
      >
        <div className="flex flex-col h-full">
          {/* Mobile Header */}
          <div className="lg:hidden p-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center shadow-sm">
                  <span className="text-lg font-semibold text-white">
                    {usuario?.nome?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">
                    {usuario?.nome}
                  </h3>
                  <p className="text-sm text-gray-500 capitalize">
                    {usuario?.role}
                  </p>
                </div>
              </div>
              <button
                onClick={close}
                className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-8">
            {menuGroups.map((group, index) => {
              // Verifica se o grupo deve ser exibido baseado nas roles
              if (
                group.roles &&
                !temAlgumaRole(group.roles)
              ) {
                return null;
              }

              // Verifica permissão financeira se o grupo requerer
              if (
                group.requirePermission === "financeiro" &&
                !permissaoFinanceiro &&
                !isAdminMaster
              ) {
                return null;
              }

              const hasVisibleItems = group.items.some(
                (item) =>
                  !item.roles ||
                  temAlgumaRole(item.roles),
              );

              if (!hasVisibleItems) {
                return null;
              }

              return (
                <div key={`group-${index}`}>
                  <h3 className="px-3 text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
                    {group.title}
                  </h3>

                  <div className="space-y-1">
                    {group.items.map((item) => {
                      if (
                        item.roles &&
                        !temAlgumaRole(item.roles)
                      ) {
                        return null;
                      }

                      const active = isActive(item.path);

                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={close}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                            active
                              ? "bg-blue-50 text-blue-700 border-r-2 border-blue-600"
                              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                          }`}
                        >
                          <item.icon
                            className={`flex-shrink-0 w-5 h-5 transition-colors ${
                              active
                                ? "text-blue-600"
                                : "text-gray-400 group-hover:text-gray-600"
                            }`}
                          />
                          <span>{item.label}</span>
                          <div className="ml-auto">
                            {active && (
                              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-100">
            <button
              onClick={() => {
                close();
                logout();
              }}
              className="flex items-center gap-2 px-3 py-2.5 w-full text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <FiLogOut className="w-5 h-5" />
              Sair
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
