import React, { useState, useEffect, useMemo, useCallback, memo } from "react";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../api";
import { toast } from "react-toastify";
import {
  FiUser,
  FiSettings,
  FiDollarSign,
  FiSave,
  FiX,
  FiEdit3,
  FiCheck,
  FiSearch,
  FiFilter,
  FiEdit,
  FiEye,
  FiTarget,
  FiInfo,
  FiCheckCircle,
  FiAlertCircle,
  FiRefreshCw,
  FiAward,
  FiLayers,
  FiTrendingUp,
  FiBarChart,
  FiStar,
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
      Carregando dados...
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

// Componente de Card de Médico otimizado
const MedicoCard = memo(
  ({
    medico,
    onOpenModal,
    especialidades,
    totalConfigurados,
    totalPossivel,
  }) => {
    const porcentagemConfigurada =
      totalPossivel > 0 ? (totalConfigurados / totalPossivel) * 100 : 0;

    return (
      <div
        className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer border border-gray-100 hover:border-blue-200 group overflow-hidden"
        onClick={() => onOpenModal(medico)}
      >
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center group-hover:from-blue-600 group-hover:to-blue-700 transition-colors">
                <FiUser className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                  Dr(a). {medico.nome}
                </h3>
                <p className="text-sm text-gray-600">CRM: {medico.crm}</p>
              </div>
            </div>
            <FiEdit className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                Especialidades:
              </p>
              <div className="flex flex-wrap gap-2">
                {medico.especialidades.slice(0, 2).map((esp) => {
                  const espId = typeof esp === "object" ? esp._id : esp;
                  const especialidade = especialidades.find(
                    (e) => e._id === espId,
                  );
                  return especialidade ? (
                    <span
                      key={espId}
                      className="px-3 py-1 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 text-xs font-medium rounded-full border border-gray-200"
                    >
                      {especialidade.nome}
                    </span>
                  ) : null;
                })}
                {medico.especialidades.length > 2 && (
                  <span className="px-3 py-1 bg-gray-50 text-gray-600 text-xs font-medium rounded-full border border-gray-200">
                    +{medico.especialidades.length - 2} mais
                  </span>
                )}
              </div>
            </div>

            {totalPossivel > 0 && (
              <div className="pt-2">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-600">Valores configurados</span>
                  <span className="font-medium text-gray-900">
                    {totalConfigurados}/{totalPossivel}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-emerald-400 to-emerald-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${(totalConfigurados / totalPossivel) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100">
            <button className="w-full flex items-center justify-center py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-medium group-hover:shadow-md">
              <FiDollarSign className="mr-2 h-4 w-4" />
              Configurar Valores
            </button>
          </div>
        </div>
      </div>
    );
  },
);

const ConfigurarValores = () => {
  const { usuario } = useAuth();
  const tenant_id = Array.isArray(usuario?.tenant_id)
    ? (typeof usuario.tenant_id[0] === 'object' ? usuario.tenant_id[0]._id : usuario.tenant_id[0])
    : (typeof usuario?.tenant_id === 'object' ? usuario?.tenant_id?._id : usuario?.tenant_id);

  const [medicos, setMedicos] = useState([]);
  const [especialidades, setEspecialidades] = useState([]);
  const [tiposExame, setTiposExame] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [medicoSelecionado, setMedicoSelecionado] = useState(null);
  const [valores, setValores] = useState({});
  const [valoresOriginais, setValoresOriginais] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [filtroMedico, setFiltroMedico] = useState("");
  const [filtroEspecialidade, setFiltroEspecialidade] = useState("");

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [medicosRes, especialidadesRes] = await Promise.all([
        api.get("/usuarios/medicos", { params: { tenant_id, limit: 100 } }),
        api.get("/especialidades"),
      ]);

      setMedicos(medicosRes.data.usuarios || []);
      setEspecialidades(especialidadesRes.data || []);
    } catch (error) {
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const carregarTiposExameMedico = async (medico) => {
    try {
      setLoading(true);

      const especialidadeIds = medico.especialidades.map((esp) => {
        return typeof esp === "object" ? esp._id : esp;
      });

      const tiposExamePromises = especialidadeIds.map((espId) => {
        return api.get(`/especialidades/${espId}/tipos-exame`);
      });

      const tiposExameRes = await Promise.all(tiposExamePromises);
      const todosTiposExame = tiposExameRes.flatMap(
        (res) => res.data.tiposExame || [],
      );

      const tiposExameUnicos = todosTiposExame.filter(
        (tipo, index, self) =>
          index === self.findIndex((t) => t._id === tipo._id),
      );

      setTiposExame(tiposExameUnicos);

      const valoresRes = await api.get("/valor-laudo/valores", {
        params: {
          tenantId: tenant_id,
          medicoId: medico._id,
        },
      });

      const valoresExistentes = {};
      if (valoresRes.data.valores) {
        valoresRes.data.valores.forEach((valor) => {
          const especialidadeId =
            typeof valor.especialidadeId === "object"
              ? valor.especialidadeId._id
              : valor.especialidadeId;
          const tipoExameId =
            typeof valor.tipoExameId === "object"
              ? valor.tipoExameId._id
              : valor.tipoExameId;
          const key = `${especialidadeId}-${tipoExameId}`;
          valoresExistentes[key] = {
            id: valor._id,
            valor: valor.valor,
            observacoes: valor.observacoes || "",
          };
        });
      }

      setValores(valoresExistentes);
      setValoresOriginais({ ...valoresExistentes });
    } catch (error) {
      toast.error("Erro ao carregar tipos de exame");
    } finally {
      setLoading(false);
    }
  };

  const abrirModal = async (medico) => {
    setMedicoSelecionado(medico);
    setModalOpen(true);
    await carregarTiposExameMedico(medico);
  };

  const fecharModal = () => {
    setModalOpen(false);
    setMedicoSelecionado(null);
    setTiposExame([]);
    setValores({});
    setValoresOriginais({});
  };

  const atualizarValor = (
    especialidadeId,
    tipoExameId,
    novoValor,
    observacoes = "",
  ) => {
    const key = `${especialidadeId}-${tipoExameId}`;
    setValores((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        valor: parseFloat(novoValor) || 0,
        observacoes,
      },
    }));
  };

  const salvarValores = async () => {
    try {
      setSalvando(true);

      const valoresParaSalvar = [];
      const valoresParaAtualizar = [];

      Object.entries(valores).forEach(([key, config]) => {
        const [especialidadeId, tipoExameId] = key.split("-");

        if (config.valor > 0) {
          const dadosValor = {
            tenantId: tenant_id,
            medicoId: medicoSelecionado._id,
            especialidadeId,
            tipoExameId,
            valor: config.valor,
            observacoes: config.observacoes,
          };

          if (config.id) {
            valoresParaAtualizar.push({ id: config.id, ...dadosValor });
          } else {
            valoresParaSalvar.push(dadosValor);
          }
        }
      });

      for (const valor of valoresParaSalvar) {
        await api.post("/valor-laudo/valores", valor);
      }

      for (const valor of valoresParaAtualizar) {
        const { id, ...dadosParaAtualizar } = valor;
        await api.put(`/valor-laudo/valores/${id}`, dadosParaAtualizar);
      }

      toast.success("Valores salvos com sucesso!");
      setValoresOriginais({ ...valores });
    } catch (error) {
      toast.error(error.response?.data?.erro || "Erro ao salvar valores");
    } finally {
      setSalvando(false);
    }
  };

  const temAlteracoes = () => {
    return JSON.stringify(valores) !== JSON.stringify(valoresOriginais);
  };

  const getEspecialidadeNome = (especialidadeId) => {
    const especialidade = especialidades.find((e) => e._id === especialidadeId);
    return especialidade?.nome || "Especialidade não encontrada";
  };

  const medicosFiltrados = medicos.filter((medico) => {
    const nomeMatch = medico.nome
      .toLowerCase()
      .includes(filtroMedico.toLowerCase());
    const especialidadeMatch =
      filtroEspecialidade === "" ||
      medico.especialidades.some((esp) => {
        const espId = typeof esp === "object" ? esp._id : esp;
        return espId === filtroEspecialidade;
      });

    return nomeMatch && especialidadeMatch;
  });

  const getValoresConfigurados = (medico) => {
    const especialidadeIds = medico.especialidades.map((esp) =>
      typeof esp === "object" ? esp._id : esp,
    );

    let totalConfigurados = 0;
    let totalPossivel = 0;

    especialidadeIds.forEach((espId) => {
      const tiposEsp = tiposExame.filter(
        (tipo) =>
          tipo.especialidades &&
          tipo.especialidades.some((espTipo) => {
            const espTipoId =
              typeof espTipo === "object" ? espTipo._id : espTipo;
            return espTipoId === espId;
          }),
      );

      tiposEsp.forEach((tipo) => {
        totalPossivel++;
        const key = `${espId}-${tipo._id}`;
        if (valores[key] && valores[key].valor > 0) {
          totalConfigurados++;
        }
      });
    });

    return { totalConfigurados, totalPossivel };
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header modernizado seguindo padrão das outras páginas */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-8 py-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-lg">
                  <FiDollarSign className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    Configurar Valores de Laudos
                  </h1>
                  <p className="text-gray-600 text-lg mt-1">
                    Configure os valores dos laudos para cada profissional e
                    tipo de exame
                  </p>
                </div>
              </div>
              <div className="hidden lg:flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-r from-gray-100 to-gray-200 rounded-xl">
                  <FiSettings className="h-5 w-5 text-gray-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Cards de estatísticas modernizados */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatCard
                stat={{
                  title: "Total de Médicos",
                  value: medicosFiltrados.length,
                  subtitle: "profissionais cadastrados",
                  gradient: "from-blue-500 to-blue-600",
                  icon: FiUser,
                  bg: "bg-gradient-to-r from-blue-50 to-blue-100",
                }}
              />
              <StatCard
                stat={{
                  title: "Especialidades",
                  value: especialidades.length,
                  subtitle: "áreas médicas ativas",
                  gradient: "from-amber-500 to-amber-600",
                  icon: FiTarget,
                  bg: "bg-gradient-to-r from-amber-50 to-amber-100",
                }}
              />
              <StatCard
                stat={{
                  title: "Tipos de Exame",
                  value: tiposExame.length,
                  subtitle: "modalidades configuradas",
                  gradient: "from-emerald-500 to-emerald-600",
                  icon: FiLayers,
                  bg: "bg-gradient-to-r from-emerald-50 to-emerald-100",
                }}
              />
              <StatCard
                stat={{
                  title: "Configurações",
                  value: Object.keys(valores).filter(
                    (key) => valores[key]?.valor > 0,
                  ).length,
                  subtitle: "valores definidos",
                  gradient: "from-blue-500 to-blue-600",
                  icon: FiBarChart,
                  bg: "bg-gradient-to-r from-blue-50 to-blue-100",
                }}
              />
            </div>
          </div>
        </div>

        {/* Seção de filtros modernizada */}
        <div className="bg-white rounded-2xl shadow-md border border-white/50 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-gray-100 to-gray-200 rounded-xl">
                <FiFilter className="h-5 w-5 text-gray-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Filtros de Busca
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FiSearch className="inline h-4 w-4 mr-2" />
                Buscar Médico
              </label>
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Digite o nome do médico..."
                  value={filtroMedico}
                  onChange={(e) => setFiltroMedico(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FiTarget className="inline h-4 w-4 mr-2" />
                Filtrar por Especialidade
              </label>
              <div className="relative">
                <FiTarget className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <select
                  value={filtroEspecialidade}
                  onChange={(e) => setFiltroEspecialidade(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white transition-all"
                >
                  <option value="">Todas as especialidades</option>
                  {especialidades.map((esp) => (
                    <option key={esp._id} value={esp._id}>
                      {esp.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Grid de médicos com estado vazio modernizado */}
        {loading ? (
          <div className="bg-white rounded-2xl shadow-md border border-white/50">
            <LoadingSpinner />
          </div>
        ) : medicosFiltrados.length === 0 ? (
          /* Estado vazio modernizado */
          <div className="bg-white rounded-2xl shadow-md border border-white/50 p-20 text-center">
            <div className="flex flex-col items-center space-y-6">
              <div className="relative">
                <div className="p-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl shadow-lg">
                  <FiUser className="h-20 w-20 text-gray-400" />
                </div>
                <div className="absolute -top-2 -right-2 p-2 bg-gradient-to-r from-amber-400 to-amber-500 rounded-full shadow-lg">
                  <FiSearch className="h-4 w-4 text-white" />
                </div>
              </div>
              <div className="max-w-md">
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  {filtroMedico || filtroEspecialidade
                    ? "Nenhum médico encontrado"
                    : "Nenhum médico cadastrado"}
                </h3>
                <p className="text-gray-600 text-lg">
                  {filtroMedico || filtroEspecialidade
                    ? "Tente ajustar os filtros para encontrar mais resultados."
                    : "Ainda não há médicos cadastrados no sistema."}
                </p>
              </div>
              {(filtroMedico || filtroEspecialidade) && (
                <button
                  onClick={() => {
                    setFiltroMedico("");
                    setFiltroEspecialidade("");
                  }}
                  className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold shadow-lg transition-all duration-200 transform hover:scale-105 hover:from-blue-700 hover:to-blue-800"
                >
                  <FiRefreshCw className="h-5 w-5" />
                  <span>Limpar Filtros</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {medicosFiltrados.map((medico) => {
              const { totalConfigurados, totalPossivel } =
                modalOpen && medicoSelecionado?._id === medico._id
                  ? getValoresConfigurados(medico)
                  : { totalConfigurados: 0, totalPossivel: 0 };

              return (
                <MedicoCard
                  key={medico._id}
                  medico={medico}
                  onOpenModal={abrirModal}
                  especialidades={especialidades}
                  totalConfigurados={totalConfigurados}
                  totalPossivel={totalPossivel}
                />
              );
            })}
          </div>
        )}

        {/* Modal completamente modernizado seguindo padrão das outras páginas */}
        {modalOpen && medicoSelecionado && (
          <div className="fixed inset-0 backdrop-blur-sm backdrop-brightness-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[95vh] overflow-hidden shadow-2xl">
              {/* Header do Modal modernizado */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-8 py-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="h-16 w-16 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 flex items-center justify-center shadow-lg">
                      <FiUser className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">
                        Dr(a). {medicoSelecionado.nome}
                      </h2>
                      <p className="text-sm text-gray-600 mt-1">
                        CRM: {medicoSelecionado.crm}
                      </p>
                      <div className="flex items-center space-x-2 mt-2">
                        <FiCheckCircle className="h-4 w-4 text-emerald-500" />
                        <span className="text-sm text-gray-600">
                          {medicoSelecionado.especialidades.length}{" "}
                          especialidade(s)
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={fecharModal}
                    className="p-3 hover:bg-white hover:bg-opacity-50 rounded-xl transition-colors"
                  >
                    <FiX className="h-6 w-6 text-gray-600" />
                  </button>
                </div>
              </div>

              {/* Conteúdo do Modal */}
              <div className="p-8 overflow-y-auto max-h-[calc(95vh-220px)]">
                {loading ? (
                  <LoadingSpinner />
                ) : (
                  <div className="space-y-8">
                    {medicoSelecionado.especialidades.map((esp) => {
                      const especialidadeId =
                        typeof esp === "object" ? esp._id : esp;
                      const tiposExameEspecialidade = tiposExame.filter(
                        (tipo) =>
                          tipo.especialidades &&
                          tipo.especialidades.some((espTipo) => {
                            const espTipoId =
                              typeof espTipo === "object"
                                ? espTipo._id
                                : espTipo;
                            return espTipoId === especialidadeId;
                          }),
                      );

                      if (tiposExameEspecialidade.length === 0) return null;

                      const valoresEspecialidade =
                        tiposExameEspecialidade.filter((tipo) => {
                          const key = `${especialidadeId}-${tipo._id}`;
                          return valores[key] && valores[key].valor > 0;
                        });

                      return (
                        <div
                          key={especialidadeId}
                          className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-6 border border-gray-200 shadow-sm"
                        >
                          <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center space-x-3">
                              <div className="h-10 w-10 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 flex items-center justify-center">
                                <FiTarget className="h-5 w-5 text-white" />
                              </div>
                              <div>
                                <h3 className="text-xl font-bold text-gray-900">
                                  {getEspecialidadeNome(especialidadeId)}
                                </h3>
                                <p className="text-sm text-gray-600">
                                  {tiposExameEspecialidade.length} tipo(s) de
                                  exame disponível(is)
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-600">
                                Configurados
                              </p>
                              <p className="text-lg font-bold text-gray-700">
                                {valoresEspecialidade.length}/
                                {tiposExameEspecialidade.length}
                              </p>
                            </div>
                          </div>

                          <div className="grid gap-4">
                            {tiposExameEspecialidade.map((tipoExame) => {
                              const key = `${especialidadeId}-${tipoExame._id}`;
                              const valorConfig = valores[key] || {
                                valor: 0,
                                observacoes: "",
                              };
                              const temValor = valorConfig.valor > 0;

                              return (
                                <div
                                  key={tipoExame._id}
                                  className={`p-4 rounded-xl border-2 transition-all ${
                                    temValor
                                      ? "bg-white border-emerald-200 shadow-sm"
                                      : "bg-gray-50 border-gray-200 hover:border-gray-300"
                                  }`}
                                >
                                  <div className="flex items-center space-x-4">
                                    <div className="flex-1">
                                      <div className="flex items-center space-x-2 mb-2">
                                        <h4 className="font-semibold text-gray-900">
                                          {tipoExame.nome}
                                        </h4>
                                        {temValor && (
                                          <FiCheckCircle className="h-4 w-4 text-emerald-500" />
                                        )}
                                        {tipoExame.urgente && (
                                          <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                                            URGENTE
                                          </span>
                                        )}
                                      </div>
                                      <input
                                        type="text"
                                        placeholder="Adicione observações sobre este valor..."
                                        value={valorConfig.observacoes}
                                        onChange={(e) =>
                                          atualizarValor(
                                            especialidadeId,
                                            tipoExame._id,
                                            valorConfig.valor,
                                            e.target.value,
                                          )
                                        }
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                      />
                                    </div>
                                    <div className="w-40">
                                      <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Valor (R$)
                                      </label>
                                      <div className="relative">
                                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                                          R$
                                        </span>
                                        <input
                                          type="number"
                                          step="0.01"
                                          min="0"
                                          value={valorConfig.valor}
                                          onChange={(e) =>
                                            atualizarValor(
                                              especialidadeId,
                                              tipoExame._id,
                                              e.target.value,
                                              valorConfig.observacoes,
                                            )
                                          }
                                          className={`w-full pl-8 pr-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent text-right font-medium ${
                                            temValor
                                              ? "border-emerald-300 focus:ring-emerald-500 bg-emerald-50"
                                              : "border-gray-300 focus:ring-blue-500"
                                          }`}
                                          placeholder="0,00"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer do Modal modernizado */}
              <div className="px-8 py-6 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {temAlteracoes() && (
                      <div className="flex items-center space-x-2 text-amber-600">
                        <FiAlertCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          Você tem alterações não salvas
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={fecharModal}
                      className="px-6 py-3 text-gray-600 hover:text-gray-800 font-medium transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={salvarValores}
                      disabled={!temAlteracoes() || salvando}
                      className={`flex items-center px-6 py-3 rounded-xl font-medium transition-all ${
                        temAlteracoes() && !salvando
                          ? "bg-gradient-to-r from-emerald-600 to-emerald-700 text-white hover:from-emerald-700 hover:to-emerald-800 shadow-lg hover:shadow-xl"
                          : "bg-gray-300 text-gray-500 cursor-not-allowed"
                      }`}
                    >
                      {salvando ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Salvando...
                        </>
                      ) : (
                        <>
                          <FiSave className="mr-2 h-4 w-4" />
                          Salvar Alterações
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConfigurarValores;
