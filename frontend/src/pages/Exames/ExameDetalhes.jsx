import React, { useEffect, useState } from "react";
import api from "../../api";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  IoArrowBack,
  IoDocumentTextOutline,
  IoDownloadOutline,
  IoPersonOutline,
  IoCalendarOutline,
  IoTimeOutline,
  IoPulseOutline,
  IoPrintOutline,
  IoCloseOutline,
} from "react-icons/io5";
import {
  FaFileMedicalAlt,
  FaCheckCircle,
  FaUserAlt,
  FaWeight,
  FaRulerVertical,
} from "react-icons/fa";
import { GiHeartBeats } from "react-icons/gi";
import ReactModal from "react-modal";

// Configuração do modal para acessibilidade
ReactModal.setAppElement("#root");

const API_URL = "http://localhost:3000";

const ExameDetalhes = () => {
  const { id } = useParams();
  const [exame, setExame] = useState(null);
  const [laudoExistente, setLaudoExistente] = useState(false);
  const [erro, setErro] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { usuario, logout, temRole } = useAuth();
  const [modalIsOpen, setModalIsOpen] = useState(false);

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

        const [exameResponse, laudoResponse] = await Promise.all([
          api.get(`/exames/${id}`),
          api.get(`/laudos/exame/${id}`),
        ]);

        setExame(exameResponse.data);
        setLaudoExistente(laudoResponse.data.length > 0);
      } catch (err) {
        if (err.response?.status === 401) {
          setErro("Sessão expirada. Redirecionando para login...");
          setTimeout(() => logout(), 2000);
        } else if (err.response?.status === 404) {
          setErro("Exame não encontrado");
        } else {
          setErro("Erro ao carregar detalhes do exame. Tente novamente.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchExame();
  }, [id, logout]);

  const handleDownload = async () => {
    if (!exame?.arquivo && !exame?.arquivoKey) return;

    try {
      // Usar endpoint de download que retorna URL pré-assinada
      const response = await api.get(`/exames/${exame._id}/download`);
      
      if (response.data.downloadUrl) {
        // Abrir em nova aba para download
        const link = document.createElement("a");
        link.href = response.data.downloadUrl;
        link.setAttribute("target", "_blank");
        link.setAttribute("download", `exame_${exame._id}.pdf`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        setErro("URL de download não disponível");
      }
    } catch (error) {
      console.error("Erro ao baixar arquivo:", error);
      setErro("Erro ao baixar arquivo. Tente novamente.");
    }
  };

  const handleLaudar = () => {
    navigate(`/laudos/novo`, { state: { exameId: exame._id } });
  };

  const handleVoltar = () => {
    navigate(-1);
  };

  const calcularIdade = (dataNascimento) => {
    if (!dataNascimento) return "--";
    const nascimento = new Date(dataNascimento);
    const hoje = new Date();
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const m = hoje.getMonth() - nascimento.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) {
      idade--;
    }
    return idade;
  };

  const handlePrint = () => {
    if (!exame?.thumbnail) return;

    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>Impressão do Exame</title>
          <style>
            body { margin: 0; padding: 20px; text-align: center; font-family: 'Segoe UI', Roboto, sans-serif; }
            img { max-width: 100%; height: auto; max-height: 90vh; object-fit: contain; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
            .header { margin-bottom: 20px; }
            .header h1 { color: #1f2937; font-size: 1.5rem; margin-bottom: 0.5rem; }
            .header p { color: #6b7280; margin: 0.25rem 0; }
            @media print {
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Exame ${exame.tipoExame?.nome || "Não informado"}</h1>
            <p>Paciente: ${exame.paciente?.nome || "Não identificado"}</p>
            <p>Data: ${exame.dataExame ? new Date(exame.dataExame).toLocaleDateString() : "--"}</p>
          </div>
          <img src="${API_URL}/${exame.thumbnail}" onerror="this.onerror=null;this.src='https://via.placeholder.com/500x300?text=Imagem+não+disponível';" />
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-700 font-medium">Carregando exame...</p>
        </div>
      </div>
    );
  }

  if (!exame) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-6 rounded-xl shadow-md max-w-md w-full text-center border border-gray-200">
          <p className="text-red-500 font-medium mb-4">
            {erro || "Exame não encontrado"}
          </p>
          <button
            onClick={handleVoltar}
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-sm"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  const paciente = exame.paciente || {};

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
              Exame{" "}
              <span className="text-blue-600">
                #{exame._id.substring(0, 8)}
              </span>
            </h1>
          </div>

          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            {temRole('medico') && (
              <button
                onClick={handleLaudar}
                disabled={laudoExistente}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors shadow-sm ${
                  laudoExistente
                    ? "bg-gray-100 text-gray-600 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              >
                {laudoExistente ? (
                  <>
                    <FaCheckCircle />
                    <span>Laudo Existente</span>
                  </>
                ) : (
                  <>
                    <FaFileMedicalAlt />
                    <span>Emitir Laudo</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={handleDownload}
              disabled={!exame.arquivo && !exame.arquivoKey}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors shadow-sm ${
                (exame.arquivo || exame.arquivoKey)
                  ? "border-blue-300 text-blue-600 hover:bg-blue-50"
                  : "border-gray-300 text-gray-400 cursor-not-allowed"
              }`}
            >
              <IoDownloadOutline />
              <span>Baixar Exame</span>
            </button>
          </div>
        </div>

        {/* Grid Principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna 1 - Informações do Paciente */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-gray-50">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <FaUserAlt className="text-blue-600" />
                  Paciente
                </h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 text-blue-600">
                      <IoPersonOutline />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Nome</p>
                      <p className="font-semibold text-gray-800 mt-1">
                        {paciente.nome || "Não identificado"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="mt-1 text-blue-600">
                      <IoCalendarOutline />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Idade
                      </p>
                      <p className="font-semibold text-gray-800 mt-1">
                        {calcularIdade(paciente.dataNascimento)} anos
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-1 text-blue-600">
                        <FaRulerVertical />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">
                          Altura
                        </p>
                        <p className="font-semibold text-gray-800 mt-1">
                          {exame.altura || "--"} cm
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="mt-1 text-blue-600">
                        <FaWeight />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">
                          Peso
                        </p>
                        <p className="font-semibold text-gray-800 mt-1">
                          {exame.peso || "--"} kg
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Modal de Visualização Ampliada */}
          <ReactModal
            isOpen={modalIsOpen}
            onRequestClose={() => setModalIsOpen(false)}
            contentLabel="Visualização do Exame"
            className="fixed inset-0 flex items-center justify-center p-4"
            overlayClassName="fixed inset-0 top-0 pt-12 backdrop-blur-sm backdrop-brightness-50 z-50"
            style={{
              content: {
                position: "relative",
                maxWidth: "90vw",
                maxHeight: "90vh",
                width: "auto",
                height: "auto",
                padding: "0",
                border: "none",
                borderRadius: "8px",
                background: "transparent",
                inset: "auto",
                transform: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              },
            }}
          >
            <div className="relative w-full h-full flex items-center justify-center">
              <img
                src={`${API_URL}/${exame.thumbnail}`}
                alt="Exame completo"
                className="max-w-[90vw] max-h-[90vh] object-contain shadow-xl"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src =
                    "https://via.placeholder.com/800x600?text=Imagem+não+disponível";
                }}
              />
              <div className="absolute top-4 right-4 flex gap-2">
                <button
                  onClick={handlePrint}
                  className="p-3 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
                  title="Imprimir"
                >
                  <IoPrintOutline className="text-gray-700 text-xl" />
                </button>
                <button
                  onClick={() => setModalIsOpen(false)}
                  className="p-3 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
                  title="Fechar"
                >
                  <IoCloseOutline className="text-gray-700 text-xl" />
                </button>
              </div>
            </div>
          </ReactModal>

          {/* Coluna 2 - Informações do Exame */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-gray-50">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <FaFileMedicalAlt className="text-blue-600" />
                  Detalhes do Exame
                </h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500 flex items-center gap-2">
                        <IoDocumentTextOutline />
                        Tipo de Exame
                      </p>
                      <p className="font-semibold text-gray-800 mt-1">
                        {/* Corrigir: acessar a propriedade nome do objeto tipoExame */}
                        {exame.tipoExame?.nome || exame.tipoExame || "--"}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-500 flex items-center gap-2">
                        <IoCalendarOutline />
                        Data do Exame
                      </p>
                      <p className="font-semibold text-gray-800 mt-1">
                        {exame.dataExame
                          ? new Date(exame.dataExame).toLocaleDateString(
                              "pt-BR",
                            )
                          : "--"}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-500 flex items-center gap-2">
                        <IoTimeOutline />
                        Hora do Exame
                      </p>
                      <p className="font-semibold text-gray-800 mt-1">
                        {exame.dataExame
                          ? new Date(exame.dataExame).toLocaleTimeString(
                              "pt-BR",
                              { hour: "2-digit", minute: "2-digit" },
                            )
                          : "--"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Observações
                      </p>
                      <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                        <p className="font-medium text-gray-800">
                          {exame.observacoes || "Não informado"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Dados do Exame (se for um exame com parâmetros específicos) */}
            {exame.frequenciaCardiaca && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-gray-50">
                  <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <GiHeartBeats className="text-blue-600" />
                    Parâmetros do Exame
                  </h2>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                      <p className="text-sm font-medium text-gray-600 flex items-center gap-1">
                        <IoPulseOutline />
                        Freq. Cardíaca
                      </p>
                      <p className="font-bold text-xl text-gray-800 mt-2">
                        {exame.frequenciaCardiaca || "--"}{" "}
                        <span className="text-sm font-normal">bpm</span>
                      </p>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                      <p className="text-sm font-medium text-gray-600">
                        Segmento PR
                      </p>
                      <p className="font-bold text-xl text-gray-800 mt-2">
                        {exame.segmentoPR || "--"}{" "}
                        <span className="text-sm font-normal">ms</span>
                      </p>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                      <p className="text-sm font-medium text-gray-600">
                        Duração QRS
                      </p>
                      <p className="font-bold text-xl text-gray-800 mt-2">
                        {exame.duracaoQRS || "--"}{" "}
                        <span className="text-sm font-normal">ms</span>
                      </p>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                      <p className="text-sm font-medium text-gray-600">
                        Eixo QRS
                      </p>
                      <p className="font-bold text-xl text-gray-800 mt-2">
                        {exame.eixoMedioQRS || "--"}°
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExameDetalhes;
