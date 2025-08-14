import React, { useState, useEffect } from "react";
import InputDataBrasileira from "../../../components/InputDataBrasileira";
import {
  FiSearch,
  FiFilter,
  FiCalendar,
  FiDatabase,
  FiUser,
  FiFileText,
  FiPlus,
  FiTrash,
  FiEdit,
  FiEye,
  FiRefreshCw,
  FiX,
  FiShield,
} from "react-icons/fi";
import { FaBuilding } from "react-icons/fa";
import api from "../../../api";
import { toast } from "react-toastify";

const AuditLogList = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    action: "",
    collectionName: "",
    userId: "",
    startDate: "",
    endDate: "",
    tenant_id: "",
  });
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [tenants, setTenants] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
  });

  const fetchLogs = async (page = 1) => {
    try {
      setLoading(true);

      const queryParams = new URLSearchParams();
      queryParams.append("page", page);
      queryParams.append("limit", 20);

      // Filtrar apenas ações importantes
      const importantActions = [
        "create",
        "update",
        "delete",
        "login",
        "logout",
      ];
      if (filters.action && importantActions.includes(filters.action)) {
        queryParams.append("action", filters.action);
      }

      // Adicionar outros filtros
      Object.entries(filters).forEach(([key, value]) => {
        if (value && key !== "action") {
          queryParams.append(key, value);
        }
      });

      const response = await api.get(
        `/auditoria/adminmaster/audit?${queryParams}`,
      );

      // Filtrar logs no frontend para mostrar apenas ações importantes
      const filteredLogs = response.data.data.filter((log) =>
        importantActions.includes(log.action),
      );

      setLogs(filteredLogs);
      setPagination({
        currentPage: response.data.pagination.currentPage,
        totalPages: response.data.pagination.pages,
        totalItems: response.data.pagination.total,
      });
    } catch (error) {
      console.error("Erro ao carregar logs de auditoria:", error);
      toast.error("Erro ao carregar logs de auditoria");
    } finally {
      setLoading(false);
    }
  };

  const fetchSelects = async () => {
    try {
      const [tenantsRes, usuariosRes] = await Promise.all([
        api.get("/tenants"),
        api.get("/usuarios?limit=200"),
      ]);

      setTenants(Array.isArray(tenantsRes.data) ? tenantsRes.data : []);
      setUsuarios(
        Array.isArray(usuariosRes.data?.usuarios)
          ? usuariosRes.data.usuarios
          : [],
      );
    } catch (err) {
      console.error("Erro ao carregar dados para seleção:", err);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchSelects();
  }, []);

  const handleFilterChange = (campo, valor) => {
    setFilters((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  };

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchLogs(1);
  };

  const limparFiltros = () => {
    setFilters({
      action: "",
      collectionName: "",
      userId: "",
      startDate: "",
      endDate: "",
      tenant_id: "",
    });
    fetchLogs(1);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      return new Date(dateString).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "-";
    }
  };

  const getActionIcon = (action) => {
    switch (action) {
      case "create":
        return <FiPlus className="w-4 h-4" />;
      case "update":
        return <FiEdit className="w-4 h-4" />;
      case "delete":
        return <FiTrash className="w-4 h-4" />;
      case "login":
        return <FiShield className="w-4 h-4" />;
      case "logout":
        return <FiShield className="w-4 h-4" />;
      default:
        return <FiFileText className="w-4 h-4" />;
    }
  };

  const getActionColor = (action) => {
    switch (action) {
      case "create":
        return "bg-green-100 text-green-800";
      case "update":
        return "bg-blue-100 text-blue-800";
      case "delete":
        return "bg-red-100 text-red-800";
      case "login":
        return "bg-purple-100 text-purple-800";
      case "logout":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  const getCollectionDisplayName = (collectionName) => {
    const mapping = {
      usuarios: "Usuários",
      tenants: "Empresas",
      exames: "Exames",
      laudos: "Laudos",
      pacientes: "Pacientes",
      pagamentos: "Pagamentos",
      tipos_exame: "Tipos de Exame",
      especialidades: "Especialidades",
    };
    return mapping[collectionName] || collectionName;
  };

  if (loading && logs.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">
              Logs de Auditoria do Sistema
            </h1>
            <p className="text-slate-500 mt-1">
              Monitore e rastreie atividades importantes do sistema em todas as
              empresas
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchLogs(pagination.currentPage)}
              className="flex items-center text-slate-800 gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <FiRefreshCw className="w-4 h-4" />
              Atualizar
            </button>
            <button
              onClick={() => setMostrarFiltros(!mostrarFiltros)}
              className={`flex items-center text-slate-800 gap-2 px-4 py-2 border rounded-lg transition-colors ${
                mostrarFiltros
                  ? "bg-blue-50 border-blue-200 text-blue-600"
                  : "bg-white border-slate-200 hover:bg-slate-50"
              }`}
            >
              <FiFilter className="w-4 h-4" />
              Filtros
              {Object.values(filters).filter((v) => v).length > 0 && (
                <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                  {Object.values(filters).filter((v) => v).length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Estatísticas Rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm">Total de Eventos</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">
                  {pagination.totalItems}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FiDatabase className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm">Criações</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {logs.filter((log) => log.action === "create").length}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <FiPlus className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm">Atualizações</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  {logs.filter((log) => log.action === "update").length}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FiEdit className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm">Exclusões</p>
                <p className="text-2xl font-bold text-red-600 mt-1">
                  {logs.filter((log) => log.action === "delete").length}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <FiTrash className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filtros Avançados */}
        {mostrarFiltros && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">Filtros</h3>
              <button
                onClick={() => setMostrarFiltros(false)}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <FiX className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleFilterSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Ação */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <FiFileText className="inline w-4 h-4 mr-1" />
                    Ação
                  </label>
                  <select
                    value={filters.action}
                    onChange={(e) =>
                      handleFilterChange("action", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
                  >
                    <option value="">Todas as ações</option>
                    <option value="create">Criação</option>
                    <option value="update">Atualização</option>
                    <option value="delete">Exclusão</option>
                    <option value="login">Login</option>
                    <option value="logout">Logout</option>
                  </select>
                </div>

                {/* Coleção */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <FiDatabase className="inline w-4 h-4 mr-1" />
                    Tipo de Documento
                  </label>
                  <select
                    value={filters.collectionName}
                    onChange={(e) =>
                      handleFilterChange("collectionName", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
                  >
                    <option value="">Todos os tipos</option>
                    <option value="usuarios">Usuários</option>
                    <option value="tenants">Empresas</option>
                    <option value="exames">Exames</option>
                    <option value="laudos">Laudos</option>
                    <option value="pacientes">Pacientes</option>
                    <option value="pagamentos">Pagamentos</option>
                  </select>
                </div>

                {/* Empresa */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <FaBuilding className="inline w-4 h-4 mr-1" />
                    Empresa
                  </label>
                  <select
                    value={filters.tenant_id}
                    onChange={(e) =>
                      handleFilterChange("tenant_id", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
                  >
                    <option value="">Todas as empresas</option>
                    {tenants.map((tenant) => (
                      <option key={tenant._id} value={tenant._id}>
                        {tenant.nomeFantasia || tenant.nome}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Usuário */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <FiUser className="inline w-4 h-4 mr-1" />
                    Usuário
                  </label>
                  <select
                    value={filters.userId}
                    onChange={(e) =>
                      handleFilterChange("userId", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
                  >
                    <option value="">Todos os usuários</option>
                    {usuarios.map((usuario) => (
                      <option key={usuario._id} value={usuario._id}>
                        {usuario.nome}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Data Inicial */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <FiCalendar className="inline w-4 h-4 mr-1" />
                    Data Inicial
                  </label>
                  <InputDataBrasileira
                    value={filters.startDate}
                    onChange={(e) =>
                      handleFilterChange("startDate", e.target.value)
                    }
                    placeholder="dd/mm/aaaa"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
                  />
                </div>

                {/* Data Final */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <FiCalendar className="inline w-4 h-4 mr-1" />
                    Data Final
                  </label>
                  <InputDataBrasileira
                    value={filters.endDate}
                    onChange={(e) =>
                      handleFilterChange("endDate", e.target.value)
                    }
                    placeholder="dd/mm/aaaa"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
                  />
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200">
                <div className="text-sm text-slate-500">
                  {Object.values(filters).filter((v) => v).length} filtros
                  aplicados
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={limparFiltros}
                    className="px-4 py-2 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    Limpar Filtros
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Aplicar Filtros
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Tabela de Logs */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">
                  Logs de Auditoria
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  {pagination.totalItems} eventos encontrados
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Data/Hora
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Ação
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Tipo de Documento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Usuário
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Empresa
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Descrição
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-4 text-center">
                      <div className="flex justify-center items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      </div>
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center">
                      <FiDatabase className="mx-auto text-slate-300 text-4xl mb-3" />
                      <h3 className="text-lg font-medium text-slate-500">
                        Nenhum log encontrado
                      </h3>
                      <p className="text-slate-400 mt-1">
                        {Object.values(filters).filter((v) => v).length > 0
                          ? "Tente ajustar os filtros para encontrar resultados"
                          : "Não há logs de auditoria registrados"}
                      </p>
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr
                      key={log._id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {formatDate(log.timestamp)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionColor(log.action)}`}
                        >
                          {getActionIcon(log.action)}
                          <span className="ml-1 capitalize">
                            {log.action === "create"
                              ? "Criação"
                              : log.action === "update"
                                ? "Atualização"
                                : log.action === "delete"
                                  ? "Exclusão"
                                  : log.action === "login"
                                    ? "Login"
                                    : log.action === "logout"
                                      ? "Logout"
                                      : log.action}
                          </span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {getCollectionDisplayName(log.collectionName)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        <div className="flex items-center">
                          <FiUser className="w-4 h-4 text-slate-400 mr-2" />
                          {log.userId?.nome || "Sistema"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        <div className="flex items-center">
                          <FaBuilding className="w-4 h-4 text-slate-400 mr-2" />
                          {log.tenant_id?.nomeFantasia ||
                            log.tenant_id?.nome ||
                            "N/A"}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate">
                        {log.description || "Sem descrição"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {!loading && logs.length > 0 && pagination.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <p className="text-sm text-slate-600">
                  Página {pagination.currentPage} de {pagination.totalPages} •{" "}
                  {pagination.totalItems} itens
                </p>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => fetchLogs(pagination.currentPage - 1)}
                    disabled={pagination.currentPage === 1}
                    className={`px-3 py-1 rounded-md border ${
                      pagination.currentPage === 1
                        ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                        : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    Anterior
                  </button>

                  <button
                    onClick={() => fetchLogs(pagination.currentPage + 1)}
                    disabled={pagination.currentPage === pagination.totalPages}
                    className={`px-3 py-1 rounded-md border ${
                      pagination.currentPage === pagination.totalPages
                        ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                        : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    Próxima
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuditLogList;
