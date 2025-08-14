import React, { useState, useEffect } from "react";
import api from "../../api";
import {
  FiPlus,
  FiTrash2,
  FiEdit,
  FiCheck,
  FiX,
  FiSearch,
  FiFilter,
  FiRefreshCw,
  FiSettings,
  FiActivity,
  FiAlertCircle,
  FiCheckCircle,
  FiHeart,
  FiAlertTriangle,
} from "react-icons/fi";
import { toast } from "react-toastify";
import Select from "react-select";

const Configuracoes = () => {
  // Estados para Tipos de Exame
  const [tiposExame, setTiposExame] = useState([]);
  const [novoTipo, setNovoTipo] = useState("");
  const [novoTipoUrgente, setNovoTipoUrgente] = useState(false);
  const [selectedEspecialidades, setSelectedEspecialidades] = useState([]);
  const [editingTipoId, setEditingTipoId] = useState(null);
  const [editTipoValue, setEditTipoValue] = useState("");
  const [editTipoUrgente, setEditTipoUrgente] = useState(false);
  const [editTipoEspecialidades, setEditTipoEspecialidades] = useState([]);
  const [searchTipoTerm, setSearchTipoTerm] = useState("");

  // Estados para Especialidades
  const [especialidades, setEspecialidades] = useState([]);
  const [novaEspecialidade, setNovaEspecialidade] = useState({
    nome: "",
    descricao: "",
    status: "ativo",
  });
  const [editingEspecialidadeId, setEditingEspecialidadeId] = useState(null);
  const [editEspecialidadeValue, setEditEspecialidadeValue] = useState({
    nome: "",
    descricao: "",
    status: "ativo",
  });
  const [searchEspecialidadeTerm, setSearchEspecialidadeTerm] = useState("");

  const [activeTab, setActiveTab] = useState("tipos-exame");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tiposResponse, especialidadesResponse] = await Promise.all([
        api.get("/tipos-exame"),
        api.get("/especialidades"),
      ]);
      setTiposExame(tiposResponse.data);
      setEspecialidades(especialidadesResponse.data);
    } catch (err) {
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  // Funções para Tipos de Exame
  const handleCreateTipo = async () => {
    if (!novoTipo.trim()) {
      toast.warning("Digite um nome para o tipo de exame");
      return;
    }

    try {
      setLoading(true);
      const response = await api.post("/tipos-exame", {
        nome: novoTipo,
        especialidades: selectedEspecialidades,
        urgente: novoTipoUrgente,
      });
      setTiposExame([...tiposExame, response.data]);
      setNovoTipo("");
      setNovoTipoUrgente(false);
      setSelectedEspecialidades([]);
      toast.success("Tipo de exame criado com sucesso!");
    } catch (err) {
      toast.error("Erro ao criar tipo de exame");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTipo = async (id) => {
    if (!window.confirm("Tem certeza que deseja excluir este tipo de exame?")) {
      return;
    }

    try {
      setLoading(true);
      await api.delete(`/tipos-exame/${id}`);
      setTiposExame(tiposExame.filter((tipo) => tipo._id !== id));
      toast.success("Tipo de exame removido com sucesso!");
    } catch (err) {
      const msg = err?.response?.data?.error || err?.response?.data?.message || err.message || "Erro ao remover tipo de exame";
      toast.error(`Erro ao remover tipo de exame: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const startEditingTipo = (tipo) => {
    setEditingTipoId(tipo._id);
    setEditTipoValue(tipo?.nome || "");
    setEditTipoUrgente(tipo?.urgente || false);
    setEditTipoEspecialidades((tipo?.especialidades || []).map((e) => e._id || e));
  };

  const cancelEditingTipo = () => {
    setEditingTipoId(null);
    setEditTipoValue("");
    setEditTipoUrgente(false);
    setEditTipoEspecialidades([]);
  };

  const handleUpdateTipo = async () => {
    try {
      setLoading(true);
      const response = await api.put(`/tipos-exame/${editingTipoId}`, {
        nome: editTipoValue,
        especialidades: editTipoEspecialidades,
        urgente: editTipoUrgente,
      });
      setTiposExame(
        tiposExame.map((tipo) =>
          tipo._id === editingTipoId ? response.data : tipo,
        ),
      );
      cancelEditingTipo();
      toast.success("Tipo de exame atualizado com sucesso!");
    } catch (err) {
      toast.error("Erro ao atualizar tipo de exame");
    } finally {
      setLoading(false);
    }
  };

  // Funções para Especialidades
  const handleCreateEspecialidade = async () => {
    if (!novaEspecialidade?.nome?.trim()) {
      toast.warning("Digite um nome para a especialidade");
      return;
    }

    try {
      setLoading(true);
      const response = await api.post("/especialidades", novaEspecialidade);
      setEspecialidades([...especialidades, response.data]);
      setNovaEspecialidade({ nome: "", descricao: "", status: "ativo" });
      toast.success("Especialidade criada com sucesso!");
    } catch (err) {
      toast.error("Erro ao criar especialidade");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEspecialidade = async (id) => {
    if (!window.confirm("Tem certeza que deseja excluir esta especialidade?")) {
      return;
    }

    try {
      setLoading(true);
      await api.delete(`/especialidades/${id}`);
      setEspecialidades(especialidades.filter((esp) => esp._id !== id));
      toast.success("Especialidade removida com sucesso!");
    } catch (err) {
      const msg = err?.response?.data?.error || err?.response?.data?.message || err.message || "Erro ao remover especialidade";
      toast.error(`Erro ao remover especialidade: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const startEditingEspecialidade = (especialidade) => {
    setEditingEspecialidadeId(especialidade._id);
    setEditEspecialidadeValue({
      nome: especialidade?.nome || "",
      descricao: especialidade?.descricao || "",
      status: especialidade?.status || "ativo",
    });
  };

  const cancelEditingEspecialidade = () => {
    setEditingEspecialidadeId(null);
    setEditEspecialidadeValue({ nome: "", descricao: "", status: "ativo" });
  };

  const handleUpdateEspecialidade = async () => {
    try {
      setLoading(true);
      const response = await api.put(
        `/especialidades/${editingEspecialidadeId}`,
        editEspecialidadeValue,
      );
      setEspecialidades(
        especialidades.map((esp) =>
          esp._id === editingEspecialidadeId ? response.data : esp,
        ),
      );
      cancelEditingEspecialidade();
      toast.success("Especialidade atualizada com sucesso!");
    } catch (err) {
      toast.error("Erro ao atualizar especialidade");
    } finally {
      setLoading(false);
    }
  };

  const filteredTipos = tiposExame.filter((tipo) =>
    tipo?.nome?.toLowerCase().includes((searchTipoTerm || "").toLowerCase()),
  );

  const filteredEspecialidades = especialidades.filter(
    (esp) =>
      esp?.nome?.toLowerCase().includes((searchEspecialidadeTerm || "").toLowerCase()) ||
      (esp?.descricao &&
        esp.descricao
          .toLowerCase()
          .includes((searchEspecialidadeTerm || "").toLowerCase())),
  );

  const tabs = [
    { id: "tipos-exame", label: "Tipos de Exame", icon: FiActivity },
    { id: "especialidades", label: "Especialidades", icon: FiHeart },
    { id: "geral", label: "Configurações Gerais", icon: FiSettings },
  ];

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Configurações do Sistema
          </h1>
          <p className="text-slate-500 mt-1">
            Gerencie as configurações e parâmetros do sistema
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="border-b border-slate-200">
            <div className="flex space-x-2 p-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? "bg-slate-800 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tipos de Exame Tab */}
          {activeTab === "tipos-exame" && (
            <div className="divide-y divide-slate-200">
              {/* Search and Actions */}
              <div className="p-6">
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <div className="relative flex-grow">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiSearch className="text-slate-400" />
                    </div>
                    <input
                      type="text"
                      value={searchTipoTerm}
                      onChange={(e) => setSearchTipoTerm(e.target.value)}
                      placeholder="Buscar tipo de exame..."
                      className="block w-full pl-10 pr-3 py-2.5 bg-white border border-slate-300 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all placeholder:text-slate-400"
                    />
                  </div>
                  <button
                    onClick={fetchData}
                    disabled={loading}
                    className="inline-flex items-center justify-center px-4 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                  >
                    <FiRefreshCw
                      className={`mr-2 ${loading ? "animate-spin" : ""}`}
                    />
                    Atualizar
                  </button>
                </div>

                {/* Create Form */}
                <div className="bg-slate-50 rounded-xl p-6">
                  <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
                    <FiPlus className="mr-2" />
                    Novo Tipo de Exame
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-700">
                        Nome do Tipo <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={novoTipo}
                        onChange={(e) => setNovoTipo(e.target.value)}
                        placeholder="Ex: ECG, Holter, etc."
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-700">
                        Especialidades <span className="text-red-500">*</span>
                      </label>
                      <Select
                        isMulti
                        options={especialidades.map((especialidade) => ({
                          value: especialidade._id,
                          label: especialidade.nome,
                        }))}
                        value={selectedEspecialidades.map((id) => ({
                          value: id,
                          label:
                            especialidades.find((e) => e._id === id)?.nome ||
                            "",
                        }))}
                        onChange={(selectedOptions) => {
                          setSelectedEspecialidades(
                            selectedOptions.map((option) => option.value),
                          );
                        }}
                        className="basic-multi-select text-slate-800"
                        classNamePrefix="select"
                        placeholder="Selecione as especialidades..."
                      />
                    </div>

                    <div className="col-span-2">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="novoTipoUrgente"
                          checked={novoTipoUrgente}
                          onChange={(e) => setNovoTipoUrgente(e.target.checked)}
                          className="w-4 h-4 text-red-600 bg-white border-slate-300 rounded focus:ring-red-500 focus:ring-2"
                        />
                        <label
                          htmlFor="novoTipoUrgente"
                          className="text-sm font-medium text-slate-700 flex items-center"
                        >
                          <FiAlertTriangle className="w-4 h-4 mr-2 text-red-500" />
                          Tipo de exame urgente (prioridade alta)
                        </label>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 ml-7">
                        Exames marcados como urgentes aparecerão primeiro na
                        listagem
                      </p>
                    </div>
                  </div>
                  <div className="mt-6">
                    <button
                      onClick={handleCreateTipo}
                      disabled={loading}
                      className="inline-flex items-center px-4 py-2.5 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors duration-200 font-medium shadow-sm disabled:opacity-75 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                          Processando...
                        </>
                      ) : (
                        <>
                          <FiPlus className="mr-2" />
                          Adicionar Tipo
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* List */}
              <div className="p-6">
                <h2 className="text-lg font-semibold text-slate-800 mb-4">
                  Tipos de Exame Cadastrados
                </h2>

                {loading && filteredTipos.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800 mx-auto"></div>
                    <p className="mt-4 text-slate-600 font-medium">
                      Carregando tipos de exame...
                    </p>
                  </div>
                ) : filteredTipos.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <FiActivity className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                    <p className="font-medium">
                      Nenhum tipo de exame encontrado
                    </p>
                    <p className="text-sm mt-1">
                      Comece adicionando um novo tipo de exame
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead>
                        <tr className="bg-slate-50">
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Nome
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Especialidades
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Urgência
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Ações
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-200">
                        {filteredTipos.map((tipo) => (
                          <tr
                            key={tipo._id}
                            className="hover:bg-slate-50 transition-colors text-slate-800"
                          >
                            <td className="px-6 py-4">
                              {editingTipoId === tipo._id ? (
                                <input
                                  type="text"
                                  value={editTipoValue}
                                  onChange={(e) =>
                                    setEditTipoValue(e.target.value)
                                  }
                                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                                />
                              ) : (
                                <div className="flex items-center">
                                  <div className="font-medium text-slate-900">
                                    {tipo.nome}
                                  </div>
                                  {tipo.urgente && (
                                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                      <FiAlertTriangle className="w-3 h-3 mr-1" />
                                      Urgente
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              {editingTipoId === tipo._id ? (
                                <Select
                                  isMulti
                                  options={especialidades.map(
                                    (especialidade) => ({
                                      value: especialidade._id,
                                      label: especialidade.nome,
                                    }),
                                  )}
                                  value={editTipoEspecialidades.map((id) => ({
                                    value: id,
                                    label:
                                      especialidades.find((e) => e._id === id)
                                        ?.nome || "",
                                  }))}
                                  onChange={(selectedOptions) => {
                                    setEditTipoEspecialidades(
                                      selectedOptions.map(
                                        (option) => option.value,
                                      ),
                                    );
                                  }}
                                  className="basic-multi-select"
                                  classNamePrefix="select"
                                />
                              ) : (
                                <div className="text-slate-600">
                                  {(tipo?.especialidades || [])
                                    .map((e) => e?.nome || "")
                                    .filter(nome => nome.trim() !== "")
                                    .join(", ")}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              {editingTipoId === tipo._id ? (
                                <div className="flex items-center space-x-3">
                                  <input
                                    type="checkbox"
                                    id={`editTipoUrgente-${tipo._id}`}
                                    checked={editTipoUrgente}
                                    onChange={(e) =>
                                      setEditTipoUrgente(e.target.checked)
                                    }
                                    className="w-4 h-4 text-red-600 bg-white border-slate-300 rounded focus:ring-red-500 focus:ring-2"
                                  />
                                  <label
                                    htmlFor={`editTipoUrgente-${tipo._id}`}
                                    className="text-sm text-slate-700"
                                  >
                                    Urgente
                                  </label>
                                </div>
                              ) : (
                                <div>
                                  {tipo.urgente ? (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                      <FiAlertTriangle className="w-3 h-3 mr-1" />
                                      Urgente
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      <FiCheckCircle className="w-3 h-3 mr-1" />
                                      Normal
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center space-x-3">
                                {editingTipoId === tipo._id ? (
                                  <>
                                    <button
                                      onClick={handleUpdateTipo}
                                      className="text-green-600 hover:text-green-900"
                                      title="Salvar"
                                    >
                                      <FiCheck className="h-5 w-5" />
                                    </button>
                                    <button
                                      onClick={cancelEditingTipo}
                                      className="text-slate-600 hover:text-slate-900"
                                      title="Cancelar"
                                    >
                                      <FiX className="h-5 w-5" />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => startEditingTipo(tipo)}
                                      className="text-slate-600 hover:text-slate-900"
                                      title="Editar"
                                    >
                                      <FiEdit className="h-5 w-5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteTipo(tipo._id)}
                                      className="text-red-600 hover:text-red-900"
                                      title="Excluir"
                                    >
                                      <FiTrash2 className="h-5 w-5" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Especialidades Tab */}
          {activeTab === "especialidades" && (
            <div className="divide-y divide-slate-200">
              {/* Search and Actions */}
              <div className="p-6">
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <div className="relative flex-grow">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiSearch className="text-slate-400" />
                    </div>
                    <input
                      type="text"
                      value={searchEspecialidadeTerm}
                      onChange={(e) =>
                        setSearchEspecialidadeTerm(e.target.value)
                      }
                      placeholder="Buscar especialidade..."
                      className="block w-full pl-10 pr-3 py-2.5 bg-white border border-slate-300 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all placeholder:text-slate-400"
                    />
                  </div>
                  <button
                    onClick={fetchData}
                    disabled={loading}
                    className="inline-flex items-center justify-center px-4 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                  >
                    <FiRefreshCw
                      className={`mr-2 ${loading ? "animate-spin" : ""}`}
                    />
                    Atualizar
                  </button>
                </div>

                {/* Create Form */}
                <div className="bg-slate-50 rounded-xl p-6">
                  <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
                    <FiPlus className="mr-2" />
                    Nova Especialidade
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-700">
                        Nome <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={novaEspecialidade.nome}
                        onChange={(e) =>
                          setNovaEspecialidade({
                            ...novaEspecialidade,
                            nome: e.target.value,
                          })
                        }
                        placeholder="Ex: Cardiologia, Neurologia, etc."
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-700">
                        Status <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={novaEspecialidade.status}
                        onChange={(e) =>
                          setNovaEspecialidade({
                            ...novaEspecialidade,
                            status: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                      >
                        <option value="ativo">Ativo</option>
                        <option value="inativo">Inativo</option>
                      </select>
                    </div>
                    <div className="col-span-2 space-y-2">
                      <label className="block text-sm font-medium text-slate-700">
                        Descrição
                      </label>
                      <textarea
                        value={novaEspecialidade.descricao}
                        onChange={(e) =>
                          setNovaEspecialidade({
                            ...novaEspecialidade,
                            descricao: e.target.value,
                          })
                        }
                        placeholder="Descreva a especialidade..."
                        rows={3}
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all resize-none"
                      />
                    </div>
                  </div>
                  <div className="mt-6">
                    <button
                      onClick={handleCreateEspecialidade}
                      disabled={loading}
                      className="inline-flex items-center px-4 py-2.5 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors duration-200 font-medium shadow-sm disabled:opacity-75 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                          Processando...
                        </>
                      ) : (
                        <>
                          <FiPlus className="mr-2" />
                          Adicionar Especialidade
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* List */}
              <div className="p-6">
                <h2 className="text-lg font-semibold text-slate-800 mb-4">
                  Especialidades Cadastradas
                </h2>

                {loading && filteredEspecialidades.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800 mx-auto"></div>
                    <p className="mt-4 text-slate-600 font-medium">
                      Carregando especialidades...
                    </p>
                  </div>
                ) : filteredEspecialidades.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <FiHeart className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                    <p className="font-medium">
                      Nenhuma especialidade encontrada
                    </p>
                    <p className="text-sm mt-1">
                      Comece adicionando uma nova especialidade
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead>
                        <tr className="bg-slate-50">
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Nome
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Descrição
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Ações
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-200">
                        {filteredEspecialidades.map((especialidade) => (
                          <tr
                            key={especialidade._id}
                            className="hover:bg-slate-50 transition-colors text-slate-800"
                          >
                            <td className="px-6 py-4">
                              {editingEspecialidadeId === especialidade._id ? (
                                <input
                                  type="text"
                                  value={editEspecialidadeValue.nome}
                                  onChange={(e) =>
                                    setEditEspecialidadeValue({
                                      ...editEspecialidadeValue,
                                      nome: e.target.value,
                                    })
                                  }
                                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                                />
                              ) : (
                                <div className="font-medium text-slate-900">
                                  {especialidade.nome}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              {editingEspecialidadeId === especialidade._id ? (
                                <input
                                  type="text"
                                  value={editEspecialidadeValue.descricao}
                                  onChange={(e) =>
                                    setEditEspecialidadeValue({
                                      ...editEspecialidadeValue,
                                      descricao: e.target.value,
                                    })
                                  }
                                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                                />
                              ) : (
                                <div className="text-slate-600">
                                  {especialidade.descricao || "-"}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              {editingEspecialidadeId === especialidade._id ? (
                                <select
                                  value={editEspecialidadeValue.status}
                                  onChange={(e) =>
                                    setEditEspecialidadeValue({
                                      ...editEspecialidadeValue,
                                      status: e.target.value,
                                    })
                                  }
                                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                                >
                                  <option value="ativo">Ativo</option>
                                  <option value="inativo">Inativo</option>
                                </select>
                              ) : (
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    especialidade.status === "ativo"
                                      ? "bg-green-100 text-green-800"
                                      : "bg-red-100 text-red-800"
                                  }`}
                                >
                                  {especialidade.status === "ativo"
                                    ? "Ativo"
                                    : "Inativo"}
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center space-x-3">
                                {editingEspecialidadeId ===
                                especialidade._id ? (
                                  <>
                                    <button
                                      onClick={handleUpdateEspecialidade}
                                      className="text-green-600 hover:text-green-900"
                                      title="Salvar"
                                    >
                                      <FiCheck className="h-5 w-5" />
                                    </button>
                                    <button
                                      onClick={cancelEditingEspecialidade}
                                      className="text-slate-600 hover:text-slate-900"
                                      title="Cancelar"
                                    >
                                      <FiX className="h-5 w-5" />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={() =>
                                        startEditingEspecialidade(especialidade)
                                      }
                                      className="text-slate-600 hover:text-slate-900"
                                      title="Editar"
                                    >
                                      <FiEdit className="h-5 w-5" />
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleDeleteEspecialidade(
                                          especialidade._id,
                                        )
                                      }
                                      className="text-red-600 hover:text-red-900"
                                      title="Excluir"
                                    >
                                      <FiTrash2 className="h-5 w-5" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Configurações Gerais Tab */}
          {activeTab === "geral" && (
            <div className="p-6">
              <div className="bg-slate-50 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
                  <FiSettings className="mr-2" />
                  Configurações Gerais
                </h2>
                <p className="text-slate-500 mb-6">
                  Esta seção está em desenvolvimento. Em breve você poderá
                  gerenciar outras configurações do sistema aqui.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Placeholder para futuras configurações */}
                  <div className="p-4 border border-slate-200 rounded-lg bg-white">
                    <h3 className="font-medium text-slate-800 mb-2">
                      Notificações
                    </h3>
                    <p className="text-slate-500 text-sm">
                      Configurações de notificações do sistema
                    </p>
                  </div>
                  <div className="p-4 border border-slate-200 rounded-lg bg-white">
                    <h3 className="font-medium text-slate-800 mb-2">
                      Integrações
                    </h3>
                    <p className="text-slate-500 text-sm">
                      Gerenciar integrações com outros sistemas
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Configuracoes;
