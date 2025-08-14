import React, { useState, useEffect, useCallback, useMemo, memo } from "react";
import {
  FiFileText,
  FiSearch,
  FiDownload,
  FiUser,
  FiDatabase,
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
  FiFilter,
  FiRefreshCw,
  FiActivity,
  FiShield,
  FiBarChart,
  FiTrendingUp,
} from "react-icons/fi";
import {
  FaFilePdf,
  FaFileExcel,
  FaCheckCircle,
  FaTimesCircle,
} from "react-icons/fa";
import { HiOutlineDocumentReport } from "react-icons/hi";
import { MdOutlineSecurity } from "react-icons/md";
import api from "../../api";
import { useAuth } from "../../contexts/AuthContext";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";

// Hook personalizado para debounce
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Componente de Loading otimizado
const LoadingSpinner = memo(() => (
  <div className="flex flex-col justify-center items-center p-20">
    <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent"></div>
    <p className="text-gray-600 text-lg font-medium mt-4">
      Carregando registros...
    </p>
  </div>
));

// Componente de Card de Estatística otimizado
const StatCard = memo(
  ({ title, value, icon: Icon, color, gradient, subtitle, isLoading }) => {
    if (isLoading) {    return (
      <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="h-3 bg-gray-200 rounded w-1/2 mb-1"></div>
            <div className="h-6 bg-gray-200 rounded w-16 mb-1"></div>
            <div className="h-2 bg-gray-200 rounded w-2/3"></div>
          </div>
          <div className="w-10 h-10 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
    }

    return (
      <div
        className={`bg-white rounded-2xl p-4 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-200 ${color}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-xs font-semibold text-gray-600 mb-1">{title}</p>
            <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
            <span className="text-xs text-gray-500">{subtitle}</span>
          </div>
          <div
            className={`p-3 bg-gradient-to-r ${gradient} rounded-xl shadow-md`}
          >
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </div>
    );
  },
);

const Auditoria = () => {
  const { usuario } = useAuth();
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filtros, setFiltros] = useState({
    dataInicio: new Date(new Date().setDate(new Date().getDate() - 7)),
    dataFim: new Date(),
    action: "",
    collectionName: "",
    userId: "",
    status: "",
  });
  const [totalRegistros, setTotalRegistros] = useState(0);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    totalPages: 1,
  });

  // Opções de ações memorizadas
  const opcoesAcao = useMemo(
    () => [
      { value: "", label: "Todas as ações" },
      { value: "create", label: "Criação" },
      { value: "update", label: "Atualização" },
      { value: "delete", label: "Exclusão" },
      { value: "login", label: "Login" },
      { value: "sign", label: "Assinatura" },
    ],
    [],
  );

  // Opções de coleções memorizadas
  const opcoesColecao = useMemo(
    () => [
      { value: "", label: "Todas as coleções" },
      { value: "usuarios", label: "Usuários" },
      { value: "pacientes", label: "Pacientes" },
      { value: "exames", label: "Exames" },
      { value: "laudos", label: "Laudos" },
    ],
    [],
  );

  // Configuração das estatísticas
  const statsConfig = useMemo(() => {
    if (!registros || registros.length === 0) {
      return [
        {
          title: "Total de Registros",
          value: "0",
          icon: FiDatabase,
          gradient: "from-slate-600 to-slate-800",
          subtitle: "No período selecionado",
        },
        {
          title: "Operações de Criação",
          value: "0",
          icon: FiActivity,
          gradient: "from-emerald-600 to-emerald-700",
          subtitle: "Novos registros",
        },
        {
          title: "Atualizações",
          value: "0",
          icon: FiTrendingUp,
          gradient: "from-blue-600 to-blue-700",
          subtitle: "Modificações",
        },
        {
          title: "Falhas",
          value: "0",
          icon: FaTimesCircle,
          gradient: "from-red-600 to-red-700",
          subtitle: "Operações falharam",
        },
      ];
    }

    return [
      {
        title: "Total de Registros",
        value: totalRegistros.toLocaleString("pt-BR"),
        icon: FiDatabase,
        gradient: "from-blue-600 to-blue-800",
        subtitle: "No período selecionado",
      },
      {
        title: "Operações de Criação",
        value: registros
          .filter((r) => r.action === "create")
          .length.toLocaleString("pt-BR"),
        icon: FiActivity,
        gradient: "from-emerald-600 to-emerald-700",
        subtitle: "Novos registros",
      },
      {
        title: "Atualizações",
        value: registros
          .filter((r) => r.action === "update")
          .length.toLocaleString("pt-BR"),
        icon: FiTrendingUp,
        gradient: "from-blue-600 to-blue-700",
        subtitle: "Modificações",
      },
      {
        title: "Falhas",
        value: registros
          .filter((r) => r.status === "failed")
          .length.toLocaleString("pt-BR"),
        icon: FaTimesCircle,
        gradient: "from-red-600 to-red-700",
        subtitle: "Operações falharam",
      },
    ];
  }, [registros, totalRegistros]);

  const buscarRegistros = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        sort: "-createdAt",
        ...filtros,
        dataInicio: filtros.dataInicio?.toISOString(),
        dataFim: filtros.dataFim?.toISOString(),
      };

      // Remove campos vazios
      Object.keys(params).forEach((key) => {
        if (params[key] === "" || params[key] === undefined) delete params[key];
      });

      const response = await api.get("/auditoria", { params });

      if (!response.data.success) {
        throw new Error(response.data.error || "Erro ao buscar registros");
      }

      setRegistros(response.data.data);
      setTotalRegistros(response.data.pagination.total);
      setPagination((prev) => ({
        ...prev,
        totalPages: response.data.pagination.pages,
      }));
    } catch (err) {
      console.error("Erro ao buscar registros");
      setError(err.response?.data?.error || err.message || "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, [pagination.page, filtros]);

  useEffect(() => {
    buscarRegistros();
  }, [buscarRegistros]);

  const exportarParaExcel = useCallback(() => {
    if (!registros || registros.length === 0) return;

    const dados = registros.map((registro) => ({
      "Data/Hora": new Date(registro.createdAt).toLocaleString(),
      Ação: registro.action,
      Usuário: registro.userId?.nome || "Sistema",
      Coleção: registro.collectionName,
      Descrição: registro.description,
      Status: registro.status || "success",
      IP: registro.ip,
      Dispositivo: registro.userAgent,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dados);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Registros Auditoria");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const data = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    saveAs(data, `auditoria_${new Date().toISOString().split("T")[0]}.xlsx`);
  }, [registros]);

  const formatarData = useCallback((data) => {
    return data ? new Date(data).toLocaleString("pt-BR") : "-";
  }, []);

  const handlePageChange = useCallback((newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Cabeçalho Moderno */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl shadow-lg">
                <MdOutlineSecurity className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Auditoria</h1>
                <p className="text-gray-600 mt-1">
                  Monitoramento e registro de atividades do sistema
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <FiCalendar className="h-4 w-4" />
              <span>
                {new Date().toLocaleDateString("pt-BR", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {statsConfig.map((stat, index) => (
            <StatCard
              key={index}
              title={stat.title}
              value={stat.value}
              icon={stat.icon}
              gradient={stat.gradient}
              subtitle={stat.subtitle}
              isLoading={loading}
            />
          ))}
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg">
                <FiFilter className="h-5 w-5 text-white" />
              </div>
              Filtros de Busca
            </h2>
            <button
              onClick={() =>
                setFiltros({
                  dataInicio: new Date(
                    new Date().setDate(new Date().getDate() - 7),
                  ),
                  dataFim: new Date(),
                  action: "",
                  collectionName: "",
                  userId: "",
                  status: "",
                })
              }
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FiRefreshCw className="h-4 w-4" />
              Limpar
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6 mb-6">
            {/* Filtro de Período */}
            <div className="xl:col-span-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-3 text-gray-700">
                    Data Inicial
                  </label>
                  <DatePicker
                    selected={filtros.dataInicio}
                    onChange={(date) =>
                      setFiltros({ ...filtros, dataInicio: date })
                    }
                    className="w-full p-3 border border-gray-200 text-gray-700 rounded-xl focus:ring-0 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white shadow-sm transition-all duration-200"
                    dateFormat="dd/MM/yyyy"
                    selectsStart
                    startDate={filtros.dataInicio}
                    endDate={filtros.dataFim}
                    maxDate={filtros.dataFim || new Date()}
                    calendarClassName="text-sm"
                    showMonthDropdown
                    showYearDropdown
                    dropdownMode="select"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-3 text-gray-700">
                    Data Final
                  </label>
                  <DatePicker
                    selected={filtros.dataFim}
                    onChange={(date) =>
                      setFiltros({ ...filtros, dataFim: date })
                    }
                    className="w-full p-3 border border-gray-200 text-gray-700 rounded-xl focus:ring-0 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white shadow-sm transition-all duration-200"
                    dateFormat="dd/MM/yyyy"
                    selectsEnd
                    startDate={filtros.dataInicio}
                    endDate={filtros.dataFim}
                    minDate={filtros.dataInicio}
                    calendarClassName="text-sm"
                    showMonthDropdown
                    showYearDropdown
                    dropdownMode="select"
                  />
                </div>
              </div>
            </div>

            {/* Ação */}
            <div>
              <label className="block text-sm font-semibold mb-3 text-gray-700">
                Ação
              </label>
              <select
                value={filtros.action}
                onChange={(e) =>
                  setFiltros({ ...filtros, action: e.target.value })
                }
                className="w-full p-3 border border-gray-200 text-gray-700 rounded-xl focus:ring-0 focus:border-blue-500 text-sm bg-white shadow-sm transition-all duration-200"
              >
                {opcoesAcao.map((opcao) => (
                  <option key={opcao.value} value={opcao.value}>
                    {opcao.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Coleção */}
            <div>
              <label className="block text-sm font-semibold mb-3 text-gray-700">
                Coleção
              </label>
              <select
                value={filtros.collectionName}
                onChange={(e) =>
                  setFiltros({ ...filtros, collectionName: e.target.value })
                }
                className="w-full p-3 border border-gray-200 text-gray-700 rounded-xl focus:ring-0 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white shadow-sm transition-all duration-200"
              >
                {opcoesColecao.map((opcao) => (
                  <option key={opcao.value} value={opcao.value}>
                    {opcao.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <button
              onClick={buscarRegistros}
              disabled={loading}
              className={`flex items-center justify-center gap-3 px-6 py-3 rounded-xl text-white font-semibold shadow-lg transition-all duration-200 transform hover:scale-105 ${
                loading
                  ? "bg-gradient-to-r from-gray-400 to-gray-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 hover:shadow-xl"
              } w-full sm:w-auto`}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  <span>Buscando...</span>
                </>
              ) : (
                <>
                  <FiSearch className="h-5 w-5" />
                  <span>Buscar Registros</span>
                </>
              )}
            </button>

            {registros.length > 0 && (
              <button
                onClick={exportarParaExcel}
                className="flex items-center justify-center gap-3 px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 w-full sm:w-auto"
              >
                <FaFileExcel className="h-5 w-5" />
                <span>Exportar Excel</span>
              </button>
            )}
          </div>
        </div>

        {/* Mensagens de erro */}
        {error && (
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-red-200">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-red-100 rounded-lg flex-shrink-0">
                <FaTimesCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-red-800 mb-1">
                  Erro ao carregar dados
                </h3>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
            <LoadingSpinner />
          </div>
        )}

        {/* Tabela de Resultados */}
        {!loading && registros.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg">
                    <HiOutlineDocumentReport className="h-5 w-5 text-white" />
                  </div>
                  Registros de Atividade
                </h2>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <FiBarChart className="h-4 w-4" />
                  <span>
                    {totalRegistros.toLocaleString("pt-BR")} registros
                    encontrados
                  </span>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Data/Hora
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Ação
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Usuário
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Coleção
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Descrição
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {registros.map((registro, index) => (
                    <tr
                      key={registro._id}
                      className={`hover:bg-gray-50 transition-colors duration-200 ${index % 2 === 0 ? "bg-white" : "bg-gray-50/30"}`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                        {formatarData(registro.timestamp || registro.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full ${
                            registro.action === "create"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : registro.action === "update"
                                ? "bg-blue-100 text-blue-800 border border-blue-200"
                                : registro.action === "delete"
                                  ? "bg-red-100 text-red-800 border border-red-200"
                                  : registro.action === "login"
                                    ? "bg-purple-100 text-purple-800 border border-purple-200"
                                    : "bg-slate-100 text-slate-800 border border-slate-200"
                          }`}
                        >
                          {registro.action === "create" && "Criação"}
                          {registro.action === "update" && "Atualização"}
                          {registro.action === "delete" && "Exclusão"}
                          {registro.action === "login" && "Login"}
                          {registro.action === "sign" && "Assinatura"}
                          {![
                            "create",
                            "update",
                            "delete",
                            "login",
                            "sign",
                          ].includes(registro.action) && registro.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">
                        <div className="flex items-center gap-2">
                          <FiUser className="h-4 w-4 text-gray-400" />
                          {registro.userId?.nome || "Sistema"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                        <span className="inline-flex items-center px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-md border border-gray-200">
                          {registro.collectionName}
                        </span>
                      </td>
                      <td
                        className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate"
                        title={registro.description}
                      >
                        {registro.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full ${
                            registro.status === "failed"
                              ? "bg-red-100 text-red-800 border border-red-200"
                              : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          }`}
                        >
                          {registro.status === "failed" ? (
                            <>
                              <FaTimesCircle className="h-3 w-3 mr-1" />
                              Falha
                            </>
                          ) : (
                            <>
                              <FaCheckCircle className="h-3 w-3 mr-1" />
                              Sucesso
                            </>
                          )}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            {pagination.totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <div className="flex justify-between items-center">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                      pagination.page === 1
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
                        : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 hover:border-gray-400 shadow-sm hover:shadow"
                    }`}
                  >
                    <FiChevronLeft className="h-4 w-4" />
                    <span>Anterior</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 font-medium">
                      Página {pagination.page} de {pagination.totalPages}
                    </span>
                    <span className="text-xs text-gray-400">
                      ({totalRegistros.toLocaleString("pt-BR")} registros)
                    </span>
                  </div>

                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                      pagination.page === pagination.totalPages
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
                        : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 hover:border-gray-400 shadow-sm hover:shadow"
                    }`}
                  >
                    <span>Próxima</span>
                    <FiChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Estado vazio */}
        {!loading && registros.length === 0 && !error && (
          <div className="bg-white rounded-2xl p-12 shadow-lg border border-gray-100 text-center">
            <div className="flex flex-col items-center">
              <div className="p-4 bg-gray-100 rounded-full mb-4">
                <FiDatabase className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Nenhum registro encontrado
              </h3>
              <p className="text-gray-600 mb-6 max-w-md">
                Não foram encontrados registros de auditoria com os filtros
                selecionados. Tente ajustar os critérios de busca.
              </p>
              <button
                onClick={buscarRegistros}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105"
              >
                <FiRefreshCw className="h-4 w-4" />
                Tentar novamente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Auditoria;
