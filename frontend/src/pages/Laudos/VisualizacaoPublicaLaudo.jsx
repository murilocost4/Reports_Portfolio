import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  FaFileMedicalAlt,
  FaUser,
  FaStethoscope,
  FaCalendarAlt,
  FaInfoCircle,
  FaDownload,
  FaCheckCircle,
  FaTimesCircle,
} from "react-icons/fa";
import api from "../../api";

const VisualizacaoPublicaLaudo = () => {
  const { id } = useParams();
  const [laudo, setLaudo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Carregar laudo automaticamente ao montar o componente
  useEffect(() => {
    const carregarLaudo = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/laudos/publico/${id}`);
        setLaudo(response.data);
        setError("");
      } catch (err) {
        console.error('Erro ao carregar laudo:', err);
        console.error('Resposta do erro:', err.response?.data);
        setError(err.response?.data?.erro || err.response?.data?.message || "Erro ao carregar laudo");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      carregarLaudo();
    }
  }, [id]);

  const handleDownloadPdf = () => {
    window.open(`${api.defaults.baseURL}/laudos/publico/${id}/pdf`, "_blank");
  };

  const formatarData = (dataString) => {
    if (!dataString) return "Não informado";
    const data = new Date(dataString);
    return data.toLocaleDateString("pt-BR");
  };

  // Modal de autenticação - deve aparecer primeiro
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-slate-700 font-medium">Carregando laudo...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-xl shadow-md w-full max-w-md text-center border border-slate-200">
          <div className="flex justify-center mb-3">
            <FaTimesCircle className="text-red-500 text-4xl" />
          </div>
          <p className="text-red-600 font-medium mb-4">{error}</p>
          <p className="text-slate-600">
            O laudo pode não existir ou ter sido invalidado.
          </p>
        </div>
      </div>
    );
  }

  if (!laudo) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-xl shadow-md w-full max-w-md text-center border border-slate-200">
          <div className="flex justify-center mb-3">
            <FaTimesCircle className="text-red-500 text-4xl" />
          </div>
          <p className="text-red-600 font-medium mb-4">Laudo não encontrado</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Cabeçalho simplificado */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <FaFileMedicalAlt className="text-blue-600 text-xl" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Laudo Médico</h1>
              <p className="text-sm text-slate-500">Visualização Pública</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Cabeçalho do Laudo */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <FaFileMedicalAlt className="text-blue-500" />
              <span>Detalhes do Laudo</span>
            </h2>
          </div>

          <div className="p-6">
            <div className="flex flex-wrap gap-3 mb-4">
              <div className="flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-full">
                <span className="font-medium text-blue-800 text-sm">
                  ID: {laudo.codigoValidacao}
                </span>
              </div>

              <div className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-full">
                <span className="font-medium text-slate-800 text-sm">
                  Versão: {laudo.versao}
                </span>
              </div>

              <div
                className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                  laudo.status === "ativo"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {laudo.status === "ativo" ? (
                  <FaCheckCircle className="text-green-600" />
                ) : (
                  <FaTimesCircle className="text-red-600" />
                )}
                <span className="font-medium">
                  {laudo.status === "ativo" ? "Ativo" : "Inativo"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-slate-600 mb-4">
              <FaCalendarAlt className="text-slate-400" />
              <span className="text-sm">
                Data do laudo: {formatarData(laudo.dataEmissao)}
              </span>
            </div>

            {/* Sempre mostrar botão de download - o backend gera PDF dinâmico se não houver assinado */}
            {/*
            <button
              onClick={handleDownloadPdf}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg transition-colors shadow-sm w-full sm:w-auto"
            >
              <FaDownload />
              <span>
                {laudo.temPdfAssinado ? 'Baixar Laudo Assinado (PDF)' : 'Baixar Laudo (PDF)'}
              </span>
            </button>
            */}
          </div>
        </div>

        {/* Grid de informações */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Informações do Paciente */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <FaUser className="text-blue-500" />
                <span>Paciente</span>
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">Nome</p>
                  <p className="font-semibold text-slate-800 mt-1">
                    {laudo.paciente.nome}
                  </p>
                </div>

                {laudo.paciente.idade && (
                  <div>
                    <p className="text-sm font-medium text-slate-500">Idade</p>
                    <p className="font-semibold text-slate-800 mt-1">
                      {laudo.paciente.idade}
                    </p>
                  </div>
                )}

                {laudo.paciente.dataNascimento && (
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      Data de Nascimento
                    </p>
                    <p className="font-semibold text-slate-800 mt-1">
                      {formatarData(laudo.paciente.dataNascimento)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Informações do Exame */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <FaFileMedicalAlt className="text-blue-500" />
                <span>Exame</span>
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">Tipo</p>
                  <p className="font-semibold text-slate-800 mt-1">
                    {laudo.exame.tipo}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-500">Data</p>
                  <p className="font-semibold text-slate-800 mt-1">
                    {formatarData(laudo.exame.data)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Conclusão Médica */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mt-6">
          <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <FaStethoscope className="text-blue-500" />
              <span>Conclusão Médica</span>
            </h2>
          </div>
          <div className="p-6">
            <div className="prose max-w-none">
              <div className="whitespace-pre-line text-slate-700">
                {laudo.conclusao}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200">
              <div className="flex items-start gap-3 bg-slate-50 p-4 rounded-lg">
                <FaInfoCircle className="text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-slate-600">
                    {laudo.status === "ativo" ? (
                      <>
                        <span className="font-medium">Validade:</span>{" "}
                        {laudo.assinadoCom === 'certificado_medico' ? (
                          <>
                            Este laudo foi assinado digitalmente por{" "}
                            <strong>{laudo.medico}</strong> utilizando certificado digital ICP-Brasil 
                            padrão A3, em conformidade com a MP 2.200-2/2001 e legislação vigente. 
                            A assinatura digital garante a autenticidade, integridade e validade 
                            jurídica do documento, tendo o mesmo valor legal de uma assinatura manuscrita.
                          </>
                        ) : laudo.assinadoCom === 'upload_manual' ? (
                          <>
                            Este laudo foi assinado pelo médico{" "}
                            <strong>{laudo.medico}</strong> e tem validade legal conforme 
                            estabelecido no Código de Ética Médica e regulamentações do 
                            Conselho Federal de Medicina (CFM).
                          </>
                        ) : (
                          <>
                            Este laudo foi emitido digitalmente por{" "}
                            <strong>{laudo.medico}</strong> e é válido sem
                            assinatura manuscrita, de acordo com a legislação
                            vigente.
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        <span className="font-medium">Atenção:</span> Este laudo
                        não está ativo. Laudos só são considerados válidos
                        quando marcados como "Laudo assinado" no sistema.
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisualizacaoPublicaLaudo;
