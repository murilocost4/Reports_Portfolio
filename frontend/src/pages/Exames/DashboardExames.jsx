import React, { useEffect, useState, memo, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom"; 
import api from "../../api";
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
  FiRefreshCw,
  FiEye,
  FiEdit,
  FiTrash,
  FiDownload,
  FiBarChart2,
  FiAlertTriangle,
  FiPlus,
  FiClock,
  FiActivity,
  FiTrendingUp,
  FiTrendingDown,
  FiDatabase,
} from "react-icons/fi";
import { FaBuilding } from "react-icons/fa";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "react-toastify";

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
      Carregando exames...
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
              <span className="text-xs text-gray-500">{subtitle}</span>
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

const DashboardExames = () => {
  const [exames, setExames] = useState([]);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalItens, setTotalItens] = useState(0);
  const [filtros, setFiltros] = useState({
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
  const [exameParaExcluir, setExameParaExcluir] = useState(null);
  const [mostrarModalExcluir, setMostrarModalExcluir] = useState(false);
  const navigate = useNavigate();
  const { usuario, temRole } = useAuth();

  // Estados para controle de filtros aplicados
  const [filtrosAplicados, setFiltrosAplicados] = useState({
    paciente: "",
    tipoExame: "",
    status: "",
    dataInicio: "",
    dataFim: "",
    urgente: "",
  });

  // Debounce para busca de paciente (aplicado automaticamente)
  const debouncedPaciente = useDebounce(filtros.paciente, 800);

  const opcoesStatus = useMemo(
    () => [
      { value: "", label: "Todos" },
      { value: "Pendente", label: "Pendente" },
      { value: "Concluído", label: "Concluído" },
      { value: "Laudo realizado", label: "Laudo realizado" },
      { value: "Cancelado", label: "Cancelado" },
    ],
    [],
  );

  // Buscar tipos de exame
  const fetchTiposExame = useCallback(async () => {
    try {
      const response = await api.get("/tipos-exame");
      const tipos = response.data.map((tipo) => ({
        value: tipo._id,
        label: tipo.nome,
      }));
      setOpcoesTipoExame([{ value: "", label: "Todos" }, ...tipos]);
    } catch (err) {
      console.error("Erro ao buscar tipos de exame");
    }
  }, []);

  const fetchExames = useCallback(async () => {
    setIsLoading(true);
    setErro("");

    try {
      const params = new URLSearchParams({
        page: paginaAtual,
        limit: 10,
      });

      // Usar filtrosAplicados em vez de filtros (exceto para paciente que usa debounce)
      const filtrosParaEnviar = {
        ...filtrosAplicados,
        paciente: debouncedPaciente // Paciente sempre usa o valor com debounce
      };

      // Adicionar filtros apenas se tiverem valor válido
      Object.entries(filtrosParaEnviar).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          // Para o filtro urgente, incluir mesmo se for 'false'
          if (key === "urgente" && (value === "true" || value === "false")) {
            params.append(key, value);
          } else if (key !== "urgente" && String(value).trim() !== "") {
            params.append(key, String(value).trim());
          }
        }
      });

      const response = await api.get(`/exames?${params.toString()}`);

      setExames(response.data.exames || []);
      setTotalPaginas(response.data.totalPages || 1);
      setTotalItens(response.data.total || 0);
    } catch (err) {
      setErro("Erro ao carregar exames. Tente novamente.");
      console.error("Erro ao buscar exames");
      if (err.response) {
        // Log do erro sem expor detalhes
      }
    } finally {
      setIsLoading(false);
    }
  }, [paginaAtual, filtrosAplicados, debouncedPaciente]);

  const handleExcluirExame = async () => {
    if (!exameParaExcluir) return;

    // Verificar se o exame tem laudo realizado
    if (exameParaExcluir.status === "Laudo realizado") {
      toast.error(
        "Não é possível excluir um exame que já possui laudo realizado",
      );
      setMostrarModalExcluir(false);
      setExameParaExcluir(null);
      return;
    }

    try {
      setIsLoading(true);
      await api.delete(`/exames/${exameParaExcluir._id}`);

      toast.success("Exame excluído com sucesso!");
      setMostrarModalExcluir(false);
      setExameParaExcluir(null);

      // Recarregar a lista de exames
      fetchExames();
    } catch (err) {
      console.error("Erro ao excluir exame");

      if (err.response?.data?.codigo === "EXAME_COM_LAUDO") {
        toast.error(
          "Não é possível excluir um exame que já possui laudo realizado",
        );
      } else {
        toast.error("Erro ao excluir exame. Tente novamente.");
      }

      setMostrarModalExcluir(false);
      setExameParaExcluir(null);
    } finally {
      setIsLoading(false);
    }
  };

  const confirmarExclusao = (exame) => {
    // Verificar se o exame tem laudo realizado antes de abrir o modal
    if (exame.status === "Laudo realizado") {
      toast.error(
        "Não é possível excluir um exame que já possui laudo realizado",
      );
      return;
    }

    setExameParaExcluir(exame);
    setMostrarModalExcluir(true);
  };

  const cancelarExclusao = () => {
    setExameParaExcluir(null);
    setMostrarModalExcluir(false);
  };

  useEffect(() => {
    fetchTiposExame();
  }, [fetchTiposExame]);

  // Effect para carregamento inicial (sem filtros)
  useEffect(() => {
    if (paginaAtual === 1 && Object.values(filtrosAplicados).every(v => v === "")) {
      fetchExames();
    }
  }, [fetchExames, paginaAtual, filtrosAplicados]);

  // Effect para mudança de página (mantém filtros aplicados)
  useEffect(() => {
    if (paginaAtual > 1) {
      fetchExames();
    }
  }, [paginaAtual, fetchExames]);

  // Effect APENAS para busca de paciente com debounce (aplicação automática)
  useEffect(() => {
    if (debouncedPaciente !== filtrosAplicados.paciente) {
      setFiltrosAplicados(prev => ({ ...prev, paciente: debouncedPaciente }));
    }
  }, [debouncedPaciente, filtrosAplicados.paciente]);

  // useEffect para atualizar tabela quando filtros são aplicados (exceto na inicialização)
  useEffect(() => {
    if (Object.values(filtrosAplicados).some(v => v !== "")) {
      fetchExames();
    }
  }, [filtrosAplicados, fetchExames]);

  const handleFiltroChange = useCallback((e) => {
    const { name, value } = e.target;
    setFiltros((prev) => ({ ...prev, [name]: value }));
  }, []);

  const limparFiltros = useCallback(() => {
    const filtrosLimpos = {
      paciente: "",
      tipoExame: "",
      status: "",
      dataInicio: "",
      dataFim: "",
      urgente: "",
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

  // Configuração das colunas baseada no papel do usuário
  const colunas = [
    {
      header: "Paciente",
      key: "paciente",
      render: (value, row) => (
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center mr-3">
            <FiUser className="text-gray-500" />
          </div>
          <div>
            <p className="font-medium text-gray-800">
              {row.paciente?.nome || "Sem paciente"}
            </p>
            {row.paciente?.idade && (
              <p className="text-xs text-gray-500">
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
          bg: "bg-gray-100",
          text: "text-gray-800",
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
          bg: "bg-gray-100",
          text: "text-gray-800",
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
      header: "Data",
      key: "dataExame",
      render: (value) => (
        <div>
          <p className="text-gray-800">
            {value
              ? new Date(value).toLocaleDateString("pt-BR")
              : "Data não informada"}
          </p>
          {value && (
            <p className="text-xs text-gray-500">
              {new Date(value).toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>
      ),
    },
    // Mostrar coluna de empresa apenas para médicos que podem ter múltiplos tenants
    ...(temRole('medico') &&
    Array.isArray(usuario.tenant_id) &&
    usuario.tenant_id.length > 1
      ? [
          {
            header: "Empresa",
            key: "tenant_id",
            render: (value, exame) => (
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center mr-3">
                  <FaBuilding className="text-slate-500" />
                </div>
                <span className="font-medium text-slate-800">
                  {exame.tenant_id?.nomeFantasia || "Sem empresa"}
                </span>
              </div>
            ),
          },
        ]
      : []),
  ];

  const acoes = [
    {
      label: "Ver detalhes",
      acao: (exame) => navigate(`/exames/${exame._id}`),
      icon: <FiEye className="h-4 w-4" />,
      style: "text-slate-600 hover:text-slate-800 hover:bg-slate-50",
      mostrar: () => true, // Sempre visível
    },

    // Editar para técnicos, admins e recepcionistas - OCULTO se tiver laudo realizado
    ...(temRole('admin') ||
    temRole('tecnico') ||
    temRole('recepcionista')
      ? [
          {
            label: "Editar",
            acao: (exame) => {
              if (exame.status === "Laudo realizado") {
                toast.error(
                  "Não é possível editar um exame que já possui laudo realizado",
                );
                return;
              }
              navigate(`/exames/editar/${exame._id}`);
            },
            icon: <FiEdit className="h-4 w-4" />,
            style: "text-amber-600 hover:text-amber-800 hover:bg-amber-50",
            mostrar: (exame) => exame.status !== "Laudo realizado", // OCULTAR se laudo realizado
            disabled: false,
          },
        ]
      : []),

    // Download sempre disponível
    {
      label: "Download",
      acao: async (exame) => {
        if (exame.arquivo || exame.arquivoKey) {
          try {
            // Usar endpoint de download que retorna URL pré-assinada
            const response = await api.get(`/exames/${exame._id}/download`);
            
            if (response.data.downloadUrl) {
              window.open(response.data.downloadUrl, "_blank");
            } else {
              toast.error("URL de download não disponível");
            }
          } catch (error) {
            console.error("Erro ao baixar arquivo:", error);
            toast.error("Erro ao baixar arquivo. Tente novamente.");
          }
        } else {
          toast.warning("Arquivo não disponível para download");
        }
      },
      icon: <FiDownload className="h-4 w-4" />,
      style: (exame) =>
        (exame.arquivo || exame.arquivoKey)
          ? "text-green-600 hover:text-green-800 hover:bg-green-50"
          : "text-gray-400 cursor-not-allowed",
      disabled: (exame) => !exame.arquivo && !exame.arquivoKey,
      disabledMessage: (exame) =>
        (!exame.arquivo && !exame.arquivoKey) ? "Arquivo não disponível" : null,
      mostrar: () => true,
    },

    // Excluir apenas para admins - OCULTO se tiver laudo realizado
    ...(temRole('admin')
      ? [
          {
            label: "Excluir",
            acao: (exame) => confirmarExclusao(exame),
            icon: <FiTrash className="h-4 w-4" />,
            style: "text-red-600 hover:text-red-800 hover:bg-red-50",
            mostrar: (exame) => exame.status !== "Laudo realizado", // OCULTAR se laudo realizado
            disabled: false,
          },
        ]
      : []),

    // Alternativa: Mostrar botão bloqueado com tooltip explicativo (opcional)
    // Descomente as linhas abaixo se preferir mostrar os botões desabilitados em vez de ocultos

    /*
    // Editar BLOQUEADO para exames com laudo
    ...(usuario.role === 'admin' || usuario.role === 'tecnico' ? [{
      label: 'Editar',
      acao: (exame) => {
        if (exame.status !== 'Laudo realizado') {
          navigate(`/exames/editar/${exame._id}`);
        }
      },
      icon: <FiEdit className="h-4 w-4" />,
      style: (exame) => exame.status === 'Laudo realizado' 
        ? 'text-gray-400 cursor-not-allowed bg-gray-100' 
        : 'text-amber-600 hover:text-amber-800 hover:bg-amber-50',
      disabled: (exame) => exame.status === 'Laudo realizado',
      disabledMessage: (exame) => exame.status === 'Laudo realizado' 
        ? 'Não é possível editar exames com laudo realizado' 
        : null,
      mostrar: () => true
    }] : []),
    
    // Excluir BLOQUEADO para exames com laudo
    ...(usuario.role === 'admin' ? [{
      label: 'Excluir',
      acao: (exame) => {
        if (exame.status !== 'Laudo realizado') {
          confirmarExclusao(exame);
        }
      },
      icon: <FiTrash className="h-4 w-4" />,
      style: (exame) => exame.status === 'Laudo realizado' 
        ? 'text-gray-400 cursor-not-allowed bg-gray-100' 
        : 'text-red-600 hover:text-red-800 hover:bg-red-50',
      disabled: (exame) => exame.status === 'Laudo realizado',
      disabledMessage: (exame) => exame.status === 'Laudo realizado' 
        ? 'Não é possível excluir exames com laudo realizado' 
        : null,
      mostrar: () => true
    }] : [])
    */
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Modal de Confirmação de Exclusão */}
      {mostrarModalExcluir && (
        <div className="fixed inset-0 backdrop-brightness-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-red-50 to-red-100">
              <h3 className="text-lg font-bold text-gray-900 flex items-center">
                <FiAlertTriangle className="text-red-500 mr-2" />
                Confirmar Exclusão
              </h3>
            </div>

            <div className="p-6">
              <p className="text-gray-600 mb-4">
                Tem certeza que deseja excluir o exame do paciente{" "}
                <span className="font-semibold text-gray-900">
                  {exameParaExcluir?.paciente?.nome || "Nome não disponível"}
                </span>
                ?
              </p>
              <p className="text-sm text-red-600 bg-red-50 p-3 rounded-xl border border-red-200">
                <FiAlertTriangle className="inline w-4 h-4 mr-1" />
                Esta ação não pode ser desfeita.
              </p>

              {/* Mostrar aviso adicional se o exame tiver laudo */}
              {exameParaExcluir?.status === "Laudo realizado" && (
                <p className="text-sm text-red-700 bg-red-100 p-3 rounded-xl mt-3 font-semibold border border-red-300">
                  <FiAlertTriangle className="inline w-4 h-4 mr-1" />
                  ATENÇÃO: Este exame já possui laudo realizado e não pode ser
                  excluído.
                </p>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 rounded-b-2xl">
              <button
                onClick={cancelarExclusao}
                disabled={isLoading}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium transition-colors rounded-lg hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleExcluirExame}
                disabled={
                  isLoading || exameParaExcluir?.status === "Laudo realizado"
                }
                className={`px-4 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 ${
                  exameParaExcluir?.status === "Laudo realizado"
                    ? "bg-gray-400 text-white cursor-not-allowed"
                    : "bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800"
                }`}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Excluindo...
                  </>
                ) : (
                  <>
                    <FiTrash className="w-4 h-4" />
                    {exameParaExcluir?.status === "Laudo realizado"
                      ? "Não Permitido"
                      : "Confirmar Exclusão"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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
                  ? "Meus Exames para Análise"
                  : "Dashboard de Exames"}
              </h1>
              <p className="text-sm text-gray-600 mt-2 ml-14">
                {temRole('medico')
                  ? "Exames das suas especialidades disponíveis para análise e laudo"
                  : "Gestão completa dos exames da sua empresa"}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={fetchExames}
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
                    : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                <FiFilter className="mr-2 h-4 w-4" />
                <span>Filtros</span>
                {mostrarFiltros && <FiX className="ml-2 h-4 w-4" />}
              </button>

              {/* Botão novo exame para admins, técnicos e recepcionistas */}
              {(temRole('admin') ||
                temRole('tecnico') ||
                temRole('recepcionista')) && (
                <button
                  onClick={() => navigate("/exames/novo")}
                  className="flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-xl hover:from-blue-700 hover:to-blue-900 transition-all duration-200 shadow-lg hover:shadow-xl font-medium text-sm"
                >
                  <FiPlus className="mr-2 h-4 w-4" />
                  <span>Novo Exame</span>
                </button>
              )}
            </div>
          </div>

          {/* Cards de estatísticas */}
          {estatisticas && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title={
                  usuario.role === "medico"
                    ? "Exames Disponíveis"
                    : "Total de Exames"
                }
                value={estatisticas.totalExames}
                icon={FiDatabase}
                gradient="from-blue-600 to-blue-800"
                subtitle="Total geral"
                isLoading={!estatisticas}
              />
              <StatCard
                title="Urgentes"
                value={estatisticas.examesUrgentes || 0}
                icon={FiAlertTriangle}
                gradient="from-red-600 to-pink-600"
                subtitle="Prioridade alta"
                color="bg-red-50 border-red-200"
                isLoading={!estatisticas}
              />
              <StatCard
                title="Pendentes"
                value={
                  estatisticas.examesPorStatus?.find(
                    (s) => s.status === "Pendente",
                  )?.total || 0
                }
                icon={FiClock}
                gradient="from-amber-600 to-orange-600"
                subtitle="Aguardando análise"
                isLoading={!estatisticas}
              />
              <StatCard
                title={temRole('medico') ? "Com Laudo" : "Concluídos"}
                value={
                  estatisticas.examesPorStatus?.find(
                    (s) => s.status === "Laudo realizado",
                  )?.total ||
                  estatisticas.examesPorStatus?.find(
                    (s) => s.status === "Concluído",
                  )?.total ||
                  0
                }
                icon={FiActivity}
                gradient="from-emerald-600 to-green-600"
                subtitle="Finalizados"
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
                  {/* Paciente */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Paciente
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiSearch className="text-gray-400" />
                      </div>
                      <input
                        type="text"
                        name="paciente"
                        value={filtros.paciente}
                        onChange={handleFiltroChange}
                        placeholder="Buscar paciente..."
                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white text-gray-700 font-medium text-sm"
                      />
                    </div>
                  </div>

                  {/* Tipo de exame */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Tipo de Exame
                    </label>
                    <div className="relative">
                      <select
                        name="tipoExame"
                        value={filtros.tipoExame}
                        onChange={handleFiltroChange}
                        className="block w-full pl-3 pr-10 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white transition-all duration-200 text-gray-700 font-medium text-sm"
                      >
                        {opcoesTipoExame.map((opcao) => (
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

                  {/* Prioridade */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Prioridade
                    </label>
                    <div className="relative">
                      <select
                        name="urgente"
                        value={filtros.urgente || ""}
                        onChange={handleFiltroChange}
                        className="block w-full pl-3 pr-10 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-slate-500 appearance-none bg-white transition-all duration-200 text-slate-700 font-medium text-sm"
                      >
                        <option value="">Todas</option>
                        <option value="true">Apenas Urgentes</option>
                        <option value="false">Apenas Normais</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <FiChevronDown className="text-slate-400" />
                      </div>
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
          {isLoading && !mostrarModalExcluir ? (
            <LoadingSpinner />
          ) : (
            <Tabela
              colunas={colunas}
              dados={exames}
              acoes={acoes}
              customRowClass={(exame) =>
                exame.tipoExame?.urgente
                  ? "hover:from-red-100 hover:to-pink-100"
                  : "hover:bg-slate-50"
              }
              mensagemSemDados={
                <div className="text-center py-16">
                  <div className="mx-auto w-24 h-24 bg-gradient-to-r from-slate-100 to-slate-200 rounded-full flex items-center justify-center mb-4">
                    <FiFileText className="text-slate-400 text-4xl" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-600 mb-2">
                    Nenhum exame encontrado
                  </h3>
                  <p className="text-slate-500 max-w-md mx-auto">
                    {temRole('medico')
                      ? "Não há exames das suas especialidades disponíveis para análise no momento"
                      : "Nenhum exame cadastrado ainda. Comece criando um novo exame."}
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

export default DashboardExames;
