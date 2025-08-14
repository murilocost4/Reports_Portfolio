import React, { useState, useEffect, memo, useMemo, useCallback } from "react";
import api from "../../api";
import { useNavigate } from "react-router-dom";
import {
  FiSearch,
  FiPlus,
  FiFilter,
  FiX,
  FiUser,
  FiRefreshCw,
  FiEdit,
  FiTrash2,
  FiDatabase,
  FiClock,
  FiActivity,
  FiTrendingUp,
  FiTrendingDown,
} from "react-icons/fi";
import Tabela from "../../components/Tabela";
import { useAuth } from "../../contexts/AuthContext";

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
      Carregando pacientes...
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

const ListaPacientes = () => {
  const [pacientes, setPacientes] = useState([]);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalItens, setTotalItens] = useState(0);
  const [filtros, setFiltros] = useState({
    nome: "",
    cpf: "",
  });
  const [erro, setErro] = useState("");
  const [notification, setNotification] = useState("");
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPaciente, setSelectedPaciente] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [estatisticas, setEstatisticas] = useState(null);
  const navigate = useNavigate();
  const { usuario, logout, temRole } = useAuth();

  // Debounce para busca de paciente
  const debouncedNome = useDebounce(filtros.nome, 500);
  const debouncedCpf = useDebounce(filtros.cpf, 500);

  // Funções auxiliares para manipulação de datas
  const formatarDataLocal = (dataString) => {
    if (!dataString || !dataString.match(/^\d{4}-\d{2}-\d{2}$/))
      return "Data inválida";

    // Separa os componentes diretamente da string
    const [year, month, day] = dataString.split("-");

    // Cria uma data UTC (ignora completamente o fuso horário do navegador)
    return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
  };

  const calcularIdade = (dataString) => {
    if (!dataString || !dataString.match(/^\d{4}-\d{2}-\d{2}$/)) return 0;

    const [year, month, day] = dataString.split("-");
    const hoje = new Date();
    const nascimento = new Date(Date.UTC(year, month - 1, day));

    let idade = hoje.getUTCFullYear() - nascimento.getUTCFullYear();
    const mes = hoje.getUTCMonth() - nascimento.getUTCMonth();

    if (mes < 0 || (mes === 0 && hoje.getUTCDate() < nascimento.getUTCDate())) {
      idade--;
    }

    return idade;
  };

  const fetchPacientes = useCallback(async () => {
    setIsLoading(true);
    setErro("");

    try {
      // **CORRIGIDO: Preparar parâmetros de filtro**
      const params = {
        page: paginaAtual,
        limit: 10,
      };

      // Adicionar filtros apenas se tiverem valor
      if (filtros.nome && filtros.nome.trim() !== "") {
        params.nome = filtros.nome.trim();
      }

      if (filtros.cpf && filtros.cpf.trim() !== "") {
        // Enviar CPF apenas com números para o backend
        params.cpf = filtros.cpf.replace(/\D/g, "");
      }

      // **REMOVIDO: tenant_id é obtido automaticamente via token JWT no backend**

      const response = await api.get("/pacientes", { params });

      // Tratamento para diferentes formatos de resposta
      if (response.data && Array.isArray(response.data)) {
        setPacientes(response.data);
        setTotalPaginas(Math.ceil(response.data.length / 10));
        setTotalItens(response.data.length);
      } else if (response.data && response.data.pacientes) {
        setPacientes(response.data.pacientes);
        setTotalPaginas(response.data.totalPaginas || 1);
        setTotalItens(response.data.totalItens || 0);
      } else {
        setPacientes([]);
        setTotalPaginas(1);
        setTotalItens(0);
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setErro("Sessão expirada. Redirecionando para login...");
        setTimeout(() => logout(), 2000);
      } else if (err.response) {
        setErro(
          `Erro ao carregar pacientes: ${err.response.data?.message || err.response.statusText}`,
        );
      } else if (err.request) {
        setErro(
          "Não foi possível conectar ao servidor. Verifique sua conexão.",
        );
      } else {
        setErro("Ocorreu um erro inesperado.");
      }
      setPacientes([]);
    } finally {
      setIsLoading(false);
    }
  }, [paginaAtual, filtros, usuario, logout]);

  useEffect(() => {
    fetchPacientes();
  }, [fetchPacientes]);

  // Effect para busca com debounce
  useEffect(() => {
    if (debouncedNome !== filtros.nome || debouncedCpf !== filtros.cpf) return;

    if (filtros.nome !== "" || filtros.cpf !== "") {
      setPaginaAtual(1);
      fetchPacientes();
    }
  }, [debouncedNome, debouncedCpf, filtros.nome, filtros.cpf, fetchPacientes]);

  const mudarPagina = (novaPagina) => {
    setPaginaAtual(novaPagina);
  };

  const handleFiltroChange = useCallback((e) => {
    const { name, value } = e.target;

    // **CORRIGIDO: Formatação especial para CPF**
    if (name === "cpf") {
      // Remover caracteres não numéricos e limitar a 11 dígitos
      const cpfLimpo = value.replace(/\D/g, "").substring(0, 11);

      // Aplicar máscara de CPF durante a digitação (opcional)
      let cpfFormatado = cpfLimpo;
      if (cpfLimpo.length > 9) {
        cpfFormatado = cpfLimpo.replace(
          /(\d{3})(\d{3})(\d{3})(\d{2})/,
          "$1.$2.$3-$4",
        );
      } else if (cpfLimpo.length > 6) {
        cpfFormatado = cpfLimpo.replace(/(\d{3})(\d{3})(\d{1,3})/, "$1.$2.$3");
      } else if (cpfLimpo.length > 3) {
        cpfFormatado = cpfLimpo.replace(/(\d{3})(\d{1,3})/, "$1.$2");
      }

      setFiltros((prev) => ({ ...prev, [name]: cpfFormatado }));
    } else {
      setFiltros((prev) => ({ ...prev, [name]: value }));
    }
  }, []);

  const aplicarFiltros = useCallback(() => {

    setPaginaAtual(1);
    setMostrarFiltros(false);

    // Buscar pacientes imediatamente
    fetchPacientes();
  }, [filtros, fetchPacientes]);

  const limparFiltros = useCallback(() => {
    setFiltros({
      nome: "",
      cpf: "",
    });
    setPaginaAtual(1);
  }, []);

  const handleCancelDelete = () => {
    setIsModalOpen(false);
    setSelectedPaciente(null);
  };

  const handleConfirmDelete = async () => {
    if (!selectedPaciente) return;

    try {
      await api.delete(`/pacientes/${selectedPaciente._id}`);

      setNotification(
        `Paciente ${selectedPaciente.nome} excluído com sucesso!`,
      );
      setTimeout(() => setNotification(""), 5000);

      // Atualizar lista de pacientes
      fetchPacientes();

      // Fechar modal
      setIsModalOpen(false);
      setSelectedPaciente(null);
    } catch (err) {
      if (err.response?.status === 401) {
        setErro("Sessão expirada. Redirecionando para login...");
        setTimeout(() => logout(), 2000);
      } else {
        setErro(
          `Erro ao excluir paciente: ${err.response?.data?.message || err.message}`,
        );
        setTimeout(() => setErro(""), 5000);
      }
    }
  };

  const colunas = useMemo(
    () => [
      {
        header: "Nome",
        key: "nome",
        render: (value, row) => (
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center mr-3">
              <FiUser className="text-gray-600" />
            </div>
            <span className="font-medium text-gray-800">
              {value || "Não informado"}
            </span>
          </div>
        ),
      },
      {
        header: "Email",
        key: "email",
        render: (value) => (
          <span className="text-gray-700">{value || "—"}</span>
        ),
      },
      {
        header: "Telefone",
        key: "telefone",
        render: (value) =>
          value ? (
            <span className="text-gray-700">{value}</span>
          ) : (
            <span className="text-gray-400">—</span>
          ),
      },
      {
        header: "Nascimento",
        key: "dataNascimento",
        render: (value) =>
          value ? (
            <div>
              <p className="text-gray-800">{formatarDataLocal(value)}</p>
              <p className="text-xs text-gray-500">
                {calcularIdade(value)} anos
              </p>
            </div>
          ) : (
            <span className="text-gray-400">—</span>
          ),
      },
      // Add company column if user is medico or adminMaster
      ...(temRole('medico') || temRole('adminMaster')
        ? [
            {
              header: "Empresa",
              key: "tenant_id",
              render: (value, paciente) => (
                <span className="text-gray-800">
                  {paciente.tenant_id?.nomeFantasia || "Não informado"}
                </span>
              ),
            },
          ]
        : []),
    ],
    [usuario.role],
  );

  const acoes = useMemo(
    () => [
      {
        label: "Editar",
        acao: (paciente) => navigate(`/pacientes/editar/${paciente._id}`),
        icon: <FiEdit className="h-4 w-4" />,
        style: "text-blue-600 hover:text-blue-800 hover:bg-blue-50",
        mostrar: () => true,
      },
      {
        label: "Excluir",
        acao: (paciente) => {
          setSelectedPaciente(paciente);
          setIsModalOpen(true);
        },
        icon: <FiTrash2 className="h-4 w-4" />,
        style: "text-red-600 hover:text-red-800 hover:bg-red-50",
        mostrar: () =>
          usuario.role === "admin" || usuario.role === "adminMaster",
      },
    ],
    [navigate, usuario.role],
  );

  // Configuração das estatísticas
  const statsConfig = useMemo(() => {
    if (!estatisticas) return [];

    return [
      {
        title: "Total de Pacientes",
        value: estatisticas.totalPacientes?.toLocaleString("pt-BR") || "0",
        icon: FiDatabase,
        gradient: "from-blue-600 to-blue-800",
        subtitle: "Pacientes cadastrados",
      },
      {
        title: "Novos (Este mês)",
        value: estatisticas.novosMes?.toLocaleString("pt-BR") || "0",
        icon: FiClock,
        gradient: "from-blue-600 to-blue-700",
        subtitle: "Pacientes este mês",
      },
      {
        title: "Ativos",
        value: estatisticas.pacientesAtivos?.toLocaleString("pt-BR") || "0",
        icon: FiActivity,
        gradient: "from-emerald-600 to-emerald-700",
        subtitle: "Com exames recentes",
      },
    ];
  }, [estatisticas]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Cabeçalho e controles integrados ao fundo da página */}
      <div className="px-6 py-6">
        <div className="flex flex-col gap-6">
          {/* Título e botões de ação */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center">
                <div className="p-3 bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl mr-3 shadow-lg">
                  <FiUser className="text-white h-5 w-5" />
                </div>
                Pacientes
              </h1>
              <p className="text-sm text-gray-600 mt-2 ml-14">
                {totalItens > 0
                  ? `${totalItens} pacientes encontrados`
                  : "Gerencie e visualize todos os pacientes"}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={fetchPacientes}
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

              <button
                onClick={() => navigate("/pacientes/novo")}
                className="flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-xl hover:from-blue-700 hover:to-blue-900 transition-all duration-200 shadow-lg hover:shadow-xl font-medium text-sm"
              >
                <FiPlus className="mr-2 h-4 w-4" />
                <span>Novo Paciente</span>
              </button>
            </div>
          </div>

          {/* Cards de estatísticas */}
          {estatisticas && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {statsConfig.map((stat, index) => (
                <StatCard key={index} {...stat} isLoading={!estatisticas} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Container principal */}
      <div className="px-6">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
          {/* Filtros avançados */}
          {mostrarFiltros && (
            <div className="px-6 py-6 bg-gray-50 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <FiFilter className="text-gray-600 mr-2" />
                  Filtros Avançados
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Nome */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nome
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiSearch className="text-gray-400" />
                      </div>
                      <input
                        type="text"
                        name="nome"
                        value={filtros.nome}
                        onChange={handleFiltroChange}
                        placeholder="Buscar por nome..."
                        className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 text-gray-700 outline-none rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      />
                    </div>
                  </div>

                  {/* CPF */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      CPF
                    </label>
                    <input
                      type="text"
                      name="cpf"
                      value={filtros.cpf}
                      onChange={handleFiltroChange}
                      placeholder="000.000.000-00"
                      maxLength="14"
                      className="block w-full px-3 py-2.5 border border-gray-300 text-gray-700 outline-none rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Digite pelo menos 3 números para buscar
                    </p>
                  </div>
                </div>

                <div className="flex justify-end mt-6 gap-3">
                  <button
                    onClick={limparFiltros}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                  >
                    Limpar
                  </button>
                  <button
                    onClick={aplicarFiltros}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 shadow-sm transition-all duration-200"
                  >
                    Aplicar Filtros
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Mensagens de erro e notificação */}
          {erro && (
            <div className="mx-6 mt-6 bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center">
                <svg
                  className="text-red-500 mr-2 h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-red-700">{erro}</p>
              </div>
            </div>
          )}

          {notification && (
            <div className="mx-6 mt-6 bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center">
                <svg
                  className="text-green-500 mr-2 h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-green-700">{notification}</p>
              </div>
            </div>
          )}

          {/* Conteúdo da tabela */}
          <div className="">
            {isLoading ? (
              <LoadingSpinner />
            ) : (
              <Tabela
                colunas={colunas}
                dados={pacientes}
                acoes={acoes}
                mensagemSemDados={
                  <div className="text-center py-16">
                    <FiUser className="mx-auto text-gray-300 text-5xl mb-4" />
                    <h3 className="text-xl font-semibold text-gray-600 mb-2">
                      Nenhum paciente encontrado
                    </h3>
                    <p className="text-gray-400">
                      Tente ajustar seus filtros de busca ou cadastre um novo
                      paciente
                    </p>
                    <button
                      onClick={() => navigate("/pacientes/novo")}
                      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-sm"
                    >
                      <FiPlus className="inline mr-2" />
                      Novo Paciente
                    </button>
                  </div>
                }
              />
            )}
          </div>

          {/* Paginação */}
          {totalPaginas > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <p className="text-sm text-gray-600">
                  Página {paginaAtual} de {totalPaginas} • {totalItens}{" "}
                  pacientes
                </p>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => mudarPagina(paginaAtual - 1)}
                    disabled={paginaAtual === 1}
                    className={`px-4 py-2 rounded-xl border transition-all duration-200 ${
                      paginaAtual === 1
                        ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 shadow-sm hover:shadow-md"
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
                        onClick={() => mudarPagina(pageNum)}
                        className={`px-4 py-2 rounded-xl border transition-all duration-200 ${
                          paginaAtual === pageNum
                            ? "bg-blue-600 text-white border-blue-600 shadow-md"
                            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 shadow-sm hover:shadow-md"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => mudarPagina(paginaAtual + 1)}
                    disabled={paginaAtual === totalPaginas}
                    className={`px-4 py-2 rounded-xl border transition-all duration-200 ${
                      paginaAtual === totalPaginas
                        ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 shadow-sm hover:shadow-md"
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

      {/* Modal de Confirmação */}
      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center backdrop-blur-sm backdrop-brightness-50 bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-md w-full mx-4 border border-gray-200">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Confirmar Exclusão
            </h2>
            <p className="text-gray-600 mb-6">
              Tem certeza que deseja excluir o paciente{" "}
              <strong className="text-gray-800">
                {selectedPaciente?.nome}
              </strong>
              ? Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleCancelDelete}
                className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all duration-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-all duration-200 shadow-sm"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ListaPacientes;
