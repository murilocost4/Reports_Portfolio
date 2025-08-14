import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../api";
import {
  IoArrowBack,
  IoDocumentTextOutline,
  IoCheckmarkCircleOutline,
  IoDownloadOutline,
  IoPrintOutline,
  IoPersonOutline,
  IoCalendarOutline,
  IoTimeOutline,
} from "react-icons/io5";
import { FaFileMedicalAlt, FaUserAlt, FaShieldAlt } from "react-icons/fa";
import ModalAssinatura from "../../components/ModalAssinatura";

const CriarLaudo = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { usuario, logout, temRole } = useAuth();
  const exameId = location.state?.exameId;

  const [exame, setExame] = useState(null);
  const [conclusao, setConclusao] = useState("");
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [laudoCriado, setLaudoCriado] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [senhaCertificado, setSenhaCertificado] = useState("");
  const [usarCertificadoProprio, setUsarCertificadoProprio] = useState(false);
  const [certificadosDisponiveis, setCertificadosDisponiveis] = useState([]);
  const [mostrarModalAssinatura, setMostrarModalAssinatura] = useState(false);
  const [temCertificado, setTemCertificado] = useState(false);
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

  useEffect(() => {
    const fetchExame = async () => {
      try {
        setIsLoading(true);
        setErro("");

        if (!exameId) {
          throw new Error("ID do exame não fornecido");
        }

        const response = await api.get(`/exames/${exameId}`);

        if (!response.data) {
          throw new Error("Exame não encontrado");
        }

        // Format the exam data
        const formattedExame = {
          ...response.data,
          tipoExame: response.data.tipoExame?.nome || "Não informado",
          paciente: {
            ...response.data.paciente,
            nome: response.data.paciente?.nome || "Não identificado",
          },
        };

        setExame(formattedExame);
      } catch (err) {
        console.error("Erro ao buscar exame:", err);

        if (err.response?.status === 401) {
          setErro("Sessão expirada. Redirecionando para login...");
          setTimeout(() => logout(), 2000);
        } else if (err.response?.status === 404) {
          setErro("Exame não encontrado. Verifique o ID fornecido.");
          setTimeout(() => navigate("/exames"), 3000);
        } else if (err.message === "ID do exame não fornecido") {
          setErro(err.message);
          navigate("/exames");
        } else {
          setErro(err.message || "Erro ao carregar detalhes do exame");
        }
      } finally {
        setIsLoading(false);
      }
    };

    const carregarCertificados = async () => {
      try {
        const response = await api.get('/certificados/meus');
        // O backend já filtra por ativo: true, então consideramos todos os retornados
        setCertificadosDisponiveis(response.data.certificados || []);
      } catch (error) {
        console.error('Erro ao carregar certificados:', error);
      }
    };

    const verificarAssinaturaFisica = async () => {
      try {
        const response = await api.get('/assinaturas/fisica/verificar');
        setTemAssinaturaFisica(response.data.temAssinatura);
      } catch (error) {
        console.error('Erro ao verificar assinatura física:', error.message);
        setTemAssinaturaFisica(false);
      }
    };

    fetchExame();
    carregarCertificados();
    verificarAssinaturaFisica();
  }, [exameId, navigate, logout]);

  const handleDownloadLaudoOriginal = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`/laudos/${laudoCriado._id}/pdf`, {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `laudo_${laudoCriado._id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setMensagem("Download iniciado com sucesso");
    } catch (err) {
      if (err.response?.status === 401) {
        setErro("Sessão expirada. Redirecionando para login...");
        setTimeout(() => logout(), 2000);
      } else {
        setErro(err.response?.data?.message || "Falha ao baixar o laudo");
        console.error("Erro no download:", err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!exameId) {
      setErro("Selecione um exame para continuar");
      return;
    }

    if (!conclusao.trim()) {
      setErro(
        "A conclusão médica é obrigatória e deve ter pelo menos 10 caracteres",
      );
      return;
    }

    if (conclusao.trim().length < 10) {
      setErro("A conclusão deve conter pelo menos 10 caracteres");
      return;
    }

    try {
      setIsLoading(true);
      setErro("");
      setMensagem("Criando laudo...");

      // Create the laudo
      const response = await api.post(
        "/laudos",
        {
          exameId,
          conclusao: conclusao.trim(),
          tenant_id: exame.tenant_id,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        },
      );

      const laudoData = response.data.laudo;
      const temCertificadoAtivo = response.data.temCertificado;
      
      setLaudoCriado(laudoData);
      setTemCertificado(temCertificadoAtivo);

      // If user has certificate and status is "Laudo pronto para assinatura", show modal
      if ((temCertificadoAtivo || temAssinaturaFisica) && laudoData.status === 'Laudo pronto para assinatura') {
        setMostrarModalAssinatura(true);
        setMensagem("Laudo criado! Escolha como deseja assinar.");
      } else {
        setMensagem("Laudo criado com sucesso!");
      }

    } catch (err) {
      console.error("Erro detalhado:", err);

      if (err.response) {
        switch (err.response.status) {
          case 400:
            setErro(
              err.response.data?.erro ||
                "Dados inválidos. Verifique os campos e tente novamente.",
            );
            break;

          case 401:
            setErro("Sessão expirada. Redirecionando para login...");
            setTimeout(() => logout(), 2000);
            break;

          case 404:
            setErro("Exame não encontrado");
            break;

          case 500:
            setErro("Erro no servidor. Tente novamente mais tarde.");
            break;

          default:
            setErro(
              err.response.data?.message || "Erro ao processar a requisição",
            );
        }
      } else if (err.request) {
        setErro("Sem resposta do servidor. Verifique sua conexão.");
      } else {
        setErro("Erro ao configurar a requisição: " + err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoltar = () => {
    navigate(-1);
  };

  // Handle automatic signing from modal
  const handleAssinarAutomaticamente = async () => {
    try {
      setIsLoading(true);
      setErro("");
      setMensagem("Assinando automaticamente...");

      const response = await api.post(
        `/laudos/${laudoCriado.id}/assinar-automaticamente`,
        {}, // Sem necessidade de senha, ela já está no certificado
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        },
      );

      setLaudoCriado(prev => ({
        ...prev,
        status: 'Laudo assinado',
        arquivoPath: response.data.laudo.arquivoPath,
        dataAssinatura: response.data.laudo.dataAssinatura
      }));

      setMostrarModalAssinatura(false);
      setMensagem("Laudo assinado automaticamente com sucesso!");

    } catch (err) {
      console.error("Erro ao assinar automaticamente:", {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data
      });
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
      setMensagem("Assinando com imagem física...");

      const response = await api.post(
        `/laudos/${laudoCriado.id}/assinar-com-imagem-fisica`,
        {},
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        },
      );

      setLaudoCriado(prev => ({
        ...prev,
        status: 'Laudo assinado',
        arquivoPath: response.data.laudo.url,
        dataAssinatura: new Date().toISOString(),
        tipoAssinatura: 'fisica',
        assinadoDigitalmente: false,
        assinadoCom: 'upload_manual'
      }));

      setMostrarModalAssinatura(false);
      setMensagem("Laudo assinado com imagem física com sucesso!");

    } catch (err) {
      console.error("Erro ao assinar com imagem física:", err.message);
      setErro(err.response?.data?.erro || "Erro ao assinar o laudo com imagem física");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle manual upload choice from modal
  const handleEscolherUploadManual = () => {
    setMostrarModalAssinatura(false);
    setMensagem("Laudo criado! Acesse os detalhes do laudo para fazer o upload do arquivo assinado.");
    // Navigate to laudo details where they can upload
    setTimeout(() => {
      navigate(`/laudos/${laudoCriado.id}`);
    }, 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-700 font-medium">Processando...</p>
        </div>
      </div>
    );
  }

  if (!exame) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-6 rounded-xl shadow-md max-w-md w-full text-center border border-gray-200">
          <p className="text-red-500 font-medium mb-4">
            {erro || "Carregando informações..."}
          </p>
          <button
            onClick={handleVoltar}
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-sm"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={handleVoltar}
              className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors"
            >
              <IoArrowBack className="text-lg" />
              <span className="font-medium">Voltar</span>
            </button>

            <div className="hidden md:block h-6 w-px bg-gray-300"></div>

            <h1 className="text-2xl font-bold text-gray-800">
              Criar Laudo Médico
            </h1>
          </div>
        </div>

        {/* Mensagens de feedback */}
        {erro && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg mb-6">
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
          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg mb-6">
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

        {!laudoCriado ? (
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
          >
            {/* Seção Informações do Exame */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-gray-50">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <FaFileMedicalAlt className="text-blue-600" />
                Informações do Exame
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1 text-blue-600">
                    <IoPersonOutline />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Paciente
                    </p>
                    <p className="font-semibold text-gray-800">
                      {exame.paciente?.nome || "Não identificado"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="mt-1 text-blue-600">
                    <IoDocumentTextOutline />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Tipo de Exame
                    </p>
                    <p className="font-semibold text-gray-800">
                      {exame.tipoExame || "Não informado"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="mt-1 text-blue-600">
                    <IoCalendarOutline />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Data</p>
                    <p className="font-semibold text-gray-800">
                      {new Date(exame.dataExame).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="mt-1 text-blue-600">
                    <IoTimeOutline />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Hora</p>
                    <p className="font-semibold text-gray-800">
                      {new Date(exame.dataExame).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Seção Conclusão */}
            <div className="px-6 py-4 border-t border-b border-gray-200 bg-gradient-to-r from-blue-50 to-gray-50">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <FaFileMedicalAlt className="text-blue-600" />
                Conclusão Médica
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descreva detalhadamente as suas conclusões{" "}
                  <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={conclusao}
                  onChange={(e) => {
                    setConclusao(e.target.value);
                    setErro("");
                  }}
                  className="w-full px-4 py-3 border border-gray-300 text-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  rows="10"
                  placeholder="Descreva os achados do exame, diagnóstico e recomendações..."
                  required
                />
              </div>
            </div>

            {/* Botão de Envio */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-3 rounded-lg font-semibold text-white transition-all flex items-center justify-center gap-2 ${
                  isLoading
                    ? "bg-gray-400"
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
                    <IoCheckmarkCircleOutline className="text-lg" />
                    <span>Emitir Laudo</span>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Seção Sucesso */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-gray-50">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <IoCheckmarkCircleOutline className="text-green-500" />
                Laudo Criado com Sucesso
              </h2>
            </div>
            <div className="p-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <IoCheckmarkCircleOutline className="text-green-500 text-3xl" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  {laudoCriado.status === 'Laudo assinado' 
                    ? 'Laudo criado e assinado digitalmente'
                    : laudoCriado.status === 'Laudo pronto para assinatura'
                    ? 'Laudo criado e pronto para assinatura'
                    : 'Laudo registrado no sistema'
                  }
                </h3>
                <p className="text-gray-600 mb-6">
                  {laudoCriado.status === 'Laudo assinado' 
                    ? `O laudo foi criado e assinado digitalmente com sucesso.`
                    : laudoCriado.status === 'Laudo pronto para assinatura'
                    ? 'O laudo foi criado e está pronto para ser assinado. Você será redirecionado para os detalhes onde poderá assinar ou fazer upload.'
                    : 'O laudo foi criado com sucesso e está disponível para assinatura.'
                  }
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  {laudoCriado.status === 'Laudo pronto para assinatura' ? (
                    <button
                      onClick={() => navigate(`/laudos/${laudoCriado.id}`)}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all"
                    >
                      <FaShieldAlt />
                      <span>Ir para Assinatura</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => navigate(`/laudos`)}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all"
                    >
                      <IoDocumentTextOutline />
                      <span>Ir para laudos</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Assinatura */}
      <ModalAssinatura
        isOpen={mostrarModalAssinatura}
        onRequestClose={() => setMostrarModalAssinatura(false)}
        onAssinarAutomaticamente={handleAssinarAutomaticamente}
        onAssinarComImagemFisica={handleAssinarComImagemFisica}
        onEscolherUpload={handleEscolherUploadManual}
        certificados={certificadosDisponiveis}
        temCertificado={temCertificado}
        temAssinaturaFisica={temAssinaturaFisica}
        isLoading={isLoading}
      />
    </div>
  );
};

export default CriarLaudo;
