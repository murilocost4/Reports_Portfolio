import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import InputDataBrasileira from "../../components/InputDataBrasileira";
import { 
  FiCalendar, 
  FiSearch, 
  FiFilter, 
  FiCreditCard, 
  FiDownload, 
  FiRefreshCw,
  FiX,
  FiTarget,
  FiTrendingUp,
  FiArrowDown,
  FiDollarSign,
  FiUser,
  FiEye,
  FiChevronDown,
  FiChevronUp,
  FiBarChart
} from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api';
import { toast } from 'react-toastify';

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
const LoadingSpinner = memo(function LoadingSpinner() {
  return (
    <div className="flex flex-col justify-center items-center p-20">
      <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent"></div>
      <p className="text-gray-600 text-lg font-medium mt-4">
        Carregando meus pagamentos...
      </p>
    </div>
  );
});

// Componente de Card de Estatística otimizado
const StatCard = memo(function StatCard({ stat }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-200">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold text-gray-600 mb-1">
            {stat.title}
          </p>
          <p className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</p>
          <div className="flex items-center space-x-1">
            <div className={`p-0.5 bg-gradient-to-r ${stat.gradient} rounded-full`}>
              <stat.icon className="h-2.5 w-2.5 text-white" />
            </div>
            <span className="text-xs text-gray-500">{stat.subtitle}</span>
          </div>
        </div>
        <div className={`p-3 bg-gradient-to-r ${stat.gradient} rounded-xl shadow-md`}>
          <stat.icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );
});

const MeusPagamentos = () => {
  const { usuario } = useAuth();
  const [pagamentos, setPagamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({
    totalPagamentos: 0,
    valorTotal: 0,
    valorDescontos: 0,
    valorLiquido: 0
  });

  // Filtros
  const [filtros, setFiltros] = useState({
    dataInicio: '',
    dataFim: '',
    meioPagamento: ''
  });

  const [showFilters, setShowFilters] = useState(false);
  const itemsPerPage = 20;

  // Debounce search term
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const meiosPagamento = [
    { value: '', label: 'Todos os meios' },
    { value: 'pix', label: 'PIX' },
    { value: 'transferencia', label: 'Transferência bancária' },
    { value: 'dinheiro', label: 'Dinheiro' },
    { value: 'cheque', label: 'Cheque' },
    { value: 'cartao', label: 'Cartão' },
    { value: 'outros', label: 'Outros' }
  ];

  // Memoized filtering with debounced search
  const filteredPagamentos = useMemo(() => {
    return pagamentos.filter((pagamento) => {
      if (!debouncedSearchTerm) return true;

      const searchLower = debouncedSearchTerm.toLowerCase();
      return (
        pagamento.meioPagamento?.toLowerCase().includes(searchLower) ||
        pagamento.observacoes?.toLowerCase().includes(searchLower) ||
        pagamento._id?.toLowerCase().includes(searchLower)
      );
    });
  }, [pagamentos, debouncedSearchTerm]);

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredPagamentos.slice(indexOfFirstItem, indexOfLastItem);
  const totalPagesFiltered = Math.ceil(filteredPagamentos.length / itemsPerPage);

  // Check for active filters
  const hasActiveFilters = Object.values(filtros).some((v) => v) || searchTerm;

    const carregarPagamentos = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      // Verificar se o usuário está logado
      if (!usuario || (!usuario.id && !usuario._id)) {
        setError('Usuário não autenticado.');
        return;
      }

      const params = new URLSearchParams();

      // **CONTEXTO INDIVIDUAL**: Indica que é a página MeusPagamentos (individual)
      params.append('context', 'individual');

      // Para médicos, o backend automaticamente filtra pelos seus pagamentos
      // não precisamos enviar medicoId pois está no token JWT

      // Adicionar filtros se existirem
      Object.entries(filtros).forEach(([key, value]) => {
        if (value && value.trim() !== '') {
          params.append(key, value);
        }
      });

      // Adicionar paginação
      params.append('page', currentPage.toString());
      params.append('limit', '20');

      const response = await api.get(`/financeiro/pagamentos?${params.toString()}`);
      
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
          medicoNome: pagamento.medicoId?.nome || pagamento.medicoNome || 'N/A',
          tenantNome: pagamento.tenant_id?.nomeFantasia || pagamento.tenant_id?.nome || 'N/A',
          valorTotal: Number(pagamento.valorTotal) || 0,
          valorDesconto: Number(pagamento.valorDesconto) || 0,
          valorFinal: Number(pagamento.valorFinal) || 0,
          laudos: pagamento.laudos || [],
          laudosDetalhes: pagamento.laudosDetalhes || [],
        }));

        setPagamentos(pagamentosFormatados);
        setTotalPages(response.data.totalPages || 1);
        setTotal(response.data.total || 0);

        if (resumoData) {
          const statsData = {
            totalPagamentos: Number(resumoData.totalPagamentos) || 0,
            valorTotal: Number(resumoData.valorTotal) || 0,
            valorDescontos: Number(resumoData.valorDescontos) || 0,
            valorLiquido: Number(resumoData.valorLiquido) || 0,
          };
          setStats(statsData);
        } else {
          // Se não há resumo, calcular a partir dos dados carregados
          const calculatedStats = pagamentosFormatados.reduce((acc, pagamento) => ({
            totalPagamentos: acc.totalPagamentos + 1,
            valorTotal: acc.valorTotal + pagamento.valorTotal,
            valorDescontos: acc.valorDescontos + pagamento.valorDesconto,
            valorLiquido: acc.valorLiquido + pagamento.valorFinal,
          }), {
            totalPagamentos: 0,
            valorTotal: 0,
            valorDescontos: 0,
            valorLiquido: 0,
          });
          setStats(calculatedStats);
        }
      } else {
        setPagamentos([]);
        setStats({
          totalPagamentos: 0,
          valorTotal: 0,
          valorDescontos: 0,
          valorLiquido: 0,
        });
      }
    } catch (error) {
      console.error('Erro ao carregar pagamentos');
      if (error.response?.status === 403) {
        toast.error('Acesso negado. Verifique suas permissões.');
      } else {
        toast.error('Erro ao carregar os pagamentos.');
      }
      setError('Erro ao carregar os pagamentos. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [currentPage, filtros, usuario]);

  useEffect(() => {
    carregarPagamentos();
  }, [carregarPagamentos]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, filtros]);

  const handleFiltroChange = useCallback((campo, valor) => {
    setFiltros(prev => ({
      ...prev,
      [campo]: valor
    }));
    setCurrentPage(1);
  }, []);

  const limparFiltros = useCallback(() => {
    setFiltros({
      dataInicio: '',
      dataFim: '',
      meioPagamento: ''
    });
    setSearchTerm('');
    setCurrentPage(1);
  }, []);

  const formatarData = useCallback((data) => {
    if (!data) return 'N/A';
    return new Date(data).toLocaleDateString('pt-BR');
  }, []);

  const formatarMoeda = useCallback((valor) => {
    if (valor === null || valor === undefined) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  }, []);

  const getBadgeVariant = useCallback((meioPagamento) => {
    switch (meioPagamento) {
      case 'PIX': return { bg: 'bg-green-100', text: 'text-green-800' };
      case 'Transferência bancária': return { bg: 'bg-blue-100', text: 'text-blue-800' };
      case 'Dinheiro': return { bg: 'bg-yellow-100', text: 'text-yellow-800' };
      case 'Cartão':
      case 'Cartão de crédito':
      case 'Cartão de débito': return { bg: 'bg-purple-100', text: 'text-purple-800' };
      case 'Cheque': return { bg: 'bg-orange-100', text: 'text-orange-800' };
      default: return { bg: 'bg-gray-100', text: 'text-gray-800' };
    }
  }, []);

  const handleDownloadRecibo = useCallback(async (id) => {
    try {
      const response = await api.get(`/financeiro/recibo/${id}`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `recibo_${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Recibo baixado com sucesso!');
    } catch (err) {
      console.error('Erro ao baixar recibo');
      toast.error('Erro ao baixar recibo');
    }
  }, []);

  // Configuração dos cards de estatísticas
  const statsConfig = useMemo(() => [
    {
      title: "Total de Pagamentos",
      value: stats.totalPagamentos.toLocaleString("pt-BR"),
      icon: FiTarget,
      gradient: "from-blue-500 to-blue-600",
      subtitle: "Pagamentos recebidos",
    },
    {
      title: "Descontos",
      value: formatarMoeda(stats.valorDescontos),
      icon: FiArrowDown,
      gradient: "from-red-500 to-pink-500",
      subtitle: "Total em descontos",
    },
    {
      title: "Valor Líquido",
      value: formatarMoeda(stats.valorLiquido),
      icon: FiDollarSign,
      gradient: "from-emerald-500 to-emerald-600",
      subtitle: "Valor final recebido",
    },
  ], [stats, formatarMoeda]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-md">
                <FiCreditCard className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Meus Pagamentos
                </h1>
                <p className="text-gray-600 flex items-center space-x-2">
                  <FiUser className="h-4 w-4 text-gray-500" />
                  <span>Consulte seus pagamentos recebidos</span>
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-md ${
                  showFilters
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
                }`}
              >
                <FiFilter className="h-4 w-4" />
                <span>Filtros</span>
              </button>
              <button
                onClick={carregarPagamentos}
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium shadow-md hover:bg-blue-700 transition-all duration-200 disabled:opacity-50"
              >
                <FiRefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                <span>Atualizar</span>
              </button>
            </div>
          </div>

          {/* Cards de Estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            {statsConfig.map((stat, index) => (
              <StatCard key={index} stat={stat} />
            ))}
          </div>
        </div>

        {/* Filtros */}
        {showFilters && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 mb-6">
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
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Filtros de Data e Meio de Pagamento */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data Início
                </label>
                <InputDataBrasileira
                  value={filtros.dataInicio}
                  onChange={(e) => handleFiltroChange('dataInicio', e.target.value)}
                  placeholder="dd/mm/aaaa"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data Fim
                </label>
                <InputDataBrasileira
                  value={filtros.dataFim}
                  onChange={(e) => handleFiltroChange('dataFim', e.target.value)}
                  placeholder="dd/mm/aaaa"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Meio de Pagamento
                </label>
                <select
                  value={filtros.meioPagamento}
                  onChange={(e) => handleFiltroChange('meioPagamento', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {meiosPagamento.map((meio) => (
                    <option key={meio.value} value={meio.value}>
                      {meio.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Mensagem de erro */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FiX className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
              <div className="ml-auto pl-3">
                <button
                  onClick={() => setError('')}
                  className="text-red-400 hover:text-red-600"
                >
                  <FiX className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Conteúdo principal */}
        <div className="bg-white rounded-2xl shadow-md border border-white/50 overflow-hidden">
          {loading ? (
            <LoadingSpinner />
          ) : currentItems.length === 0 ? (
            /* Estado vazio */
            <div className="p-20 text-center">
              <div className="flex flex-col items-center space-y-6">
                <div className="relative">
                  <div className="p-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl shadow-lg">
                    <FiCreditCard className="h-20 w-20 text-gray-400" />
                  </div>
                  <div className="absolute -top-2 -right-2 p-2 bg-gradient-to-r from-blue-400 to-blue-500 rounded-full shadow-lg">
                    <FiSearch className="h-4 w-4 text-white" />
                  </div>
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {searchTerm || hasActiveFilters
                      ? "Nenhum pagamento encontrado"
                      : "Nenhum pagamento registrado"}
                  </h3>
                  <p className="text-gray-600 max-w-md mx-auto">
                    {searchTerm || hasActiveFilters
                      ? "Tente ajustar os filtros para encontrar mais resultados."
                      : "Ainda não há pagamentos registrados para você."}
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
          ) : (
            <div className="overflow-hidden">
              {/* Header da tabela */}
              <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg">
                      <FiCreditCard className="h-5 w-5 text-white" />
                    </div>
                    Meus Pagamentos
                  </h2>
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">{filteredPagamentos.length}</span> pagamentos encontrados
                  </div>
                </div>
              </div>

              {/* Tabela */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <FiCalendar className="h-4 w-4 text-blue-500" />
                          Data
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <FiUser className="h-4 w-4 text-gray-500" />
                          Empresa
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <FiArrowDown className="h-4 w-4 text-red-500" />
                          Desconto
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <FiDollarSign className="h-4 w-4 text-emerald-500" />
                          Valor Final
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <FiCreditCard className="h-4 w-4 text-purple-500" />
                          Pagamento
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <FiBarChart className="h-4 w-4 text-gray-500" />
                          Laudos
                        </div>
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentItems.map((pagamento, index) => (
                      <tr
                        key={pagamento._id}
                        className={`hover:bg-gray-50 transition-colors duration-150 ${
                          index % 2 === 0 ? "bg-white" : "bg-gray-25"
                        }`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-blue-100 rounded-xl">
                              <FiCalendar className="h-4 w-4 text-blue-600" />
                            </div>
                            <div className="text-sm font-medium text-gray-900">
                              {formatarData(pagamento.dataPagamento)}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-gray-100 rounded-xl">
                              <FiUser className="h-4 w-4 text-gray-600" />
                            </div>
                            <div className="text-sm font-medium text-gray-900">
                              {pagamento.tenantNome}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {pagamento.valorDesconto > 0 ? (
                            <div className="text-sm font-medium text-red-600">
                              -{formatarMoeda(pagamento.valorDesconto)}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-emerald-600">
                            {formatarMoeda(pagamento.valorFinal)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              getBadgeVariant(pagamento.meioPagamento).bg
                            } ${getBadgeVariant(pagamento.meioPagamento).text}`}
                          >
                            {pagamento.meioPagamento}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col space-y-1">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              {pagamento.laudos?.length || 0} laudo(s)
                            </span>
                            {pagamento.laudosDetalhes && pagamento.laudosDetalhes.length > 0 && (
                              <div className="space-y-1">
                                {pagamento.laudosDetalhes.slice(0, 2).map((laudo, idx) => (
                                  <div key={idx} className="text-xs text-gray-600">
                                    {laudo.pacienteNome} - {laudo.tipoExameNome}
                                  </div>
                                ))}
                                {pagamento.laudosDetalhes.length > 2 && (
                                  <div className="text-xs text-gray-500">
                                    +{pagamento.laudosDetalhes.length - 2} mais...
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              onClick={() => handleDownloadRecibo(pagamento._id)}
                              className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100 rounded-lg transition-colors duration-150"
                              title="Baixar Recibo"
                            >
                              <FiDownload className="h-4 w-4" />
                            </button>
                            {pagamento.observacoes && (
                              <button
                                className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors duration-150"
                                title={pagamento.observacoes}
                              >
                                <FiEye className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginação */}
              {totalPagesFiltered > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="text-sm text-gray-600">
                      Página {currentPage} de {totalPagesFiltered} • {filteredPagamentos.length} itens
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className={`px-3 py-1 rounded-md border ${
                          currentPage === 1
                            ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        Anterior
                      </button>
                      
                      {Array.from({ length: Math.min(5, totalPagesFiltered) }, (_, i) => {
                        const pageNum = currentPage <= 3
                          ? i + 1
                          : currentPage >= totalPagesFiltered - 2
                            ? totalPagesFiltered - 4 + i
                            : currentPage - 2 + i;

                        if (pageNum < 1 || pageNum > totalPagesFiltered) return null;

                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`px-3 py-1 rounded-md border ${
                              currentPage === pageNum
                                ? "bg-blue-600 text-white border-blue-600"
                                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}

                      <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPagesFiltered, p + 1))}
                        disabled={currentPage === totalPagesFiltered}
                        className={`px-3 py-1 rounded-md border ${
                          currentPage === totalPagesFiltered
                            ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        Próxima
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
};

export default MeusPagamentos;
