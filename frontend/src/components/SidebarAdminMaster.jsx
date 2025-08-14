import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useSidebarAdminMaster } from "../contexts/SidebarAdminMasterContext";
import {
  FiHome,
  FiUsers,
  FiSettings,
  FiClipboard,
  FiDatabase,
  FiLogOut,
  FiBriefcase,
  FiX,
  FiChevronDown,
  FiChevronRight,
  FiFileText,
  FiPieChart,
  FiDollarSign,
  FiTrendingUp,
  FiCreditCard,
  FiBarChart,
} from "react-icons/fi";

const SidebarAdminMaster = () => {
  const { usuario, logout } = useAuth();
  const { isOpen, close } = useSidebarAdminMaster();
  const location = useLocation();
  const [expandedGroups, setExpandedGroups] = useState({
    financial: false,
  });

  const isActive = (path) => location.pathname.startsWith(path);
  const isFinancialActive = () =>
    location.pathname.startsWith("/adminmaster/financeiro");

  const toggleGroup = (groupKey) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  const menuGroups = [
    {
      title: "Visão Geral",
      items: [
        { path: "/adminmaster/dashboard", icon: FiHome, label: "Dashboard" },
        { path: "/adminmaster/empresas", icon: FiBriefcase, label: "Empresas" },
        { path: "/adminmaster/usuarios", icon: FiUsers, label: "Usuários" },
      ],
    },
    {
      title: "Monitoramento Financeiro",
      items: [
        {
          path: "/adminmaster/financeiro/pagamentos",
          icon: FiCreditCard,
          label: "Monitoramento de Pagamentos",
        },
      ],
    },
    {
      title: "Sistema",
      items: [
        {
          path: "/adminmaster/logs",
          icon: FiDatabase,
          label: "Logs de Auditoria",
        },
        {
          path: "/adminmaster/configuracoes",
          icon: FiSettings,
          label: "Configurações do Sistema",
        },
      ],
    },
    {
      title: "Monitoramento",
      items: [
        { path: "/adminmaster/exames", icon: FiFileText, label: "Exames" },
        { path: "/adminmaster/laudos", icon: FiClipboard, label: "Laudos" },
        {
          path: "/adminmaster/relatorios",
          icon: FiPieChart,
          label: "Relatórios",
        },
      ],
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

      {/* Sidebar AdminMaster minimalista */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-gray-900 shadow-lg z-40 transform transition-all duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 lg:top-16 lg:h-[calc(100vh-4rem)] border-r border-gray-700`}
      >
        <div className="flex flex-col h-full">
          {/* Mobile Header */}
          <div className="lg:hidden p-4 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center">
                  <span className="text-lg font-semibold text-white">
                    {usuario?.nome?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="font-medium text-white">{usuario?.nome}</h3>
                  <p className="text-sm text-gray-400">Admin Master</p>
                </div>
              </div>
              <button
                onClick={close}
                className="p-2 rounded-lg text-gray-400 hover:bg-white/10"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-8">
            {menuGroups.map((group, index) => (
              <div key={`group-${index}`}>
                <h3 className="px-3 text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
                  {group.title}
                </h3>

                <div className="space-y-1">
                  {group.isExpandable ? (
                    <>
                      {/* Expandable group header */}
                      <button
                        onClick={() => toggleGroup(group.key)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group w-full ${
                          isFinancialActive()
                            ? "bg-white/10 text-white"
                            : "text-gray-300 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        <group.icon
                          className={`flex-shrink-0 w-5 h-5 transition-colors ${
                            isFinancialActive()
                              ? "text-white"
                              : "text-gray-400 group-hover:text-white"
                          }`}
                        />
                        <span className="flex-1 text-left">{group.label}</span>
                        {expandedGroups[group.key] || isFinancialActive() ? (
                          <FiChevronDown className="text-white w-4 h-4" />
                        ) : (
                          <FiChevronRight className="text-gray-400 group-hover:text-white w-4 h-4" />
                        )}
                      </button>

                      {/* Expandable group items */}
                      {(expandedGroups[group.key] || isFinancialActive()) && (
                        <div className="ml-6 space-y-1 mt-1">
                          {group.items.map((item) => {
                            const active = isActive(item.path);

                            return (
                              <Link
                                key={item.path}
                                to={item.path}
                                onClick={close}
                                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group ${
                                  active
                                    ? "bg-white/10 text-white"
                                    : "text-gray-300 hover:bg-white/5 hover:text-white"
                                }`}
                              >
                                <item.icon
                                  className={`flex-shrink-0 w-4 h-4 transition-colors ${
                                    active
                                      ? "text-white"
                                      : "text-gray-400 group-hover:text-white"
                                  }`}
                                />
                                <span>{item.label}</span>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </>
                  ) : (
                    // Regular group items
                    group.items.map((item) => {
                      const active = isActive(item.path);

                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={close}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                            active
                              ? "bg-white/10 text-white border-r-2 border-blue-600"
                              : "text-gray-300 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          <item.icon
                            className={`flex-shrink-0 w-5 h-5 transition-colors ${
                              active
                                ? "text-white"
                                : "text-gray-400 group-hover:text-white"
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
                    })
                  )}
                </div>
              </div>
            ))}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-700">
            <button
              onClick={logout}
              className="flex items-center gap-2 px-3 py-2.5 w-full text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
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

export default SidebarAdminMaster;
