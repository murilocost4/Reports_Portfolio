import React, { useState, useEffect, useCallback, useMemo, memo } from "react";
import { useNavigate } from "react-router-dom";
import Tabela from "../../components/Tabela";
import InputDataBrasileira from "../../components/InputDataBrasileira";
import {
  FiSearch,
  FiFilter,
  FiCalendar,
  FiX,
  FiChevronDown,
  FiFileText,
  FiUser,
  FiAlertCircle,
  FiPlus,
  FiRefreshCw,
  FiEye,
  FiClock,
  FiActivity,
  FiDatabase,
  FiTrendingUp,
  FiTrendingDown,
} from "react-icons/fi";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../api";

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
      Carregando laudos...
    </p>
  </div>
));

// Componente de Card de Estatística otimizado
const StatCard = memo(
  ({
    title,
    value,
    icon: Icon,
    color,
    gradient,
    subtitle,
    trend,
    isLoading,
  }) => {
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
            <div className="flex items-center space-x-1">
              {trend && (
                <div
                  className={`p-0.5 bg-gradient-to-r ${gradient} rounded-full`}
                >
                  <div
                    className={`flex items-center space-x-1 ${trend > 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {trend > 0 ? (
                      <FiTrendingUp className="h-2.5 w-2.5 text-white" />
                    ) : (
                      <FiTrendingDown className="h-2.5 w-2.5 text-white" />
                    )}
                  </div>
                </div>
              )}
              <span className="text-xs text-slate-500">{subtitle}</span>
            </div>
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

const LaudosDashboard = () => {
  const [laudos, setLaudos] = useState([]);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalItens, setTotalItens] = useState(0);
  const [filtros, setFiltros] = useState({
    medicoId: "",
    status: "",
    paciente: "",
    dataInicio: "",
    dataFim: "",
  });
  
  // Estados para controle de filtros aplicados
  const [filtrosAplicados, setFiltrosAplicados] = useState({
    medicoId: "",
    status: "",
    paciente: "",
    dataInicio: "",
    dataFim: "",
  });
  
  const [erro, setErro] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [estatisticas, setEstatisticas] = useState(null);
  const [medicos, setMedicos] = useState([]);
  const navigate = useNavigate();
  const { usuario, logout, temRole } = useAuth();

  // Debounce para busca de paciente (aplicado automaticamente)
  const debouncedPaciente = useDebounce(filtros.paciente, 800);

  const opcoesStatus = [
    { value: "", label: "Todos" },
    { value: "Laudo pronto para assinatura", label: "Laudo pronto para assinatura" },
    { value: "Laudo assinado", label: "Laudo assinado" },
  ];

  // Buscar médicos para o filtro
  const fetchMedicos = useCallback(async () => {
    try {
      if (usuario.role !== "medico") {
        const response = await api.get("/usuarios?role=medico");
        const medicosData = response.data.usuarios || response.data || [];
        setMedicos([
          { value: "", label: "Todos os médicos" },
          ...medicosData.map((medico) => ({
            value: medico._id,
            label: `${medico.nome}${medico.crm ? ` - CRM: ${medico.crm}` : ""}`,
          })),
        ]);
      }
    } catch (err) {
      console.error("Erro ao buscar médicos");
      setMedicos([{ value: "", label: "Todos os médicos" }]);
    }
  }, [usuario.role]);

  const fetchLaudos = useCallback(async () => {
    try {
      setIsLoading(true);
      setErro("");

      const params = new URLSearchParams();

      // Adicionar página e limite
      params.append("page", paginaAtual);
      params.append("limit", 10);

      // Usar filtrosAplicados em vez de filtros (exceto para paciente que usa debounce)
      const filtrosParaEnviar = {
        ...filtrosAplicados,
        paciente: debouncedPaciente // Paciente sempre usa o valor com debounce
      };

      // Adicionar filtros apenas se tiverem valor e não forem vazios
      Object.entries(filtrosParaEnviar).forEach(([key, value]) => {
        if (value && typeof value === "string" && value.trim() !== "") {
          params.append(key, value.trim());
        }
      });

      const response = await api.get(`/laudos?${params.toString()}`);

      if (response.data && Array.isArray(response.data.laudos)) {
        setLaudos(response.data.laudos);
        setTotalPaginas(response.data.totalPages || 1);
        setTotalItens(response.data.total || 0);
      } else {
        console.error("Formato de resposta inesperado");
        setLaudos([]);
        setTotalPaginas(1);
        setTotalItens(0);
      }
    } catch (err) {
      console.error("Erro ao buscar laudos");

      if (err.response?.status === 401) {
        setErro("Sessão expirada. Redirecionando para login...");
        setTimeout(() => logout(), 2000);
      } else {
        setErro("Erro ao carregar laudos. Tente novamente.");
      }

      // Limpar dados em caso de erro
      setLaudos([]);
      setTotalPaginas(1);
      setTotalItens(0);
    } finally {
      setIsLoading(false);
    }
  }, [paginaAtual, filtrosAplicados, debouncedPaciente, usuario?.id, logout]);

  // useEffect para carregar laudos na inicialização (sem filtros)
  useEffect(() => {
    if (usuario?.id && paginaAtual === 1 && Object.values(filtrosAplicados).every(v => v === "")) {
      fetchLaudos();
    }
  }, [usuario?.id, fetchLaudos, paginaAtual, filtrosAplicados]);

  // useEffect para carregar médicos
  useEffect(() => {
    if (usuario?.id) {
      fetchMedicos();
    }
  }, [usuario?.id, fetchMedicos]);

  // useEffect para mudança de página (mantém filtros aplicados)
  useEffect(() => {
    if (usuario?.id && paginaAtual > 1) {
      fetchLaudos();
    }
  }, [usuario?.id, paginaAtual, fetchLaudos]);

  // Effect APENAS para busca de paciente com debounce (aplicação automática)
  useEffect(() => {
    if (debouncedPaciente !== filtrosAplicados.paciente) {
      setFiltrosAplicados(prev => ({ ...prev, paciente: debouncedPaciente }));
    }
  }, [debouncedPaciente, filtrosAplicados.paciente]);

  // useEffect para atualizar tabela quando filtros são aplicados (exceto na inicialização)
  useEffect(() => {
    if (usuario?.id && Object.values(filtrosAplicados).some(v => v !== "")) {
      fetchLaudos();
    }
  }, [usuario?.id, filtrosAplicados, fetchLaudos]);

  const handleFiltroChange = useCallback((e) => {
    const { name, value } = e.target;
    setFiltros((prev) => ({ ...prev, [name]: value }));
  }, []);

  const limparFiltros = useCallback(() => {
    const filtrosLimpos = {
      medicoId: "",
      status: "",
      paciente: "",
      dataInicio: "",
      dataFim: "",
    };
    setFiltros(filtrosLimpos);
    setFiltrosAplicados(filtrosLimpos);
    setPaginaAtual(1);
  }, []);

  const aplicarFiltros = useCallback(() => {
    // Aplicar os filtros atuais (exceto paciente que já é aplicado automaticamente via debounce)
    setFiltrosAplicados(filtros);
    setPaginaAtual(1);
    setMostrarFiltros(false);
  }, [filtros]);

  // Verificar se há filtros pendentes para aplicar
  const hasFiltrosPendentes = useMemo(() => {
    const filtrosComparar = { ...filtros };
    const aplicadosComparar = { ...filtrosAplicados };
    
    // Ignorar campo paciente na comparação (aplicado automaticamente)
    delete filtrosComparar.paciente;
    delete aplicadosComparar.paciente;
    
    return JSON.stringify(filtrosComparar) !== JSON.stringify(aplicadosComparar);
  }, [filtros, filtrosAplicados]);

  // Renderização das colunas com melhor tratamento de dados descriptografados
  const colunas = [
    // Mostrar coluna do médico apenas se não for médico logado
    ...(!temRole('medico')
      ? [
          {
            header: "Médico Responsável",
            key: "medicoResponsavel",
            render: (value, laudo) => {
              // Tentar obter o nome do médico de diferentes formas
              let nomeExibir = "Não informado";
              let crm = null;

              try {
                if (laudo.medicoResponsavelId?.nome) {
                  nomeExibir = laudo.medicoResponsavelId.nome;
                  crm = laudo.medicoResponsavelId.crm;
                } else if (laudo.medicoResponsavel) {
                  nomeExibir = laudo.medicoResponsavel;
                } else if (value) {
                  nomeExibir = value;
                }
              } catch (e) {
                console.error("Erro ao extrair dados do médico");
              }

              return (
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center mr-3">
                    <FiUser className="text-blue-500" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">{nomeExibir}</p>
                    {crm && (
                      <p className="text-xs text-slate-500">CRM: {crm}</p>
                    )}
                  </div>
                </div>
              );
            },
          },
        ]
      : []),

    {
      header: "Paciente",
      render: (_, laudo) => {
        let pacienteNome = "Não informado";
        let pacienteIdade = null;

        try {
          // Tentar acessar o nome do paciente de diferentes formas
          if (laudo.exame?.paciente?.nome) {
            pacienteNome = laudo.exame.paciente.nome;
            pacienteIdade = laudo.exame.paciente.idade;
          } else if (laudo.paciente?.nome) {
            pacienteNome = laudo.paciente.nome;
            pacienteIdade = laudo.paciente.idade;
          }
        } catch (e) {
          console.error("Erro ao extrair dados do paciente");
        }

        return (
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center mr-3">
              <FiUser className="text-purple-500" />
            </div>
            <div>
              <p className="font-medium text-slate-800">{pacienteNome}</p>
              {pacienteIdade && (
                <p className="text-xs text-slate-500">{pacienteIdade} anos</p>
              )}
            </div>
          </div>
        );
      },
    },

    {
      header: "Conclusão",
      key: "conclusao",
      render: (value) => {
        if (!value || value.trim() === "") {
          return <p className="text-slate-500 italic">Não informado</p>;
        }

        const textoLimitado =
          value.length > 50 ? `${value.substring(0, 50)}...` : value;

        return (
          <p className="text-slate-800" title={value}>
            {textoLimitado}
          </p>
        );
      },
    },

    {
      header: "Status",
      key: "status",
      render: (value) => {
        const statusCores = {
          "Laudo pronto pra assinatura": {
            bg: "bg-amber-100",
            text: "text-amber-800",
          },
          "Laudo assinado": { bg: "bg-green-100", text: "text-green-800" },
        };

        const cores = statusCores[value] || {
          bg: "bg-slate-100",
          text: "text-slate-800",
        };
        const statusExibir = value || "Não informado";

        return (
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${cores.bg} ${cores.text}`}
          >
            {statusExibir}
          </span>
        );
      },
    },

    {
      header: "Data Criação",
      key: "createdAt",
      render: (value) => {
        if (!value) {
          return <p className="text-slate-500">—</p>;
        }

        try {
          const data = new Date(value);
          return (
            <div>
              <p className="text-slate-800">
                {data.toLocaleDateString("pt-BR")}
              </p>
              <p className="text-xs text-slate-500">
                {data.toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          );
        } catch (e) {
          console.error("Erro ao formatar data");
          return <p className="text-slate-500">—</p>;
        }
      },
    },

    // Mostrar coluna da empresa apenas se for adminMaster ou admin
    ...(usuario.role === "adminMaster" || usuario.role === "admin"
      ? [
          {
            header: "Empresa",
            key: "tenant_id",
            render: (value, laudo) => {
              const nomeEmpresa =
                laudo.tenant_id?.nomeFantasia || "Não informado";
              return <p className="text-slate-800">{nomeEmpresa}</p>;
            },
          },
        ]
      : []),
  ];

  const acoes = [
    {
      label: "Ver detalhes",
      acao: (laudo) => navigate(`/laudos/${laudo._id}`),
      icon: <FiEye className="h-4 w-4" />,
      style: "text-slate-600 hover:text-slate-800 hover:bg-slate-50",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Cabeçalho e controles integrados ao fundo da página */}
      <div className="px-6 py-6">
        <div className="flex flex-col gap-6">
          {/* Título e botões de ação */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <div className="p-3 bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl mr-3 shadow-lg">
                  <FiFileText className="text-white h-5 w-5" />
                </div>
                {temRole('medico')
                  ? "Meus Laudos"
                  : "Dashboard de Laudos"}
              </h1>
              <p className="text-sm text-gray-600 mt-2 ml-14">
                {temRole('medico')
                  ? "Gerencie e visualize seus laudos médicos"
                  : "Gerencie e visualize todos os laudos da empresa"}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={fetchLaudos}
                className="flex items-center justify-center px-6 py-3 rounded-xl border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-all duration-200 shadow-sm text-sm font-medium"
              >
                <FiRefreshCw className="mr-2 h-4 w-4" />
                <span>Atualizar</span>
              </button>

              <button
                onClick={() => setMostrarFiltros(!mostrarFiltros)}
                className={`flex items-center justify-center px-6 py-3 rounded-xl border font-medium transition-all duration-200 shadow-sm text-sm ${
                  mostrarFiltros
                    ? "bg-gradient-to-r from-blue-600 to-blue-800 text-white border-blue-600"
                    : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <FiFilter className="mr-2 h-4 w-4" />
                <span>Filtros</span>
                {mostrarFiltros && <FiX className="ml-2 h-4 w-4" />}
              </button>

              {/* Botão Novo Laudo - Apenas para médicos */}
              {temRole('medico') && (
                <button
                  onClick={() => navigate("/laudos/novo")}
                  className="flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-xl hover:from-blue-700 hover:to-blue-900 transition-all duration-200 shadow-lg hover:shadow-xl font-medium text-sm"
                >
                  <FiPlus className="mr-2 h-4 w-4" />
                  <span>Novo Laudo</span>
                </button>
              )}
            </div>
          </div>

          {/* Cards de estatísticas */}
          {estatisticas && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Total de Laudos"
                value={estatisticas.totalLaudos || 0}
                icon={FiDatabase}
                gradient="from-blue-600 to-blue-800"
                subtitle="Total geral"
                isLoading={!estatisticas}
              />
              <StatCard
                title="Prontos para Assinatura"
                value={
                  estatisticas.laudosPorStatus?.find(
                    (s) => s.status === "Laudo pronto pra assinatura",
                  )?.total || 0
                }
                icon={FiClock}
                gradient="from-amber-600 to-orange-600"
                subtitle="Aguardando assinatura"
                isLoading={!estatisticas}
              />
              <StatCard
                title="Assinados"
                value={
                  estatisticas.laudosPorStatus?.find(
                    (s) => s.status === "Laudo assinado",
                  )?.total || 0
                }
                icon={FiFileText}
                gradient="from-emerald-600 to-green-600"
                subtitle="Prontos para entrega"
                isLoading={!estatisticas}
              />
            </div>
          )}

          {/* Seção de filtros integrada ao fundo */}
          {mostrarFiltros && (
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="flex flex-col gap-6">
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  Filtros de Busca
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Médico - Não mostrar para médicos */}
                  {usuario.role !== "medico" && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Médico Responsável
                      </label>
                      <div className="relative">
                        <select
                          name="medicoId"
                          value={filtros.medicoId}
                          onChange={handleFiltroChange}
                          className="block w-full pl-3 pr-10 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white transition-all duration-200 text-gray-700 font-medium text-sm"
                        >
                          {medicos.map((medico) => (
                            <option key={medico.value} value={medico.value}>
                              {medico.label}
                            </option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <FiChevronDown className="text-slate-400" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Status */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Status
                    </label>
                    <div className="relative">
                      <select
                        name="status"
                        value={filtros.status}
                        onChange={handleFiltroChange}
                        className="block w-full pl-3 pr-10 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-slate-500 appearance-none bg-white transition-all duration-200 text-slate-700 font-medium text-sm"
                      >
                        {opcoesStatus.map((opcao) => (
                          <option key={opcao.value} value={opcao.value}>
                            {opcao.label}
                          </option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <FiChevronDown className="text-slate-400" />
                      </div>
                    </div>
                  </div>

                  {/* Paciente */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
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
                        placeholder="Nome do paciente..."
                        className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-all duration-200 bg-white text-slate-700 font-medium text-sm"
                      />
                    </div>
                  </div>

                  {/* Período */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Período
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <InputDataBrasileira
                        name="dataInicio"
                        value={filtros.dataInicio}
                        onChange={handleFiltroChange}
                        placeholder="Data inicial"
                        className="text-sm"
                      />
                      <InputDataBrasileira
                        name="dataFim"
                        value={filtros.dataFim}
                        onChange={handleFiltroChange}
                        placeholder="Data final"
                        className="text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center mt-4">
                  {/* Indicador de filtros pendentes */}
                  {hasFiltrosPendentes && (
                    <div className="flex items-center text-amber-600 text-sm">
                      <FiAlertCircle className="w-4 h-4 mr-1" />
                      <span className="font-medium">Filtros alterados - clique em "Aplicar" para buscar</span>
                    </div>
                  )}
                  
                  <div className="flex gap-3 ml-auto">
                    <button
                      onClick={limparFiltros}
                      className="px-6 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-all duration-200 shadow-sm"
                    >
                      Limpar Filtros
                    </button>
                    <button
                      onClick={aplicarFiltros}
                      disabled={!hasFiltrosPendentes}
                      className={`px-6 py-2 text-sm font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl ${
                        hasFiltrosPendentes
                          ? "text-white bg-gradient-to-r from-slate-600 to-slate-800 hover:from-slate-700 hover:to-slate-900"
                          : "text-slate-400 bg-slate-200 cursor-not-allowed"
                      }`}
                    >
                      {hasFiltrosPendentes ? "Aplicar Filtros" : "Filtros Aplicados"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mensagem de erro */}
      {erro && (
        <div className="mx-6 mb-6">
          <div className="bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500 p-4 rounded-r-xl shadow-lg">
            <div className="flex items-center">
              <FiAlertCircle className="text-red-500 mr-3 h-5 w-5" />
              <p className="text-red-700 font-medium">{erro}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tabela separada */}
      <div className="mx-6 mb-6">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
          {isLoading ? (
            <LoadingSpinner />
          ) : (
            <Tabela
              colunas={colunas}
              dados={laudos}
              acoes={acoes}
              customRowClass={() => "hover:bg-slate-50"}
              mensagemSemDados={
                <div className="text-center py-16">
                  <div className="mx-auto w-24 h-24 bg-gradient-to-r from-slate-100 to-slate-200 rounded-full flex items-center justify-center mb-4">
                    <FiFileText className="text-slate-400 text-4xl" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-600 mb-2">
                    Nenhum laudo encontrado
                  </h3>
                  <p className="text-slate-500 max-w-md mx-auto">
                    {temRole('medico')
                      ? "Você ainda não possui laudos registrados no sistema"
                      : "Nenhum laudo encontrado. Tente ajustar seus filtros de busca."}
                  </p>
                </div>
              }
            />
          )}

          {/* Paginação dentro da tabela */}
          {totalPaginas > 1 && (
            <div className="px-6 py-4 border-t border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <p className="text-sm text-slate-600 font-medium">
                  Página {paginaAtual} de {totalPaginas} • {totalItens} itens
                </p>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))}
                    disabled={paginaAtual === 1}
                    className={`px-4 py-2 rounded-xl border font-medium transition-all duration-200 text-sm ${
                      paginaAtual === 1
                        ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                        : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50 shadow-sm"
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
                        className={`px-4 py-2 rounded-xl border font-medium transition-all duration-200 text-sm ${
                          paginaAtual === pageNum
                            ? "bg-gradient-to-r from-slate-600 to-slate-800 text-white border-slate-600 shadow-lg"
                            : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50 shadow-sm"
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
                    className={`px-4 py-2 rounded-xl border font-medium transition-all duration-200 text-sm ${
                      paginaAtual === totalPaginas
                        ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                        : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50 shadow-sm"
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

export default LaudosDashboard;
