import React, { useState, useEffect, useCallback, useMemo, memo } from "react";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../api";
import InputDataBrasileira from "../../components/InputDataBrasileira";
import {
  FiDownload,
  FiFilter,
  FiEye,
  FiChevronDown,
  FiChevronUp,
  FiCalendar,
  FiRefreshCw,
  FiDollarSign,
  FiUser,
  FiFileText,
  FiCreditCard,
  FiTrendingUp,
  FiBarChart,
  FiSearch,
  FiActivity,
  FiCheckCircle,
  FiTarget,
  FiInfo,
  FiArrowDown,
  FiX,
  FiZap,
  FiStar,
  FiAward,
  FiLayers,
  FiAlertCircle,
} from "react-icons/fi";
import { toast } from "react-toastify";

// Hook customizado para debounce
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
      Carregando pagamentos...
    </p>
  </div>
));

// Componente de Card de Estatística otimizado
const StatCard = memo(({ stat, index }) => (
  <div
    className={`${stat.bg} rounded-2xl p-4 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-200`}
  >
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <p className="text-xs font-semibold text-gray-600 mb-1">
          {stat.title}
        </p>
        <p className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</p>
        <div className="flex items-center space-x-1">
          <div
            className={`p-0.5 bg-gradient-to-r ${stat.gradient} rounded-full`}
          >
            <stat.icon className="h-2.5 w-2.5 text-white" />
          </div>
          <span className="text-xs text-gray-500">{stat.subtitle}</span>
        </div>
      </div>
      <div
        className={`p-3 bg-gradient-to-r ${stat.gradient} rounded-xl shadow-md`}
      >
        <stat.icon className="h-6 w-6 text-white" />
      </div>
    </div>
  </div>
));

// Componente de linha da tabela otimizado
const TableRow = memo(
  ({
    pagamento,
    index,
    isSelected,
    isExpanded,
    onToggleSelect,
    onExpand,
    onDownload,
    formatCurrency,
    formatDate,
    formatDateTime,
    getMeioPagamentoIcon,
  }) => {
    const paymentMethod = getMeioPagamentoIcon(pagamento.meioPagamento);

    return (
      <>
        <tr
          className={`hover:bg-gray-50 transition-colors duration-150 ${isSelected ? "bg-gray-50" : index % 2 === 0 ? "bg-white" : "bg-gray-25"}`}
        >
          <td className="px-4 py-3 whitespace-nowrap">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onToggleSelect}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </td>
          <td className="px-4 py-3 whitespace-nowrap">
            <div className="flex items-center">
              <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 flex items-center justify-center">
                <FiUser className="h-4 w-4 text-white" />
              </div>
              <div className="ml-3">
                <div className="text-sm font-semibold text-gray-900">
                  Dr(a). {pagamento.medicoNome}
                </div>
                <div className="text-xs text-gray-500">
                  ID: {pagamento._id.slice(-8)}
                </div>
              </div>
            </div>
          </td>
          <td className="px-4 py-3 whitespace-nowrap">
            <div className="text-sm font-medium text-gray-900">
              {formatDate(pagamento.dataPagamento)}
            </div>
            <div className="text-xs text-gray-500">
              {formatDateTime(pagamento.createdAt).split(" ")[1]}
            </div>
          </td>
          <td className="px-4 py-3 whitespace-nowrap">
            {pagamento.valorDesconto > 0 ? (
              <div className="text-sm font-medium text-red-600">
                -{formatCurrency(pagamento.valorDesconto)}
              </div>
            ) : (
              <span className="text-sm text-gray-400">—</span>
            )}
          </td>
          <td className="px-4 py-3 whitespace-nowrap">
            <div className="text-sm font-semibold text-emerald-600">
              {formatCurrency(pagamento.valorFinal)}
            </div>
          </td>
          <td className="px-4 py-3 whitespace-nowrap">
            <span
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${paymentMethod.bg} ${paymentMethod.text}`}
            >
              <paymentMethod.icon className="h-3 w-3 mr-1" />
              {pagamento.meioPagamento?.toUpperCase()}
            </span>
          </td>
          <td className="px-4 py-3 whitespace-nowrap">
            <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-medium">
              {pagamento.laudos?.length || 0} laudos
            </span>
          </td>
          <td className="px-4 py-3 whitespace-nowrap text-center">
            <div className="flex items-center justify-center space-x-1">
              <button
                onClick={onDownload}
                className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100 rounded-lg transition-colors duration-150"
                title="Baixar Recibo"
              >
                <FiDownload className="h-4 w-4" />
              </button>
              <button
                onClick={onExpand}
                className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors duration-150"
                title={isExpanded ? "Ocultar Detalhes" : "Ver Detalhes"}
              >
                {isExpanded ? (
                  <FiChevronUp className="h-4 w-4" />
                ) : (
                  <FiChevronDown className="h-4 w-4" />
                )}
              </button>
            </div>
          </td>
        </tr>
        {isExpanded && (
          <tr className="bg-gray-50">
            <td colSpan="8" className="px-4 py-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
                  <h4 className="text-base font-semibold text-gray-900 mb-3 flex items-center">
                    <FiInfo className="h-4 w-4 mr-2 text-gray-500" />
                    Detalhes do Pagamento
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">ID:</span>
                      <span className="font-mono text-gray-900 bg-gray-100 px-2 py-1 rounded text-xs">
                        {pagamento._id}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">
                        Criado em:
                      </span>
                      <span className="text-gray-900">
                        {formatDateTime(pagamento.createdAt)}
                      </span>
                    </div>
                    {pagamento.observacoes && (
                      <div>
                        <span className="font-medium text-gray-600">
                          Observações:
                        </span>
                        <p className="text-gray-900 bg-gray-100 p-2 rounded mt-1">
                          {pagamento.observacoes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
                  <h4 className="text-base font-semibold text-gray-900 mb-3 flex items-center">
                    <FiFileText className="h-4 w-4 mr-2 text-green-500" />
                    Laudos ({pagamento.laudos?.length || 0})
                  </h4>
                  {pagamento.laudos && pagamento.laudos.length > 0 ? (
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {pagamento.laudos.map((laudo, idx) => {
                        const laudoId =
                          typeof laudo === "string"
                            ? laudo
                            : laudo._id || laudo.id || "";
                        const displayId =
                          laudoId && laudoId.length >= 8
                            ? laudoId.slice(-8)
                            : laudoId || "N/A";
                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2 bg-gray-50 rounded"
                          >
                            <span className="text-sm font-medium text-gray-900">
                              Laudo #{displayId}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">
                      Nenhum laudo associado.
                    </p>
                  )}
                </div>
              </div>
            </td>
          </tr>
        )}
      </>
    );
  },
);

// Componente Card de Pagamento otimizado
const PaymentCard = memo(
  ({
    pagamento,
    isExpanded,
    onExpand,
    onDownload,
    formatCurrency,
    formatDate,
    getMeioPagamentoIcon,
  }) => {
    const paymentMethod = getMeioPagamentoIcon(pagamento.meioPagamento);

    return (
      <div className="bg-white rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-shadow duration-200 overflow-hidden">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 flex items-center justify-center">
                <FiUser className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  Dr(a). {pagamento.medicoNome}
                </h3>
                <p className="text-sm text-gray-500">
                  {formatDate(pagamento.dataPagamento)}
                </p>
              </div>
            </div>
            <span
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${paymentMethod.bg} ${paymentMethod.text}`}
            >
              <paymentMethod.icon className="h-3 w-3 mr-1" />
              {pagamento.meioPagamento?.toUpperCase()}
            </span>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Valor Final:</span>
              <span className="font-semibold text-emerald-600">
                {formatCurrency(pagamento.valorFinal)}
              </span>
            </div>
            {pagamento.valorDesconto > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Desconto:</span>
                <span className="font-medium text-red-500">
                  {formatCurrency(pagamento.valorDesconto)}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Laudos:</span>
              <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-medium">
                {pagamento.laudos?.length || 0}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={onDownload}
              className="flex items-center space-x-2 px-3 py-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors duration-150 text-sm font-medium"
            >
              <FiDownload className="h-4 w-4" />
              <span>Recibo</span>
            </button>
            <button
              onClick={onExpand}
              className="flex items-center space-x-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-150 text-sm font-medium"
            >
              <FiEye className="h-4 w-4" />
              <span>Detalhes</span>
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="border-t border-gray-100 bg-gray-50 p-4">
            <div className="space-y-3 text-sm">
              <div>
                <span className="font-medium text-gray-700">ID:</span>
                <p className="text-xs text-gray-600 font-mono bg-white p-2 rounded border mt-1">
                  {pagamento._id}
                </p>
              </div>
              {pagamento.observacoes && (
                <div>
                  <span className="font-medium text-gray-700">
                    Observações:
                  </span>
                  <p className="text-gray-600 bg-white p-2 rounded border mt-1">
                    {pagamento.observacoes}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  },
);

export default function HistoricoPagamentos() {
  const { usuario } = useAuth();

  const tenant_id = Array.isArray(usuario?.tenant_id)
    ? usuario.tenant_id[0]
    : usuario?.tenant_id;

  const [pagamentos, setPagamentos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtros, setFiltros] = useState({
    medicoId: "",
    dataInicio: "",
    dataFim: "",
    meioPagamento: "",
  });
  const [medicos, setMedicos] = useState([]);
  const [expandedPayment, setExpandedPayment] = useState(null);
  const [stats, setStats] = useState({
    totalPagamentos: 0,
    valorDescontos: 0,
    valorLiquido: 0,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState("table");
  const [selectedPayments, setSelectedPayments] = useState([]);
  const [sortField, setSortField] = useState("dataPagamento");
  const [sortDirection, setSortDirection] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20; // Aumentado para melhor performance

  // Debounce search term
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Memoized filtering with debounced search
  const filteredPagamentos = useMemo(() => {
    return pagamentos.filter((pagamento) => {
      if (!debouncedSearchTerm) return true;

      const searchLower = debouncedSearchTerm.toLowerCase();
      return (
        pagamento.medicoNome?.toLowerCase().includes(searchLower) ||
        pagamento.meioPagamento?.toLowerCase().includes(searchLower) ||
        pagamento.observacoes?.toLowerCase().includes(searchLower) ||
        pagamento._id?.toLowerCase().includes(searchLower)
      );
    });
  }, [pagamentos, debouncedSearchTerm]);

  // Memoized sorting
  const sortedPagamentos = useMemo(() => {
    return [...filteredPagamentos].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      if (sortField === "dataPagamento" || sortField === "createdAt") {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }

      if (sortField === "valorFinal") {
        aValue = Number(aValue) || 0;
        bValue = Number(bValue) || 0;
      }

      if (typeof aValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortDirection === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  }, [filteredPagamentos, sortField, sortDirection]);

  // Memoized pagination
  const { currentItems, totalPages, indexOfFirstItem, indexOfLastItem } =
    useMemo(() => {
      const indexOfLastItem = currentPage * itemsPerPage;
      const indexOfFirstItem = indexOfLastItem - itemsPerPage;
      const currentItems = sortedPagamentos.slice(
        indexOfFirstItem,
        indexOfLastItem,
      );
      const totalPages = Math.ceil(sortedPagamentos.length / itemsPerPage);

      return {
        currentItems,
        totalPages,
        indexOfFirstItem,
        indexOfLastItem,
      };
    }, [sortedPagamentos, currentPage, itemsPerPage]);

  // Memoized stats calculation
  const calculatedStats = useMemo(() => {
    const totalPagamentos = filteredPagamentos.length;
    const valorDescontos = filteredPagamentos.reduce(
      (sum, p) => sum + (Number(p.valorDesconto) || 0),
      0,
    );
    const valorLiquido = filteredPagamentos.reduce(
      (sum, p) => sum + (Number(p.valorFinal) || 0),
      0,
    );

    return {
      totalPagamentos,
      valorDescontos,
      valorLiquido,
    };
  }, [filteredPagamentos]);

  // Update stats when calculated stats change
  useEffect(() => {
    setStats(calculatedStats);
  }, [calculatedStats]);

  // Callback functions with useCallback for better performance
  const handleSort = useCallback(
    (field) => {
      if (sortField === field) {
        setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        setSortDirection("asc");
      }
    },
    [sortField],
  );

  const handleExpandPayment = useCallback((id) => {
    setExpandedPayment((prev) => (prev === id ? null : id));
  }, []);

  const handleDownloadRecibo = useCallback(async (id) => {
    try {
      const response = await api.get(`/financeiro/recibo/${id}`, {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `recibo_${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success("Recibo baixado com sucesso!");
    } catch (err) {
      toast.error("Erro ao baixar recibo");
    }
  }, []);

  const handleBulkDownload = useCallback(
    async (paymentIds) => {
      try {
        for (const id of paymentIds) {
          await handleDownloadRecibo(id);
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
        toast.success(`${paymentIds.length} recibos baixados com sucesso!`);
        setSelectedPayments([]);
      } catch (err) {
        toast.error("Erro ao baixar alguns recibos");
      }
    },
    [handleDownloadRecibo],
  );

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFiltros((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  const limparFiltros = useCallback(() => {
    setFiltros({
      medicoId: "",
      dataInicio: "",
      dataFim: "",
      meioPagamento: "",
    });
    setSearchTerm("");
  }, []);

  // Utility functions
  const formatCurrency = useCallback((value) => {
    const numericValue = Number(value) || 0;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(numericValue);
  }, []);

  const formatDate = useCallback((dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("pt-BR");
    } catch {
      return "N/A";
    }
  }, []);

  const formatDateTime = useCallback((dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleString("pt-BR");
    } catch {
      return "N/A";
    }
  }, []);

  const getMeioPagamentoIcon = useCallback((meio) => {
    switch (meio?.toLowerCase()) {
      case "pix":
        return { bg: "bg-emerald-100", text: "text-emerald-800", icon: FiZap };
      case "transferencia":
        return { bg: "bg-blue-100", text: "text-blue-800", icon: FiCreditCard };
      case "dinheiro":
        return {
          bg: "bg-green-100",
          text: "text-green-800",
          icon: FiDollarSign,
        };
      case "cheque":
        return {
          bg: "bg-purple-100",
          text: "text-purple-800",
          icon: FiFileText,
        };
      case "cartao":
        return {
          bg: "bg-indigo-100",
          text: "text-indigo-800",
          icon: FiCreditCard,
        };
      default:
        return {
          bg: "bg-gray-100",
          text: "text-gray-800",
          icon: FiAlertCircle,
        };
    }
  }, []);

  // API calls
  const fetchPagamentos = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();

      // **CONTEXTO ADMINISTRATIVO**: Indica que é a página HistoricoPagamentos (administrativa)
      params.append('context', 'administrative');

      if (tenant_id) {
        params.append("tenantId", tenant_id);
      }

      Object.entries(filtros).forEach(([key, value]) => {
        if (value && value.trim() !== "") {
          params.append(key, value);
        }
      });

      const response = await api.get(
        `/financeiro/pagamentos?${params.toString()}`,
      );

      if (response.data) {
        let pagamentosData = [];
        let resumoData = null;

        if (Array.isArray(response.data.pagamentos)) {
          pagamentosData = response.data.pagamentos;
          resumoData = response.data.resumo;
        } else if (Array.isArray(response.data)) {
          pagamentosData = response.data;
        }

        const pagamentosFormatados = pagamentosData.map((pagamento) => ({
          ...pagamento,
          medicoNome: pagamento.medicoId?.nome || pagamento.medicoNome || "N/A",
          valorDesconto: Number(pagamento.valorDesconto) || 0,
          valorFinal: Number(pagamento.valorFinal) || 0,
          laudos: pagamento.laudos || [],
          laudosDetalhes: pagamento.laudosDetalhes || [],
        }));

        setPagamentos(pagamentosFormatados);

        if (resumoData) {
          setStats({
            totalPagamentos: Number(resumoData.totalPagamentos) || 0,
            valorDescontos: Number(resumoData.valorDescontos) || 0,
            valorLiquido: Number(resumoData.valorLiquido) || 0,
          });
        }
      } else {
        setPagamentos([]);
        setStats({
          totalPagamentos: 0,
          valorDescontos: 0,
          valorLiquido: 0,
        });
      }
    } catch (err) {
      if (err.response?.status === 403) {
        toast.error("Acesso negado. Verifique suas permissões.");
      } else if (err.response?.status === 404) {
        toast.error("Endpoint não encontrado.");
      } else {
        toast.error("Erro ao carregar histórico de pagamentos");
      }

      setPagamentos([]);
      setStats({
        totalPagamentos: 0,
        valorDescontos: 0,
        valorLiquido: 0,
      });
    } finally {
      setLoading(false);
    }
  }, [filtros, tenant_id]);

  const fetchMedicos = useCallback(async () => {
    try {
      const response = await api.get("/usuarios/medicos");

      if (response.data && Array.isArray(response.data.usuarios)) {
        setMedicos(response.data.usuarios);
      } else if (response.data && Array.isArray(response.data)) {
        setMedicos(response.data);
      } else {
        setMedicos([]);
      }
    } catch (err) {
      toast.error("Erro ao carregar médicos");
      setMedicos([]);
    }
  }, []);

  useEffect(() => {
    fetchMedicos();
    fetchPagamentos();
  }, []);

  useEffect(() => {
    fetchPagamentos();
  }, [filtros]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, filtros]);

  const hasActiveFilters = Object.values(filtros).some((v) => v) || searchTerm;

  const statsConfig = useMemo(
    () => [
      {
        title: "Total de Pagamentos",
        value: stats.totalPagamentos.toLocaleString("pt-BR"),
        icon: FiTarget,
        gradient: "from-blue-500 to-blue-600",
        bg: "bg-blue-50",
        subtitle: "Registros encontrados",
      },
      {
        title: "Descontos",
        value: formatCurrency(stats.valorDescontos),
        icon: FiArrowDown,
        gradient: "from-red-500 to-pink-500",
        bg: "bg-red-50",
        subtitle: "Total em descontos",
      },
      {
        title: "Valor Líquido",
        value: formatCurrency(stats.valorLiquido),
        icon: FiCheckCircle,
        gradient: "from-emerald-500 to-green-500",
        bg: "bg-emerald-50",
        subtitle: "Valor final pago",
      },
    ],
    [stats, formatCurrency],
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-6 shadow-md border border-white/50 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
            <div className="flex items-center space-x-4 mb-4 lg:mb-0">
              <div className="p-3 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-lg">
                <FiBarChart className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 bg-clip-text text-transparent">
                  Histórico de Pagamentos
                </h1>
                <p className="text-gray-600 flex items-center space-x-2">
                  <FiAward className="h-4 w-4 text-gray-500" />
                  <span>Consulte e analise todos os pagamentos realizados</span>
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-md ${
                  showFilters
                    ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
                }`}
              >
                <FiFilter className="h-4 w-4" />
                <span>Filtros</span>
                {hasActiveFilters && (
                  <span className="bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                    !
                  </span>
                )}
              </button>

              <button
                onClick={fetchPagamentos}
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-medium transition-all duration-200 shadow-md disabled:opacity-70"
              >
                <FiRefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
                <span>Atualizar</span>
              </button>
            </div>
          </div>

          {/* Cards de Estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {statsConfig.map((stat, index) => (
              <StatCard key={index} stat={stat} index={index} />
            ))}
          </div>
        </div>

        {/* Filtros */}
        {showFilters && (
          <div className="bg-white rounded-2xl shadow-lg border border-white/50 p-4 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Filtros</h3>
              <div className="flex items-center space-x-2">
                {hasActiveFilters && (
                  <button
                    onClick={limparFiltros}
                    className="text-sm text-red-600 hover:text-red-800 font-medium"
                  >
                    Limpar
                  </button>
                )}
                <button
                  onClick={() => setShowFilters(false)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <FiX className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Barra de Pesquisa */}
            <div className="mb-4">
              <div className="relative max-w-md">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Pesquisar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <select
                name="medicoId"
                value={filtros.medicoId}
                onChange={handleInputChange}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos os médicos</option>
                {medicos.map((medico) => (
                  <option key={medico._id} value={medico._id}>
                    {medico.nome}
                  </option>
                ))}
              </select>

              <InputDataBrasileira
                name="dataInicio"
                value={filtros.dataInicio}
                onChange={handleInputChange}
                placeholder="Data inicial"
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <InputDataBrasileira
                name="dataFim"
                value={filtros.dataFim}
                onChange={handleInputChange}
                placeholder="Data final"
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <select
                name="meioPagamento"
                value={filtros.meioPagamento}
                onChange={handleInputChange}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                <option value="pix">PIX</option>
                <option value="transferencia">Transferência</option>
                <option value="dinheiro">Dinheiro</option>
                <option value="cheque">Cheque</option>
                <option value="cartao">Cartão</option>
              </select>
            </div>
          </div>
        )}

        {/* Controles de visualização */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <span className="text-sm font-medium text-gray-600">
              Visualização:
            </span>
            <div className="flex items-center bg-white rounded-lg shadow-sm border border-gray-200">
              <button
                onClick={() => setViewMode("table")}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                  viewMode === "table"
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <FiLayers className="h-4 w-4" />
                <span>Tabela</span>
              </button>
              <button
                onClick={() => setViewMode("cards")}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                  viewMode === "cards"
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <FiEye className="h-4 w-4" />
                <span>Cards</span>
              </button>
            </div>
          </div>

          {filteredPagamentos.length > 0 && (
            <div className="flex items-center space-x-2 text-sm text-gray-600 bg-white px-3 py-2 rounded-lg shadow-sm border border-gray-200">
              <FiStar className="h-4 w-4 text-yellow-500" />
              <span className="font-medium">
                {filteredPagamentos.length} pagamentos
              </span>
            </div>
          )}
        </div>

        {/* Conteúdo principal */}
        <div className="bg-white shadow-lg rounded-2xl overflow-hidden border border-gray-200">
          {loading ? (
            <LoadingSpinner />
          ) : currentItems.length === 0 ? (
            <div className="p-16 text-center">
              <div className="flex flex-col items-center space-y-4">
                <div className="p-4 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full">
                  <FiBarChart className="h-16 w-16 text-gray-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {searchTerm || hasActiveFilters
                      ? "Nenhum pagamento encontrado"
                      : "Nenhum pagamento registrado"}
                  </h3>
                  <p className="text-gray-600">
                    {searchTerm || hasActiveFilters
                      ? "Tente ajustar os filtros para encontrar mais resultados."
                      : "Ainda não há pagamentos registrados no sistema."}
                  </p>
                </div>
                {hasActiveFilters && (
                  <button
                    onClick={limparFiltros}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium shadow-md hover:bg-blue-700 transition-colors duration-200"
                  >
                    <FiX className="h-4 w-4" />
                    <span>Limpar Filtros</span>
                  </button>
                )}
              </div>
            </div>
          ) : viewMode === "cards" ? (
            // Vista de Cards otimizada
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentItems.map((pagamento) => (
                  <PaymentCard
                    key={pagamento._id}
                    pagamento={pagamento}
                    isExpanded={expandedPayment === pagamento._id}
                    onExpand={() => handleExpandPayment(pagamento._id)}
                    onDownload={() => handleDownloadRecibo(pagamento._id)}
                    formatCurrency={formatCurrency}
                    formatDate={formatDate}
                    getMeioPagamentoIcon={getMeioPagamentoIcon}
                  />
                ))}
              </div>
            </div>
          ) : (
            // Vista de Tabela otimizada
            <div className="overflow-hidden">
              {/* Header da tabela */}
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-gray-900">
                    Tabela de Pagamentos
                  </h3>
                  <div className="flex items-center space-x-3">
                    {/* Seleção em massa */}
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={
                          currentItems.length > 0 &&
                          currentItems.every((p) =>
                            selectedPayments.includes(p._id),
                          )
                        }
                        onChange={() => {
                          if (
                            currentItems.every((p) =>
                              selectedPayments.includes(p._id),
                            )
                          ) {
                            setSelectedPayments([]);
                          } else {
                            setSelectedPayments(currentItems.map((p) => p._id));
                          }
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label className="text-sm font-medium text-gray-700">
                        Selecionar todos
                      </label>
                    </div>

                    {/* Ações em lote */}                      {selectedPayments.length > 0 && (
                      <button
                        onClick={() => handleBulkDownload(selectedPayments)}
                        className="flex items-center space-x-2 px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                      >
                        <FiDownload className="h-4 w-4" />
                        <span>Baixar {selectedPayments.length} Recibos</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Tabela */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <span className="sr-only">Seleção</span>
                      </th>
                      <th
                        className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort("medicoNome")}
                      >
                        <div className="flex items-center space-x-1">
                          <FiUser className="h-3 w-3" />
                          <span>Médico</span>
                          {sortField === "medicoNome" &&
                            (sortDirection === "asc" ? (
                              <FiChevronUp className="h-3 w-3" />
                            ) : (
                              <FiChevronDown className="h-3 w-3" />
                            ))}
                        </div>
                      </th>
                      <th
                        className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort("dataPagamento")}
                      >
                        <div className="flex items-center space-x-1">
                          <FiCalendar className="h-3 w-3" />
                          <span>Data</span>
                          {sortField === "dataPagamento" &&
                            (sortDirection === "asc" ? (
                              <FiChevronUp className="h-3 w-3" />
                            ) : (
                              <FiChevronDown className="h-3 w-3" />
                            ))}
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        <div className="flex items-center space-x-1">
                          <FiArrowDown className="h-3 w-3" />
                          <span>Desconto</span>
                        </div>
                      </th>
                      <th
                        className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort("valorFinal")}
                      >
                        <div className="flex items-center space-x-1">
                          <FiCheckCircle className="h-3 w-3" />
                          <span>Valor Final</span>
                          {sortField === "valorFinal" &&
                            (sortDirection === "asc" ? (
                              <FiChevronUp className="h-3 w-3" />
                            ) : (
                              <FiChevronDown className="h-3 w-3" />
                            ))}
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        <div className="flex items-center space-x-1">
                          <FiCreditCard className="h-3 w-3" />
                          <span>Pagamento</span>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        <div className="flex items-center space-x-1">
                          <FiFileText className="h-3 w-3" />
                          <span>Laudos</span>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        <span>Ações</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentItems.map((pagamento, index) => (
                      <TableRow
                        key={pagamento._id}
                        pagamento={pagamento}
                        index={index}
                        isSelected={selectedPayments.includes(pagamento._id)}
                        isExpanded={expandedPayment === pagamento._id}
                        onToggleSelect={() => {
                          if (selectedPayments.includes(pagamento._id)) {
                            setSelectedPayments((prev) =>
                              prev.filter((id) => id !== pagamento._id),
                            );
                          } else {
                            setSelectedPayments((prev) => [
                              ...prev,
                              pagamento._id,
                            ]);
                          }
                        }}
                        onExpand={() => handleExpandPayment(pagamento._id)}
                        onDownload={() => handleDownloadRecibo(pagamento._id)}
                        formatCurrency={formatCurrency}
                        formatDate={formatDate}
                        formatDateTime={formatDateTime}
                        getMeioPagamentoIcon={getMeioPagamentoIcon}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginação */}
              {totalPages > 1 && (
                <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Mostrando {indexOfFirstItem + 1} a{" "}
                      {Math.min(indexOfLastItem, filteredPagamentos.length)} de{" "}
                      {filteredPagamentos.length} resultados
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() =>
                          setCurrentPage((prev) => Math.max(prev - 1, 1))
                        }
                        disabled={currentPage === 1}
                        className="px-3 py-1 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                      >
                        Anterior
                      </button>

                      <span className="px-3 py-1 text-sm font-medium text-gray-700">
                        {currentPage} de {totalPages}
                      </span>

                      <button
                        onClick={() =>
                          setCurrentPage((prev) =>
                            Math.min(prev + 1, totalPages),
                          )
                        }
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                      >
                        Próximo
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
