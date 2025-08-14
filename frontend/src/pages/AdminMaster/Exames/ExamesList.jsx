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
  FiAlertTriangle,
} from "react-icons/fi";
import { FaBuilding } from "react-icons/fa";
import { useAuth } from "../../../contexts/AuthContext";

const ExamesList = () => {
  const [exames, setExames] = useState([]);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalItens, setTotalItens] = useState(0);
  const [filtros, setFiltros] = useState({
    empresa: "",
    paciente: "",
    tipoExame: "",
    status: "",
    dataInicio: "",
    dataFim: "",
    urgente: "",
  });
  const [erro, setErro] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [estatisticas, setEstatisticas] = useState(null);
  const [opcoesTipoExame, setOpcoesTipoExame] = useState([
    { value: "", label: "Todos" },
  ]);
  const navigate = useNavigate();
  const { usuario } = useAuth();

  const opcoesStatus = [
    { value: "", label: "Todos" },
    { value: "Pendente", label: "Pendente" },
    { value: "Concluído", label: "Concluído" },
    { value: "Laudo realizado", label: "Laudo realizado" },
    { value: "Cancelado", label: "Cancelado" },
  ];

  // Buscar tipos de exame
  const fetchTiposExame = async () => {
    try {
      const response = await api.get("/tipos-exame");
      const tipos = response.data.map((tipo) => ({
        value: tipo._id,
        label: tipo.nome,
      }));
      setOpcoesTipoExame([{ value: "", label: "Todos" }, ...tipos]);
    } catch (err) {
      console.error("Erro ao buscar tipos de exame:", err);
    }
  };

  const fetchEstatisticas = async () => {
    try {
      const response = await api.get("/exames/estatisticas");
      setEstatisticas(response.data);
    } catch (err) {
      console.error("Erro ao buscar estatísticas:", err);
    }
  };

  const fetchExames = async () => {
    setIsLoading(true);
    setErro("");

    try {
      const params = new URLSearchParams({
        page: paginaAtual,
        limit: 10,
      });

      // Adicionar filtros apenas se tiverem valor
      Object.entries(filtros).forEach(([key, value]) => {
        if (value && value.trim() !== "") {
          params.append(key, value);
        }
      });


      const response = await api.get(`/exames?${params.toString()}`);

      setExames(response.data.exames || []);
      setTotalPaginas(response.data.totalPages || 1); // Corrigido: totalPages
      setTotalItens(response.data.total || 0); // Corrigido: total
    } catch (err) {
      setErro("Erro ao carregar exames. Tente novamente.");
      console.error("Erro ao buscar exames:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTiposExame();
    fetchEstatisticas();
  }, []);

  useEffect(() => {
    fetchExames();
  }, [paginaAtual, filtros]);

  const handleFiltroChange = (e) => {
    const { name, value } = e.target;
    setFiltros((prev) => ({ ...prev, [name]: value }));
  };

  const limparFiltros = () => {
    setFiltros({
      empresa: "",
      paciente: "",
      tipoExame: "",
      status: "",
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
      render: (value, exame) => (
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center mr-3">
            <FaBuilding className="text-indigo-500" />
          </div>
          <span className="font-medium text-slate-800">
            {exame.tenant_id?.nomeFantasia || "Sem empresa"}
          </span>
        </div>
      ),
    },
    {
      header: "Paciente",
      key: "paciente",
      render: (value, row) => (
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center mr-3">
            <FiUser className="text-blue-500" />
          </div>
          <div>
            <p className="font-medium text-slate-800">
              {row.paciente?.nome || "Sem paciente"}
            </p>
            {row.paciente?.idade && (
              <p className="text-xs text-slate-500">
                {row.paciente.idade} anos
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      header: "Tipo de Exame",
      key: "tipoExame",
      render: (value, row) => {
        const tipoCores = {
          ECG: { bg: "bg-purple-100", text: "text-purple-800" },
          Holter: { bg: "bg-pink-100", text: "text-pink-800" },
          Ergometria: { bg: "bg-indigo-100", text: "text-indigo-800" },
          Mapa: { bg: "bg-emerald-100", text: "text-emerald-800" },
          Outro: { bg: "bg-blue-100", text: "text-blue-800" },
        };

        const tipoNome = row.tipoExame?.nome || "Tipo não informado";
        const isUrgente = row.tipoExame?.urgente || false;
        const cores = tipoCores[tipoNome] || {
          bg: "bg-slate-100",
          text: "text-slate-800",
        };

        return (
          <div className="flex flex-col space-y-1">
            <div className="flex items-center space-x-2">
              {isUrgente && (
                <div className="flex items-center">
                  <FiAlertTriangle className="w-4 h-4 text-red-500" />
                  <span className="text-xs font-bold text-red-600 ml-1">
                    URGENTE
                  </span>
                </div>
              )}
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${cores.bg} ${cores.text} ${
                isUrgente ? "ring-2 ring-red-500 ring-opacity-50" : ""
              }`}
            >
              {tipoNome}
            </span>
          </div>
        );
      },
    },
    {
      header: "Status",
      key: "status",
      render: (value) => {
        const statusCores = {
          Pendente: { bg: "bg-amber-100", text: "text-amber-800" },
          Concluído: { bg: "bg-green-100", text: "text-green-800" },
          "Laudo realizado": { bg: "bg-emerald-100", text: "text-emerald-800" },
          Cancelado: { bg: "bg-red-100", text: "text-red-800" },
        };

        const statusValue = value || "Pendente";
        const cores = statusCores[statusValue] || {
          bg: "bg-slate-100",
          text: "text-slate-800",
        };

        return (
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${cores.bg} ${cores.text}`}
          >
            {statusValue}
          </span>
        );
      },
    },
    {
      header: "Técnico",
      key: "tecnico",
      render: (value, row) => (
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center mr-3">
            <FiUser className="text-slate-500" />
          </div>
          <span className="font-medium text-slate-800">
            {row.tecnico?.nome || "Sem técnico"}
          </span>
        </div>
      ),
    },
    {
      header: "Data",
      key: "dataExame",
      render: (value) => (
        <div>
          <p className="text-slate-800">
            {value
              ? new Date(value).toLocaleDateString("pt-BR")
              : "Data não informada"}
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
      acao: (exame) => navigate(`/adminmaster/exames/${exame._id}`),
      icon: <FiEye className="h-4 w-4" />,
      style: "text-blue-600 hover:text-blue-800 hover:bg-blue-50",
    },
    {
      label: "Editar",
      acao: (exame) => navigate(`/admin/exames/${exame._id}/editar`),
      icon: <FiEdit className="h-4 w-4" />,
      style: "text-amber-600 hover:text-amber-800 hover:bg-amber-50",
    },
    {
      label: "Excluir",
      acao: (exame) => {
        if (window.confirm("Tem certeza que deseja excluir este exame?")) {
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
                  Gestão de Exames
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Visão geral e administração de todos os exames
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={fetchExames}
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mt-4">
                <div className="bg-white p-4 rounded-lg border border-slate-200">
                  <h3 className="text-sm font-medium text-slate-600">
                    Total de Exames
                  </h3>
                  <p className="text-2xl font-bold text-slate-800 mt-2">
                    {estatisticas.totalExames}
                  </p>
                </div>
                <div className="p-4 rounded-lg border border-red-200 bg-red-50">
                  <h3 className="text-sm font-medium text-red-600 flex items-center">
                    <FiAlertTriangle className="w-4 h-4 mr-1" />
                    Urgentes
                  </h3>
                  <p className="text-2xl font-bold text-red-600 mt-2">
                    {estatisticas.examesUrgentes || 0}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-slate-200">
                  <h3 className="text-sm font-medium text-slate-600">
                    Pendentes
                  </h3>
                  <p className="text-2xl font-bold text-amber-500 mt-2">
                    {estatisticas.examesPorStatus?.find(
                      (s) => s.status === "Pendente",
                    )?.total || 0}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-slate-200">
                  <h3 className="text-sm font-medium text-slate-600">
                    Concluídos
                  </h3>
                  <p className="text-2xl font-bold text-green-500 mt-2">
                    {estatisticas.examesPorStatus?.find(
                      (s) => s.status === "Concluído",
                    )?.total || 0}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Filtros */}
        {mostrarFiltros && (
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <div className="flex flex-col gap-4">
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

                {/* Tipo de exame */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Tipo de Exame
                  </label>
                  <div className="relative">
                    <select
                      name="tipoExame"
                      value={filtros.tipoExame}
                      onChange={handleFiltroChange}
                      className="block w-full pl-3 pr-8 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none"
                    >
                      {opcoesTipoExame.map((opcao) => (
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

                {/* Prioridade */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Prioridade
                  </label>
                  <div className="relative">
                    <select
                      name="urgente"
                      value={filtros.urgente || ""}
                      onChange={handleFiltroChange}
                      className="block w-full pl-3 pr-8 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none"
                    >
                      <option value="">Todas</option>
                      <option value="true">Apenas Urgentes</option>
                      <option value="false">Apenas Normais</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                      <FiChevronDown className="text-slate-400" />
                    </div>
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
              dados={exames}
              acoes={acoes}
              customRowClass={(exame) =>
                exame.tipoExame?.urgente
                  ? "bg-red-50 border-l-4 border-red-500 hover:bg-red-100"
                  : "hover:bg-slate-50"
              }
              mensagemSemDados={
                <div className="text-center py-12">
                  <FiFileText className="mx-auto text-slate-300 text-4xl mb-3" />
                  <h3 className="text-lg font-medium text-slate-500">
                    Nenhum exame encontrado
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

export default ExamesList;
