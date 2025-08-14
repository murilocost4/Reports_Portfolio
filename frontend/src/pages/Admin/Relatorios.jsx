import React, { useState, useEffect, useCallback, useMemo, memo } from "react";
import {
  FiPieChart,
  FiCalendar,
  FiUser,
  FiFileText,
  FiDownload,
  FiBarChart,
  FiTrendingUp,
  FiActivity,
  FiDatabase,
  FiFilter,
  FiRefreshCw,
} from "react-icons/fi";
import {
  FaFilePdf,
  FaFileExcel,
  FaSearch,
  FaCheckCircle,
  FaTimesCircle,
} from "react-icons/fa";
import { HiOutlineDocumentReport } from "react-icons/hi";
import { MdOutlineMedicalServices } from "react-icons/md";
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
      Gerando relatório...
    </p>
  </div>
));

// Componente de Card de Estatística otimizado
const StatCard = memo(
  ({ title, value, icon: Icon, color, gradient, subtitle, isLoading }) => {
    if (isLoading) {
      return (
        <div className="bg-white rounded-2xl p-4 shadow-md border border-white/50 animate-pulse">
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

const Relatorios = () => {
  const { usuario, temRole, temAlgumaRole } = useAuth();
  const [relatorio, setRelatorio] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filtros, setFiltros] = useState({
    dataInicio: new Date(new Date().setDate(new Date().getDate() - 7)),
    dataFim: new Date(),
    tipoExame: "",
    // Permitir que recepcionista também veja todos os médicos
    medicoId: temAlgumaRole(['admin', 'recepcionista'])
      ? ""
      : usuario?.id,
    statusLaudo: "",
  });
  const [medicos, setMedicos] = useState([]);
  const [loadingMedicos, setLoadingMedicos] = useState(false);

  // Opções de status memorizadas
  const opcoesStatus = useMemo(
    () => [
      { value: "", label: "Todos os status" },
      { value: "Laudo realizado", label: "Realizado" },
      { value: "Laudo assinado", label: "Assinado" },
      { value: "Laudo refeito", label: "Refeito" },
      { value: "Cancelado", label: "Cancelado" },
    ],
    [],
  );

  // Configuração das estatísticas
  const statsConfig = useMemo(() => {
    if (!relatorio) return [];

    return [
      {
        title: "Total de Laudos",
        value: relatorio?.totais?.quantidade?.toLocaleString("pt-BR") || "0",
        icon: FiDatabase,
        gradient: "from-blue-600 to-blue-800",
        subtitle: "Laudos no período",
      },
      {
        title: "Laudos Assinados",
        value: relatorio?.totais?.assinados?.toLocaleString("pt-BR") || "0",
        icon: FaCheckCircle,
        gradient: "from-emerald-600 to-emerald-700",
        subtitle: "Concluídos",
      },
      {
        title: "Pendentes",
        value: relatorio?.totais?.pendentes?.toLocaleString("pt-BR") || "0",
        icon: FiActivity,
        gradient: "from-amber-600 to-amber-700",
        subtitle: "Aguardando assinatura",
      },
    ];
  }, [relatorio]);

  const fetchMedicos = useCallback(async () => {
    // Permitir que admin e recepcionista vejam a lista de médicos
    if (temAlgumaRole(['admin', 'recepcionista'])) {
      setLoadingMedicos(true);
      try {
        const response = await api.get("/usuarios/medicos");

        if (response.data && Array.isArray(response.data.usuarios)) {
          setMedicos(response.data.usuarios);
        } else if (Array.isArray(response.data)) {
          setMedicos(response.data);
        } else {
          setMedicos([]);
        }
      } catch (err) {
        console.error("Erro ao carregar médicos");
        setMedicos([]);
      } finally {
        setLoadingMedicos(false);
      }
    }
  }, [temAlgumaRole]);

  useEffect(() => {
    fetchMedicos();
  }, [fetchMedicos]);

  const gerarRelatorio = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const ajustarDataFim = (date) => {
        if (!date) return "";
        const d = new Date(date);
        d.setHours(23, 59, 59, 999); // Inclui todo o dia até o último milissegundo
        return d.toISOString();
      };

      const params = {
        medicoId: filtros.medicoId || "",
        tipoExame: filtros.tipoExame || "",
        status: filtros.statusLaudo || "",
        dataInicio: filtros.dataInicio?.toISOString().split("T")[0] || "",
        dataFim: ajustarDataFim(filtros.dataFim).split("T")[0] || "",
      };

      const response = await api.get("/laudos/reports/laudos", { params });

      if (!response.data.success) {
        throw new Error(response.data.error || "Erro ao gerar relatório");
      }

      setRelatorio({
        ...response.data.data,
        laudos: response.data.data.laudos.map((laudo) => ({
          ...laudo,
          dataCriacao: laudo.dataCriacao ? new Date(laudo.dataCriacao) : null,
          dataAtualizacao: laudo.dataAtualizacao
            ? new Date(laudo.dataAtualizacao)
            : null,
        })),
      });
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, [filtros]);

  const exportarParaExcel = useCallback(() => {
    if (!relatorio || !Array.isArray(relatorio.laudos)) return;

    const dados = relatorio.laudos.map((l) => ({
      ID: l._id || "-",
      Data: l.createdAt ? new Date(l.createdAt).toLocaleDateString() : "-",
      Médico: typeof l.medicoResponsavel === 'string' ? l.medicoResponsavel : l.medicoResponsavel?.toString() || "-",
      "Tipo Exame": typeof l.exame?.tipoExame === 'string' ? l.exame.tipoExame : l.exame?.tipoExame?.toString() || "-",
      Paciente: typeof l.exame?.paciente?.nome === 'string' ? l.exame.paciente.nome : l.exame?.paciente?.nome?.toString() || "-",
      Status: l.status || "-",
      Válido: l.valido ? "Sim" : "Não",
      "Data Assinatura": l.dataAssinatura
        ? new Date(l.dataAssinatura).toLocaleDateString()
        : "-",
      "Data Envio Email": l.dataEnvioEmail
        ? new Date(l.dataEnvioEmail).toLocaleDateString()
        : "-",
    }));

    const worksheet = XLSX.utils.json_to_sheet(dados);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Relatório Laudos");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const data = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    saveAs(
      data,
      `relatorio_laudos_${new Date().toISOString().split("T")[0]}.xlsx`,
    );
  }, [relatorio]);

  const exportarParaPDF = useCallback(async () => {
    try {
      const params = { ...filtros };
      Object.keys(params).forEach((key) => {
        if (params[key] === "") delete params[key];
      });

      const response = await api.get(`/laudos/relatorios/exportar-pdf`, {
        params,
        responseType: "blob",
      });

      const pdfBlob = new Blob([response.data], { type: "application/pdf" });
      saveAs(
        pdfBlob,
        `relatorio_laudos_${new Date().toISOString().split("T")[0]}.pdf`,
      );
    } catch (err) {
      setError("Erro ao exportar para PDF");
    }
  }, [filtros]);

  const formatarData = (data) => {
    return data ? new Date(data).toLocaleDateString("pt-BR") : "-";
  };

  const isValidId = (id) => {
    return (
      id &&
      typeof id === "string" &&
      id.length === 24 &&
      /^[0-9a-fA-F]+$/.test(id)
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Cabeçalho Moderno */}
        <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl shadow-lg">
                <HiOutlineDocumentReport className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Relatórios
                </h1>
                <p className="text-gray-600 mt-1">
                  Gere relatórios personalizados dos laudos médicos
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
        {relatorio && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
        )}

        {/* Filtros */}
        <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg">
                <FiFilter className="h-5 w-5 text-white" />
              </div>
              Filtros do Relatório
            </h2>
            <button
              onClick={() =>
                setFiltros({
                  dataInicio: new Date(
                    new Date().setDate(new Date().getDate() - 7),
                  ),
                  dataFim: new Date(),
                  tipoExame: "",
                  medicoId: temAlgumaRole(['admin', 'recepcionista'])
                    ? ""
                    : usuario?.id,
                  statusLaudo: "",
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
                    className="w-full p-3 border border-gray-300 text-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white shadow-sm transition-all duration-200"
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
                    className="w-full p-3 border border-gray-300 text-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white shadow-sm transition-all duration-200"
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

            {/* Médico (para admin e recepcionista) */}
            {temAlgumaRole(['admin', 'recepcionista']) && (
              <div>
                <label className="block text-sm font-semibold mb-3 text-gray-700">
                  Médico
                </label>
                {loadingMedicos ? (
                  <div className="p-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-500 text-sm animate-pulse">
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent"></div>
                      Carregando médicos...
                    </div>
                  </div>
                ) : (
                  <select
                    value={filtros.medicoId}
                    onChange={(e) =>
                      setFiltros({ ...filtros, medicoId: e.target.value })
                    }
                    className="w-full p-3 border border-gray-300 text-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white shadow-sm transition-all duration-200"
                  >
                    <option value="">Todos os médicos</option>
                    {medicos.map((medico) => (
                      <option key={medico._id} value={medico._id}>
                        {typeof medico.nome === 'string' ? medico.nome : medico.nome?.toString() || 'Nome não disponível'}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Status do Laudo */}
            <div>
              <label className="block text-sm font-semibold mb-3 text-gray-700">
                Status do Laudo
              </label>
              <select
                value={filtros.statusLaudo}
                onChange={(e) =>
                  setFiltros({ ...filtros, statusLaudo: e.target.value })
                }
                className="w-full p-3 border border-gray-300 text-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white shadow-sm transition-all duration-200"
              >
                <option value="">Todos os status</option>
                <option value="Laudo realizado">Realizado</option>
                <option value="Laudo assinado">Assinado</option>
                <option value="Laudo refeito">Refeito</option>
                <option value="Cancelado">Cancelado</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row justify-between items-center gap-4 pt-6 border-t border-gray-200">
            <button
              onClick={gerarRelatorio}
              disabled={loading}
              className={`flex items-center justify-center gap-3 px-6 py-3 rounded-xl font-semibold shadow-lg transition-all duration-200 w-full lg:w-auto ${
                loading
                  ? "bg-gray-400 cursor-not-allowed text-white"
                  : "bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white hover:shadow-xl transform hover:-translate-y-0.5"
              }`}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  <span>Gerando Relatório...</span>
                </>
              ) : (
                <>
                  <FiBarChart className="h-5 w-5" />
                  <span>Gerar Relatório</span>
                </>
              )}
            </button>

            {relatorio && !loading && (
              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                <button
                  onClick={exportarParaExcel}
                  className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-xl font-semibold shadow-lg transition-all duration-200 hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <FaFileExcel className="h-4 w-4" />
                  <span>Exportar Excel</span>
                </button>
                <button
                  onClick={exportarParaPDF}
                  className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl font-semibold shadow-lg transition-all duration-200 hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <FaFilePdf className="h-4 w-4" />
                  <span>Exportar PDF</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mensagens de erro */}
        {error && (
          <div className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-2xl p-6 shadow-md">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-red-500 rounded-xl">
                <FaTimesCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-red-800 font-semibold mb-1">
                  Erro ao gerar relatório
                </h3>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && !relatorio && <LoadingSpinner />}

        {/* Resultados */}
        {relatorio && !loading && (
          <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
            {/* Cabeçalho do Relatório */}
            <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg">
                    <MdOutlineMedicalServices className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      Relatório de Laudos
                    </h2>
                    <p className="text-gray-600 mt-1">
                      Período: {formatarData(relatorio.periodo?.inicio)} até{" "}
                      {formatarData(relatorio.periodo?.fim)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-100 px-3 py-2 rounded-lg">
                  <FiCalendar className="h-4 w-4" />
                  <span>
                    Gerado em: {new Date().toLocaleDateString("pt-BR")}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6">
              {/* Tabela de Detalhes */}
              <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        ID
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Data
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Médico
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Paciente
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Tipo Exame
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Assinatura
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {relatorio.laudos && relatorio.laudos.length > 0 ? (
                      relatorio.laudos.map((laudo, index) => (
                        <tr
                          key={laudo._id || index}
                          className="hover:bg-gray-50 transition-colors duration-150"
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {isValidId(laudo._id) ? (
                              <a
                                href={`/laudos/${laudo._id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 hover:underline font-mono bg-blue-50 px-2 py-1 rounded"
                              >
                                {laudo._id.substring(0, 8)}
                              </a>
                            ) : (
                              <span className="text-gray-500 font-mono bg-gray-50 px-2 py-1 rounded">
                                {laudo._id?.substring(0, 8) || "-"}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                            {formatarData(laudo.createdAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-800">
                            {typeof laudo.medicoResponsavel === 'string' ? laudo.medicoResponsavel : laudo.medicoResponsavel?.toString() || "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {typeof laudo.exame?.paciente?.nome === 'string' ? laudo.exame.paciente.nome : laudo.exame?.paciente?.nome?.toString() || "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {typeof laudo.exame?.tipoExame === 'string' ? laudo.exame.tipoExame : laudo.exame?.tipoExame?.toString() || "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-3 py-1.5 text-xs font-semibold rounded-full ${
                                laudo.status === "Laudo assinado"
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                  : laudo.status === "Laudo realizado"
                                    ? "bg-blue-100 text-blue-800 border border-blue-200"
                                    : laudo.status === "Laudo refeito"
                                      ? "bg-amber-100 text-amber-800 border border-amber-200"
                                      : "bg-red-100 text-red-800 border border-red-200"
                              }`}
                            >
                              {laudo.status || "Não informado"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {laudo.dataAssinatura ? (
                              <div className="flex items-center gap-2">
                                <FaCheckCircle className="h-4 w-4 text-emerald-500" />
                                {formatarData(laudo.dataAssinatura)}
                              </div>
                            ) : (
                              <span className="text-gray-400">
                                Não assinado
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <div className="p-4 bg-gray-100 rounded-full">
                              <FiFileText className="h-8 w-8 text-gray-400" />
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-gray-600">
                                Nenhum laudo encontrado
                              </h3>
                              <p className="text-gray-500">
                                Ajuste os filtros e tente novamente
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Relatorios;
