import React, { useState, useEffect } from "react";
import {
  FiPieChart,
  FiCalendar,
  FiUser,
  FiFileText,
  FiDownload,
  FiFilter,
} from "react-icons/fi";
import {
  FaFilePdf,
  FaFileExcel,
  FaSearch,
  FaCheckCircle,
  FaBuilding,
} from "react-icons/fa";
import { HiOutlineDocumentReport } from "react-icons/hi";
import { MdOutlineMedicalServices } from "react-icons/md";
import api from "../../../api";
import { useAuth } from "../../../contexts/AuthContext";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";

const RelatoriosAdminMaster = () => {
  const { usuario } = useAuth();
  const [relatorio, setRelatorio] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filtros, setFiltros] = useState({
    dataInicio: new Date(new Date().setDate(new Date().getDate() - 30)),
    dataFim: new Date(),
    tipoExame: "",
    medicoId: "",
    statusLaudo: "",
    empresa: "", // Campo específico para AdminMaster
  });
  const [medicos, setMedicos] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [loadingMedicos, setLoadingMedicos] = useState(false);
  const [loadingEmpresas, setLoadingEmpresas] = useState(false);

  // Cores personalizadas
  const COLORS = {
    primary: "#3B82F6",
    primaryLight: "#93C5FD",
    primaryDark: "#1D4ED8",
    secondary: "#10B981",
    accent: "#8B5CF6",
    warning: "#F59E0B",
    danger: "#EF4444",
    background: "#F8FAFC",
    cardBg: "#FFFFFF",
    text: "#1E293B",
    muted: "#64748B",
    border: "#E2E8F0",
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoadingMedicos(true);
      setLoadingEmpresas(true);

      try {
        const [medicosResponse, empresasResponse] = await Promise.all([
          api.get("/usuarios", { params: { role: "medico" } }),
          api.get("/tenants"),
        ]);

        // Handle médicos response
        if (
          medicosResponse.data &&
          Array.isArray(medicosResponse.data.usuarios)
        ) {
          setMedicos(medicosResponse.data.usuarios);
        } else if (Array.isArray(medicosResponse.data)) {
          setMedicos(medicosResponse.data);
        } else {
          setMedicos([]);
        }

        // Handle empresas response
        if (
          empresasResponse.data &&
          Array.isArray(empresasResponse.data.tenants)
        ) {
          setEmpresas(empresasResponse.data.tenants);
        } else if (Array.isArray(empresasResponse.data)) {
          setEmpresas(empresasResponse.data);
        } else {
          setEmpresas([]);
        }
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
        setMedicos([]);
        setEmpresas([]);
      } finally {
        setLoadingMedicos(false);
        setLoadingEmpresas(false);
      }
    };

    fetchData();
  }, []);

  const gerarRelatorio = async () => {
    setLoading(true);
    setError("");

    try {
      const params = {
        dataInicio: filtros.dataInicio.toISOString(),
        dataFim: filtros.dataFim.toISOString(),
      };

      if (filtros.tipoExame) params.tipoExame = filtros.tipoExame;
      if (filtros.medicoId) params.medicoId = filtros.medicoId;
      if (filtros.statusLaudo) params.statusLaudo = filtros.statusLaudo;
      if (filtros.empresa) params.tenant_id = filtros.empresa;

      const response = await api.get("/laudos/reports/laudos", { params });
      setRelatorio(response.data);
    } catch (err) {
      console.error("Erro ao gerar relatório:", err);
      setError("Erro ao gerar relatório. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const exportarParaExcel = () => {
    if (!relatorio || !relatorio.laudos) return;

    const dados = relatorio.laudos.map((laudo) => ({
      Data: formatarData(laudo.dataCriacao),
      Empresa: laudo.tenant_id?.nomeFantasia || "N/A",
      Paciente: laudo.exame?.paciente?.nome || "N/A",
      "Tipo de Exame": laudo.exame?.tipoExame?.nome || "N/A",
      Médico:
        laudo.medicoResponsavelId?.nome || laudo.medicoResponsavel || "N/A",
      Status: laudo.status,
      Conclusão: laudo.conclusao
        ? laudo.conclusao.substring(0, 100) + "..."
        : "N/A",
    }));

    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Relatório de Laudos");

    const nomeArquivo = `relatorio-laudos-${formatarData(new Date())}.xlsx`;
    XLSX.writeFile(wb, nomeArquivo);
  };

  const exportarParaPDF = async () => {
    if (!relatorio) return;

    try {
      const params = {
        dataInicio: filtros.dataInicio.toISOString(),
        dataFim: filtros.dataFim.toISOString(),
      };

      if (filtros.tipoExame) params.tipoExame = filtros.tipoExame;
      if (filtros.medicoId) params.medicoId = filtros.medicoId;
      if (filtros.statusLaudo) params.statusLaudo = filtros.statusLaudo;
      if (filtros.empresa) params.tenant_id = filtros.empresa;

      const response = await api.get("/laudos/relatorios/exportar-pdf", {
        params,
        responseType: "blob",
      });

      const blob = new Blob([response.data], { type: "application/pdf" });
      const nomeArquivo = `relatorio-laudos-${formatarData(new Date())}.pdf`;
      saveAs(blob, nomeArquivo);
    } catch (err) {
      console.error("Erro ao exportar PDF:", err);
      setError("Erro ao exportar PDF. Tente novamente.");
    }
  };

  const formatarData = (data) => {
    return new Date(data).toLocaleDateString("pt-BR");
  };

  const isValidId = (id) => {
    return id && id !== "" && id !== "undefined" && id !== "null";
  };

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: COLORS.background }}
    >
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div
              className="p-2 rounded-lg"
              style={{ backgroundColor: COLORS.primary }}
            >
              <HiOutlineDocumentReport className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold" style={{ color: COLORS.text }}>
              Relatórios de Laudos - AdminMaster
            </h1>
          </div>
          <p style={{ color: COLORS.muted }}>
            Gere relatórios completos de laudos de todas as empresas do sistema
          </p>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <FiFilter className="w-5 h-5" style={{ color: COLORS.primary }} />
            <h2
              className="text-lg font-semibold"
              style={{ color: COLORS.text }}
            >
              Filtros
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Data Início */}
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: COLORS.text }}
              >
                Data Início
              </label>
              <DatePicker
                selected={filtros.dataInicio}
                onChange={(date) =>
                  setFiltros({ ...filtros, dataInicio: date })
                }
                dateFormat="dd/MM/yyyy"
                className="w-full p-2 border rounded-lg text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                style={{ borderColor: COLORS.border }}
              />
            </div>

            {/* Data Fim */}
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: COLORS.text }}
              >
                Data Fim
              </label>
              <DatePicker
                selected={filtros.dataFim}
                onChange={(date) => setFiltros({ ...filtros, dataFim: date })}
                dateFormat="dd/MM/yyyy"
                className="w-full p-2 border rounded-lg text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                style={{ borderColor: COLORS.border }}
              />
            </div>

            {/* Empresa */}
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: COLORS.text }}
              >
                Empresa
              </label>
              {loadingEmpresas ? (
                <div className="p-2 border rounded-lg bg-slate-100 text-slate-500 text-sm">
                  Carregando empresas...
                </div>
              ) : (
                <select
                  value={filtros.empresa}
                  onChange={(e) =>
                    setFiltros({ ...filtros, empresa: e.target.value })
                  }
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  style={{ borderColor: COLORS.border, color: COLORS.text }}
                >
                  <option value="">Todas as empresas</option>
                  {empresas.map((empresa) => (
                    <option key={empresa._id} value={empresa._id}>
                      {empresa.nomeFantasia}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Médico */}
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: COLORS.text }}
              >
                Médico
              </label>
              {loadingMedicos ? (
                <div className="p-2 border rounded-lg bg-slate-100 text-slate-500 text-sm">
                  Carregando médicos...
                </div>
              ) : (
                <select
                  value={filtros.medicoId}
                  onChange={(e) =>
                    setFiltros({ ...filtros, medicoId: e.target.value })
                  }
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  style={{ borderColor: COLORS.border, color: COLORS.text }}
                >
                  <option value="">Todos os médicos</option>
                  {medicos.map((medico) => (
                    <option key={medico._id} value={medico._id}>
                      {medico.nome}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Tipo de Exame */}
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: COLORS.text }}
              >
                Tipo de Exame
              </label>
              <select
                value={filtros.tipoExame}
                onChange={(e) =>
                  setFiltros({ ...filtros, tipoExame: e.target.value })
                }
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                style={{ borderColor: COLORS.border, color: COLORS.text }}
              >
                <option value="">Todos os tipos</option>
                <option value="ECG">ECG</option>
                <option value="Holter">Holter</option>
                <option value="Ergometria">Ergometria</option>
                <option value="Mapa">Mapa</option>
                <option value="Outro">Outro</option>
              </select>
            </div>

            {/* Status do Laudo */}
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: COLORS.text }}
              >
                Status do Laudo
              </label>
              <select
                value={filtros.statusLaudo}
                onChange={(e) =>
                  setFiltros({ ...filtros, statusLaudo: e.target.value })
                }
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                style={{ borderColor: COLORS.border, color: COLORS.text }}
              >
                <option value="">Todos os status</option>
                <option value="Rascunho">Rascunho</option>
                <option value="Laudo em processamento">Em processamento</option>
                <option value="Laudo realizado">Realizado</option>
                <option value="Laudo assinado">Assinado</option>
                <option value="Laudo refeito">Refeito</option>
                <option value="Cancelado">Cancelado</option>
              </select>
            </div>
          </div>

          {/* Botão Gerar Relatório */}
          <div className="mt-6">
            <button
              onClick={gerarRelatorio}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-all"
              style={{ backgroundColor: COLORS.primary }}
            >
              <FaSearch className="w-4 h-4" />
              {loading ? "Gerando..." : "Gerar Relatório"}
            </button>
          </div>
        </div>

        {/* Erro */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Resultados do Relatório */}
        {relatorio && (
          <div className="space-y-6">
            {/* Resumo */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3
                className="text-lg font-semibold mb-4"
                style={{ color: COLORS.text }}
              >
                Resumo do Relatório
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div
                  className="p-4 rounded-lg"
                  style={{ backgroundColor: COLORS.background }}
                >
                  <div className="flex items-center gap-2">
                    <FiFileText style={{ color: COLORS.primary }} />
                    <span
                      className="text-sm font-medium"
                      style={{ color: COLORS.muted }}
                    >
                      Total de Laudos
                    </span>
                  </div>
                  <p
                    className="text-2xl font-bold mt-1"
                    style={{ color: COLORS.text }}
                  >
                    {relatorio.total || 0}
                  </p>
                </div>

                <div
                  className="p-4 rounded-lg"
                  style={{ backgroundColor: COLORS.background }}
                >
                  <div className="flex items-center gap-2">
                    <FaCheckCircle style={{ color: COLORS.secondary }} />
                    <span
                      className="text-sm font-medium"
                      style={{ color: COLORS.muted }}
                    >
                      Laudos Assinados
                    </span>
                  </div>
                  <p
                    className="text-2xl font-bold mt-1"
                    style={{ color: COLORS.text }}
                  >
                    {relatorio.totalAssinados || 0}
                  </p>
                </div>

                <div
                  className="p-4 rounded-lg"
                  style={{ backgroundColor: COLORS.background }}
                >
                  <div className="flex items-center gap-2">
                    <FaBuilding style={{ color: COLORS.accent }} />
                    <span
                      className="text-sm font-medium"
                      style={{ color: COLORS.muted }}
                    >
                      Empresas
                    </span>
                  </div>
                  <p
                    className="text-2xl font-bold mt-1"
                    style={{ color: COLORS.text }}
                  >
                    {relatorio.totalEmpresas || 0}
                  </p>
                </div>

                <div
                  className="p-4 rounded-lg"
                  style={{ backgroundColor: COLORS.background }}
                >
                  <div className="flex items-center gap-2">
                    <MdOutlineMedicalServices
                      style={{ color: COLORS.warning }}
                    />
                    <span
                      className="text-sm font-medium"
                      style={{ color: COLORS.muted }}
                    >
                      Médicos Ativos
                    </span>
                  </div>
                  <p
                    className="text-2xl font-bold mt-1"
                    style={{ color: COLORS.text }}
                  >
                    {relatorio.totalMedicos || 0}
                  </p>
                </div>
              </div>
            </div>

            {/* Botões de Exportação */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3
                className="text-lg font-semibold mb-4"
                style={{ color: COLORS.text }}
              >
                Exportar Relatório
              </h3>
              <div className="flex gap-4">
                <button
                  onClick={exportarParaExcel}
                  className="flex items-center gap-2 px-4 py-2 text-white rounded-lg font-medium hover:opacity-90 transition-all"
                  style={{ backgroundColor: COLORS.secondary }}
                >
                  <FaFileExcel className="w-4 h-4" />
                  Exportar para Excel
                </button>
                <button
                  onClick={exportarParaPDF}
                  className="flex items-center gap-2 px-4 py-2 text-white rounded-lg font-medium hover:opacity-90 transition-all"
                  style={{ backgroundColor: COLORS.danger }}
                >
                  <FaFilePdf className="w-4 h-4" />
                  Exportar para PDF
                </button>
              </div>
            </div>

            {/* Tabela de Laudos */}
            {relatorio.laudos && relatorio.laudos.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div
                  className="p-6 border-b"
                  style={{ borderColor: COLORS.border }}
                >
                  <h3
                    className="text-lg font-semibold"
                    style={{ color: COLORS.text }}
                  >
                    Laudos Encontrados ({relatorio.laudos.length})
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead style={{ backgroundColor: COLORS.background }}>
                      <tr>
                        <th
                          className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                          style={{ color: COLORS.muted }}
                        >
                          Data
                        </th>
                        <th
                          className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                          style={{ color: COLORS.muted }}
                        >
                          Empresa
                        </th>
                        <th
                          className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                          style={{ color: COLORS.muted }}
                        >
                          Paciente
                        </th>
                        <th
                          className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                          style={{ color: COLORS.muted }}
                        >
                          Tipo de Exame
                        </th>
                        <th
                          className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                          style={{ color: COLORS.muted }}
                        >
                          Médico
                        </th>
                        <th
                          className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                          style={{ color: COLORS.muted }}
                        >
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody
                      className="bg-white divide-y"
                      style={{ borderColor: COLORS.border }}
                    >
                      {relatorio.laudos.map((laudo, index) => (
                        <tr key={index} className="hover:bg-slate-50">
                          <td
                            className="px-6 py-4 whitespace-nowrap text-sm"
                            style={{ color: COLORS.text }}
                          >
                            {formatarData(laudo.dataCriacao)}
                          </td>
                          <td
                            className="px-6 py-4 whitespace-nowrap text-sm"
                            style={{ color: COLORS.text }}
                          >
                            {laudo.tenant_id?.nomeFantasia || "N/A"}
                          </td>
                          <td
                            className="px-6 py-4 whitespace-nowrap text-sm"
                            style={{ color: COLORS.text }}
                          >
                            {laudo.exame?.paciente?.nome || "N/A"}
                          </td>
                          <td
                            className="px-6 py-4 whitespace-nowrap text-sm"
                            style={{ color: COLORS.text }}
                          >
                            {laudo.exame?.tipoExame?.nome || "N/A"}
                          </td>
                          <td
                            className="px-6 py-4 whitespace-nowrap text-sm"
                            style={{ color: COLORS.text }}
                          >
                            {laudo.medicoResponsavelId?.nome ||
                              laudo.medicoResponsavel ||
                              "N/A"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${
                                laudo.status === "Laudo assinado"
                                  ? "bg-green-100 text-green-800"
                                  : laudo.status === "Laudo realizado"
                                    ? "bg-blue-100 text-blue-800"
                                    : laudo.status === "Laudo em processamento"
                                      ? "bg-yellow-100 text-yellow-800"
                                      : laudo.status === "Rascunho"
                                        ? "bg-gray-100 text-gray-800"
                                        : laudo.status === "Cancelado"
                                          ? "bg-red-100 text-red-800"
                                          : "bg-slate-100 text-slate-800"
                              }`}
                            >
                              {laudo.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RelatoriosAdminMaster;
