import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../api';
import { toast } from 'react-hot-toast';
import {
  FaCertificate,
  FaUpload,
  FaCheck,
  FaTimes,
  FaExclamationTriangle,
  FaClock,
  FaEye,
  FaTrash,
  FaShieldAlt,
  FaCalendarAlt,
  FaFileUpload,
  FaKey,
  FaDownload,
  FaInfoCircle,
  FaSignature
} from 'react-icons/fa';
import GerenciarAssinaturaFisica from './GerenciarAssinaturaFisica';

const GerenciarCertificados = () => {
  const [certificados, setCertificados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [certificadoParaDeletar, setCertificadoParaDeletar] = useState(null);
  const [selectedCertificado, setSelectedCertificado] = useState(null);
  const [arquivo, setArquivo] = useState(null);
  const [senha, setSenha] = useState('');
  const [estatisticas, setEstatisticas] = useState(null);
  const [deletando, setDeletando] = useState(false);
  const [activeTab, setActiveTab] = useState('certificados');

  useEffect(() => {
    carregarCertificados();
  }, []);

  const carregarCertificados = async () => {
    try {
      const response = await api.get('/certificados/meus');
      setCertificados(response.data.certificados);
    } catch (error) {
      toast.error('Erro ao carregar certificados');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadCertificado = async (e) => {
    e.preventDefault();
    
    if (!arquivo || !senha) {
      toast.error('Selecione um arquivo e informe a senha');
      return;
    }

    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('certificado', arquivo);
      formData.append('senha', senha);

      const response = await api.post('/certificados/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success('Certificado cadastrado com sucesso!');
      setShowUploadModal(false);
      setArquivo(null);
      setSenha('');
      carregarCertificados();
    } catch (error) {
      const mensagem = error.response?.data?.erro || 'Erro ao cadastrar certificado';
      toast.error(mensagem);
    } finally {
      setUploading(false);
    }
  };

  const handleAlterarStatus = async (certificado, novoStatus) => {
    try {
      const certificadoId = certificado._id || certificado.id;
      await api.patch(`/certificados/meus/${certificadoId}/status`, {
        ativo: novoStatus
      });
      
      toast.success(`Certificado ${novoStatus ? 'ativado' : 'desativado'} com sucesso!`);
      carregarCertificados();
    } catch (error) {
      const mensagem = error.response?.data?.erro || 'Erro ao alterar status do certificado';
      toast.error(mensagem);
    }
  };

  const handleRemoverCertificado = (certificado) => {
    setCertificadoParaDeletar(certificado);
    setShowDeleteModal(true);
  };

  const confirmarRemocao = async () => {
    if (!certificadoParaDeletar) return;

    setDeletando(true);
    try {
      const certificadoId = certificadoParaDeletar._id || certificadoParaDeletar.id;
      await api.delete(`/certificados/meus/${certificadoId}`);
      toast.success('Certificado removido com sucesso!');
      carregarCertificados();
      setShowDeleteModal(false);
      setCertificadoParaDeletar(null);
    } catch (error) {
      const mensagem = error.response?.data?.erro || 'Erro ao remover certificado';
      toast.error(mensagem);
    } finally {
      setDeletando(false);
    }
  };

  const cancelarRemocao = () => {
    setShowDeleteModal(false);
    setCertificadoParaDeletar(null);
  };

  const handleVerDetalhes = async (certificado) => {
    try {
      const certificadoId = certificado._id || certificado.id;
      const response = await api.get(`/certificados/meus/${certificadoId}`);
      setSelectedCertificado(response.data.certificado);
      setShowDetailsModal(true);
    } catch (error) {
      toast.error('Erro ao carregar detalhes do certificado');
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      ativo: { 
        color: 'bg-green-100 text-green-800 border-green-200', 
        icon: <FaCheck className="w-3 h-3" />,
        text: 'Ativo'
      },
      vencido: { 
        color: 'bg-red-100 text-red-800 border-red-200', 
        icon: <FaTimes className="w-3 h-3" />,
        text: 'Vencido'
      },
      proximo_vencimento: { 
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
        icon: <FaExclamationTriangle className="w-3 h-3" />,
        text: 'Próximo ao vencimento'
      },
      inativo: { 
        color: 'bg-gray-100 text-gray-800 border-gray-200', 
        icon: <FaClock className="w-3 h-3" />,
        text: 'Inativo'
      },
      pendente_validacao: { 
        color: 'bg-blue-100 text-blue-800 border-blue-200', 
        icon: <FaClock className="w-3 h-3" />,
        text: 'Pendente validação'
      }
    };

    const config = statusConfig[status] || statusConfig.inativo;
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${config.color}`}>
        {config.icon}
        {config.text}
      </span>
    );
  };

  const formatarData = (data) => {
    return new Date(data).toLocaleDateString('pt-BR');
  };

  const calcularDiasVencimento = (dataVencimento) => {
    const hoje = new Date();
    const vencimento = new Date(dataVencimento);
    const diffTime = vencimento - hoje;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando certificados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6"
        >
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FaCertificate className="w-6 h-6 text-blue-600" />
                </div>
                <h1 className="text-3xl font-bold text-gray-800">
                  Assinaturas e Certificados
                </h1>
              </div>
              <p className="text-gray-600">
                Gerencie suas opções de assinatura para laudos médicos
              </p>
            </div>
            {activeTab === 'certificados' && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors shadow-sm"
              >
                <FaUpload className="w-4 h-4" />
                Novo Certificado
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('certificados')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'certificados'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <FaCertificate className="w-4 h-4" />
              <span>Certificados Digitais</span>
            </button>
            <button
              onClick={() => setActiveTab('assinatura')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'assinatura'
                  ? 'bg-white text-purple-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <FaSignature className="w-4 h-4" />
              <span>Assinatura Física</span>
            </button>
          </div>
        </motion.div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'certificados' && (
            <motion.div
              key="certificados"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Certificados Content */}

        {/* Estatísticas */}
        {estatisticas && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total de Certificados</p>
                  <p className="text-2xl font-bold text-gray-800">{estatisticas.totalCertificados}</p>
                </div>
                <div className="p-3 bg-gray-100 rounded-lg">
                  <FaCertificate className="w-6 h-6 text-gray-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Certificados Ativos</p>
                  <p className="text-2xl font-bold text-green-600">{estatisticas.certificadosAtivos}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <FaCheck className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total de Assinaturas</p>
                  <p className="text-2xl font-bold text-blue-600">{estatisticas.totalAssinaturas}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <FaShieldAlt className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Próximos ao Vencimento</p>
                  <p className="text-2xl font-bold text-yellow-600">{estatisticas.proximosVencimento}</p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <FaExclamationTriangle className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Alertas */}
        {estatisticas?.alertas && estatisticas.alertas.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-yellow-50 border border-yellow-200 rounded-xl p-6"
          >
            <div className="flex items-start gap-3">
              <FaExclamationTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-yellow-800 mb-2">Certificados próximos ao vencimento</h3>
                <div className="space-y-2">
                  {estatisticas.alertas.map((alerta, index) => (
                    <div key={index} className="text-sm text-yellow-700">
                      <strong>{alerta.nome}</strong> vence em {alerta.diasRestantes} dias ({formatarData(alerta.dataVencimento)})
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Lista de Certificados */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden"
        >
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800">Meus Certificados</h2>
          </div>

          {certificados.length === 0 ? (
            <div className="p-12 text-center">
              <div className="p-4 bg-gray-100 rounded-full inline-block mb-4">
                <FaCertificate className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-600 mb-2">Nenhum certificado cadastrado</h3>
              <p className="text-gray-500 mb-6">Cadastre seu primeiro certificado digital para começar a assinar laudos</p>
              <button
                onClick={() => setShowUploadModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
              >
                Cadastrar Certificado
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-4 text-sm font-medium text-gray-600">Certificado</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-600">Emissor</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-600">Vencimento</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-600">Status</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-600">Assinaturas</th>
                    <th className="text-right p-4 text-sm font-medium text-gray-600">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {certificados.map((cert) => (
                    <tr key={cert.id} className="hover:bg-gray-50">
                      <td className="p-4">
                        <div>
                          <div className="font-medium text-gray-800">{cert.nomeCertificado}</div>
                          <div className="text-sm text-gray-500">
                            Cadastrado em {formatarData(cert.createdAt)}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-gray-600">{cert.emissor}</span>
                      </td>
                      <td className="p-4">
                        <div>
                          <div className="text-sm text-gray-800">{formatarData(cert.dataVencimento)}</div>
                          <div className={`text-xs ${
                            cert.diasVencimento <= 30 ? 'text-red-600' : 
                            cert.diasVencimento <= 90 ? 'text-yellow-600' : 'text-gray-500'
                          }`}>
                            {cert.diasVencimento > 0 ? `${cert.diasVencimento} dias` : 'Vencido'}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        {getStatusBadge(cert.status)}
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-gray-600">{cert.totalAssinaturas}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleVerDetalhes(cert)}
                            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Ver detalhes"
                          >
                            <FaEye className="w-4 h-4" />
                          </button>
                          
                          {cert.status !== 'vencido' && (
                            <button
                              onClick={() => handleAlterarStatus(cert, !cert.ativo)}
                              className={`p-2 rounded-lg transition-colors ${
                                cert.ativo 
                                  ? 'text-red-600 hover:text-red-800 hover:bg-red-50' 
                                  : 'text-green-600 hover:text-green-800 hover:bg-green-50'
                              }`}
                              title={cert.ativo ? 'Desativar' : 'Ativar'}
                            >
                              {cert.ativo ? <FaTimes className="w-4 h-4" /> : <FaCheck className="w-4 h-4" />}
                            </button>
                          )}
                          
                          <button
                            onClick={() => handleRemoverCertificado(cert)}
                            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remover"
                          >
                            <FaTrash className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
            </motion.div>
          )}

          {activeTab === 'assinatura' && (
            <motion.div
              key="assinatura"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <GerenciarAssinaturaFisica />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modal de Upload */}
      <AnimatePresence>
        {showUploadModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 backdrop-blur-sm backdrop-brightness-50 bg-opacity-50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FaUpload className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800">Novo Certificado</h3>
              </div>

              <form onSubmit={handleUploadCertificado} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Arquivo do Certificado (.pfx ou .p12)
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      accept=".pfx,.p12"
                      onChange={(e) => setArquivo(e.target.files[0])}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  {arquivo && (
                    <div className="mt-2 text-sm text-gray-600">
                      Arquivo selecionado: {arquivo.name}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Senha do Certificado
                  </label>
                  <div className="relative">
                    <FaKey className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="password"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Digite a senha do certificado"
                      required
                    />
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <FaInfoCircle className="w-4 h-4 text-blue-600 mt-0.5" />
                    <div className="text-sm text-blue-700">
                      <p className="font-medium mb-1">Informações importantes:</p>
                      <ul className="space-y-1 text-xs">
                        <li>• Apenas arquivos .pfx ou .p12 são aceitos</li>
                        <li>• O certificado deve estar válido</li>
                        <li>• A senha será criptografada e armazenada com segurança</li>
                        <li>• <strong>Certificados anteriores serão automaticamente desativados</strong></li>
                        <li>• Você pode manter um histórico de certificados inativos</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUploadModal(false);
                      setArquivo(null);
                      setSenha('');
                    }}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={uploading || !arquivo || !senha}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {uploading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Cadastrando...
                      </>
                    ) : (
                      <>
                        <FaUpload className="w-4 h-4" />
                        Cadastrar
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Detalhes */}
      <AnimatePresence>
        {showDetailsModal && selectedCertificado && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 backdrop-blur-sm backdrop-brightness-50 bg-opacity-50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FaCertificate className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800">Detalhes do Certificado</h3>
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <FaTimes className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Status */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-700">Status:</span>
                  {getStatusBadge(selectedCertificado.status)}
                </div>

                {/* Informações básicas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Certificado</label>
                    <p className="text-gray-800">{selectedCertificado.nomeCertificado}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Emissor</label>
                    <p className="text-gray-800">{selectedCertificado.emissor}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Número de Série</label>
                    <p className="text-gray-800 font-mono text-sm">{selectedCertificado.numeroSerie}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Algoritmo</label>
                    <p className="text-gray-800">{selectedCertificado.algoritmoAssinatura}</p>
                  </div>
                </div>

                {/* Datas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data de Emissão</label>
                    <p className="text-gray-800">{formatarData(selectedCertificado.dataEmissao)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data de Vencimento</label>
                    <p className={`font-medium ${
                      selectedCertificado.diasVencimento <= 30 ? 'text-red-600' : 
                      selectedCertificado.diasVencimento <= 90 ? 'text-yellow-600' : 'text-gray-800'
                    }`}>
                      {formatarData(selectedCertificado.dataVencimento)}
                      <span className="text-sm text-gray-500 ml-2">
                        ({selectedCertificado.diasVencimento > 0 ? `${selectedCertificado.diasVencimento} dias` : 'Vencido'})
                      </span>
                    </p>
                  </div>
                </div>

                {/* Estatísticas de uso */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{selectedCertificado.totalAssinaturas}</div>
                    <div className="text-sm text-blue-700">Total de Assinaturas</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{selectedCertificado.tamanhoChave}</div>
                    <div className="text-sm text-green-700">Tamanho da Chave (bits)</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-sm font-medium text-purple-600">
                      {selectedCertificado.ultimoUso ? formatarData(selectedCertificado.ultimoUso) : 'Nunca usado'}
                    </div>
                    <div className="text-sm text-purple-700">Último Uso</div>
                  </div>
                </div>

                {/* Informações técnicas */}
                <div className="border-t border-gray-200 pt-4">
                  <h4 className="font-medium text-gray-700 mb-3">Informações Técnicas</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Cadastrado em:</span>
                      <span className="ml-2 text-gray-800">{formatarData(selectedCertificado.createdAt)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Última atualização:</span>
                      <span className="ml-2 text-gray-800">{formatarData(selectedCertificado.updatedAt)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Validado:</span>
                      <span className="ml-2 text-gray-800">
                        {selectedCertificado.validado ? 'Sim' : 'Não'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Ativo:</span>
                      <span className="ml-2 text-gray-800">
                        {selectedCertificado.ativo ? 'Sim' : 'Não'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-6 border-t border-gray-200 mt-6">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Confirmação de Remoção */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            className="fixed inset-0 backdrop-blur-sm backdrop-brightness-50 bg-opacity-50 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <FaExclamationTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Confirmar Remoção
                  </h3>
                  <p className="text-sm text-gray-600">
                    Esta ação não pode ser desfeita
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-gray-700 mb-3">
                  Tem certeza que deseja remover o certificado:
                </p>
                <div className="bg-gray-50 rounded-lg p-3 border-l-4 border-red-400">
                  <p className="font-medium text-gray-900">
                    {certificadoParaDeletar?.nomeCertificado}
                  </p>
                  <p className="text-sm text-gray-600">
                    Emissor: {certificadoParaDeletar?.emissor}
                  </p>
                  {certificadoParaDeletar?.totalAssinaturas > 0 && (
                    <p className="text-sm text-amber-600 mt-1 flex items-center gap-1">
                      <FaInfoCircle className="w-3 h-3" />
                      Este certificado foi usado em {certificadoParaDeletar.totalAssinaturas} assinatura(s)
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={cancelarRemocao}
                  disabled={deletando}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarRemocao}
                  disabled={deletando}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {deletando ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Removendo...
                    </>
                  ) : (
                    <>
                      <FaTrash className="w-4 h-4" />
                      Remover
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GerenciarCertificados;
