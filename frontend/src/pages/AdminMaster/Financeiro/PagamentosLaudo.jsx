import React, { useState, useEffect } from "react";
import api from "../../../api";
import { toast } from "react-toastify";
import InputDataBrasileira from "../../../components/InputDataBrasileira";
import {
  FiSearch,
  FiFilter,
  FiCalendar,
  FiX,
  FiDollarSign,
  FiFileText,
  FiUser,
  FiDownload,
  FiEye,
  FiChevronDown,
  FiRefreshCw,
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiTrendingUp,
  FiBarChart,
  FiCreditCard,
} from "react-icons/fi";
import { FaBuilding } from "react-icons/fa";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function PagamentosLaudo() {
  const [pagamentos, setPagamentos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtros, setFiltros] = useState({
    tenant: "",
    medico: "",
    dataInicio: "",
    dataFim: "",
    meioPagamento: "",
    valorMin: "",
    valorMax: "",
    buscarTexto: "",
    status: "",
    ordenacao: "-dataPagamento", // Campo para ordenação
  });
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [tenants, setTenants] = useState([]);
  const [medicos, setMedicos] = useState([]);
  const [estatisticas, setEstatisticas] = useState(null);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalItens, setTotalItens] = useState(0);

  useEffect(() => {
    fetchPagamentos();
    fetchSelects();
    fetchEstatisticas();
  }, [filtros, paginaAtual]);

  const fetchSelects = async () => {
    try {
      const [tenantsRes, medicosRes] = await Promise.all([
        api.get("/tenants"),
        api.get("/usuarios?role=medico&limit=200"),
      ]);

      setTenants(Array.isArray(tenantsRes.data) ? tenantsRes.data : []);
      setMedicos(
        Array.isArray(medicosRes.data?.usuarios)
          ? medicosRes.data.usuarios
          : [],
      );
    } catch (err) {
      console.error("Erro ao carregar dados para seleção:", err);
    }
  };

  const fetchEstatisticas = async () => {
    try {
      const response = await api.get("/financeiro/pagamentos/estatisticas");
      setEstatisticas(response.data);
    } catch (err) {
      console.error("Erro ao carregar estatísticas:", err);
    }
  };

  const fetchPagamentos = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: paginaAtual,
        limit: 20,
      });

      // Adicionar filtros
      Object.entries(filtros).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const response = await api.get(
        `/financeiro/pagamentos?${params.toString()}`,
      );
      setPagamentos(response.data.pagamentos || []);
      setTotalPaginas(response.data.totalPages || 1);
      setTotalItens(response.data.total || 0);
    } catch (err) {
      console.error("Erro ao carregar pagamentos:", err);
      toast.error("Erro ao carregar pagamentos");
    } finally {
      setLoading(false);
    }
  };

  const handleFiltroChange = (campo, valor) => {
    setFiltros((prev) => ({ ...prev, [campo]: valor }));
    setPaginaAtual(1);
  };

  const limparFiltros = () => {
    setFiltros({
      tenant: "",
      medico: "",
      dataInicio: "",
      dataFim: "",
      meioPagamento: "",
      valorMin: "",
      valorMax: "",
      buscarTexto: "",
      status: "",
      ordenacao: "-dataPagamento",
    });
    setPaginaAtual(1);
  };

  const aplicarFiltroRapido = (tipo) => {
    const hoje = new Date();
    let dataInicio = new Date();

    switch (tipo) {
      case "hoje":
        dataInicio = new Date();
        break;
      case "ontem":
        dataInicio = new Date();
        dataInicio.setDate(hoje.getDate() - 1);
        break;
      case "semana":
        dataInicio = new Date();
        dataInicio.setDate(hoje.getDate() - 7);
        break;
      case "mes":
        dataInicio = new Date();
        dataInicio.setMonth(hoje.getMonth() - 1);
        break;
      case "trimestre":
        dataInicio = new Date();
        dataInicio.setMonth(hoje.getMonth() - 3);
        break;
    }

    setFiltros((prev) => ({
      ...prev,
      dataInicio: dataInicio.toISOString().split("T")[0],
      dataFim: hoje.toISOString().split("T")[0],
    }));
    setPaginaAtual(1);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value || 0);
  };

  const formatDate = (date) => {
    if (!date) return "-";
    try {
      return format(parseISO(date), "dd/MM/yyyy HH:mm", { locale: ptBR });
    } catch {
      return "-";
    }
  };

  const exportarDados = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      Object.entries(filtros).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      params.append("export", "true");

      const response = await api.get(
        `/financeiro/pagamentos/export?${params.toString()}`,
        {
          responseType: "blob",
        },
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `pagamentos_${new Date().toISOString().split("T")[0]}.xlsx`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success("Dados exportados com sucesso!");
    } catch (err) {
      console.error("Erro ao exportar dados:", err);
      toast.error("Erro ao exportar dados");
    } finally {
      setLoading(false);
    }
  };

  if (loading && pagamentos.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">
              Monitoramento de Pagamentos
            </h1>
            <p className="text-slate-500 mt-1">
              Visualize todos os pagamentos realizados pelas empresas
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={exportarDados}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <FiDownload className="w-4 h-4" />
              Exportar
            </button>
            <button
              onClick={fetchPagamentos}
              className="flex items-center text-slate-800 gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <FiRefreshCw className="w-4 h-4" />
              Atualizar
            </button>
            <button
              onClick={() => setMostrarFiltros(!mostrarFiltros)}
              className={`flex items-center text-slate-800 gap-2 px-4 py-2 border rounded-lg transition-colors ${
                mostrarFiltros
                  ? "bg-blue-50 border-blue-200 text-blue-600"
                  : "bg-white border-slate-200 hover:bg-slate-50"
              }`}
            >
              <FiFilter className="w-4 h-4" />
              Filtros Avançados
              {Object.values(filtros).filter((v) => v && v !== "-dataPagamento")
                .length > 0 && (
                <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                  {
                    Object.values(filtros).filter(
                      (v) => v && v !== "-dataPagamento",
                    ).length
                  }
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Filtros Rápidos */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-slate-700">
              Filtros rápidos:
            </span>
            <button
              onClick={() => aplicarFiltroRapido("hoje")}
              className="px-3 py-1 text-xs font-medium bg-slate-100 text-slate-700 rounded-full hover:bg-slate-200 transition-colors"
            >
              Hoje
            </button>
            <button
              onClick={() => aplicarFiltroRapido("ontem")}
              className="px-3 py-1 text-xs font-medium bg-slate-100 text-slate-700 rounded-full hover:bg-slate-200 transition-colors"
            >
              Ontem
            </button>
            <button
              onClick={() => aplicarFiltroRapido("semana")}
              className="px-3 py-1 text-xs font-medium bg-slate-100 text-slate-700 rounded-full hover:bg-slate-200 transition-colors"
            >
              Última semana
            </button>
            <button
              onClick={() => aplicarFiltroRapido("mes")}
              className="px-3 py-1 text-xs font-medium bg-slate-100 text-slate-700 rounded-full hover:bg-slate-200 transition-colors"
            >
              Último mês
            </button>
            <button
              onClick={() => aplicarFiltroRapido("trimestre")}
              className="px-3 py-1 text-xs font-medium bg-slate-100 text-slate-700 rounded-full hover:bg-slate-200 transition-colors"
            >
              Último trimestre
            </button>
            <div className="flex-1" />
            {Object.values(filtros).filter((v) => v && v !== "-dataPagamento")
              .length > 0 && (
              <button
                onClick={limparFiltros}
                className="px-3 py-1 text-xs font-medium text-red-600 hover:text-red-800 transition-colors"
              >
                <FiX className="w-3 h-3 inline mr-1" />
                Limpar todos
              </button>
            )}
          </div>
        </div>

        {/* Estatísticas Globais */}
        {estatisticas && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-500 text-sm">Total de Pagamentos</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">
                    {estatisticas.totalPagamentos || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FiDollarSign className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-500 text-sm">Volume Total</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">
                    {formatCurrency(estatisticas.volumeTotal)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <FiTrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-500 text-sm">Valor Médio</p>
                  <p className="text-2xl font-bold text-amber-600 mt-1">
                    {formatCurrency(estatisticas.valorMedio)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                  <FiBarChart className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-500 text-sm">Empresas Ativas</p>
                  <p className="text-2xl font-bold text-purple-600 mt-1">
                    {estatisticas.empresasAtivas || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <FaBuilding className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filtros Avançados */}
        {mostrarFiltros && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">
                Filtros Avançados
              </h3>
              <button
                onClick={() => setMostrarFiltros(false)}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <FiX className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {/* Busca Geral */}
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <FiSearch className="inline w-4 h-4 mr-1" />
                  Buscar
                </label>
                <input
                  type="text"
                  value={filtros.buscarTexto}
                  onChange={(e) =>
                    handleFiltroChange("buscarTexto", e.target.value)
                  }
                  placeholder="ID, médico, empresa..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
                />
              </div>

              {/* Empresa */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <FaBuilding className="inline w-4 h-4 mr-1" />
                  Empresa
                </label>
                <select
                  value={filtros.tenant}
                  onChange={(e) => handleFiltroChange("tenant", e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
                >
                  <option value="">Todas as empresas</option>
                  {tenants.map((tenant) => (
                    <option key={tenant._id} value={tenant._id}>
                      {tenant.nomeFantasia || tenant.nome}
                    </option>
                  ))}
                </select>
              </div>

              {/* Médico */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <FiUser className="inline w-4 h-4 mr-1" />
                  Médico
                </label>
                <select
                  value={filtros.medico}
                  onChange={(e) => handleFiltroChange("medico", e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
                >
                  <option value="">Todos os médicos</option>
                  {medicos.map((medico) => (
                    <option key={medico._id} value={medico._id}>
                      {medico.nome}
                    </option>
                  ))}
                </select>
              </div>

              {/* Meio de Pagamento */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <FiCreditCard className="inline w-4 h-4 mr-1" />
                  Meio de Pagamento
                </label>
                <select
                  value={filtros.meioPagamento}
                  onChange={(e) =>
                    handleFiltroChange("meioPagamento", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
                >
                  <option value="">Todos</option>
                  <option value="pix">PIX</option>
                  <option value="transferencia">Transferência Bancária</option>
                  <option value="ted">TED</option>
                  <option value="doc">DOC</option>
                  <option value="cheque">Cheque</option>
                  <option value="dinheiro">Dinheiro</option>
                  <option value="cartao_credito">Cartão de Crédito</option>
                  <option value="cartao_debito">Cartão de Débito</option>
                </select>
              </div>

              {/* Data Inicial */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <FiCalendar className="inline w-4 h-4 mr-1" />
                  Data Inicial
                </label>
                <InputDataBrasileira
                  value={filtros.dataInicio}
                  onChange={(e) =>
                    handleFiltroChange("dataInicio", e.target.value)
                  }
                  placeholder="dd/mm/aaaa"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
                />
              </div>

              {/* Data Final */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <FiCalendar className="inline w-4 h-4 mr-1" />
                  Data Final
                </label>
                <InputDataBrasileira
                  value={filtros.dataFim}
                  onChange={(e) =>
                    handleFiltroChange("dataFim", e.target.value)
                  }
                  placeholder="dd/mm/aaaa"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
                />
              </div>

              {/* Valor Mínimo */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <FiDollarSign className="inline w-4 h-4 mr-1" />
                  Valor Mínimo
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={filtros.valorMin}
                  onChange={(e) =>
                    handleFiltroChange("valorMin", e.target.value)
                  }
                  placeholder="R$ 0,00"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
                />
              </div>

              {/* Valor Máximo */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <FiDollarSign className="inline w-4 h-4 mr-1" />
                  Valor Máximo
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={filtros.valorMax}
                  onChange={(e) =>
                    handleFiltroChange("valorMax", e.target.value)
                  }
                  placeholder="R$ 0,00"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
                />
              </div>

              {/* Ordenação */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <FiBarChart className="inline w-4 h-4 mr-1" />
                  Ordenar por
                </label>
                <select
                  value={filtros.ordenacao}
                  onChange={(e) =>
                    handleFiltroChange("ordenacao", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
                >
                  <option value="-dataPagamento">Data (mais recente)</option>
                  <option value="dataPagamento">Data (mais antigo)</option>
                  <option value="-valorFinal">Valor (maior)</option>
                  <option value="valorFinal">Valor (menor)</option>
                  <option value="medicoId.nome">Médico (A-Z)</option>
                  <option value="-medicoId.nome">Médico (Z-A)</option>
                  <option value="tenant_id.nomeFantasia">Empresa (A-Z)</option>
                  <option value="-tenant_id.nomeFantasia">Empresa (Z-A)</option>
                </select>
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200">
              <div className="text-sm text-slate-500">
                {
                  Object.values(filtros).filter(
                    (v) => v && v !== "-dataPagamento",
                  ).length
                }{" "}
                filtros aplicados
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={limparFiltros}
                  className="px-4 py-2 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Limpar Filtros
                </button>
                <button
                  onClick={() => setMostrarFiltros(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Aplicar Filtros
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tabela de Pagamentos */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">
                  Histórico de Pagamentos
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  {totalItens} pagamentos encontrados
                </p>
              </div>
              {totalItens > 0 && (
                <div className="text-sm text-slate-500">
                  Ordenado por:{" "}
                  {filtros.ordenacao === "-dataPagamento"
                    ? "Data (recente)"
                    : filtros.ordenacao === "dataPagamento"
                      ? "Data (antigo)"
                      : filtros.ordenacao === "-valorFinal"
                        ? "Valor (maior)"
                        : filtros.ordenacao === "valorFinal"
                          ? "Valor (menor)"
                          : "Personalizado"}
                </div>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    ID Pagamento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Empresa
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Médico
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Laudos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Meio de Pagamento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {pagamentos.map((pagamento) => (
                  <tr
                    key={pagamento._id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FiFileText className="w-4 h-4 text-slate-400 mr-2" />
                        <span className="text-sm font-medium text-slate-800">
                          #{pagamento._id.slice(-8).toUpperCase()}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FaBuilding className="w-4 h-4 text-slate-400 mr-2" />
                        <span className="text-sm text-slate-600">
                          {pagamento.tenant_id?.nomeFantasia ||
                            pagamento.tenant_id?.nome ||
                            "N/A"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FiUser className="w-4 h-4 text-slate-400 mr-2" />
                        <span className="text-sm text-slate-600">
                          {pagamento.medicoNome || "N/A"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <p className="font-medium text-slate-800">
                          {formatCurrency(pagamento.valorFinal)}
                        </p>
                        {pagamento.valorDesconto > 0 && (
                          <p className="text-xs text-red-500">
                            Desconto: {formatCurrency(pagamento.valorDesconto)}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {Array.isArray(pagamento.laudos)
                          ? pagamento.laudos.length
                          : 0}{" "}
                        laudos
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {pagamento.meioPagamento?.toUpperCase() || "N/A"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {formatDate(pagamento.dataPagamento)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            window.open(
                              `/financeiro/recibo/${pagamento._id}`,
                              "_blank",
                            )
                          }
                          className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Ver recibo"
                        >
                          <FiEye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() =>
                            window.open(
                              `/financeiro/recibo/${pagamento._id}?download=true`,
                              "_blank",
                            )
                          }
                          className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors"
                          title="Download recibo"
                        >
                          <FiDownload className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {pagamentos.length === 0 && (
              <div className="text-center py-12">
                <FiDollarSign className="mx-auto text-slate-300 text-4xl mb-3" />
                <h3 className="text-lg font-medium text-slate-500">
                  Nenhum pagamento encontrado
                </h3>
                <p className="text-slate-400 mt-1">
                  {Object.values(filtros).filter(
                    (v) => v && v !== "-dataPagamento",
                  ).length > 0
                    ? "Tente ajustar os filtros para encontrar resultados"
                    : "Não há pagamentos registrados no sistema"}
                </p>
              </div>
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
                            ? "bg-blue-600 text-white border-blue-600"
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
    </div>
  );
}
