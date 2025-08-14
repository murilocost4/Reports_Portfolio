import React, { useEffect, useState } from "react";
import api from "../../api";
import { useNavigate, useParams } from "react-router-dom";
import {
  IoArrowBack,
  IoDocumentTextOutline,
  IoPersonOutline,
  IoPulseOutline,
  IoBodyOutline,
  IoAddCircleOutline,
  IoClose,
  IoSaveOutline,
} from "react-icons/io5";
import {
  FaFileUpload,
  FaUserAlt,
  FaWeight,
  FaRulerVertical,
} from "react-icons/fa";
import { GiHeartBeats } from "react-icons/gi";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "react-toastify";

const CriarExame = () => {
  const [pacientes, setPacientes] = useState([]);
  const [nomePaciente, setNomePaciente] = useState("");
  const [pacienteSelecionado, setPacienteSelecionado] = useState(null);
  const [tipoExame, setTipoExame] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [segmentoPR, setSegmentoPR] = useState("");
  const [frequenciaCardiaca, setFrequenciaCardiaca] = useState("");
  const [duracaoQRS, setDuracaoQRS] = useState("");
  const [eixoMedioQRS, setEixoMedioQRS] = useState("");
  const [altura, setAltura] = useState("");
  const [peso, setPeso] = useState("");
  const [arquivo, setArquivo] = useState(null);
  const [arquivoAtual, setArquivoAtual] = useState(""); // Para exames em edição
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingExame, setLoadingExame] = useState(false);
  const [showPacientesDropdown, setShowPacientesDropdown] = useState(false);
  const [opcoesTipoExame, setOpcoesTipoExame] = useState([]);

  const navigate = useNavigate();
  const { id } = useParams(); // Para capturar o ID do exame em edição
  const { logout, tenant_id } = useAuth();

  const isEdicao = Boolean(id);

  // Carregar dados do exame para edição
  useEffect(() => {
    if (isEdicao) {
      carregarExame();
    }
  }, [id]);

  const carregarExame = async () => {
    try {
      setLoadingExame(true);
      const response = await api.get(`/exames/${id}`);
      const exame = response.data;

      // **NOVA VALIDAÇÃO: Verificar se o exame já tem laudo realizado**
      if (exame.status === "Laudo realizado") {
        setErro("Este exame já possui laudo realizado e não pode ser editado");
        setTimeout(() => navigate("/exames"), 3000);
        return;
      }

      // Preencher os campos com os dados do exame
      if (exame.paciente) {
        setPacienteSelecionado(exame.paciente._id);
        setNomePaciente(exame.paciente.nome);
      }

      setTipoExame(exame.tipoExame?._id || "");
      setObservacoes(exame.observacoes || "");
      setSegmentoPR(exame.segmentoPR ? String(exame.segmentoPR) : "");
      setFrequenciaCardiaca(
        exame.frequenciaCardiaca ? String(exame.frequenciaCardiaca) : "",
      );
      setDuracaoQRS(exame.duracaoQRS ? String(exame.duracaoQRS) : "");
      setEixoMedioQRS(exame.eixoMedioQRS ? String(exame.eixoMedioQRS) : "");
      setAltura(exame.altura ? String(exame.altura) : "");
      setPeso(exame.peso ? String(exame.peso) : "");
      setArquivoAtual(exame.arquivo || "");
    } catch (err) {
      console.error("Erro ao carregar exame");
      if (err.response?.status === 404) {
        setErro("Exame não encontrado");
        setTimeout(() => navigate("/exames"), 2000);
      } else if (err.response?.status === 401) {
        setErro("Sessão expirada. Redirecionando para login...");
        setTimeout(() => logout(), 2000);
      } else if (err.response?.status === 403) {
        if (err.response?.data?.codigo === "EXAME_COM_LAUDO") {
          setErro(
            "Este exame já possui laudo realizado e não pode ser editado",
          );
        } else {
          setErro("Você não tem permissão para editar este exame");
        }
        setTimeout(() => navigate("/exames"), 3000);
      } else {
        setErro("Erro ao carregar dados do exame");
      }
    } finally {
      setLoadingExame(false);
    }
  };

  const fetchPacientes = async (query) => {
    try {
      const response = await api.get(`/pacientes?nome=${query}`);
      setPacientes(response.data || []);
      setShowPacientesDropdown(true);
    } catch (err) {
      if (err.response?.status === 401) {
        setErro("Sessão expirada. Redirecionando para login...");
        setTimeout(() => logout(), 2000);
      } else {
        setErro("Erro ao buscar pacientes.");
      }
      setPacientes([]);
    }
  };

  useEffect(() => {
    if (nomePaciente.trim() === "") {
      setPacientes([]);
      setShowPacientesDropdown(false);
      return;
    }

    // Não buscar pacientes se já há um selecionado (modo edição)
    if (pacienteSelecionado && !showPacientesDropdown) {
      return;
    }

    const debounceFetch = setTimeout(() => {
      fetchPacientes(nomePaciente);
    }, 300);

    return () => clearTimeout(debounceFetch);
  }, [nomePaciente, logout, pacienteSelecionado, showPacientesDropdown]);

  useEffect(() => {
    const fetchTiposExame = async () => {
      try {
        const response = await api.get("/tipos-exame");
        const tipos = response.data.map((tipo) => ({
          value: tipo._id,
          label: tipo.nome,
        }));
        setOpcoesTipoExame(tipos);

        // Se não é edição e não há tipo selecionado, selecionar o primeiro
        if (!isEdicao && tipos.length > 0 && !tipoExame) {
          setTipoExame(tipos[0].value);
        }
      } catch (err) {
        setErro("Erro ao carregar tipos de exame.");
      }
    };

    fetchTiposExame();
  }, [isEdicao, tipoExame]);

  const validarFormulario = () => {
    if (!pacienteSelecionado) {
      setErro("Selecione um paciente válido");
      return false;
    }

    if (!observacoes.trim()) {
      setErro("Descreva as observações do paciente");
      return false;
    }

    if (!tipoExame) {
      setErro("Selecione um tipo de exame");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErro("");
    setMensagem("");

    if (!validarFormulario()) {
      setIsLoading(false);
      return;
    }

    try {
      // NOVA ABORDAGEM: Criar FormData mais limpo
      const formData = new FormData();

      // Adicionar campos de texto primeiro
      const camposTexto = {
        paciente: pacienteSelecionado,
        tipoExame: tipoExame,
        observacoes: observacoes,
        segmentoPR: segmentoPR || "",
        frequenciaCardiaca: frequenciaCardiaca || "",
        duracaoQRS: duracaoQRS || "",
        eixoMedioQRS: eixoMedioQRS || "",
        altura: altura || "",
        peso: peso || "",
      };

      // Adicionar apenas campos com valores válidos
      Object.entries(camposTexto).forEach(([key, value]) => {
        if (value !== "" && value !== null && value !== undefined) {
          formData.append(key, value);
        }
      });

      // Adicionar arquivo por último e apenas uma vez
      if (!isEdicao && !arquivo) {
        setErro("Selecione um arquivo para o exame");
        setIsLoading(false);
        return;
      }

      if (arquivo) {

        // Verificar se é realmente um PDF
        if (arquivo.type !== "application/pdf") {
          setErro("Apenas arquivos PDF são permitidos");
          setIsLoading(false);
          return;
        }

        // Verificar tamanho (10MB máximo)
        if (arquivo.size > 10 * 1024 * 1024) {
          setErro("Arquivo muito grande. Tamanho máximo: 10MB");
          setIsLoading(false);
          return;
        }

        formData.append("arquivo", arquivo);
      }

      // Debug: Verificar todos os campos do FormData
      let fileCount = 0;
      let fieldCount = 0;

      for (let [key, value] of formData.entries()) {
        if (value instanceof File) {
          fileCount++;
        } else {
          fieldCount++;
        }
      }

      if (fileCount > 1) {
        setErro(
          "Erro: Múltiplos arquivos detectados. Recarregue a página e tente novamente.",
        );
        setIsLoading(false);
        return;
      }

      let response;
      const config = {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 60000, // 60 segundos
      };

      if (isEdicao) {
        response = await api.put(`/exames/${id}`, formData, config);
        setMensagem("Exame atualizado com sucesso!");
        toast.success("Exame atualizado com sucesso!");
      } else {
        response = await api.post("/exames", formData, config);
        setMensagem("Exame criado com sucesso!");
        toast.success("Exame criado com sucesso!");
      }

      setTimeout(() => navigate("/exames"), 1500);
    } catch (err) {

      if (err.response?.status === 401) {
        setErro("Sessão expirada. Redirecionando para login...");
        setTimeout(() => logout(), 2000);
      } else if (err.response?.status === 400) {
        const errorData = err.response.data;

        if (errorData.codigo === "TOO_MANY_FILES") {
          setErro(
            "Apenas um arquivo é permitido. Recarregue a página e tente novamente.",
          );
        } else if (errorData.codigo === "FILE_TOO_LARGE") {
          setErro("Arquivo muito grande. Tamanho máximo: 10MB");
        } else if (errorData.codigo === "INVALID_FILE_TYPE") {
          setErro("Apenas arquivos PDF são permitidos");
        } else if (errorData.codigo === "UNEXPECTED_FIELD_NAME") {
          setErro(
            "Erro no formato dos dados. Recarregue a página e tente novamente.",
          );
        } else if (errorData.erros) {
          const errorMessages = errorData.erros.map((e) => e.msg).join(", ");
          setErro(`Erro de validação: ${errorMessages}`);
        } else {
          setErro(errorData.erro || "Erro de validação nos dados enviados");
        }
      } else if (err.response?.status === 403) {
        if (err.response?.data?.codigo === "EXAME_COM_LAUDO") {
          setErro(
            "Este exame já possui laudo realizado e não pode ser editado",
          );
          toast.error(
            "Este exame já possui laudo realizado e não pode ser editado",
          );
        } else if (err.response?.data?.codigo === "STATUS_INVALIDO") {
          setErro("Status inválido para o exame");
          toast.error("Status inválido para o exame");
        } else {
          setErro("Você não tem permissão para realizar esta operação");
          toast.error("Você não tem permissão para realizar esta operação");
        }
      } else {
        const mensagemErro =
          err.response?.data?.erro ||
          err.response?.data?.message ||
          (isEdicao
            ? "Erro ao atualizar exame. Tente novamente."
            : "Erro ao criar exame. Tente novamente.");
        setErro(mensagemErro);
        toast.error(mensagemErro);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const selecionarPaciente = (paciente) => {
    setPacienteSelecionado(paciente._id);
    setNomePaciente(paciente.nome);
    setShowPacientesDropdown(false);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 100 * 1024 * 1024) {
        setErro("O arquivo deve ter no máximo 100MB");
        return;
      }
      setArquivo(file);
    }
  };

  const removeFile = () => {
    setArquivo(null);
  };

  const handleTipoExameChange = (e) => {
    setTipoExame(e.target.value);
  };

  const handleNomePacienteChange = (e) => {
    setNomePaciente(e.target.value);
    if (pacienteSelecionado) {
      setPacienteSelecionado(null); // Limpar seleção se o nome for alterado
    }
  };

  // Loading state para carregamento do exame
  if (isEdicao && loadingExame) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando dados do exame...</p>
        </div>
      </div>
    );
  }

  // Adicione esta função no seu componente
  const handleArquivoChange = (e) => {
    const file = e.target.files[0]; // Pegar apenas o primeiro arquivo

    if (file) {

      // Validações no frontend
      if (file.type !== "application/pdf") {
        setErro("Apenas arquivos PDF são permitidos");
        e.target.value = ""; // Limpar o input
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setErro("Arquivo muito grande. Tamanho máximo: 10MB");
        e.target.value = ""; // Limpar o input
        return;
      }

      setArquivo(file);
      setErro(""); // Limpar erro anterior
    } else {
      setArquivo(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/exames")}
              className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors"
            >
              <IoArrowBack className="text-lg" />
              <span className="font-medium">Voltar</span>
            </button>

            <div className="hidden md:block h-6 w-px bg-gray-200"></div>

            <h1 className="text-2xl font-bold text-gray-900">
              {isEdicao ? "Editar Exame" : "Novo Exame"}
            </h1>
          </div>
        </div>

        {/* Mensagens de feedback */}
        {erro && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
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
        {mensagem && (
          <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4 rounded-lg">
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
              <p className="text-green-700">{mensagem}</p>
            </div>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden"
        >
          {/* Seção Informações Básicas */}
          <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-gray-50 backdrop-blur-sm">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              {isEdicao ? (
                <IoSaveOutline className="text-blue-600" />
              ) : (
                <IoAddCircleOutline className="text-blue-600" />
              )}
              Informações Básicas
            </h2>
          </div>
          <div className="p-6 space-y-6">
            {/* Seção Paciente */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <IoPersonOutline className="text-blue-600" />
                Paciente *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={nomePaciente}
                  onChange={handleNomePacienteChange}
                  onFocus={() => {
                    if (nomePaciente && !pacienteSelecionado) {
                      setShowPacientesDropdown(true);
                    }
                  }}
                  className="w-full px-4 py-3 border border-gray-200 text-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Digite o nome do paciente"
                  required
                />
                {showPacientesDropdown && pacientes.length > 0 && (
                  <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-100 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {pacientes.map((paciente) => (
                      <li
                        key={paciente._id}
                        onClick={() => selecionarPaciente(paciente)}
                        className="px-4 py-3 hover:bg-blue-50 cursor-pointer transition-colors flex items-center gap-3"
                      >
                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                          <FaUserAlt className="text-blue-600 text-sm" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {paciente.nome}
                          </p>
                          <p className="text-sm text-gray-500">
                            {paciente.cpf}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Seção Tipo de Exame */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <IoDocumentTextOutline className="text-blue-600" />
                Tipo de Exame *
              </label>
              <select
                value={tipoExame}
                onChange={handleTipoExameChange}
                className="w-full px-4 py-3 border border-gray-200 text-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none"
                required
              >
                <option value="">Selecione um tipo de exame</option>
                {opcoesTipoExame.map((opcao) => (
                  <option key={opcao.value} value={opcao.value}>
                    {opcao.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Seção Observações */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <GiHeartBeats className="text-blue-600" />
                Observações *
              </label>
              <textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 text-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                rows="3"
                placeholder="Descreva as observações e sintomas apresentados pelo paciente ou informações relevantes sobre o exame"
                required
              />
            </div>
          </div>

          {/* Seção Parâmetros do Exame 
          <div className="px-6 py-4 border-t border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100 backdrop-blur-sm">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <IoPulseOutline className="text-slate-500" />
              Parâmetros do Exame
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Segmento PR (ms)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={segmentoPR}
                    onChange={(e) => setSegmentoPR(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 text-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                    placeholder="120"
                  />
                  <span className="absolute right-3 top-3 text-slate-400">
                    ms
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Frequência Cardíaca (bpm)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={frequenciaCardiaca}
                    onChange={(e) => setFrequenciaCardiaca(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 text-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                    placeholder="75"
                  />
                  <span className="absolute right-3 top-3 text-slate-400">
                    bpm
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Duração QRS (ms)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={duracaoQRS}
                    onChange={(e) => setDuracaoQRS(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 text-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                    placeholder="90"
                  />
                  <span className="absolute right-3 top-3 text-slate-400">
                    ms
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Eixo Médio QRS (°)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="360"
                    value={eixoMedioQRS}
                    onChange={(e) => setEixoMedioQRS(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 text-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                    placeholder="45"
                  />
                  <span className="absolute right-3 top-3 text-slate-400">
                    °
                  </span>
                </div>
              </div>
            </div>
          </div>
          */}

          {/* Seção Dados Antropométricos */}
          <div className="px-6 py-4 border-t border-b border-gray-100 bg-gradient-to-r from-blue-50 to-gray-50 backdrop-blur-sm">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <IoBodyOutline className="text-blue-600" />
              Dados Antropométricos
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <FaRulerVertical className="text-blue-600" />
                  Altura (cm)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={altura}
                    onChange={(e) => setAltura(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 text-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="170"
                  />
                  <span className="absolute right-3 top-3 text-gray-400">
                    cm
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <FaWeight className="text-blue-600" />
                  Peso (kg)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={peso}
                    onChange={(e) => setPeso(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 text-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="70"
                  />
                  <span className="absolute right-3 top-3 text-gray-400">
                    kg
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Seção Arquivo */}
          <div className="px-6 py-4 border-t border-b border-gray-100 bg-gradient-to-r from-blue-50 to-gray-50 backdrop-blur-sm">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FaFileUpload className="text-blue-600" />
              Arquivo do Exame{" "}
              {isEdicao && "(opcional - deixe em branco para manter o atual)"}
            </h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {/* Mostrar arquivo atual em modo de edição */}
              {isEdicao && arquivoAtual && (
                <div className="mb-4 p-3 bg-blue-50 border border-gray-100 rounded-lg">
                  <p className="text-sm font-medium text-gray-900 mb-2">
                    Arquivo atual:
                  </p>
                  <div className="flex items-center gap-2">
                    <FaFileUpload className="text-blue-600" />
                    <a
                      href={arquivoAtual}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline text-sm"
                    >
                      Visualizar arquivo atual
                    </a>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isEdicao ? "Novo arquivo (opcional)" : "Selecione o arquivo"}{" "}
                  (PDF, JPG, PNG)
                </label>

                {arquivo ? (
                  <div className="border border-gray-100 rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                          <FaFileUpload className="text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {arquivo.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {(arquivo.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={removeFile}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <IoClose className="text-lg" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer bg-gray-50 hover:bg-blue-50 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <FaFileUpload className="text-2xl text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500">
                        Clique para selecionar ou arraste o arquivo
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Tamanho máximo: 100MB
                      </p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleArquivoChange}
                      accept=".pdf,.jpg,.jpeg,.png"
                    />
                  </label>
                )}
              </div>
            </div>
          </div>

          {/* Botão de Envio */}
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 rounded-lg font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2 ${
                isLoading
                  ? "bg-gray-400"
                  : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg"
              }`}
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5 text-white"
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
                  <span>{isEdicao ? "Atualizando..." : "Processando..."}</span>
                </>
              ) : (
                <>
                  {isEdicao ? (
                    <IoSaveOutline className="text-lg" />
                  ) : (
                    <IoAddCircleOutline className="text-lg" />
                  )}
                  <span>{isEdicao ? "Atualizar Exame" : "Criar Exame"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CriarExame;
