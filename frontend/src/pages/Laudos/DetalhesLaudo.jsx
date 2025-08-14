import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  IoArrowBack,
  IoCloudUploadOutline,
  IoReload,
  IoMail,
  IoDocumentTextOutline,
  IoDownloadOutline,
  IoPersonOutline,
  IoCalendarOutline,
  IoTimeOutline,
  IoCloseOutline,
  IoCloseCircleOutline,
  IoLayers,
} from "react-icons/io5";
import {
  FaFilePdf,
  FaCheckCircle,
  FaFileMedicalAlt,
  FaStethoscope,
  FaUserAlt,
  FaExclamationTriangle,
  FaInfoCircle,
  FaHistory,
  FaBuilding,
  FaDownload, // Ícone de download
  FaCalendarAlt,
  FaClock,
  FaUserMd,
  FaCog,
  FaEdit,
  FaShieldAlt,
} from "react-icons/fa";
import { useAuth } from "../../contexts/AuthContext";
import Modal from "react-modal";
import api from "../../api";
import ModalAssinatura from "../../components/ModalAssinatura";

// Configuração do modal para acessibilidade
Modal.setAppElement("#root");

const DetalhesLaudo = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { usuario, logout, temRole } = useAuth();

  // Estados principais
  const [laudo, setLaudo] = useState(null);
  const [paciente, setPaciente] = useState(null);
  const [empresa, setEmpresa] = useState(null);
  const [historicoVersoes, setHistoricoVersoes] = useState([]);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState({ texto: "", tipo: "" });
  const [isLoading, setIsLoading] = useState(false);

  // Estados para upload
  const fileInputRef = useRef(null);
  const [arquivoSelecionado, setArquivoSelecionado] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [mostrarUpload, setMostrarUpload] = useState(false);

  // Estados para refazer laudo
  const [modalRefazerAberto, setModalRefazerAberto] = useState(false);
  const [novaConclusao, setNovaConclusao] = useState("");
  const [motivoRefacao, setMotivoRefacao] = useState("");

  // Estados para email
  const [estaEnviandoEmail, setEstaEnviandoEmail] = useState(false);
  const [mostrarHistorico, setMostrarHistorico] = useState(false);

  // Estados para assinatura
  const [mostrarModalAssinatura, setMostrarModalAssinatura] = useState(false);
  const [certificadosDisponiveis, setCertificadosDisponiveis] = useState([]);
  const [temAssinaturaFisica, setTemAssinaturaFisica] = useState(false);

  // Paleta de cores moderna - atualizada para o padrão azul/cinza
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

  // Buscar dados do laudo
  const fetchLaudoData = async () => {
    try {
      setIsLoading(true);
      setErro("");

      // Buscar laudo
      const responseLaudo = await api.get(`/laudos/${id}`);

      setLaudo(responseLaudo.data);
      setNovaConclusao(responseLaudo.data.conclusao);

      // O paciente já vem no populate do exame
      if (responseLaudo.data.exame?.paciente) {
        setPaciente(responseLaudo.data.exame.paciente);
      }

      // A empresa já vem no populate do tenant_id
      if (responseLaudo.data.tenant_id) {
        setEmpresa(responseLaudo.data.tenant_id);
      }

      // Buscar histórico
      try {
        const responseHistorico = await api.get(`/laudos/${id}/historico`);
        setHistoricoVersoes(responseHistorico.data.historico || []);
      } catch (histError) {
        console.error("Erro ao buscar histórico:", histError.message);
        setHistoricoVersoes([]);
      }
    } catch (err) {
      console.error("Erro completo:", err.message);

      if (err.response?.status === 401) {
        setErro("Sessão expirada. Redirecionando para login...");
        setTimeout(() => logout(), 2000);
      } else if (err.response?.status === 404) {
        setErro("Laudo não encontrado");
      } else {
        setErro(
          err.response?.data?.erro ||
            err.response?.data?.message ||
            "Erro ao carregar dados do laudo",
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLaudoData();
    carregarCertificados();
    verificarAssinaturaFisica();
  }, [id, modalRefazerAberto]);

  // Carregar certificados disponíveis
  const carregarCertificados = async () => {
    try {
      const response = await api.get('/certificados/meus');
      
      // Filtrar certificados que podem ser usados para assinatura
      const certificadosDisponiveis = response.data.certificados || [];
      setCertificadosDisponiveis(certificadosDisponiveis);
    } catch (error) {
      console.error('Erro ao carregar certificados:', error.message);
    }
  };

  // Verificar se o médico tem assinatura física cadastrada
  const verificarAssinaturaFisica = async () => {
    try {
      const response = await api.get('/assinaturas/fisica/verificar');
      setTemAssinaturaFisica(response.data.temAssinatura);
    } catch (error) {
      console.error('Erro ao verificar assinatura física:', error.message);
      setTemAssinaturaFisica(false);
    }
  };

  // Fetch tenant details if not already fetched
  useEffect(() => {
    if (
      (temRole('medico') || temRole('adminMaster')) &&
      laudo?.tenant_id &&
      !empresa
    ) {
      const fetchTenantDetails = async () => {
        try {
          const response = await api.get(`/empresas/${laudo.tenant_id}`);
          setEmpresa(response.data);
        } catch (error) {
          console.error("Erro ao buscar empresa:", error);
        }
      };
      fetchTenantDetails();
    }
  }, [laudo, usuario.role, empresa]);

  // Função para refazer laudo
  const handleRefazerLaudo = async () => {
    if (!novaConclusao.trim()) {
      setErro("A nova conclusão é obrigatória");
      return;
    }

    if (novaConclusao.trim().length < 10) {
      setErro("A conclusão deve conter pelo menos 10 caracteres");
      return;
    }

    try {
      setIsLoading(true);
      setErro("");
      setMensagem({ texto: "Refazendo laudo...", tipo: "info" });

      const response = await api.post(`/laudos/${id}/refazer`, {
        conclusao: novaConclusao.trim(),
        motivo: motivoRefacao,
      });

      const novoLaudoData = response.data.laudo;
      
      // **NOVO: Sempre redirecionar para o novo laudo criado**
      // O backend agora sempre retorna redirect: true
      if (response.data.redirect && response.data.redirectTo) {
        // Fechar modal de refação
        setModalRefazerAberto(false);
        
        // Mostrar mensagem de sucesso
        setMensagem({
          texto: response.data.mensagem || "Laudo refeito com sucesso! Redirecionando para o novo laudo.",
          tipo: "sucesso",
        });

        // Redirecionar para o novo laudo após pequeno delay para mostrar a mensagem
        setTimeout(() => {
          navigate(`/laudos/${novoLaudoData.id || novoLaudoData._id}`);
        }, 1500);
      } else {
        // Fallback caso não tenha redirect (manter comportamento anterior por segurança)
        navigate(`/laudos/${novoLaudoData.id || novoLaudoData._id}`);
        setMensagem({
          texto: "Laudo refeito com sucesso! Novo laudo criado.",
          tipo: "sucesso",
        });
      }

    } catch (error) {
      console.error("Erro ao refazer laudo:", error);
      setErro(
        error.response?.data?.erro || 
        error.response?.data?.detalhes || 
        "Erro ao refazer laudo"
      );
      setMensagem({ texto: "Erro ao refazer laudo", tipo: "erro" });
    } finally {
      setIsLoading(false);
    }
  };

  // Função para download de laudo - CORRIGIDA PARA DOWNLOADS DIRETOS
  const handleDownloadLaudo = async (tipo) => {
    try {
      setIsLoading(true);
      setErro("");

      // Para laudo assinado, verificar se existe arquivo UploadCare legado
      if (tipo === "assinado") {
        const url = laudo.arquivoPath || laudo.laudoAssinado;
        if (url && url.includes("ucarecdn.com")) {
          try {
            const response = await fetch(url);
            const blob = await response.blob();
            
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = blobUrl;
            link.setAttribute("download", `laudo_assinado_${laudo._id}.pdf`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            window.URL.revokeObjectURL(blobUrl);
            
            setMensagem({
              texto: "Download do laudo assinado iniciado",
              tipo: "info",
            });
            return;
          } catch (fetchError) {
            console.warn('Erro no fetch do UploadCare, usando endpoint da API:', fetchError);
          }
        }
      }

      // Usar endpoint da API para download direto (S3 streaming)
      const endpoint = tipo === "assinado" ? "download/assinado" : "download/original";
      
      const response = await api.get(`/laudos/${laudo._id}/${endpoint}`, {
        responseType: "blob",
      });

      // Criar blob e fazer download direto
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute("download", `laudo_${tipo}_${laudo._id}.pdf`);
      document.body.appendChild(link);
      link.click();

      // Limpeza
      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(link);

      setMensagem({
        texto: `Download do laudo ${tipo} iniciado com sucesso`,
        tipo: "sucesso",
      });

    } catch (err) {
      console.error(`❌ Erro no download do laudo ${tipo}:`, err);
      
      if (err.response?.status === 401) {
        setErro("Sessão expirada. Redirecionando para login...");
        setTimeout(() => logout(), 2000);
      } else if (err.response?.status === 404) {
        setErro(`Laudo ${tipo} não encontrado ou não disponível`);
      } else if (err.response?.status === 501) {
        setErro(`Funcionalidade de download ${tipo} temporariamente indisponível`);
      } else {
        setErro(err.response?.data?.erro || err.message || `Erro ao baixar laudo ${tipo}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Funções para upload de arquivo
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type !== "application/pdf") {
        setErro("Por favor, envie um arquivo PDF");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setErro("O arquivo deve ter no máximo 5MB");
        return;
      }
      setArquivoSelecionado(file);
      setErro("");
      setMensagem({ texto: `Arquivo selecionado: ${file.name}`, tipo: "info" });
    }
  };

  const handleEnviarArquivo = async () => {
    if (!arquivoSelecionado) {
      setErro("Nenhum arquivo selecionado");
      return;
    }

    try {
      setIsLoading(true);
      setErro("");
      setMensagem({ texto: "Enviando arquivo...", tipo: "info" });

      const formData = new FormData();
      formData.append("signedFile", arquivoSelecionado);

      const response = await api.post(`/laudos/${id}/upload-assinado`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total,
          );
          setUploadProgress(percentCompleted);
        },
      });

      // Atualizar estado do laudo com os dados retornados
      setLaudo(prev => ({
        ...prev,
        status: "Laudo assinado",
        arquivoPath: response.data.laudo.arquivoPath,
        dataAssinatura: response.data.laudo.dataAssinatura,
        assinadoDigitalmente: false,
        assinadoCom: 'upload_manual'
      }));

      setMensagem({
        texto: "Laudo assinado enviado com sucesso!",
        tipo: "sucesso",
      });

      setArquivoSelecionado(null);
      setUploadProgress(0);
      setMostrarUpload(false);

      // Atualizar dados do laudo
      await fetchLaudoData();

    } catch (err) {
      console.error('Erro no upload:', err);
      
      if (err.response?.status === 401) {
        setErro("Sessão expirada. Redirecionando para login...");
        setTimeout(() => logout(), 2000);
      } else if (err.response?.status === 400) {
        setErro(err.response.data?.erro || "Dados inválidos para upload");
      } else if (err.response?.status === 403) {
        setErro("Você não tem permissão para fazer upload neste laudo");
      } else if (err.response?.status === 404) {
        setErro("Laudo não encontrado");
      } else {
        setErro(err.response?.data?.erro || err.response?.data?.message || "Erro ao enviar laudo assinado");
      }
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  };

  // Função para enviar email
  const handleEnviarEmail = async () => {
    try {
      setEstaEnviandoEmail(true);
      setErro("");
      setMensagem({ texto: "", tipo: "" });

      // Verificação básica antes de enviar
      if (!(laudo?.arquivoPath || laudo?.laudoAssinado)) {
        throw new Error(
          "O laudo precisa estar assinado antes de enviar por e-mail",
        );
      }

      // Enviar o e-mail do paciente no body
      const destinatario = paciente?.email || "";
      const response = await api.post(`/laudos/${id}/enviar-email`, { email: destinatario });

      // Modo sandbox/teste
      if (response.data?.sandbox) {
        setMensagem({
          texto: "E-mail não enviado (modo teste)",
          tipo: "info",
        });
        return;
      }

      // Atualiza os dados do laudo com a resposta do servidor
      if (response.data.laudo) {
        setLaudo(response.data.laudo);
      }

      // Atualiza o histórico
      try {
        const responseHistorico = await api.get(`/laudos/${id}/historico`);
        setHistoricoVersoes(responseHistorico.data.historico || []);
      } catch (error) {
        console.error("Erro ao atualizar histórico:", error);
        setHistoricoVersoes([]);
      }

      // Feedback para o usuário
      setMensagem({
        texto:
          response.data.message ||
          `E-mail enviado para ${response.data.destinatario}`,
        tipo: "sucesso",
      });
    } catch (error) {
      // Tratamento de erros específicos
      let errorMessage = "Erro ao enviar e-mail";

      if (error.response) {
        // Erros estruturados do backend
        errorMessage =
          error.response.data.error ||
          error.response.data.message ||
          errorMessage;

        // Atualiza o laudo se veio na resposta de erro
        if (error.response.data.laudo) {
          setLaudo(error.response.data.laudo);
        }
      } else if (error.message.includes("timeout")) {
        errorMessage = "O servidor demorou muito para responder";
      } else if (error.request) {
        errorMessage = "Sem resposta do servidor";
      } else {
        errorMessage = error.message || errorMessage;
      }

      setErro(errorMessage);

      // Tenta atualizar o histórico mesmo em caso de erro
      try {
        const responseHistorico = await api.get(`/laudos/${id}/historico`);
        setHistoricoVersoes(responseHistorico.data.historico || []);
      } catch (err) {
        console.error("Erro ao buscar histórico:", err);
        setHistoricoVersoes([]);
      }
    } finally {
      setEstaEnviandoEmail(false);
    }
  };

  // Handle automatic signing from modal or button
  const handleAssinarAutomaticamente = async (senhaCertificado = null) => {
    try {
      setIsLoading(true);
      setErro("");
      setMensagem({ texto: "Assinando automaticamente...", tipo: "info" });

      // Se não foi passada senha, fazer requisição sem senha (para assinatura automática)
      const requestBody = senhaCertificado ? { senhaCertificado } : {};

      const response = await api.post(
        `/laudos/${id}/assinar-automaticamente`,
        requestBody,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        },
      );

      // Update laudo state
      setLaudo(prev => ({
        ...prev,
        status: 'Laudo assinado',
        arquivoPath: response.data.laudo.arquivoPath,
        dataAssinatura: response.data.laudo.dataAssinatura,
        assinadoDigitalmente: true,
        assinadoCom: 'certificado_medico'
      }));

      setMostrarModalAssinatura(false);
      setMensagem({ texto: "Laudo assinado automaticamente com sucesso!", tipo: "sucesso" });

      // Refresh the data
      await fetchLaudoData();

    } catch (err) {
      console.error("Erro ao assinar automaticamente:", err.message);
      setErro(err.response?.data?.erro || "Erro ao assinar o laudo automaticamente");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle signing with physical image
  const handleAssinarComImagemFisica = async () => {
    try {
      setIsLoading(true);
      setErro("");
      setMensagem({ texto: "Assinando com imagem física...", tipo: "info" });

      const response = await api.post(
        `/laudos/${id}/assinar-com-imagem-fisica`,
        {},
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        },
      );

      // Update laudo state
      setLaudo(prev => ({
        ...prev,
        status: 'Laudo assinado',
        arquivoPath: response.data.laudo.url,
        dataAssinatura: new Date().toISOString(),
        tipoAssinatura: 'fisica',
        assinadoDigitalmente: false,
        assinadoCom: 'upload_manual'
      }));

      setMostrarModalAssinatura(false);
      setMensagem({ texto: "Laudo assinado com imagem física com sucesso!", tipo: "sucesso" });

      // Refresh the data
      await fetchLaudoData();

    } catch (err) {
      console.error("Erro ao assinar com imagem física:", err.message);
      setErro(err.response?.data?.erro || "Erro ao assinar o laudo com imagem física");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle manual signing
  const handleAssinarManualmente = async (senhaCertificado) => {
    try {
      setIsLoading(true);
      setErro("");
      setMensagem({ texto: "Assinando manualmente...", tipo: "info" });

      const response = await api.post(
        `/laudos/${id}/assinar-manual`,
        { senhaCertificado },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        },
      );

      // Update laudo state
      setLaudo(prev => ({
        ...prev,
        status: 'Laudo assinado',
        arquivoPath: response.data.laudo.arquivoPath,
        dataAssinatura: response.data.laudo.dataAssinatura,
        assinadoDigitalmente: true,
        assinadoCom: 'certificado_medico'
      }));

      setMensagem({ texto: "Laudo assinado manualmente com sucesso!", tipo: "sucesso" });

      // Refresh the data
      await fetchLaudoData();

    } catch (err) {
      console.error("Erro ao assinar manualmente:", err.message);
      setErro(err.response?.data?.erro || "Erro ao assinar o laudo manualmente");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle upload choice from modal
  const handleEscolherUploadManual = () => {
    setMostrarModalAssinatura(false);
    setMostrarUpload(true);
    setMensagem({ texto: "Selecione o arquivo PDF assinado para fazer upload.", tipo: "info" });
  };

  // Funções auxiliares
  const calcularIdade = (dataNascimento) => {
    if (!dataNascimento) return null;
    const nascimento = new Date(dataNascimento);
    const hoje = new Date();
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const m = hoje.getMonth() - nascimento.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) {
      idade--;
    }
    return idade;
  };

  const obterEnviosEmail = () => {
    if (!Array.isArray(historicoVersoes)) return [];
    const envios = historicoVersoes
      .filter((item) => item && item.acao === "EnvioEmail")
      .sort((a, b) => new Date(b.data) - new Date(a.data));
    return envios || [];
  };

  const obterStatusEmail = () => {
    if (!(laudo?.arquivoPath || laudo?.laudoAssinado)) return null;

    const enviosEmail = obterEnviosEmail();
    if (enviosEmail.length === 0) return null;

    const ultimoEnvio = enviosEmail[0];
    return {
      status: ultimoEnvio.statusEnvio,
      data: ultimoEnvio.data,
      destinatario: ultimoEnvio.destinatarioEmail,
      mensagemErro: ultimoEnvio.mensagemErro,
    };
  };

  // Funções de verificação
  const podeEnviarAssinatura = () => {
    return (
      temRole('medico') &&
      (laudo?.status === "Laudo realizado" || laudo?.status === "Laudo pronto para assinatura") &&
      !laudo?.arquivoPath &&
      !laudo?.laudoAssinado &&
      (laudo?.laudoOriginal || mostrarUpload)
    );
  };

  const podeRefazerLaudo = () => {
    return (
      temRole('medico') &&
      laudo?.status !== "Cancelado" &&
      !laudo?.laudoSubstituto &&
      laudo?.status !== "Laudo refeito"
    );
  };

  const podeReenviarEmail = () => {
    const statusEmail = obterStatusEmail();
    return (
      (laudo?.arquivoPath || laudo?.laudoAssinado) && (statusEmail?.status === "Falha" || !statusEmail)
    );
  };

  const statusEmail = obterStatusEmail();
  const enviosEmail = obterEnviosEmail();

  // Renderização condicional para estados de carregamento e erro
  if (isLoading && !laudo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-700 font-medium">Carregando laudo...</p>
        </div>
      </div>
    );
  }

  if (erro && !laudo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-6 rounded-xl shadow-md max-w-md w-full text-center border border-gray-200">
          <p className="text-red-500 font-medium mb-4">{erro}</p>
          <button
            onClick={() => navigate(-1)}
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-sm"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  if (!laudo) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() =>
                navigate(
                  usuario.role === "adminMaster"
                    ? "/adminmaster/laudos"
                    : "/laudos",
                )
              }
              className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors"
            >
              <IoArrowBack className="text-lg" />
              <span className="font-medium">Voltar</span>
            </button>

            <div className="hidden md:block h-6 w-px bg-gray-300"></div>

            <h1 className="text-2xl font-bold text-gray-800">
              Laudo{" "}
              <span className="text-blue-600">
                #{laudo._id?.toString()?.substring(0, 8)}
              </span>
              {laudo.versao > 1 && (
                <span className="ml-2 text-sm bg-gray-100 text-gray-800 px-2 py-1 rounded-full">
                  Versão {laudo.versao}
                </span>
              )}
            </h1>
          </div>

          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            {/* Botões de Assinatura para "Laudo pronto para assinatura" */}
            {laudo.status === "Laudo pronto para assinatura" && temRole('medico') && (
              <>
                {(certificadosDisponiveis.length > 0 || temAssinaturaFisica) ? (
                  <button
                    onClick={() => setMostrarModalAssinatura(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white transition-all shadow-sm"
                  >
                    <FaShieldAlt />
                    <span>Escolher Método</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setMostrarUpload(true);
                      setMensagem({ texto: "Selecione o arquivo PDF assinado para fazer upload.", tipo: "info" });
                      // Aguardar renderização antes de clicar no input
                      setTimeout(() => {
                        fileInputRef.current?.click();
                      }, 100);
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white transition-all shadow-sm"
                  >
                    <IoCloudUploadOutline />
                    <span>Upload Manual</span>
                  </button>
                )}
              </>
            )}

            {/* Botão Enviar Email */}
            {(laudo.arquivoPath || laudo.laudoAssinado) && (
              <button
                onClick={handleEnviarEmail}
                disabled={estaEnviandoEmail || !podeReenviarEmail()}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all shadow-sm ${
                  estaEnviandoEmail
                    ? "bg-gray-400 cursor-not-allowed"
                    : podeReenviarEmail()
                      ? "bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800"
                      : "bg-gray-200 text-gray-500 cursor-not-allowed"
                } text-white`}
              >
                {estaEnviandoEmail ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4 text-white"
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
                    <span>Enviando...</span>
                  </>
                ) : (
                  <>
                    <IoMail className="text-lg" />
                    <span>Enviar por E-mail</span>
                  </>
                )}
              </button>
            )}

            {/* Botão Refazer Laudo */}
            {podeRefazerLaudo() && (
              <button
                onClick={() => {
                  setModalRefazerAberto(true);
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white transition-all shadow-sm"
              >
                <IoReload />
                <span>Refazer Laudo</span>
              </button>
            )}

            {/* Botões Download - ATUALIZADOS PARA S3 */}
            {/* Botão Original - Disponível apenas se laudo NÃO estiver assinado */}
            {laudo.status !== "Rascunho" && 
             laudo.status !== "Cancelado" && 
             laudo.status !== "Laudo assinado" &&
             !laudo.arquivoPath && 
             !laudo.laudoAssinado && (
              <button
                onClick={() => handleDownloadLaudo("original")}
                disabled={isLoading}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-500 text-gray-600 hover:bg-gray-50 transition-all shadow-sm ${
                  isLoading ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                <FaFilePdf />
                <span>Download Original</span>
              </button>
            )}

            {/* Botão Assinado - Prioritário quando disponível */}
            {(laudo.arquivoPath || laudo.laudoAssinado) && (
              <button
                onClick={() => handleDownloadLaudo("assinado")}
                disabled={isLoading}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white transition-all shadow-sm ${
                  isLoading ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                <FaDownload className="text-lg" />
                <span>Download Laudo</span>
              </button>
            )}
          </div>
        </div>

        {/* Mensagens de feedback */}
        {mensagem.texto && (
          <div
            className={`fixed top-4 right-4 z-50 p-4 rounded-md shadow-lg ${
              mensagem.tipo === "sucesso"
                ? "bg-green-100 text-green-800 border-l-4 border-green-500"
                : "bg-blue-100 text-blue-800 border-l-4 border-blue-500"
            }`}
          >
            <div className="flex items-center gap-2">
              {mensagem.tipo === "sucesso" ? (
                <FaCheckCircle className="text-green-500" />
              ) : (
                <FaInfoCircle className="text-blue-500" />
              )}
              <span>{mensagem.texto}</span>
              <button
                onClick={() => setMensagem({ texto: "", tipo: "" })}
                className="ml-4 text-gray-500 hover:text-gray-700"
              >
                <IoCloseOutline />
              </button>
            </div>
          </div>
        )}

        {/* Status do Laudo e Email */}
        <div className="space-y-4 mb-8">
          {/* Status do Laudo - MODERNIZADO */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-300">
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-gray-50">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <FaFileMedicalAlt className="text-blue-600" />
                Status do Laudo
              </h3>
            </div>

            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                {/* Status Principal */}
                <div className="flex items-center gap-4">
                  <div
                    className={`p-3 rounded-full ${
                      laudo.status === "Laudo assinado"
                        ? "bg-green-100"
                        : laudo.status === "Laudo realizado"
                          ? "bg-gray-100"
                          : laudo.status === "Laudo refeito"
                            ? "bg-yellow-100"
                            : laudo.status === "Laudo em processamento"
                              ? "bg-blue-100"
                              : laudo.status === "Erro ao gerar PDF"
                                ? "bg-red-100"
                                : laudo.status === "Cancelado"
                                  ? "bg-red-100"
                                  : laudo.status === "Rascunho"
                                    ? "bg-purple-100"
                                    : "bg-gray-100"
                    }`}
                  >
                    {laudo.status === "Laudo assinado" && (
                      <FaCheckCircle className="text-2xl text-green-600" />
                    )}
                    {laudo.status === "Laudo realizado" && (
                      <FaFilePdf className="text-2xl text-gray-600" />
                    )}
                    {laudo.status === "Laudo pronto para assinatura" && (
                      <FaShieldAlt className="text-2xl text-blue-600" />
                    )}
                    {laudo.status === "Laudo refeito" && (
                      <IoReload className="text-2xl text-yellow-600" />
                    )}
                    {laudo.status === "Laudo em processamento" && (
                      <FaCog className="text-2xl text-blue-600 animate-spin" />
                    )}
                    {laudo.status === "Erro ao gerar PDF" && (
                      <FaExclamationTriangle className="text-2xl text-red-600" />
                    )}
                    {laudo.status === "Cancelado" && (
                      <IoCloseCircleOutline className="text-2xl text-red-600" />
                    )}
                    {laudo.status === "Rascunho" && (
                      <FaEdit className="text-2xl text-purple-600" />
                    )}
                    {![
                      "Laudo assinado",
                      "Laudo realizado",
                      "Laudo pronto para assinatura",
                      "Laudo refeito",
                      "Laudo em processamento",
                      "Erro ao gerar PDF",
                      "Cancelado",
                      "Rascunho",
                    ].includes(laudo.status) && (
                      <FaInfoCircle className="text-2xl text-gray-600" />
                    )}
                  </div>

                  <div>
                    <div
                      className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium border ${
                        laudo.status === "Laudo assinado"
                          ? "bg-green-50 text-green-800 border-green-200"
                          : laudo.status === "Laudo realizado"
                            ? "bg-gray-50 text-gray-800 border-gray-200"
                            : laudo.status === "Laudo pronto para assinatura"
                              ? "bg-blue-50 text-blue-800 border-blue-200"
                            : laudo.status === "Laudo refeito"
                              ? "bg-yellow-50 text-yellow-800 border-yellow-200"
                              : laudo.status === "Laudo em processamento"
                                ? "bg-blue-50 text-blue-800 border-blue-200"
                                : laudo.status === "Erro ao gerar PDF"
                                  ? "bg-red-50 text-red-800 border-red-200"
                                  : laudo.status === "Cancelado"
                                    ? "bg-red-50 text-red-800 border-red-200"
                                    : laudo.status === "Rascunho"
                                      ? "bg-purple-50 text-purple-800 border-purple-200"
                                      : "bg-gray-50 text-gray-800 border-gray-200"
                      }`}
                    >
                      <span className="font-semibold">{laudo.status}</span>
                    </div>

                    <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                      <FaCalendarAlt className="text-gray-400" />
                      <span>
                        {laudo.status === "Laudo assinado" &&
                        laudo.dataAssinatura ? (
                          <>
                            Assinado em{" "}
                            {new Date(laudo.dataAssinatura).toLocaleDateString(
                              "pt-BR",
                            )}
                          </>
                        ) : laudo.updatedAt ? (
                          <>
                            Atualizado em{" "}
                            {new Date(laudo.updatedAt).toLocaleDateString(
                              "pt-BR",
                            )}
                          </>
                        ) : (
                          <>
                            Criado em{" "}
                            {new Date(laudo.createdAt).toLocaleDateString(
                              "pt-BR",
                            )}
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Badge de Versão */}
                {laudo.versao > 1 && (
                  <div className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-lg">
                    <IoLayers className="text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">
                      Versão {laudo.versao}
                    </span>
                  </div>
                )}
              </div>

              {/* Detalhes Adicionais */}
              <div className="space-y-3 pt-4 border-t border-gray-100">
                {/* Progress Bar para status em processamento */}
                {laudo.status === "Laudo em processamento" && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        Processando laudo...
                      </span>
                      <span className="text-blue-600 font-medium">
                        Em andamento
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full animate-pulse"
                        style={{ width: "65%" }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Informações contextuais por status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <FaClock className="text-gray-400" />
                    <span>
                      {laudo.status === "Laudo assinado" && laudo.dataAssinatura
                        ? `Assinado às ${new Date(laudo.dataAssinatura).toLocaleTimeString("pt-BR")}`
                        : `Criado às ${new Date(laudo.createdAt).toLocaleTimeString("pt-BR")}`}
                    </span>
                  </div>

                  {laudo.medicoResponsavelId?.nome && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <FaUserMd className="text-gray-400" />
                      <span>Dr(a). {laudo.medicoResponsavelId.nome}</span>
                    </div>
                  )}
                </div>

                {/* Mensagem de ajuda baseada no status */}
                {laudo.status === "Laudo pronto para assinatura" && (
                  <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <FaShieldAlt className="text-blue-500 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium">Pronto para assinatura!</p>
                      <p>
                        Você pode assinar automaticamente com seu certificado digital ou fazer upload do laudo assinado.
                      </p>
                    </div>
                  </div>
                )}

                {laudo.status === "Laudo realizado" && !(laudo.arquivoPath || laudo.laudoAssinado) && (
                  <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <FaInfoCircle className="text-blue-500 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium">Próximo passo:</p>
                      <p>
                        Faça o upload do laudo assinado para concluir o
                        processo.
                      </p>
                    </div>
                  </div>
                )}

                {laudo.status === "Laudo assinado" && (
                  <div className="flex items-start gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                    <FaCheckCircle className="text-green-500 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-green-800">
                      <p className="font-medium">Laudo concluído!</p>
                      <p>
                        O laudo está disponível para download e já pode ser
                        enviado por e-mail.
                      </p>
                    </div>
                  </div>
                )}

                {laudo.status === "Erro ao gerar PDF" && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
                    <FaExclamationTriangle className="text-red-500 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-red-800">
                      <p className="font-medium">Erro no processamento</p>
                      <p>
                        Ocorreu um erro ao gerar o PDF. Tente refazer o laudo ou
                        entre em contato com o suporte.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Status do Email */}
          {statusEmail && (
            <div
              className={`p-4 rounded-lg border-l-4 ${
                statusEmail.status === "Enviado"
                  ? "bg-green-50 border-green-500 text-green-800"
                  : "bg-red-50 border-red-500 text-red-800"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold flex items-center gap-2">
                    <IoMail className="text-gray-600" />
                    Status do Email:{" "}
                    <span className="capitalize">
                      {statusEmail.status.toLowerCase()}
                    </span>
                  </p>
                  <p className="text-sm mt-1">
                    Destinatário:{" "}
                    {statusEmail.destinatario || "Não especificado"}
                  </p>
                  {statusEmail.data && (
                    <p className="text-sm mt-1">
                      Última tentativa:{" "}
                      {new Date(statusEmail.data).toLocaleString()}
                    </p>
                  )}
                </div>
                {statusEmail.status === "Enviado" ? (
                  <FaCheckCircle className="text-xl text-green-500 mt-1" />
                ) : (
                  <FaExclamationTriangle className="text-xl text-red-500 mt-1" />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Grid Principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna 1 - Informações do Laudo */}
          <div className="lg:col-span-2 space-y-6">
            {/* Card Informações do Laudo */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-gray-50">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <FaFileMedicalAlt className="text-blue-600" />
                  Informações do Laudo
                </h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <p className="text-sm font-medium text-gray-500 mb-2">
                      ID do Laudo
                    </p>
                    <p className="font-semibold text-gray-800">
                      {laudo._id?.toString()?.substring(0, 8)}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <p className="text-sm font-medium text-gray-500 mb-2">
                      Médico Responsável
                    </p>
                    <p className="font-semibold text-gray-800">
                      {laudo.medicoResponsavel}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <p className="text-sm font-medium text-gray-500 mb-2">
                      Data de Criação
                    </p>
                    <p className="font-semibold text-gray-800">
                      {new Date(laudo.createdAt).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(laudo.createdAt).toLocaleDateString("pt-BR", {
                        weekday: "long",
                      })}
                    </p>
                  </div>
                  {laudo.laudoAnterior &&
                  typeof laudo.laudoAnterior === "object" ? (
                    <div className="p-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <p className="text-sm font-medium text-gray-500 mb-2">
                        Laudo Anterior
                      </p>
                      <p className="font-semibold text-gray-800">
                        <button
                          onClick={() =>
                            navigate(`/laudos/${laudo.laudoAnterior._id}`)
                          }
                          className="text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                        >
                          #{laudo.laudoAnterior._id.toString().substring(0, 8)}
                        </button>
                      </p>
                    </div>
                  ) : laudo.laudoAnterior ? (
                    <div className="p-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <p className="text-sm font-medium text-gray-500 mb-2">
                        Laudo Anterior
                      </p>
                      <p className="font-semibold text-gray-800">
                        <button
                          onClick={() =>
                            navigate(`/laudos/${laudo.laudoAnterior}`)
                          }
                          className="text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                        >
                          #{laudo.laudoAnterior.toString().substring(0, 8)}
                        </button>
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Card Conclusão Médica */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-gray-50">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <FaStethoscope className="text-blue-600" />
                  Conclusão Médica
                </h2>
              </div>
              <div className="p-6">
                <div className="p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="prose max-w-none">
                    <p className="whitespace-pre-line text-gray-700 leading-relaxed">
                      {laudo.conclusao}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Botão para mostrar/ocultar histórico */}
            {((enviosEmail && enviosEmail.length > 0) || (historicoVersoes && historicoVersoes.length > 0)) && (
              <div className="flex justify-center">
                <button
                  onClick={() => setMostrarHistorico(!mostrarHistorico)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm"
                >
                  <FaHistory className="text-gray-500" />
                  <span>
                    {mostrarHistorico
                      ? "Ocultar Histórico"
                      : "Mostrar Histórico"}
                  </span>
                  <span
                    className={`transform transition-transform ${mostrarHistorico ? "rotate-180" : ""}`}
                  >
                    ↓
                  </span>
                </button>
              </div>
            )}

            {/* Seção Upload */}
            {podeEnviarAssinatura() && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-gray-50">
                  <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <IoCloudUploadOutline className="text-blue-600" />
                    Enviar Laudo Assinado
                  </h2>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="application/pdf"
                      className="hidden"
                    />

                    <button
                      onClick={() => fileInputRef.current.click()}
                      disabled={isLoading}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-colors"
                    >
                      <IoCloudUploadOutline className="text-xl text-gray-500" />
                      <span className="font-medium text-gray-700">
                        Selecionar Arquivo PDF
                      </span>
                    </button>

                    {arquivoSelecionado && (
                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-800">
                              {arquivoSelecionado.name}
                            </p>
                            <p className="text-sm text-gray-500">
                              {(arquivoSelecionado.size / 1024 / 1024).toFixed(
                                2,
                              )}{" "}
                              MB
                            </p>
                          </div>
                          <button
                            onClick={handleEnviarArquivo}
                            disabled={isLoading}
                            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                              isLoading
                                ? "bg-gray-300 text-gray-600"
                                : "bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800"
                            } transition-all shadow-sm`}
                          >
                            {isLoading ? (
                              <>
                                <svg
                                  className="animate-spin h-4 w-4 text-white"
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
                                <span>Enviando...</span>
                              </>
                            ) : (
                              <>
                                <IoCloudUploadOutline />
                                <span>Enviar Laudo</span>
                              </>
                            )}
                          </button>
                        </div>

                        {uploadProgress > 0 && (
                          <div className="mt-3">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full"
                                style={{ width: `${uploadProgress}%` }}
                              ></div>
                            </div>
                            <p className="text-xs text-gray-500 mt-1 text-right">
                              {uploadProgress}% completado
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Histórico de Versões */}
            {mostrarHistorico && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transform transition-all duration-300 ease-in-out">
                <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-gray-50">
                  <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <FaHistory className="text-blue-600" />
                    Histórico de Alterações
                  </h2>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {(historicoVersoes && historicoVersoes.length > 0) ? (
                      <ul className="divide-y divide-gray-200">
                        {historicoVersoes.map((item, index) => (
                          <li
                            key={index}
                            className="py-3 hover:bg-gray-50 rounded-lg px-2 transition-colors"
                          >
                            <div className="flex justify-between">
                              <div>
                                <p className="font-medium text-gray-800 capitalize flex items-center gap-2">
                                  {item.acao === "EnvioEmail" && (
                                    <IoMail className="text-gray-400" />
                                  )}
                                  {item.acao === "LaudoRefazer" && (
                                    <IoReload className="text-yellow-500" />
                                  )}
                                  {item.acao === "LaudoAssinado" && (
                                    <FaCheckCircle className="text-green-500" />
                                  )}
                                  {item.acao.replace(/([A-Z])/g, " $1").trim()}
                                </p>
                                {item.motivo && (
                                  <p className="text-sm text-gray-600 mt-1">
                                    <span className="font-medium">Motivo:</span>{" "}
                                    {item.motivo}
                                  </p>
                                )}
                                {item.destinatarioEmail && (
                                  <p className="text-sm text-gray-600 mt-1">
                                    <span className="font-medium">
                                      Destinatário:
                                    </span>{" "}
                                    {item.destinatarioEmail}
                                  </p>
                                )}
                                {item.statusEnvio && (
                                  <p className="text-sm text-gray-600 mt-1">
                                    <span className="font-medium">Status:</span>
                                    <span
                                      className={`ml-1 font-medium ${
                                        item.statusEnvio === "Enviado"
                                          ? "text-green-600"
                                          : "text-red-600"
                                      }`}
                                    >
                                      {item.statusEnvio}
                                    </span>
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-gray-500">
                                  {new Date(item.data).toLocaleString()}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                  por {item.usuario || "Sistema"}
                                </p>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-center py-8">
                        <FaHistory className="mx-auto text-gray-300 text-4xl mb-3" />
                        <p className="text-gray-500">
                          Nenhum histórico disponível
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Coluna 2 - Informações do Paciente e Exame */}
          <div className="space-y-6">
            {/* Card Informações do Paciente */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-gray-50">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <FaUserAlt className="text-blue-600" />
                  Paciente
                </h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="mt-1 text-gray-500 text-lg">
                      <IoPersonOutline />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-500">Nome</p>
                      <p className="font-semibold text-gray-800 mt-1">
                        {paciente?.nome || "Não identificado"}
                      </p>
                    </div>
                  </div>

                  {paciente?.dataNascimento && (
                    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="mt-1 text-gray-500 text-lg">
                        <IoCalendarOutline />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-500">
                          Idade
                        </p>
                        <p className="font-semibold text-gray-800 mt-1">
                          {calcularIdade(paciente.dataNascimento)} anos
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Nascimento:{" "}
                          {new Date(paciente.dataNascimento).toLocaleDateString(
                            "pt-BR",
                          )}
                        </p>
                      </div>
                    </div>
                  )}

                  {paciente?.email && (
                    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="mt-1 text-gray-500 text-lg">
                        <IoMail />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-500">
                          Email
                        </p>
                        <p className="font-semibold text-gray-800 mt-1 break-words">
                          {paciente.email}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Card Informações do Exame */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-gray-50">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <FaFileMedicalAlt className="text-blue-600" />
                  Exame Relacionado
                </h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <p className="text-sm font-medium text-gray-500 flex items-center gap-2 mb-2">
                      <IoDocumentTextOutline />
                      Tipo de Exame
                    </p>
                    <p className="font-semibold text-gray-800">
                      {laudo.exame?.tipoExame?.nome || "--"}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <p className="text-sm font-medium text-gray-500 flex items-center gap-2 mb-2">
                      <IoCalendarOutline />
                      Data do Exame
                    </p>
                    <p className="font-semibold text-gray-800">
                      {laudo.exame?.dataExame
                        ? new Date(laudo.exame.dataExame).toLocaleDateString(
                            "pt-BR",
                          )
                        : "--"}
                    </p>
                    {laudo.exame?.dataExame && (
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(laudo.exame.dataExame).toLocaleDateString(
                          "pt-BR",
                          {
                            weekday: "long",
                          },
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Render company information if user is medico or adminMaster */}
            {temRole('medico') || temRole('adminMaster') ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-gray-50">
                  <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <FaBuilding className="text-blue-600" />
                    Empresa
                  </h2>
                </div>
                <div className="p-6">
                  <div className="p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <p className="text-sm font-medium text-gray-500 mb-2">
                      Nome da Empresa
                    </p>
                    <p className="font-semibold text-gray-800">
                      {empresa?.nomeFantasia || "Não informado"}
                    </p>
                    {empresa?.razaoSocial &&
                      empresa.razaoSocial !== empresa.nomeFantasia && (
                        <p className="text-xs text-gray-400 mt-1">
                          Razão Social: {empresa.razaoSocial}
                        </p>
                      )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Modal para Refazer Laudo */}
      <Modal
        isOpen={modalRefazerAberto}
        onRequestClose={() => !isLoading && setModalRefazerAberto(false)}
        contentLabel="Refazer Laudo"
        style={{
          overlay: {
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          },
          content: {
            position: "relative",
            top: "auto",
            left: "auto",
            right: "auto",
            bottom: "auto",
            border: "none",
            background: "none",
            padding: "0",
            borderRadius: "0.5rem",
            overflow: "visible",
            maxWidth: "32rem",
            width: "100%",
            maxHeight: "90vh",
          },
        }}
      >
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-gray-50">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <IoReload className="text-yellow-500" />
              Refazer Laudo
            </h2>
          </div>

          <div className="p-6 space-y-4">
            {erro && (
              <div className="bg-red-50 text-red-700 p-3 rounded-md border-l-4 border-red-500">
                {erro}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Motivo da Refação *
              </label>
              <input
                type="text"
                value={motivoRefacao}
                onChange={(e) => setMotivoRefacao(e.target.value)}
                placeholder="Ex: Correção de diagnóstico, informações incompletas..."
                className="w-full px-3 py-2 border border-gray-300 text-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nova Conclusão *
              </label>
              <textarea
                value={novaConclusao}
                onChange={(e) => setNovaConclusao(e.target.value)}
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 text-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="px-6 py-4 border-t border-gray-200 bg-gradient-to-r from-blue-50 to-gray-50 flex justify-end gap-3">
            <button
              onClick={() => setModalRefazerAberto(false)}
              disabled={isLoading}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancelar
            </button>
            <button
              onClick={handleRefazerLaudo}
              disabled={isLoading || !motivoRefacao || !novaConclusao}
              className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 ${
                isLoading || !motivoRefacao || !novaConclusao
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              }`}
            >
              Refazer Laudo
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal de Assinatura */}
      <ModalAssinatura
        isOpen={mostrarModalAssinatura}
        onClose={() => setMostrarModalAssinatura(false)}
        onAssinarAutomaticamente={handleAssinarAutomaticamente}
        onAssinarComImagemFisica={handleAssinarComImagemFisica}
        onEscolherUpload={handleEscolherUploadManual}
        certificados={certificadosDisponiveis}
        temCertificado={certificadosDisponiveis.length > 0}
        temAssinaturaFisica={temAssinaturaFisica}
        isLoading={isLoading}
      />
    </div>
  );
};

export default DetalhesLaudo;
