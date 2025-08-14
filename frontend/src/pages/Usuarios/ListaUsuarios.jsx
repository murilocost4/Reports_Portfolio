import React, { useEffect, useState, memo, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import InputDataBrasileira from "../../components/InputDataBrasileira";
import {
  FiSearch,
  FiPlus,
  FiFilter,
  FiCalendar,
  FiX,
  FiChevronDown,
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
      Carregando usuários...
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

const ListaUsuarios = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalItens, setTotalItens] = useState(0);
  const [filtros, setFiltros] = useState({
    nome: "",
    email: "",
    role: "",
    dataInicio: "",
    dataFim: "",
  });
  const [erro, setErro] = useState("");
  const [notification, setNotification] = useState("");
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUsuario, setSelectedUsuario] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [estatisticas, setEstatisticas] = useState(null);
  const navigate = useNavigate();
  const { usuario, logout } = useAuth();

  // Debounce para busca
  const debouncedNome = useDebounce(filtros.nome, 500);
  const debouncedEmail = useDebounce(filtros.email, 500);

  const opcoesRole = [
    { value: "", label: "Todos" },
    { value: "admin", label: "Administrador" },
    { value: "medico", label: "Médico" },
    { value: "tecnico", label: "Técnico" },
  ];
  const fetchUsuarios = useCallback(async () => {
    try {
      setIsLoading(true);
      setErro("");

      const params = {
        page: paginaAtual,
        limit: 10,
      };

      // Usar os valores debouncados para nome e email
      if (debouncedNome && debouncedNome.trim() !== "") {
        params.nome = debouncedNome.trim();
      }

      if (debouncedEmail && debouncedEmail.trim() !== "") {
        params.email = debouncedEmail.trim();
      }

      if (filtros.role && filtros.role.trim() !== "") {
        params.role = filtros.role.trim();
      }

      if (filtros.dataInicio && filtros.dataInicio.trim() !== "") {
        params.dataInicio = filtros.dataInicio.trim();
      }

      if (filtros.dataFim && filtros.dataFim.trim() !== "") {
        params.dataFim = filtros.dataFim.trim();
      }

      if (usuario.role !== "adminMaster") {
        params.tenant_id = usuario.tenant_id;
      }

      const response = await api.get("/usuarios", { params });

      if (response.data && Array.isArray(response.data.usuarios)) {
        setUsuarios(response.data.usuarios);
        setTotalPaginas(response.data.totalPaginas || 1);
        setTotalItens(response.data.totalItens || 0);
      } else if (response.data && Array.isArray(response.data)) {
        setUsuarios(response.data);
        setTotalPaginas(Math.ceil(response.data.length / 10));
        setTotalItens(response.data.length);
      } else {
        setUsuarios([]);
        setTotalPaginas(1);
        setTotalItens(0);
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setErro("Sessão expirada. Redirecionando para login...");
        setTimeout(() => logout(), 2000);
      } else if (err.response) {
        setErro(
          `Erro ao carregar usuários: ${err.response.data?.message || err.response.statusText}`,
        );
      } else if (err.request) {
        setErro(
          "Não foi possível conectar ao servidor. Verifique sua conexão.",
        );
      } else {
        setErro("Ocorreu um erro inesperado.");
      }
      setUsuarios([]);
    } finally {
      setIsLoading(false);
    }
  }, [
    paginaAtual,
    debouncedNome,
    debouncedEmail,
    filtros.role,
    filtros.dataInicio,
    filtros.dataFim,
    usuario,
    logout,
  ]);

  // useEffect para busca com debounce
  useEffect(() => {
    const filtrosAtualizados = {
      ...filtros,
      nome: debouncedNome,
      email: debouncedEmail,
    };

    if (JSON.stringify(filtrosAtualizados) !== JSON.stringify(filtros)) {
      setPaginaAtual(1);
    }
    fetchUsuarios();
  }, [
    fetchUsuarios,
    debouncedNome,
    debouncedEmail,
    paginaAtual,
    filtros.role,
    filtros.dataInicio,
    filtros.dataFim,
  ]);

  const mudarPagina = useCallback((novaPagina) => {
    setPaginaAtual(novaPagina);
  }, []);

  const handleFiltroChange = useCallback((e) => {
    const { name, value } = e.target;
    setFiltros((prev) => ({ ...prev, [name]: value }));
  }, []);

  const aplicarFiltros = useCallback(() => {
    setPaginaAtual(1);
    setMostrarFiltros(false);
  }, []);

  const limparFiltros = useCallback(() => {
    setFiltros({
      nome: "",
      email: "",
      role: "",
      dataInicio: "",
      dataFim: "",
    });
    setPaginaAtual(1);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    try {
      setIsLoading(true);
      await api.delete(`/usuarios/${selectedUsuario._id}`);

      setUsuarios((prev) => prev.filter((u) => u._id !== selectedUsuario._id));
      setNotification("Usuário excluído com sucesso!");
    } catch (err) {
      if (err.response?.status === 401) {
        setErro("Sessão expirada. Redirecionando para login...");
        setTimeout(() => logout(), 2000);
      } else {
        setNotification(
          err.response?.data?.message || "Erro ao excluir usuário",
        );
      }
    } finally {
      setIsModalOpen(false);
      setSelectedUsuario(null);
      setIsLoading(false);

      // Limpar notificação após 5 segundos
      setTimeout(() => setNotification(""), 5000);
    }
  }, [selectedUsuario, logout]);

  const colunas = useMemo(
    () => [
      {
        header: "Nome",
        key: "nome",
        render: (value, row) => (
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center mr-3">
              <FiUser className="text-gray-600 h-4 w-4" />
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
        header: "Função",
        key: "role",
        render: (value) => (
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              value === "admin"
                ? "bg-purple-100 text-purple-800"
                : value === "medico"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-green-100 text-green-800"
            }`}
          >
            {opcoesRole.find((r) => r.value === value)?.label || value}
          </span>
        ),
      },
      {
        header: "Status",
        key: "ativo",
        render: (value) => (
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              value !== false
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {value !== false ? "Ativo" : "Inativo"}
          </span>
        ),
      },
      {
        header: "Data Cadastro",
        key: "createdAt",
        render: (value) => (
          <div>
            <p className="text-gray-800 font-medium">
              {value ? new Date(value).toLocaleDateString("pt-BR") : "—"}
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
    ],
    [opcoesRole],
  );

  const acoes = useMemo(
    () => [
      {
        label: "Editar",
        acao: (usuario) => navigate(`/usuarios/editar/${usuario._id}`),
        icon: <FiEdit className="h-4 w-4" />,
        style: "text-blue-600 hover:text-blue-800 hover:bg-blue-50",
      },
      {
        label: "Excluir",
        acao: (usuario) => {
          setSelectedUsuario(usuario);
          setIsModalOpen(true);
        },
        icon: <FiTrash2 className="h-4 w-4" />,
        style: "text-red-600 hover:text-red-800 hover:bg-red-50",
        mostrar: () =>
          usuario?.role === "admin" || usuario?.role === "adminMaster",
      },
    ],
    [navigate, usuario?.role],
  );

  // Configuração das estatísticas
  const statsConfig = useMemo(() => {
    if (!estatisticas) return [];

    return [
      {
        title: "Total de Usuários",
        value: estatisticas.totalUsuarios?.toLocaleString("pt-BR") || "0",
        icon: FiDatabase,
        gradient: "from-blue-600 to-blue-800",
        subtitle: "Usuários cadastrados",
      },
      {
        title: "Novos (Este mês)",
        value: estatisticas.novosMes?.toLocaleString("pt-BR") || "0",
        icon: FiClock,
        gradient: "from-blue-600 to-blue-700",
        subtitle: "Usuários este mês",
      },
      {
        title: "Ativos",
        value: estatisticas.usuariosAtivos?.toLocaleString("pt-BR") || "0",
        icon: FiActivity,
        gradient: "from-emerald-600 to-emerald-700",
        subtitle: "Com atividade recente",
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
                Usuários
              </h1>
              <p className="text-sm text-gray-600 mt-2 ml-14">
                {totalItens > 0
                  ? `${totalItens} usuários encontrados`
                  : "Gerencie e visualize todos os usuários"}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={fetchUsuarios}
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

              {usuario?.role === "admin" && (
                <button
                  onClick={() => navigate("/usuarios/novo")}
                  className="flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-xl hover:from-blue-700 hover:to-blue-900 transition-all duration-200 shadow-lg hover:shadow-xl font-medium text-sm"
                >
                  <FiPlus className="mr-2 h-4 w-4" />
                  <span>Novo Usuário</span>
                </button>
              )}
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
                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 text-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="text"
                      name="email"
                      value={filtros.email}
                      onChange={handleFiltroChange}
                      placeholder="Buscar por email..."
                      className="block w-full px-3 py-3 border border-gray-300 text-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                  </div>

                  {/* Função */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Função
                    </label>
                    <div className="relative">
                      <select
                        name="role"
                        value={filtros.role}
                        onChange={handleFiltroChange}
                        className="block w-full pl-3 pr-8 py-3 border border-gray-300 text-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none transition-colors"
                      >
                        {opcoesRole.map((opcao) => (
                          <option key={opcao.value} value={opcao.value}>
                            {opcao.label}
                          </option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                        <FiChevronDown className="text-gray-400" />
                      </div>
                    </div>
                  </div>

                  {/* Período */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Período de cadastro
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FiCalendar className="text-gray-400" />
                        </div>
                        <InputDataBrasileira
                          name="dataInicio"
                          value={filtros.dataInicio}
                          onChange={handleFiltroChange}
                          placeholder="dd/mm/aaaa"
                          className="block w-full pl-10 pr-3 py-3 border border-gray-300 text-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        />
                      </div>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FiCalendar className="text-gray-400" />
                        </div>
                        <InputDataBrasileira
                          name="dataFim"
                          value={filtros.dataFim}
                          onChange={handleFiltroChange}
                          placeholder="dd/mm/aaaa"
                          className="block w-full pl-10 pr-3 py-3 border border-gray-300 text-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end mt-6 gap-3">
                  <button
                    onClick={limparFiltros}
                    className="px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 transition-colors"
                  >
                    Limpar Filtros
                  </button>
                  <button
                    onClick={aplicarFiltros}
                    className="px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl hover:from-blue-700 hover:to-blue-900 focus:ring-2 focus:ring-blue-500 shadow-sm transition-all duration-200"
                  >
                    Aplicar Filtros
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Mensagem de erro */}
          {erro && (
            <div className="px-6 py-4 bg-red-50 border-b border-red-200">
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
                <p className="text-red-700 font-medium">{erro}</p>
              </div>
            </div>
          )}

          {/* Mensagem de notificação */}
          {notification && (
            <div className="px-6 py-4 bg-green-50 border-b border-green-200">
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
                <p className="text-green-700 font-medium">{notification}</p>
              </div>
            </div>
          )}

          {/* Conteúdo da tabela */}
          <div className="overflow-x-auto">
            {isLoading ? (
              <LoadingSpinner />
            ) : (
              <Tabela
                colunas={colunas}
                dados={usuarios}
                acoes={acoes}
                mensagemSemDados={
                  <div className="text-center py-16">
                    <FiUser className="mx-auto text-gray-300 text-5xl mb-4" />
                    <h3 className="text-lg font-semibold text-gray-500 mb-2">
                      Nenhum usuário encontrado
                    </h3>
                    <p className="text-gray-400">
                      Tente ajustar seus filtros de busca ou cadastre um novo
                      usuário
                    </p>
                  </div>
                }
              />
            )}
          </div>

          {/* Paginação */}
          {totalPaginas > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <p className="text-sm text-gray-600 font-medium">
                  Exibindo página {paginaAtual} de {totalPaginas} • {totalItens}{" "}
                  registros
                </p>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => mudarPagina(paginaAtual - 1)}
                    disabled={paginaAtual === 1 || isLoading}
                    className={`px-4 py-2 rounded-lg border font-medium text-sm transition-colors ${
                      paginaAtual === 1 || isLoading
                        ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400"
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
                        onClick={() => !isLoading && mudarPagina(pageNum)}
                        disabled={isLoading}
                        className={`px-4 py-2 rounded-lg border font-medium text-sm transition-colors ${
                          paginaAtual === pageNum
                            ? "bg-gradient-to-r from-blue-600 to-blue-800 text-white border-blue-600 shadow-lg"
                            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400"
                        } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => mudarPagina(paginaAtual + 1)}
                    disabled={paginaAtual === totalPaginas || isLoading}
                    className={`px-4 py-2 rounded-lg border font-medium text-sm transition-colors ${
                      paginaAtual === totalPaginas || isLoading
                        ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400"
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
        <div className="fixed inset-0 flex items-center justify-center backdrop-blur-sm backdrop-brightness-50 bg-opacity-50 z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-800">
                Confirmar Exclusão
              </h2>
            </div>

            <div className="px-6 py-4">
              <p className="text-gray-600 mb-3">
                Tem certeza que deseja excluir o usuário?
              </p>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="font-semibold text-gray-800">
                  {selectedUsuario?.nome}
                </p>
                {selectedUsuario?.email && (
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedUsuario.email}
                  </p>
                )}
                <p className="text-xs text-red-600 mt-2 font-medium">
                  ⚠️ Esta ação não pode ser desfeita
                </p>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                disabled={isLoading}
                className="px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isLoading}
                className={`px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-red-600 to-red-700 rounded-xl hover:from-red-700 hover:to-red-800 focus:ring-2 focus:ring-red-500 shadow-lg transition-all duration-200 ${
                  isLoading ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Excluindo...
                  </div>
                ) : (
                  "Confirmar Exclusão"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ListaUsuarios;
