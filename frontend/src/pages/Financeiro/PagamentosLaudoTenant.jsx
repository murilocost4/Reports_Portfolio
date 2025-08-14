import React, { useState, useEffect, useMemo, useCallback, memo } from "react";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../api";
import InputDataBrasileira from "../../components/InputDataBrasileira";
import { toast } from "react-hot-toast";
import {
  FiDollarSign,
  FiUser,
  FiFileText,
  FiClock,
  FiCheckCircle,
  FiTrendingUp,
  FiFilter,
  FiRefreshCw,
  FiX,
  FiDownload,
  FiCalendar,
  FiCreditCard,
  FiInfo,
  FiSave,
  FiAlertCircle,
  FiSearch,
  FiEye,
  FiEdit3,
  FiTrash2,
  FiPlus,
  FiActivity,
  FiTarget,
  FiBarChart,
  FiPieChart,
  FiArrowUp,
  FiArrowDown,
  FiLayers,
  FiStar,
  FiAward,
  FiZap,
  FiShield,
  FiChevronDown,
  FiChevronUp,
  FiCheckSquare,
  FiUsers,
  FiSettings,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";

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
      Carregando laudos...
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

// Componente de linha da tabela otimizado
const TableRow = memo(
  ({
    laudo,
    index,
    isSelected,
    canSelect,
    onToggleSelect,
    onOpenDetails,
    onDownloadRecibo,
    formatCurrency,
    formatDate,
    medicos,
  }) => {
    const medicoNome =
      laudo.medicoNome ||
      medicos.find(
        (m) =>
          m._id ===
          (laudo.medicoId ||
            laudo.medicoResponsavelId?._id ||
            laudo.medicoResponsavelId),
      )?.nome ||
      "N/A";

    const valorExibir = laudo.pagamentoRegistrado
      ? (parseFloat(laudo.valorPago) || 0)  // Para laudos pagos, sempre usar valorPago
      : (parseFloat(laudo.valorConfigurado) || parseFloat(laudo.valorPago) || 0); // Para pendentes, usar valorConfigurado atual

    return (
      <tr
        className={`hover:bg-emerald-50 transition-colors duration-150 ${
          laudo.pagamentoRegistrado
            ? "bg-emerald-50"
            : !canSelect
              ? "bg-gray-50 opacity-50"
              : isSelected
                ? "bg-emerald-50 border-l-4 border-emerald-500"
                : index % 2 === 0
                  ? "bg-white"
                  : "bg-gray-25"
        }`}
      >
        <td className="px-4 py-3 whitespace-nowrap">
          {!laudo.pagamentoRegistrado && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onToggleSelect}
              disabled={!canSelect}
              className={`h-4 w-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 ${!canSelect ? "opacity-50 cursor-not-allowed" : ""}`}
            />
          )}
          {laudo.pagamentoRegistrado && (
            <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-emerald-100">
              <FiCheckCircle className="h-5 w-5 text-emerald-600" />
            </span>
          )}
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-xl">
              <FiCalendar className="h-4 w-4 text-blue-600" />
            </div>
            <div className="text-sm font-medium text-gray-900">
              {formatDate(laudo.dataAssinatura)}
            </div>
          </div>
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 rounded-full bg-gradient-to-r from-emerald-600 to-green-600 flex items-center justify-center">
              <FiUser className="h-4 w-4 text-white" />
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">
                {medicoNome}
              </div>
              <div className="text-xs text-gray-500">Médico responsável</div>
            </div>
          </div>
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-medium">
          {laudo.exame?.paciente?.nome || laudo.pacienteNome || "N/A"}
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
          {laudo.exame?.tipoExame?.nome || laudo.tipoExameNome || "N/A"}
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="flex flex-col">
            <span
              className={`text-lg font-bold ${valorExibir > 0 ? "text-emerald-600" : "text-red-500"}`}
            >
              {formatCurrency(valorExibir)}
            </span>
            {valorExibir <= 0 && (
              <span className="text-xs text-red-500">
                Sem valor configurado
              </span>
            )}
          </div>
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="flex flex-col">
            <span
              className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                laudo.pagamentoRegistrado
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {laudo.pagamentoRegistrado ? "Pago" : "Pendente"}
            </span>
            {laudo.pagamentoRegistrado && laudo.dataPagamento && (
              <div className="text-xs text-gray-500 mt-1">
                {formatDate(laudo.dataPagamento)}
              </div>
            )}
          </div>
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-center">
          <div className="flex items-center justify-center space-x-1">
            <button
              onClick={onOpenDetails}
              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg transition-colors duration-150"
              title="Ver detalhes"
            >
              <FiEye className="h-4 w-4" />
            </button>
            {laudo.pagamentoRegistrado && (
              <button
                onClick={onDownloadRecibo}
                className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100 rounded-lg transition-colors duration-150"
                title="Baixar recibo"
              >
                <FiDownload className="h-4 w-4" />
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  },
);

// Componente Card de Laudo otimizado
const LaudoCard = memo(
  ({
    laudo,
    isSelected,
    canSelect,
    onToggleSelect,
    onOpenDetails,
    onDownloadRecibo,
    formatCurrency,
    formatDate,
    medicos,
  }) => {
    const medicoNome =
      laudo.medicoNome ||
      medicos.find(
        (m) =>
          m._id ===
          (laudo.medicoId ||
            laudo.medicoResponsavelId?._id ||
            laudo.medicoResponsavelId),
      )?.nome ||
      "N/A";

    const valorExibir = laudo.pagamentoRegistrado
      ? (parseFloat(laudo.valorPago) || 0)  // Para laudos pagos, sempre usar valorPago
      : (parseFloat(laudo.valorConfigurado) || parseFloat(laudo.valorPago) || 0); // Para pendentes, usar valorConfigurado atual

    return (
      <div
        className={`bg-white rounded-xl shadow-md border transition-all duration-200 hover:shadow-lg ${
          laudo.pagamentoRegistrado
            ? "border-emerald-200 bg-emerald-50"
            : !canSelect
              ? "border-gray-200 opacity-50"
              : isSelected
                ? "border-emerald-300 bg-emerald-50 ring-2 ring-emerald-200"
                : "border-gray-200 hover:border-gray-300"
        }`}
      >
        <div className="p-4">
          {/* Header do Card */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              {!laudo.pagamentoRegistrado && (
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={onToggleSelect}
                  disabled={!canSelect}
                  className={`h-4 w-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 ${!canSelect ? "opacity-50 cursor-not-allowed" : ""}`}
                />
              )}
              <span
                className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  laudo.pagamentoRegistrado
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {laudo.pagamentoRegistrado ? "Pago" : "Pendente"}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={onOpenDetails}
                className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors"
                title="Ver detalhes"
              >
                <FiEye className="h-4 w-4" />
              </button>
              {laudo.pagamentoRegistrado && (
                <button
                  onClick={onDownloadRecibo}
                  className="p-2 text-emerald-600 hover:text-emerald-900 hover:bg-emerald-50 rounded-lg transition-colors"
                  title="Baixar recibo"
                >
                  <FiDownload className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Conteúdo do Card */}
          <div className="space-y-2">
            <div>
              <p className="text-xs text-gray-600">Médico</p>
              <p className="font-semibold text-gray-900">{medicoNome}</p>
            </div>

            <div>
              <p className="text-xs text-gray-600">Paciente</p>
              <p className="font-medium text-gray-900">
                {laudo.exame?.paciente?.nome || laudo.pacienteNome || "N/A"}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-600">Tipo de Exame</p>
              <p className="font-medium text-gray-900">
                {laudo.exame?.tipoExame?.nome || laudo.tipoExameNome || "N/A"}
              </p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-200">
              <div>
                <p className="text-xs text-gray-600">Valor</p>
                <p
                  className={`text-lg font-bold ${valorExibir > 0 ? "text-gray-900" : "text-red-500"}`}
                >
                  {formatCurrency(valorExibir)}
                </p>
              </div>

              <div className="text-right">
                <p className="text-xs text-gray-600">Data</p>
                <p className="text-sm font-medium text-gray-900">
                  {formatDate(laudo.dataAssinatura)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  },
);

export default function PagamentosLaudoTenant() {
  const { usuario } = useAuth();

  // Helper function to safely extract tenant_id
  const extractTenantId = (tenantData) => {
    if (!tenantData) {
      return null;
    }

    // Se for array
    if (Array.isArray(tenantData)) {
      if (tenantData.length === 0) return null;
      
      const firstItem = tenantData[0];
      
      if (typeof firstItem === 'object' && firstItem !== null) {
        const id = firstItem._id || firstItem.id;
        if (id) {
          return String(id);
        }
        // Se não encontrar _id nem id, retorna null
        return null;
      }
      return String(firstItem);
    }

    // Se for objeto
    if (typeof tenantData === 'object' && tenantData !== null) {
      const id = tenantData._id || tenantData.id;
      if (id) {
        return String(id);
      }
      // Se não encontrar _id nem id, retorna null
      return null;
    }

    // Se for string ou outro tipo primitivo
    return String(tenantData);
  };

  // Extract tenant_id properly
  const tenant_id = extractTenantId(usuario?.tenant_id);

  const [laudos, setLaudos] = useState([]);
  const [medicos, setMedicos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("table"); // 'table' ou 'cards'

  const [filtros, setFiltros] = useState({
    medicoId: "",
    status: "",
    dataInicio: "",
    dataFim: "",
    valorMinimo: "",
    valorMaximo: "",
  });

  const [selectedLaudos, setSelectedLaudos] = useState([]);
  const [totalSelecionado, setTotalSelecionado] = useState(0);
  const [modalPagamento, setModalPagamento] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [formPagamento, setFormPagamento] = useState({
    valorTotal: 0,
    desconto: 0,
    valorFinal: 0,
    meioPagamento: "pix",
    observacoes: "",
  });

  // Estado para médico selecionado
  const [medicoSelecionadoPagamento, setMedicoSelecionadoPagamento] =
    useState(null);

  // Estados para modal de detalhes
  const [modalDetalhes, setModalDetalhes] = useState(false);
  const [laudoSelecionado, setLaudoSelecionado] = useState(null);

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15; // Aumentado para melhor performance

  // Debounce search term
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Memoized filtering with debounced search
  const filteredLaudos = useMemo(() => {
    return laudos.filter((laudo) => {
      if (!debouncedSearchTerm) return true;

      const searchLower = debouncedSearchTerm.toLowerCase();
      const medicoNome = (laudo.medicoNome || "").toLowerCase();
      const pacienteNome = (
        laudo.pacienteNome ||
        laudo.exame?.paciente?.nome ||
        ""
      ).toLowerCase();
      const tipoExame = (
        laudo.tipoExameNome ||
        laudo.exame?.tipoExame?.nome ||
        ""
      ).toLowerCase();

      return (
        medicoNome.includes(searchLower) ||
        pacienteNome.includes(searchLower) ||
        tipoExame.includes(searchLower)
      );
    });
  }, [laudos, debouncedSearchTerm]);

  // Memoized pagination
  const { currentItems, totalPages, indexOfFirstItem, indexOfLastItem } =
    useMemo(() => {
      const indexOfLastItem = currentPage * itemsPerPage;
      const indexOfFirstItem = indexOfLastItem - itemsPerPage;
      const currentItems = filteredLaudos.slice(
        indexOfFirstItem,
        indexOfLastItem,
      );
      const totalPages = Math.ceil(filteredLaudos.length / itemsPerPage);

      return {
        currentItems,
        totalPages,
        indexOfFirstItem,
        indexOfLastItem,
      };
    }, [filteredLaudos, currentPage, itemsPerPage]);

  // Memoized statistics
  const stats = useMemo(() => {
    const laudosPendentes = filteredLaudos.filter(
      (l) => !l.pagamentoRegistrado,
    );
    const laudosPagos = filteredLaudos.filter((l) => l.pagamentoRegistrado);

    const totalPendente = laudosPendentes.reduce((sum, l) => {
      const valor =
        parseFloat(l.valorConfigurado) || parseFloat(l.valorPago) || 0;
      return sum + valor;
    }, 0);

    const totalPago = laudosPagos.reduce((sum, l) => {
      const valor =
        parseFloat(l.valorPago) || parseFloat(l.valorConfigurado) || 0;
      return sum + valor;
    }, 0);

    return {
      total: filteredLaudos.length,
      pendentes: laudosPendentes.length,
      pagos: laudosPagos.length,
      selecionados: selectedLaudos.length,
      totalPendente,
      totalPago,
      totalSelecionado,
    };
  }, [filteredLaudos, selectedLaudos, totalSelecionado]);

  // Update selected total whenever selected laudos change
  useEffect(() => {
    if (selectedLaudos.length > 0) {
      const total = laudos
        .filter((laudo) => selectedLaudos.includes(laudo._id))
        .reduce((sum, laudo) => {
          // Para laudos pagos usar valorPago, para pendentes usar valorConfigurado
          const valor = laudo.pagamentoRegistrado
            ? (parseFloat(laudo.valorPago) || 0)
            : (parseFloat(laudo.valorConfigurado) || parseFloat(laudo.valorPago) || 0);
          return sum + valor;
        }, 0);

      setTotalSelecionado(total);
      setFormPagamento((prev) => ({
        ...prev,
        valorTotal: total,
        valorFinal: Math.max(0, total - (prev.desconto || 0)),
      }));
    } else {
      setTotalSelecionado(0);
      setFormPagamento((prev) => ({
        ...prev,
        valorTotal: 0,
        valorFinal: 0,
      }));
    }
  }, [selectedLaudos, laudos]);

  // Update valorFinal when discount changes
  useEffect(() => {
    const valorFinal = Math.max(
      0,
      (formPagamento.valorTotal || 0) - (formPagamento.desconto || 0),
    );
    setFormPagamento((prev) => ({
      ...prev,
      valorFinal: valorFinal,
    }));
  }, [formPagamento.valorTotal, formPagamento.desconto]);

  // Callback functions
  const fetchMedicos = useCallback(async () => {
    try {
      const effectiveTenantId = extractTenantId(usuario?.tenant_id);
      
      if (!effectiveTenantId) {
        console.error('No valid tenant_id found for medicos');
        toast.error("ID da empresa não encontrado");
        return;
      }

      const response = await api.get("/usuarios/medicos", {
        params: {
          tenant_id: String(effectiveTenantId), // Garantir que seja string
        },
      });
      setMedicos(response.data.usuarios || []);
    } catch (err) {
      console.error('Error in fetchMedicos:', err);
      toast.error("Erro ao carregar médicos");
    }
  }, [usuario?.tenant_id]);

  const fetchLaudos = useCallback(async () => {
    setLoading(true);
    try {
      const effectiveTenantId = extractTenantId(usuario?.tenant_id);
      
      if (!effectiveTenantId) {
        console.error('No valid tenant_id found');
        toast.error("ID da empresa não encontrado");
        setLaudos([]);
        return;
      }

      const params = new URLSearchParams({
        medicoId: filtros.medicoId || "",
        status: filtros.status || "",
        dataInicio: filtros.dataInicio || "",
        dataFim: filtros.dataFim || "",
        tenantId: String(effectiveTenantId), // Garantir que seja string
      });

      const response = await api.get(`/financeiro/laudos-medico?${params}`);

      if (Array.isArray(response.data)) {
        setLaudos(response.data);
      } else {
        setLaudos([]);
        toast.error("Formato de resposta inválido da API");
      }
    } catch (err) {
      console.error('Error in fetchLaudos:', err);
      toast.error("Erro ao carregar laudos");
      setLaudos([]);
    } finally {
      setLoading(false);
    }
  }, [filtros, usuario?.tenant_id]);

  // Verificar se o laudo pode ser selecionado
  const podeSerSelecionado = useCallback(
    (laudo) => {
      if (laudo.pagamentoRegistrado) return false;

      if (selectedLaudos.length === 0) return true;

      if (medicoSelecionadoPagamento) {
        const laudoMedicoId =
          laudo.medicoId ||
          laudo.medicoResponsavelId?._id ||
          laudo.medicoResponsavelId;
        return laudoMedicoId === medicoSelecionadoPagamento;
      }

      return true;
    },
    [selectedLaudos.length, medicoSelecionadoPagamento],
  );

  // Controlar seleção de laudos
  const handleSelectLaudo = useCallback(
    (id) => {
      const laudo = laudos.find((l) => l._id === id);

      if (!laudo || !podeSerSelecionado(laudo)) {
        if (laudo && laudo.pagamentoRegistrado) {
          toast.error("Este laudo já foi pago");
        } else {
          toast.error("Só é possível selecionar laudos do mesmo médico");
        }
        return;
      }

      setSelectedLaudos((prevSelected) => {
        if (prevSelected.includes(id)) {
          const newSelected = prevSelected.filter(
            (selectedId) => selectedId !== id,
          );
          if (newSelected.length === 0) {
            setMedicoSelecionadoPagamento(null);
          }
          return newSelected;
        } else {
          const laudoMedicoId =
            laudo.medicoId ||
            laudo.medicoResponsavelId?._id ||
            laudo.medicoResponsavelId;
          if (!medicoSelecionadoPagamento) {
            setMedicoSelecionadoPagamento(laudoMedicoId);
          }
          return [...prevSelected, id];
        }
      });
    },
    [laudos, podeSerSelecionado, medicoSelecionadoPagamento],
  );

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

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFiltros((prev) => ({
      ...prev,
      [name]: value,
    }));
    setCurrentPage(1); // Reset para primeira página ao filtrar
  }, []);

  const limparFiltros = useCallback(() => {
    setFiltros({
      medicoId: "",
      status: "",
      dataInicio: "",
      dataFim: "",
      valorMinimo: "",
      valorMaximo: "",
    });
    setSearchTerm("");
  }, []);

  const openDetalhesModal = useCallback((laudo) => {
    setLaudoSelecionado(laudo);
    setModalDetalhes(true);
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

  useEffect(() => {
    fetchMedicos();
  }, [fetchMedicos]);

  useEffect(() => {
    fetchLaudos();
  }, [fetchLaudos]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, filtros]);

  const hasActiveFilters = Object.values(filtros).some((v) => v) || searchTerm;

  const statsConfig = useMemo(
    () => [
      {
        title: "Total de Laudos",
        value: stats.total.toLocaleString("pt-BR"),
        icon: FiTarget,
        gradient: "from-blue-600 to-blue-800",
        subtitle: "Base de cálculo",
      },
      {
        title: "Valor Bruto Total",
        value: formatCurrency(stats.totalPendente + stats.totalPago),
        icon: FiDollarSign,
        gradient: "from-purple-600 to-purple-700",
        subtitle: "Soma de todos os laudos",
      },
      {
        title: "Pendentes",
        value: stats.pendentes.toLocaleString("pt-BR"),
        icon: FiClock,
        gradient: "from-amber-600 to-amber-700",
        subtitle: formatCurrency(stats.totalPendente),
      },
      {
        title: "Pagos",
        value: stats.pagos.toLocaleString("pt-BR"),
        icon: FiCheckCircle,
        gradient: "from-emerald-600 to-emerald-700",
        subtitle: formatCurrency(stats.totalPago),
      },
      {
        title: "Selecionados",
        value: stats.selecionados.toLocaleString("pt-BR"),
        icon: FiTrendingUp,
        gradient: "from-blue-600 to-blue-700",
        subtitle: formatCurrency(stats.totalSelecionado),
      },
    ],
    [stats, formatCurrency],
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Cabeçalho Moderno */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-r from-emerald-600 to-emerald-800 rounded-xl shadow-lg">
                <FiDollarSign className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Pagamentos de Laudos
                </h1>
                <p className="text-gray-600 mt-1">
                  Gerencie os pagamentos dos laudos médicos
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
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

        {/* Botões de Ação Modernizados */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            {/* Botões de controle */}
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-3 px-6 py-3 rounded-xl font-semibold shadow-lg transition-all duration-200 transform hover:scale-105 ${
                  showFilters
                    ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white"
                    : "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 hover:from-gray-200 hover:to-gray-300"
                } w-full sm:w-auto`}
              >
                <FiFilter className="h-5 w-5" />
                <span>Filtros</span>
                {hasActiveFilters && (
                  <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    !
                  </span>
                )}
              </button>

              <button
                onClick={fetchLaudos}
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
                    <span>Atualizando...</span>
                  </>
                ) : (
                  <>
                    <FiRefreshCw className="h-5 w-5" />
                    <span>Atualizar</span>
                  </>
                )}
              </button>
            </div>

            {/* Botão de processar pagamento */}
            {selectedLaudos.length > 0 && (
              <div className="flex items-center gap-4 w-full lg:w-auto">
                <div className="hidden lg:flex items-center gap-2 text-sm text-gray-600">
                  <div className="p-1 bg-emerald-100 rounded">
                    <FiCheckCircle className="h-3 w-3 text-emerald-600" />
                  </div>
                  <span>{selectedLaudos.length} selecionado(s)</span>
                </div>
                <button
                  onClick={() => setModalPagamento(true)}
                  className="flex items-center gap-3 px-6 py-3 rounded-xl bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold shadow-lg transition-all duration-200 transform hover:scale-105 hover:from-green-600 hover:to-green-700 hover:shadow-xl w-full lg:w-auto"
                >
                  <FiDollarSign className="h-5 w-5" />
                  <span>Processar Pagamento</span>
                  <div className="bg-white bg-opacity-20 px-2 py-1 rounded-full text-xs font-bold">
                    {formatCurrency(totalSelecionado)}
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Informações do Médico Selecionado */}
        {medicoSelecionadoPagamento && (
          <div className="bg-white rounded-2xl p-6 shadow-md border border-emerald-200 bg-gradient-to-r from-emerald-50 to-emerald-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-xl shadow-lg">
                  <FiUser className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-emerald-800 mb-1">
                    Médico selecionado para pagamento
                  </h3>
                  <p className="text-2xl font-bold text-gray-900">
                    Dr(a).{" "}
                    {medicos.find((m) => m._id === medicoSelecionadoPagamento)
                      ?.nome || "Carregando..."}
                  </p>
                  <div className="flex items-center space-x-4 mt-2">
                    <span className="text-sm text-emerald-700 flex items-center bg-emerald-200 px-3 py-1 rounded-full font-medium">
                      <FiFileText className="h-4 w-4 mr-2" />
                      {selectedLaudos.length} laudo(s)
                    </span>
                    <span className="text-sm font-bold text-gray-900 bg-white px-3 py-1 rounded-full shadow-sm">
                      {formatCurrency(totalSelecionado)}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedLaudos([]);
                  setMedicoSelecionadoPagamento(null);
                }}
                className="flex items-center gap-2 px-4 py-3 text-emerald-700 hover:text-emerald-900 hover:bg-white rounded-xl transition-all font-semibold shadow-sm hover:shadow-md"
              >
                <FiX className="h-5 w-5" />
                <span>Limpar</span>
              </button>
            </div>
          </div>
        )}

        {/* Filtros */}
        {showFilters && (
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg">
                  <FiFilter className="h-5 w-5 text-white" />
                </div>
                Filtros de Busca
              </h2>
              <div className="flex items-center gap-3">
                {hasActiveFilters && (
                  <button
                    onClick={limparFiltros}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <FiRefreshCw className="h-4 w-4" />
                    Limpar
                  </button>
                )}
                <button
                  onClick={() => setShowFilters(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <FiX className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Barra de Pesquisa */}
            <div className="mb-6">
              <label className="block text-sm font-semibold mb-3 text-gray-700">
                Pesquisar
              </label>
              <div className="relative">
                <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Pesquisar por médico, paciente ou tipo de exame..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 text-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white shadow-sm transition-all duration-200"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
              <div>
                <label className="block text-sm font-semibold mb-3 text-gray-700">
                  Médico
                </label>
                <select
                  name="medicoId"
                  value={filtros.medicoId}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 text-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white shadow-sm transition-all duration-200"
                >
                  <option value="">Todos os médicos</option>
                  {medicos.map((medico) => (
                    <option key={medico._id} value={medico._id}>
                      {medico.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-3 text-gray-700">
                  Status
                </label>
                <select
                  name="status"
                  value={filtros.status}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 text-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white shadow-sm transition-all duration-200"
                >
                  <option value="">Todos</option>
                  <option value="pendente">Pendentes</option>
                  <option value="pago">Pagos</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-3 text-gray-700">
                  Data Inicial
                </label>
                <InputDataBrasileira
                  name="dataInicio"
                  value={filtros.dataInicio}
                  onChange={handleInputChange}
                  placeholder="dd/mm/aaaa"
                  className="w-full p-3 border border-gray-300 text-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white shadow-sm transition-all duration-200"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-3 text-gray-700">
                  Data Final
                </label>
                <InputDataBrasileira
                  name="dataFim"
                  value={filtros.dataFim}
                  onChange={handleInputChange}
                  placeholder="dd/mm/aaaa"
                  className="w-full p-3 border border-gray-300 text-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white shadow-sm transition-all duration-200"
                />
              </div>
            </div>
          </div>
        )}

        {/* Controles de visualização */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-semibold text-gray-700">
                Visualização:
              </span>
              <div className="flex items-center bg-gray-100 rounded-xl p-1 shadow-sm">
                <button
                  onClick={() => setViewMode("table")}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    viewMode === "table"
                      ? "bg-white text-gray-900 shadow-md"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <FiLayers className="h-4 w-4" />
                  <span>Tabela</span>
                </button>
                <button
                  onClick={() => setViewMode("cards")}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    viewMode === "cards"
                      ? "bg-white text-gray-900 shadow-md"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <FiEye className="h-4 w-4" />
                  <span>Cards</span>
                </button>
              </div>
            </div>

            {filteredLaudos.length > 0 && (
              <div className="flex items-center space-x-2 text-sm text-gray-600 bg-gray-100 px-4 py-2 rounded-xl">
                <FiFileText className="h-4 w-4 text-emerald-500" />
                <span className="font-semibold">
                  {filteredLaudos.length} laudos encontrados
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Conteúdo principal */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          {loading ? (
            <LoadingSpinner />
          ) : currentItems.length === 0 ? (
            /* Estado vazio modernizado */
            <div className="p-20 text-center">
              <div className="flex flex-col items-center space-y-6">
                <div className="relative">
                  <div className="p-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl shadow-lg">
                    <FiFileText className="h-20 w-20 text-gray-400" />
                  </div>
                  <div className="absolute -top-2 -right-2 p-2 bg-gradient-to-r from-amber-400 to-amber-500 rounded-full shadow-lg">
                    <FiSearch className="h-4 w-4 text-white" />
                  </div>
                </div>
                <div className="max-w-md">
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    {searchTerm || hasActiveFilters
                      ? "Nenhum laudo encontrado"
                      : "Nenhum laudo disponível"}
                  </h3>
                  <p className="text-gray-600 text-lg">
                    {searchTerm || hasActiveFilters
                      ? "Tente ajustar os filtros para encontrar mais resultados."
                      : "Ainda não há laudos disponíveis no sistema."}
                  </p>
                </div>
                {hasActiveFilters && (
                  <button
                    onClick={limparFiltros}
                    className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-semibold shadow-lg transition-all duration-200 transform hover:scale-105 hover:from-emerald-600 hover:to-emerald-700"
                  >
                    <FiRefreshCw className="h-5 w-5" />
                    <span>Limpar Filtros</span>
                  </button>
                )}
              </div>
            </div>
          ) : viewMode === "cards" ? (
            // Vista de Cards otimizada
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentItems.map((laudo) => (
                  <LaudoCard
                    key={laudo._id}
                    laudo={laudo}
                    isSelected={selectedLaudos.includes(laudo._id)}
                    canSelect={podeSerSelecionado(laudo)}
                    onToggleSelect={() => handleSelectLaudo(laudo._id)}
                    onOpenDetails={() => openDetalhesModal(laudo)}
                    onDownloadRecibo={() =>
                      handleDownloadRecibo(laudo.pagamentoId || laudo._id)
                    }
                    formatCurrency={formatCurrency}
                    formatDate={formatDate}
                    medicos={medicos}
                  />
                ))}
              </div>
            </div>
          ) : (
            // Vista de Tabela Modernizada
            <div className="overflow-hidden">
              {/* Header da tabela modernizado */}
              <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl shadow-lg">
                      <FiFileText className="h-5 w-5 text-white" />
                    </div>
                    Laudos para Pagamento
                  </h2>
                  {selectedLaudos.length > 0 && (
                    <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 border border-emerald-200 rounded-xl px-4 py-3 shadow-sm">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-lg shadow-md">
                          <FiDollarSign className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <span className="text-sm font-semibold text-emerald-800">
                            Total Selecionado:
                          </span>
                          <span className="text-xl font-bold text-emerald-900 ml-2">
                            {formatCurrency(totalSelecionado)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Tabela modernizada */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <FiCheckSquare className="h-4 w-4 text-emerald-500" />
                          Seleção
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <FiCalendar className="h-4 w-4 text-blue-500" />
                          Data
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <FiUser className="h-4 w-4 text-emerald-500" />
                          Médico
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <FiUsers className="h-4 w-4 text-purple-500" />
                          Paciente
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <FiFileText className="h-4 w-4 text-blue-500" />
                          Exame
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <FiDollarSign className="h-4 w-4 text-green-500" />
                          Valor
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <FiActivity className="h-4 w-4 text-amber-500" />
                          Status
                        </div>
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                        <div className="flex items-center justify-center gap-2">
                          <FiSettings className="h-4 w-4 text-gray-500" />
                          Ações
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentItems.map((laudo, index) => (
                      <TableRow
                        key={laudo._id}
                        laudo={laudo}
                        index={index}
                        isSelected={selectedLaudos.includes(laudo._id)}
                        canSelect={podeSerSelecionado(laudo)}
                        onToggleSelect={() => handleSelectLaudo(laudo._id)}
                        onOpenDetails={() => openDetalhesModal(laudo)}
                        onDownloadRecibo={() =>
                          handleDownloadRecibo(laudo.pagamentoId || laudo._id)
                        }
                        formatCurrency={formatCurrency}
                        formatDate={formatDate}
                        medicos={medicos}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginação Modernizada */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <div className="p-2 bg-white rounded-lg shadow-sm">
                        <FiFileText className="h-4 w-4 text-emerald-500" />
                      </div>
                      <span className="font-semibold">
                        Mostrando {indexOfFirstItem + 1} a{" "}
                        {Math.min(indexOfLastItem, filteredLaudos.length)} de{" "}
                        <span className="text-emerald-600 font-bold">
                          {filteredLaudos.length}
                        </span>{" "}
                        resultados
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() =>
                          setCurrentPage((prev) => Math.max(prev - 1, 1))
                        }
                        disabled={currentPage === 1}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm shadow-md transition-all duration-200 ${
                          currentPage === 1
                            ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                            : "bg-white text-gray-700 hover:bg-gradient-to-r hover:from-blue-600 hover:to-blue-700 hover:text-white hover:shadow-lg hover:-translate-y-0.5"
                        }`}
                      >
                        <FiChevronLeft className="h-4 w-4" />
                        <span className="hidden sm:inline">Anterior</span>
                      </button>

                      <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-md border border-gray-200">
                        <span className="text-sm font-semibold text-gray-600">
                          Página
                        </span>
                        <span className="px-2 py-1 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg text-sm font-bold">
                          {currentPage}
                        </span>
                        <span className="text-sm text-gray-400">de</span>
                        <span className="text-sm font-semibold text-gray-800">
                          {totalPages}
                        </span>
                      </div>

                      <button
                        onClick={() =>
                          setCurrentPage((prev) =>
                            Math.min(prev + 1, totalPages),
                          )
                        }
                        disabled={currentPage === totalPages}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm shadow-md transition-all duration-200 ${
                          currentPage === totalPages
                            ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                            : "bg-white text-gray-700 hover:bg-gradient-to-r hover:from-blue-600 hover:to-blue-700 hover:text-white hover:shadow-lg hover:-translate-y-0.5"
                        }`}
                      >
                        <span className="hidden sm:inline">Próximo</span>
                        <FiChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal de Pagamento - versão simplificada mantida */}
        {modalPagamento && (
          <div className="fixed inset-0 backdrop-blur-sm backdrop-brightness-50 rounded-2xl bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl">
              {/* Header do Modal - Fixo */}
              <div className="px-6 py-4 border-b rounded-t-2xl border-gray-200 bg-emerald-50 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 flex items-center justify-center">
                      <FiDollarSign className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">
                        Registrar Pagamento
                      </h2>
                      <p className="text-sm text-gray-600">
                        Configure os detalhes do pagamento
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setModalPagamento(false)}
                    className="p-2 hover:bg-white rounded-lg transition-colors"
                  >
                    <FiX className="h-5 w-5 text-gray-600" />
                  </button>
                </div>
              </div>

              {/* Conteúdo do Modal - Com Scroll */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Informações do médico */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center">
                      <FiUser className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-blue-800">
                        Médico Responsável
                      </label>
                      <div className="text-xl font-bold text-blue-900">
                        Dr(a).{" "}
                        {medicos.find(
                          (m) => m._id === medicoSelecionadoPagamento,
                        )?.nome || "Carregando..."}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Resumo dos laudos */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Resumo dos Laudos
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white rounded-lg p-4 text-center">
                      <p className="text-sm text-gray-600">Quantidade</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {selectedLaudos.length}
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-4 text-center">
                      <p className="text-sm text-gray-600">Valor Bruto</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(formPagamento.valorTotal || totalSelecionado)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Formulário simplificado */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Valor Total
                    </label>
                    <input
                      type="number"
                      name="valorTotal"
                      value={formPagamento.valorTotal || totalSelecionado || ""}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Desconto
                    </label>
                    <input
                      type="number"
                      name="desconto"
                      value={formPagamento.desconto || ""}
                      onChange={(e) =>
                        setFormPagamento((prev) => ({
                          ...prev,
                          desconto: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      step="0.01"
                      min="0"
                      max={formPagamento.valorTotal}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Valor Final
                    </label>
                    <div className="w-full border-2 border-green-200 rounded-lg px-3 py-2 bg-green-50">
                      <span className="text-xl font-bold text-green-700">
                        {formatCurrency(formPagamento.valorFinal || 0)}
                      </span>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Meio de Pagamento
                    </label>
                    <select
                      name="meioPagamento"
                      value={formPagamento.meioPagamento}
                      onChange={(e) =>
                        setFormPagamento((prev) => ({
                          ...prev,
                          meioPagamento: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="pix">PIX</option>
                      <option value="transferencia">
                        Transferência Bancária
                      </option>
                      <option value="dinheiro">Dinheiro</option>
                      <option value="cheque">Cheque</option>
                      <option value="cartao">Cartão</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Observações
                    </label>
                    <textarea
                      name="observacoes"
                      value={formPagamento.observacoes}
                      onChange={(e) =>
                        setFormPagamento((prev) => ({
                          ...prev,
                          observacoes: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                      rows="3"
                      placeholder="Adicione observações..."
                    ></textarea>
                  </div>
                </div>
              </div>

              {/* Footer do Modal - Fixo */}
              <div className="px-6 py-4 border-t rounded-b-2xl border-gray-200 bg-gray-50 flex-shrink-0">
                <div className="flex items-center justify-end space-x-3">
                  <button
                    onClick={() => setModalPagamento(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        setLoading(true);

                        const effectiveTenantId = extractTenantId(usuario?.tenant_id);
                        
                        if (!effectiveTenantId) {
                          toast.error("ID da empresa não encontrado");
                          return;
                        }

                        if (!selectedLaudos || selectedLaudos.length === 0) {
                          toast.error("Nenhum laudo selecionado");
                          return;
                        }

                        if (!medicoSelecionadoPagamento) {
                          toast.error("Nenhum médico selecionado");
                          return;
                        }

                        if (!formPagamento.valorFinal || formPagamento.valorFinal <= 0) {
                          toast.error("Valor final deve ser maior que zero");
                          return;
                        }

                        const payload = {
                          tenantId: String(effectiveTenantId),
                          laudoIds: selectedLaudos,
                          valorTotal: formPagamento.valorTotal,
                          desconto: formPagamento.desconto || 0,
                          meioPagamento: formPagamento.meioPagamento,
                          observacoes: formPagamento.observacoes || ""
                        };

                        const response = await api.post('/financeiro/pagamentos', payload);

                        if (response.data) {
                          toast.success("Pagamento registrado com sucesso!");
                          
                          // Limpar seleções
                          setSelectedLaudos([]);
                          setMedicoSelecionadoPagamento(null);
                          setTotalSelecionado(0);
                          
                          // Resetar formulário
                          setFormPagamento({
                            valorTotal: 0,
                            desconto: 0,
                            valorFinal: 0,
                            meioPagamento: "pix",
                            observacoes: "",
                          });
                          
                          // Fechar modal
                          setModalPagamento(false);
                          
                          // Recarregar laudos
                          await fetchLaudos();
                        }
                      } catch (error) {
                        console.error('Erro ao registrar pagamento:', error);
                        
                        if (error.response?.data?.erro) {
                          toast.error(error.response.data.erro);
                        } else if (error.response?.data?.laudosJaPagos) {
                          toast.error("Alguns laudos já estão pagos. Recarregue a página.");
                        } else {
                          toast.error("Erro ao registrar pagamento");
                        }
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading || formPagamento.valorFinal <= 0}
                    className={`flex items-center px-6 py-2 rounded-lg font-medium transition-all ${
                      loading || formPagamento.valorFinal <= 0
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-gradient-to-r from-emerald-600 to-green-600 text-white hover:from-emerald-700 hover:to-green-700 shadow-md"
                    }`}
                  >
                    <FiSave className="mr-2 h-4 w-4" />
                    Confirmar Pagamento
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Detalhes - versão simplificada */}
        {modalDetalhes && laudoSelecionado && (
          <div className="fixed inset-0 backdrop-blur-sm bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              {/* Header do Modal */}
              <div className="px-6 py-4 border-b border-gray-200 bg-blue-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center">
                      <FiFileText className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">
                        Detalhes do Laudo
                      </h2>
                      <p className="text-sm text-gray-600">
                        Informações completas
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setModalDetalhes(false)}
                    className="p-2 hover:bg-white rounded-lg transition-colors"
                  >
                    <FiX className="h-5 w-5 text-gray-600" />
                  </button>
                </div>
              </div>

              {/* Conteúdo simplificado */}
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Informações básicas */}
                  <div className="space-y-4">
                    <div className="bg-emerald-50 rounded-xl p-4">
                      <h3 className="text-lg font-bold text-emerald-800 mb-3">
                        Médico
                      </h3>
                      <p className="text-lg font-semibold text-emerald-900">
                        {laudoSelecionado.medicoNome ||
                          medicos.find(
                            (m) =>
                              m._id ===
                              (laudoSelecionado.medicoId ||
                                laudoSelecionado.medicoResponsavelId?._id),
                          )?.nome ||
                          "N/A"}
                      </p>
                    </div>

                    <div className="bg-blue-50 rounded-xl p-4">
                      <h3 className="text-lg font-bold text-blue-800 mb-3">
                        Paciente
                      </h3>
                      <p className="text-lg font-semibold text-blue-900">
                        {laudoSelecionado.exame?.paciente?.nome ||
                          laudoSelecionado.pacienteNome ||
                          "N/A"}
                      </p>
                    </div>

                    <div className="bg-purple-50 rounded-xl p-4">
                      <h3 className="text-lg font-bold text-purple-800 mb-3">
                        Exame
                      </h3>
                      <p className="text-lg font-semibold text-purple-900">
                        {laudoSelecionado.exame?.tipoExame?.nome ||
                          laudoSelecionado.tipoExameNome ||
                          "N/A"}
                      </p>
                      <p className="text-sm text-purple-800">
                        Data:{" "}
                        {formatDate(
                          laudoSelecionado.dataExame ||
                            laudoSelecionado.dataAssinatura,
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Informações financeiras */}
                  <div className="space-y-4">
                    <div className="bg-emerald-50 rounded-xl p-4">
                      <h3 className="text-lg font-bold text-emerald-800 mb-3">
                        Financeiras
                      </h3>
                      <div className="flex flex-col space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">
                            Valor Configurado:
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {formatCurrency(laudoSelecionado.valorConfigurado)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">
                            Valor Pago:
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {formatCurrency(laudoSelecionado.valorPago)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">
                            Data do Pagamento:
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {laudoSelecionado.dataPagamento
                              ? formatDate(laudoSelecionado.dataPagamento)
                              : "N/A"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-4">
                      <h3 className="text-lg font-bold text-gray-800 mb-3">
                        Técnicas
                      </h3>
                      <div className="flex flex-col space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">
                            ID do Laudo:
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {laudoSelecionado._id}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">
                            Data de Criação:
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {formatDateTime(laudoSelecionado.createdAt)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">
                            Última Atualização:
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {formatDateTime(laudoSelecionado.updatedAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Observações */}
                {laudoSelecionado.observacoes && (
                  <div className="bg-teal-50 rounded-xl p-4">
                    <h3 className="text-lg font-bold text-teal-800 mb-3">
                      Observações
                    </h3>
                    <p className="text-sm text-teal-800 bg-white p-4 rounded-lg border border-teal-100">
                      {laudoSelecionado.observacoes}
                    </p>
                  </div>
                )}
              </div>

              {/* Footer do Modal */}
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Laudo #{laudoSelecionado._id.slice(-8)}
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setModalDetalhes(false)}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
                    >
                      Fechar
                    </button>
                    {laudoSelecionado.pagamentoRegistrado && (
                      <button
                        onClick={() =>
                          handleDownloadRecibo(
                            laudoSelecionado.pagamentoId ||
                              laudoSelecionado._id,
                          )
                        }
                        className="flex items-center px-4 py-2 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-lg font-medium hover:from-emerald-700 hover:to-green-700 transition-all shadow-md"
                      >
                        <FiDownload className="mr-2 h-4 w-4" />
                        Baixar Recibo
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
