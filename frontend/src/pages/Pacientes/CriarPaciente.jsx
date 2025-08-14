import React, { useState, useEffect } from "react";
import api from "../../api";
import { useParams, useNavigate } from "react-router-dom";
import {
  IoArrowBack,
  IoPersonOutline,
  IoDocumentTextOutline,
  IoCalendarOutline,
  IoLocationOutline,
  IoCallOutline,
  IoMailOutline,
  IoTimeOutline,
  IoDownloadOutline,
  IoEyeOutline,
  IoShieldCheckmarkOutline,
} from "react-icons/io5";
import {
  FaUserAlt,
  FaIdCard,
  FaHistory,
  FaFileMedicalAlt,
  FaStethoscope,
  FaCheckCircle,
  FaFilePdf,
} from "react-icons/fa";
import { useAuth } from "../../contexts/AuthContext";
import DatePicker from "react-datepicker";
import { formatarData, formatarDataHora, calcularIdade, formatarDataISO } from "../../utils/dateUtils";

const CriarPaciente = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { logout, tenant_id, usuario, temRole } = useAuth();
  const [formData, setFormData] = useState({
    nome: "",
    cpf: "",
    dataNascimento: "",
    endereco: "",
    telefone: "",
    email: "",
  });
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("dados");
  const [laudos, setLaudos] = useState([]);
  const [loadingLaudos, setLoadingLaudos] = useState(false);

  // Verifica se o usuário pode editar
  const podeEditar = () => {
    return usuario?.role !== "medico";
  };

  // Função para converter data ISO (yyyy-mm-dd) para brasileira (dd/mm/yyyy)
  const converterDataParaBrasileira = (dataISO) => {
    if (!dataISO) return '';
    
    // Se já estiver no formato brasileiro, retornar como está
    if (dataISO.includes('/')) return dataISO;
    
    // Se estiver no formato ISO
    if (dataISO.includes('-')) {
      const [ano, mes, dia] = dataISO.split('-');
      return `${dia}/${mes}/${ano}`;
    }
    
    return dataISO;
  };

  // Função para converter data brasileira (dd/mm/yyyy) para ISO (yyyy-mm-dd) para envio ao backend
  const converterDataParaISO = (dataBrasileira) => {
    if (!dataBrasileira || dataBrasileira.length !== 10) return '';
    
    const [dia, mes, ano] = dataBrasileira.split('/');
    if (dia && mes && ano && ano.length === 4) {
      return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
    }
    return '';
  };

  // Sistema de cores moderno - Blue/Gray
  const COLORS = {
    primary: "#2563eb", // blue-600
    primaryLight: "#60a5fa", // blue-400
    primaryDark: "#1d4ed8", // blue-700
    secondary: "#10B981", // emerald-500
    accent: "#6366f1", // indigo-500
    warning: "#F59E0B",
    danger: "#EF4444",
    background: "#f9fafb", // gray-50
    cardBg: "#FFFFFF",
    text: "#0f172a", // slate-900
    muted: "#64748b", // slate-500
    border: "#e2e8f0", // slate-200
  };

  useEffect(() => {
    if (id) {
      const fetchPaciente = async () => {
        try {
          setIsLoading(true);
          setErro("");

          const response = await api.get(`/pacientes/${id}`);
          const pacienteData = response.data;
          
          // Garantir que a data esteja no formato brasileiro para exibição
          if (pacienteData.dataNascimento) {
            // Converter data ISO para formato brasileiro
            pacienteData.dataNascimento = converterDataParaBrasileira(pacienteData.dataNascimento);
          }
          
          setFormData(pacienteData);
        } catch (err) {
          if (err.response?.status === 401) {
            setErro("Sessão expirada. Redirecionando para login...");
            setTimeout(() => logout(), 2000);
          } else {
            setErro("Erro ao carregar dados do paciente. Tente novamente.");
          }
        } finally {
          setIsLoading(false);
        }
      };
      fetchPaciente();
    }
  }, [id, logout]);

  useEffect(() => {
    if (id && activeTab === "historico") {
      fetchLaudos();
    }
  }, [id, activeTab]);

  const handleApiError = (err, defaultMessage) => {
    if (err.response?.status === 401) {
      setErro("Sessão expirada. Redirecionando para login...");
      setTimeout(() => logout(), 2000);
    } else {
      setErro(err.response?.data?.message || defaultMessage);
    }
  };

  const fetchLaudos = async () => {
    try {
      setLoadingLaudos(true);
      setErro("");
      const response = await api.get(`/laudos/pacientes/${id}`);

      // Ajuste para a nova estrutura de retorno
      const laudosData = response.data?.laudos || [];

      setLaudos(laudosData);
    } catch (err) {
      console.error('Erro ao buscar laudos:', err);
      handleApiError(
        err,
        "Erro ao carregar histórico de laudos. Tente novamente.",
      );
      setLaudos([]);
    } finally {
      setLoadingLaudos(false);
    }
  };

  // Função para download de laudo (baseada na implementação do DetalhesLaudo)
  const handleDownloadLaudo = async (laudo, tipo = "assinado") => {
    try {
      setLoadingLaudos(true);
      setErro("");

      // Para laudo assinado, verificar se existe arquivo
      if (tipo === "assinado") {
        const url = laudo.arquivoPath || laudo.laudoAssinado;
        if (!url) {
          throw new Error("Laudo assinado não disponível");
        }

        // Se for uma URL do UploadCare (contém ucarecdn.com)
        if (url.includes("ucarecdn.com")) {
          try {
            const response = await fetch(url);
            const blob = await response.blob();
            
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = blobUrl;
            link.setAttribute("download", `laudo_assinado_${laudo._id || laudo.id}.pdf`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            window.URL.revokeObjectURL(blobUrl);
            
            setMensagem("Download do laudo assinado iniciado");
            return;
          } catch (fetchError) {
            console.warn('Erro no fetch do UploadCare, usando endpoint da API:', fetchError);
            // Se falhar no UploadCare, continuar para usar endpoint da API
          }
        }
      }

      // Para laudo original ou se não for URL do UploadCare, usar endpoint da API
      const endpoint = tipo === "assinado" ? "download/assinado" : "download/original";
      const laudoId = laudo._id || laudo.id;
      
      const response = await api.get(`/laudos/${laudoId}/${endpoint}`, {
        responseType: "blob",
      });

      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute("download", `laudo_${tipo}_${laudoId}.pdf`);
      document.body.appendChild(link);
      link.click();

      // Limpeza
      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(link);

      setMensagem(`Download do laudo ${tipo} iniciado`);

    } catch (err) {
      console.error(`❌ Erro no download do laudo ${tipo}:`, err);
      
      if (err.response?.status === 401) {
        setErro("Sessão expirada. Redirecionando para login...");
        setTimeout(() => logout(), 2000);
      } else if (err.response?.status === 404) {
        setErro(`Laudo ${tipo} não encontrado ou não disponível`);
      } else if (err.response?.status === 501) {
        setErro(`Funcionalidade de download ${tipo} não implementada no servidor`);
      } else {
        setErro(err.response?.data?.erro || err.message || `Erro ao fazer download do laudo ${tipo}`);
      }
    } finally {
      setLoadingLaudos(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDateChange = (e) => {
    let { value } = e.target;
    
    // Remove tudo que não for número
    value = value.replace(/\D/g, '');
    
    // Aplica a máscara dd/mm/yyyy
    if (value.length >= 2) {
      value = value.substring(0, 2) + '/' + value.substring(2);
    }
    if (value.length >= 5) {
      value = value.substring(0, 5) + '/' + value.substring(5, 9);
    }
    
    setFormData((prev) => ({
      ...prev,
      dataNascimento: value,
    }));
  };

  const formatarCPF = (value) => {
    return value
      .replace(/\D/g, "")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})/, "$1-$2")
      .replace(/(-\d{2})\d+?$/, "$1");
  };

  const formatarTelefone = (value) => {
    return value
      .replace(/\D/g, "")
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2")
      .replace(/(-\d{4})\d+?$/, "$1");
  };

  const validarFormulario = () => {
    if (formData.cpf.replace(/\D/g, "").length !== 11) {
      setErro("CPF inválido. Deve conter 11 dígitos.");
      return false;
    }

    if (!formData.dataNascimento) {
      setErro("Data de nascimento é obrigatória.");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Verificar se o usuário pode editar
    if (!podeEditar()) {
      setErro("Você não tem permissão para editar dados de pacientes.");
      return;
    }

    if (!validarFormulario()) {
      return;
    }

    setIsLoading(true);
    setErro("");
    setMensagem("");

    try {
      // Extrair o tenant_id correto - para usuários normais, pegar o primeiro do array
      const tenantIdParaEnvio = Array.isArray(tenant_id) ? tenant_id[0] : tenant_id;
      
      const pacienteData = {
        nome: formData.nome,
        cpf: formData.cpf,
        dataNascimento: converterDataParaISO(formData.dataNascimento), // Converter para ISO antes de enviar
        endereco: formData.endereco,
        telefone: formData.telefone,
        email: formData.email,
        tenant_id: tenantIdParaEnvio,
      };

      const response = id
        ? await api.put(`/pacientes/${id}`, pacienteData)
        : await api.post("/pacientes", pacienteData);

      if (response.data.success) {
        setMensagem(
          id
            ? "Paciente atualizado com sucesso!"
            : "Paciente cadastrado com sucesso!",
        );
        setTimeout(() => navigate("/pacientes"), 1500);
      } else {
        setErro(response.data.erro || "Operação concluída, mas com avisos.");
      }
    } catch (err) {
      console.error("Erro na requisição:");

      if (err.response?.status === 401) {
        setErro("Sessão expirada. Redirecionando para login...");
        setTimeout(() => logout(), 2000);
      } else if (err.response?.data?.erro) {
        setErro(err.response.data.erro);
      } else if (err.response?.data?.errors) {
        const errorMessages = err.response.data.errors
          .map((e) => e.msg)
          .join(", ");
        setErro(`Erro de validação: ${errorMessages}`);
      } else {
        setErro(err.message || "Erro ao salvar paciente. Tente novamente.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && id && activeTab === "dados") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-700 font-medium">
            Carregando dados do paciente...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/pacientes")}
              className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors"
            >
              <IoArrowBack className="text-lg" />
              <span className="font-medium">Voltar</span>
            </button>

            <div className="hidden md:block h-6 w-px bg-gray-300"></div>

            <h1 className="text-2xl font-bold text-gray-800">
              {id
                ? temRole('medico')
                  ? "Visualizar Paciente"
                  : "Editar Paciente"
                : "Cadastrar Novo Paciente"}
            </h1>
          </div>

          {/* Badge de Permissão para Médicos */}
          {temRole('medico') && id && (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 text-amber-800 rounded-lg border border-amber-200">
              <IoEyeOutline className="text-sm" />
              <span className="text-sm font-medium">Somente Visualização</span>
            </div>
          )}
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

        {/* Abas */}
        {id && (
          <div className="mb-6 border-b border-gray-200 bg-white rounded-t-xl">
            <nav className="-mb-px flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab("dados")}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === "dados"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-blue-600 hover:border-gray-300"
                }`}
              >
                <FaUserAlt className="text-xs" />
                Dados do Paciente
              </button>
              <button
                onClick={() => setActiveTab("historico")}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === "historico"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-blue-600 hover:border-gray-300"
                }`}
              >
                <FaHistory className="text-xs" />
                Histórico de Laudos
              </button>
            </nav>
          </div>
        )}

        {activeTab === "dados" ? (
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
          >
            {/* Seção Informações Pessoais */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-gray-50">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <FaUserAlt className="text-blue-600" />
                Informações Pessoais
              </h2>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Campo Nome */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <IoPersonOutline className="text-blue-600" />
                  Nome Completo *
                </label>
                <input
                  type="text"
                  name="nome"
                  value={formData.nome}
                  onChange={handleChange}
                  disabled={!podeEditar()}
                  className={`w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                    !podeEditar() ? "bg-gray-50 cursor-not-allowed" : ""
                  }`}
                  placeholder="Digite o nome completo"
                  required
                />
              </div>

              {/* Campo CPF */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <FaIdCard className="text-blue-600" />
                  CPF *
                </label>
                <input
                  type="text"
                  name="cpf"
                  value={formatarCPF(formData.cpf)}
                  onChange={(e) => {
                    if (podeEditar()) {
                      const formatted = formatarCPF(e.target.value);
                      setFormData((prev) => ({
                        ...prev,
                        cpf: formatted,
                      }));
                    }
                  }}
                  disabled={!podeEditar()}
                  className={`w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                    !podeEditar() ? "bg-gray-50 cursor-not-allowed" : ""
                  }`}
                  placeholder="000.000.000-00"
                  maxLength="14"
                  required
                />
              </div>

              {/* Campo Data de Nascimento */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <IoCalendarOutline className="text-blue-600" />
                  Data de Nascimento *
                </label>
                <input
                  type="text"
                  name="dataNascimento"
                  value={formData.dataNascimento || ''}
                  onChange={handleDateChange}
                  disabled={!podeEditar()}
                  className={`w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                    !podeEditar() ? "bg-gray-50 cursor-not-allowed" : ""
                  }`}
                  placeholder="dd/mm/aaaa"
                  maxLength="10"
                  required
                />
                {formData.dataNascimento && formData.dataNascimento.length === 10 && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-gray-500">
                      Idade: {calcularIdade(converterDataParaISO(formData.dataNascimento)) || 'Não calculável'} anos
                    </span>
                  </div>
                )}
              </div>

              {/* Campo Endereço */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <IoLocationOutline className="text-blue-600" />
                  Endereço Completo *
                </label>
                <input
                  type="text"
                  name="endereco"
                  value={formData.endereco}
                  onChange={handleChange}
                  disabled={!podeEditar()}
                  className={`w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                    !podeEditar() ? "bg-gray-50 cursor-not-allowed" : ""
                  }`}
                  placeholder="Digite o endereço completo"
                  required
                />
              </div>
            </div>

            {/* Seção Informações de Contato */}
            <div className="px-6 py-4 border-t border-b border-gray-200 bg-gradient-to-r from-blue-50 to-gray-50">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <IoCallOutline className="text-blue-600" />
                Informações de Contato
              </h2>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Campo Telefone */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <IoCallOutline className="text-blue-600" />
                  Telefone *
                </label>
                <input
                  type="text"
                  name="telefone"
                  value={formatarTelefone(formData.telefone)}
                  onChange={(e) => {
                    if (podeEditar()) {
                      const formatted = formatarTelefone(e.target.value);
                      setFormData((prev) => ({
                        ...prev,
                        telefone: formatted,
                      }));
                    }
                  }}
                  disabled={!podeEditar()}
                  className={`w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                    !podeEditar() ? "bg-gray-50 cursor-not-allowed" : ""
                  }`}
                  placeholder="(00) 00000-0000"
                  maxLength="15"
                />
              </div>

              {/* Campo Email */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <IoMailOutline className="text-blue-600" />
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={!podeEditar()}
                  className={`w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                    !podeEditar() ? "bg-gray-50 cursor-not-allowed" : ""
                  }`}
                  placeholder="Digite o email"
                />
              </div>
            </div>

            {/* Botão de Envio - Só aparece se pode editar */}
            {podeEditar() && (
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full py-3 rounded-lg font-semibold text-white transition-all flex items-center justify-center gap-2 ${
                    isLoading
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-sm"
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
                      <span>Processando...</span>
                    </>
                  ) : (
                    <>
                      <IoDocumentTextOutline className="text-lg" />
                      <span>
                        {id ? "Atualizar Paciente" : "Cadastrar Paciente"}
                      </span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Mensagem para médicos */}
            {!podeEditar() && (
              <div className="px-6 py-4 border-t border-gray-200 bg-amber-50">
                <div className="flex items-center justify-center gap-2 text-amber-800">
                  <IoShieldCheckmarkOutline className="text-lg" />
                  <span className="font-medium">
                    Dados protegidos - Somente visualização permitida
                  </span>
                </div>
              </div>
            )}
          </form>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-gray-50">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <FaHistory className="text-blue-600" />
                Histórico de Laudos
              </h2>
            </div>

            {/* Lista de laudos */}
            {loadingLaudos ? (
              <div className="p-8 flex justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600 text-sm">
                    Carregando histórico...
                  </p>
                </div>
              </div>
            ) : laudos.length === 0 ? (
              <div className="p-8 text-center">
                <FaFileMedicalAlt className="text-4xl text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">
                  Nenhum laudo encontrado
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  Este paciente ainda não possui laudos médicos registrados.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {laudos.map((laudo, index) => (
                  <div
                    key={laudo.id}
                    className="p-6 hover:bg-gray-50 transition-colors group"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex items-center gap-2">
                            <FaFileMedicalAlt className="text-blue-600" />
                            <h3 className="font-semibold text-gray-800">
                              Laudo #{laudo.id}
                            </h3>
                          </div>
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${
                              laudo.status === "Laudo assinado"
                                ? "bg-green-100 text-green-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {laudo.status === "Laudo assinado"
                              ? "Assinado"
                              : "Pendente"}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                          <div className="flex items-center gap-2">
                            <IoCalendarOutline className="text-gray-400" />
                            <span>
                              {formatarDataHora(laudo.createdAt)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FaStethoscope className="text-gray-400" />
                            <span>
                              {laudo.medicoResponsavel ||
                                "Médico não informado"}
                            </span>
                          </div>
                        </div>

                        {laudo.conclusao && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <p className="text-sm text-gray-700 line-clamp-3">
                              <span className="font-medium text-gray-800">
                                Conclusão:{" "}
                              </span>
                              {laudo.conclusao}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="ml-4 flex flex-col gap-2">
                        <button
                          onClick={() => navigate(`/laudos/${laudo.id}`)}
                          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-all flex items-center gap-2"
                        >
                          <IoEyeOutline className="text-sm" />
                          Ver Detalhes
                        </button>

                        {(laudo.arquivoPath || laudo.laudoAssinado) && (
                          <button
                            onClick={() => handleDownloadLaudo(laudo, "assinado")}
                            disabled={loadingLaudos}
                            className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-100 transition-all flex items-center gap-2 border border-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <IoDownloadOutline className="text-sm" />
                            {loadingLaudos ? "Baixando..." : "Download Assinado"}
                          </button>
                        )}

                        {/* Botão para download do laudo original sempre disponível */}
                        <button
                          onClick={() => handleDownloadLaudo(laudo, "original")}
                          disabled={loadingLaudos}
                          className="px-4 py-2 bg-gray-50 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-100 transition-all flex items-center gap-2 border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <FaFilePdf className="text-sm text-red-500" />
                          {loadingLaudos ? "Baixando..." : "Download Original"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CriarPaciente;
