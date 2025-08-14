import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api";
import Tabela from "../../../components/Tabela";
import InputDataBrasileira from "../../../components/InputDataBrasileira";
import {
  FiSearch,
  FiFilter,
  FiCalendar,
  FiX,
  FiChevronDown,
  FiFileText,
  FiUser,
  FiAlertCircle,
  FiRefreshCw,
  FiEye,
  FiEdit,
  FiTrash,
  FiDownload,
  FiBarChart2,
  FiUserCheck,
} from "react-icons/fi";
import { FaBuilding } from "react-icons/fa";
import { useAuth } from "../../../contexts/AuthContext";

const LaudosList = () => {
  const [laudos, setLaudos] = useState([]);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalItens, setTotalItens] = useState(0);
  const [filtros, setFiltros] = useState({
    empresa: "",
    medicoResponsavel: "",
    status: "",
    paciente: "",
    dataInicio: "",
    dataFim: "",
  });
  const [erro, setErro] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [estatisticas, setEstatisticas] = useState(null);
  const navigate = useNavigate();
  const { usuario } = useAuth();

  const opcoesStatus = [
    { value: "", label: "Todos" },
    { value: "Rascunho", label: "Rascunho" },
    { value: "Laudo em processamento", label: "Em processamento" },
    { value: "Laudo realizado", label: "Realizado" },
    { value: "Laudo assinado", label: "Assinado" },
    { value: "Laudo refeito", label: "Refeito" },
    { value: "Cancelado", label: "Cancelado" },
  ];

  const fetchEstatisticas = async () => {
    try {
      const response = await api.get("/laudos/estatisticas");
      setEstatisticas(response.data);
    } catch (err) {
      console.error("Erro ao buscar estatísticas:", err);
    }
  };

  const fetchLaudos = async () => {
    setIsLoading(true);
    setErro("");

    try {
      const params = {
        page: paginaAtual,
        limit: 10,
        ...filtros,
      };

      const response = await api.get("/laudos", { params });

      setLaudos(response.data.laudos || []);
      setTotalPaginas(response.data.totalPaginas || 1);
      setTotalItens(response.data.totalItens || 0);
    } catch (err) {
      setErro("Erro ao carregar laudos. Tente novamente.");
      console.error("Erro ao buscar laudos:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLaudos();
    fetchEstatisticas();
  }, [paginaAtual, filtros]);

  const handleFiltroChange = (e) => {
    const { name, value } = e.target;
    setFiltros((prev) => ({ ...prev, [name]: value }));
  };

  const limparFiltros = () => {
    setFiltros({
      empresa: "",
      medicoResponsavel: "",
      status: "",
      paciente: "",
      dataInicio: "",
      dataFim: "",
    });
    setPaginaAtual(1);
  };

  const aplicarFiltros = () => {
    setPaginaAtual(1);
    setMostrarFiltros(false);
  };

  const colunas = [
    {
      header: "Empresa",
      key: "tenant_id",
      render: (value, laudo) => (
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center mr-3">
            <FaBuilding className="text-indigo-500" />
          </div>
          <span className="font-medium text-slate-800">
            {laudo.tenant_id?.nomeFantasia || "Não informado"}
          </span>
        </div>
      ),
    },
    {
      header: "Médico Responsável",
      key: "medicoResponsavel",
      render: (value, laudo) => (
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center mr-3">
            <FiUserCheck className="text-emerald-500" />
          </div>
          <div>
            <p className="font-medium text-slate-800">
              {laudo.medicoResponsavelId?.nome || value || "Não informado"}
            </p>
            {laudo.medicoResponsavelId?.crm && (
              <p className="text-xs text-slate-500">
                CRM: {laudo.medicoResponsavelId.crm}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      header: "Paciente",
      render: (_, laudo) => {
        const paciente = laudo.exame?.paciente;
        if (!paciente) {
          return (
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center mr-3">
                <FiUser className="text-gray-400" />
              </div>
              <span className="text-slate-500">Não informado</span>
            </div>
          );
        }

        return (
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center mr-3">
              <FiUser className="text-blue-500" />
            </div>
            <div>
              <p className="font-medium text-slate-800">
                {paciente.nome || "Nome não informado"}
              </p>
              {paciente.cpf && (
                <p className="text-xs text-slate-500">
                  CPF:{" "}
                  {paciente.cpf.replace(
                    /(\d{3})(\d{3})(\d{3})(\d{2})/,
                    "$1.$2.$3-$4",
                  )}
                </p>
              )}
            </div>
          </div>
        );
      },
    },
    {
      header: "Tipo de Exame",
      render: (_, laudo) => (
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center mr-3">
            <FiFileText className="text-purple-500" />
          </div>
          <span className="text-slate-800">
            {laudo.exame?.tipoExame?.nome || "Não informado"}
          </span>
        </div>
      ),
    },
    {
      header: "Status",
      key: "status",
      render: (value) => {
        const statusCores = {
          "Laudo em processamento": {
            bg: "bg-amber-100",
            text: "text-amber-800",
          },
          "Laudo realizado": { bg: "bg-blue-100", text: "text-blue-800" },
          "Laudo assinado": { bg: "bg-green-100", text: "text-green-800" },
          "Erro ao gerar PDF": { bg: "bg-red-100", text: "text-red-800" },
          Cancelado: { bg: "bg-red-100", text: "text-red-800" },
          Rascunho: { bg: "bg-purple-100", text: "text-purple-800" },
          "Laudo refeito": { bg: "bg-indigo-100", text: "text-indigo-800" },
        };

        const cores = statusCores[value] || {
          bg: "bg-slate-100",
          text: "text-slate-800",
        };

        return (
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${cores.bg} ${cores.text}`}
          >
            {value || "Não informado"}
          </span>
        );
      },
    },
    {
      header: "Data Criação",
      key: "createdAt",
      render: (value) => (
        <div>
          <p className="text-slate-800">
            {value ? new Date(value).toLocaleDateString("pt-BR") : "—"}
          </p>
          {value && (
            <p className="text-xs text-slate-500">
              {new Date(value).toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>
      ),
    },
  ];

  const acoes = [
    {
      label: "Ver detalhes",
      acao: (laudo) => navigate(`/adminmaster/laudos/${laudo._id}`),
      icon: <FiEye className="h-4 w-4" />,
      style: "text-blue-600 hover:text-blue-800 hover:bg-blue-50",
    },
    {
      label: "Download",
      acao: (laudo) => {
        const pdfUrl = laudo.arquivoPath || laudo.laudoAssinado;
        if (pdfUrl) {
          window.open(pdfUrl, "_blank");
        }
      },
      icon: <FiDownload className="h-4 w-4" />,
      style: "text-green-600 hover:text-green-800 hover:bg-green-50",
    },
    {
      label: "Excluir",
      acao: (laudo) => {
        if (window.confirm("Tem certeza que deseja excluir este laudo?")) {
          // Implementar lógica de exclusão
        }
      },
      icon: <FiTrash className="h-4 w-4" />,
      style: "text-red-600 hover:text-red-800 hover:bg-red-50",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* Container principal */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
        {/* Cabeçalho com estatísticas */}
        <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100">
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-slate-800 flex items-center">
                  <FiBarChart2 className="text-indigo-500 mr-3" />
                  Gestão de Laudos
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Visão geral e administração de todos os laudos
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={fetchLaudos}
                  className="flex items-center justify-center px-4 py-2 rounded-lg border border-slate-200 hover:border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <FiRefreshCw className="mr-2" />
                  <span>Atualizar</span>
                </button>

                <button
                  onClick={() => setMostrarFiltros(!mostrarFiltros)}
                  className={`flex items-center justify-center px-4 py-2 rounded-lg border text-slate-700 ${
                    mostrarFiltros
                      ? "bg-indigo-50 border-indigo-200 text-indigo-600"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <FiFilter className="mr-2" />
                  <span>Filtros</span>
                  {mostrarFiltros && <FiX className="ml-2" />}
                </button>
              </div>
            </div>

            {/* Cards de estatísticas */}
            {estatisticas && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                <div className="bg-white p-4 rounded-lg border border-slate-200">
                  <h3 className="text-sm font-medium text-slate-600">
                    Total de Laudos
                  </h3>
                  <p className="text-2xl font-bold text-slate-800 mt-2">
                    {estatisticas.total}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-slate-200">
                  <h3 className="text-sm font-medium text-slate-600">
                    Laudos Assinados
                  </h3>
                  <p className="text-2xl font-bold text-green-500 mt-2">
                    {estatisticas.assinados}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-slate-200">
                  <h3 className="text-sm font-medium text-slate-600">
                    Em Processamento
                  </h3>
                  <p className="text-2xl font-bold text-amber-500 mt-2">
                    {estatisticas.laudosPorStatus?.find(
                      (s) => s._id === "Laudo em processamento",
                    )?.count || 0}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-slate-200">
                  <h3 className="text-sm font-medium text-slate-600">
                    Tempo Médio
                  </h3>
                  <p className="text-2xl font-bold text-blue-500 mt-2">
                    {Math.round(
                      estatisticas.tempoMedioElaboracao / (1000 * 60),
                    )}{" "}
                    min
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Filtros avançados */}
        {mostrarFiltros && (
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
            <div className="max-w-6xl mx-auto">
              <h3 className="text-lg font-medium text-slate-800 mb-4 flex items-center">
                <FiFilter className="text-indigo-500 mr-2" />
                Filtros Avançados
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Empresa */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Empresa
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaBuilding className="text-slate-400" />
                    </div>
                    <input
                      type="text"
                      name="empresa"
                      value={filtros.empresa}
                      onChange={handleFiltroChange}
                      placeholder="Filtrar por empresa..."
                      className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Médico */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Médico
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiUserCheck className="text-slate-400" />
                    </div>
                    <input
                      type="text"
                      name="medicoResponsavel"
                      value={filtros.medicoResponsavel}
                      onChange={handleFiltroChange}
                      placeholder="Filtrar por médico..."
                      className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Status
                  </label>
                  <div className="relative">
                    <select
                      name="status"
                      value={filtros.status}
                      onChange={handleFiltroChange}
                      className="block w-full pl-3 pr-8 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none"
                    >
                      {opcoesStatus.map((opcao) => (
                        <option key={opcao.value} value={opcao.value}>
                          {opcao.label}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                      <FiChevronDown className="text-slate-400" />
                    </div>
                  </div>
                </div>

                {/* Paciente */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Paciente
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiSearch className="text-slate-400" />
                    </div>
                    <input
                      type="text"
                      name="paciente"
                      value={filtros.paciente}
                      onChange={handleFiltroChange}
                      placeholder="Buscar paciente..."
                      className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Período */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Período
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiCalendar className="text-slate-400" />
                      </div>
                      <InputDataBrasileira
                        name="dataInicio"
                        value={filtros.dataInicio}
                        onChange={handleFiltroChange}
                        placeholder="dd/mm/aaaa"
                        className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiCalendar className="text-slate-400" />
                      </div>
                      <InputDataBrasileira
                        name="dataFim"
                        value={filtros.dataFim}
                        onChange={handleFiltroChange}
                        placeholder="dd/mm/aaaa"
                        className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-6 gap-3">
                <button
                  onClick={limparFiltros}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Limpar
                </button>
                <button
                  onClick={aplicarFiltros}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                >
                  Aplicar Filtros
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mensagem de erro */}
        {erro && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4">
            <div className="flex items-center">
              <FiAlertCircle className="text-red-500 mr-2" />
              <p className="text-red-700">{erro}</p>
            </div>
          </div>
        )}

        {/* Tabela */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex justify-center items-center p-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : (
            <Tabela
              colunas={colunas}
              dados={laudos}
              acoes={acoes}
              mensagemSemDados={
                <div className="text-center py-12">
                  <FiFileText className="mx-auto text-slate-300 text-4xl mb-3" />
                  <h3 className="text-lg font-medium text-slate-500">
                    Nenhum laudo encontrado
                  </h3>
                  <p className="text-slate-400 mt-1">
                    Tente ajustar seus filtros de busca
                  </p>
                </div>
              }
            />
          )}
        </div>

        {/* Paginação */}
        {totalPaginas > 1 && (
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <p className="text-sm text-slate-600">
                Página {paginaAtual} de {totalPaginas} • {totalItens} itens
              </p>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))}
                  disabled={paginaAtual === 1}
                  className={`px-3 py-1 rounded-md border ${
                    paginaAtual === 1
                      ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  Anterior
                </button>

                {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                  const pageNum =
                    paginaAtual <= 3
                      ? i + 1
                      : paginaAtual >= totalPaginas - 2
                        ? totalPaginas - 4 + i
                        : paginaAtual - 2 + i;

                  if (pageNum < 1 || pageNum > totalPaginas) return null;

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPaginaAtual(pageNum)}
                      className={`px-3 py-1 rounded-md border ${
                        paginaAtual === pageNum
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  onClick={() =>
                    setPaginaAtual((p) => Math.min(totalPaginas, p + 1))
                  }
                  disabled={paginaAtual === totalPaginas}
                  className={`px-3 py-1 rounded-md border ${
                    paginaAtual === totalPaginas
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
  );
};

export default LaudosList;
