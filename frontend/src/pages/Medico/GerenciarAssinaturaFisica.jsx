import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../api';
import { toast } from 'react-hot-toast';
import {
  FaImage,
  FaUpload,
  FaEye,
  FaTrash,
  FaFileUpload,
  FaInfoCircle,
  FaSignature,
  FaDownload
} from 'react-icons/fa';

const GerenciarAssinaturaFisica = () => {
  const [assinatura, setAssinatura] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [removendo, setRemovendo] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [arquivo, setArquivo] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);

  useEffect(() => {
    carregarAssinatura();
  }, []);

  const carregarAssinatura = async () => {
    try {
      const response = await api.get('/assinaturas/fisica');
      setAssinatura(response.data.assinatura);
    } catch (error) {
      if (error.response?.status !== 404) {
        console.error('Erro ao carregar assinatura:', error);
        toast.error('Erro ao carregar informações da assinatura');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (file.type !== 'image/png') {
      toast.error('Apenas arquivos PNG são permitidos');
      return;
    }

    // Validar tamanho (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('O arquivo deve ter no máximo 2MB');
      return;
    }

    setArquivo(file);
    
    // Criar preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewFile(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    
    if (!arquivo) {
      toast.error('Selecione um arquivo PNG para upload');
      return;
    }

    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('assinatura', arquivo);

      const response = await api.post('/assinaturas/fisica', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success('Assinatura física cadastrada com sucesso!');
      setShowUploadModal(false);
      setArquivo(null);
      setPreviewFile(null);
      carregarAssinatura();
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      const mensagem = error.response?.data?.erro || 'Erro ao cadastrar assinatura física';
      toast.error(mensagem);
    } finally {
      setUploading(false);
    }
  };

  const handleRemover = async () => {
    setRemovendo(true);
    try {
      await api.delete('/assinaturas/fisica');
      toast.success('Assinatura física removida com sucesso!');
      setAssinatura(null);
      setShowDeleteModal(false);
    } catch (error) {
      console.error('Erro ao remover assinatura:', error);
      const mensagem = error.response?.data?.erro || 'Erro ao remover assinatura física';
      toast.error(mensagem);
    } finally {
      setRemovendo(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="bg-gray-200 rounded-lg h-32 mb-4"></div>
        <div className="bg-gray-200 rounded h-4 mb-2"></div>
        <div className="bg-gray-200 rounded h-4 w-3/4"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <FaSignature className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Assinatura Física</h2>
              <p className="text-sm text-gray-600">
                Gerencie sua assinatura física (PNG) para uso nos laudos
              </p>
            </div>
          </div>
          
          {!assinatura && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowUploadModal(true)}
              className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
            >
              <FaUpload className="w-4 h-4" />
              <span>Cadastrar Assinatura</span>
            </motion.button>
          )}
        </div>
      </div>

      {/* Status da Assinatura */}
      {assinatura ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-3">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border bg-green-100 text-green-800 border-green-200">
                  <FaImage className="w-3 h-3" />
                  Ativa
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-700">Arquivo</p>
                  <p className="text-sm text-gray-600">{assinatura.filename}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Tamanho</p>
                  <p className="text-sm text-gray-600">{formatFileSize(assinatura.size)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Data de Upload</p>
                  <p className="text-sm text-gray-600">
                    {new Date(assinatura.uploadedAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Status</p>
                  <p className="text-sm text-green-600 font-medium">Pronta para uso</p>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-2 ml-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowPreview(true)}
                className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 px-3 py-1 rounded border border-blue-200 hover:border-blue-300 transition-colors"
              >
                <FaEye className="w-4 h-4" />
                <span>Visualizar</span>
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowUploadModal(true)}
                className="flex items-center space-x-1 text-purple-600 hover:text-purple-700 px-3 py-1 rounded border border-purple-200 hover:border-purple-300 transition-colors"
              >
                <FaUpload className="w-4 h-4" />
                <span>Substituir</span>
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center space-x-1 text-red-600 hover:text-red-700 px-3 py-1 rounded border border-red-200 hover:border-red-300 transition-colors"
              >
                <FaTrash className="w-4 h-4" />
                <span>Remover</span>
              </motion.button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaSignature className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhuma assinatura física cadastrada
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Cadastre sua assinatura física em formato PNG para que ela seja automaticamente 
              inserida nos laudos, dispensando a necessidade de impressão e assinatura manual.
            </p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowUploadModal(true)}
              className="flex items-center space-x-2 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors mx-auto"
            >
              <FaUpload className="w-4 h-4" />
              <span>Cadastrar Assinatura</span>
            </motion.button>
          </div>
        </div>
      )}

      {/* Informações importantes */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <FaInfoCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <h4 className="font-medium mb-1">Requisitos para assinatura física:</h4>
            <ul className="space-y-1 text-blue-700">
              <li>• Arquivo deve ser no formato PNG</li>
              <li>• Tamanho máximo: 2MB</li>
              <li>• Dimensões: mínimo 50x25 pixels, máximo 2000x1000 pixels</li>
              <li>• Fundo transparente é recomendado para melhor integração</li>
              <li>• A assinatura será inserida automaticamente nos laudos não assinados digitalmente</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Modal de Upload */}
      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 backdrop-blur-sm backdrop-brightness-50 bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-lg max-w-md w-full p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {assinatura ? 'Substituir Assinatura' : 'Cadastrar Assinatura Física'}
              </h3>
              
              <form onSubmit={handleUpload} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Arquivo PNG da Assinatura
                  </label>
                  <input
                    type="file"
                    accept=".png,image/png"
                    onChange={handleFileSelect}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Apenas arquivos PNG, máximo 2MB
                  </p>
                </div>

                {previewFile && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Preview:</p>
                    <div className="bg-gray-50 p-4 rounded border-2 border-dashed border-gray-300 text-center">
                      <img 
                        src={previewFile} 
                        alt="Preview da assinatura" 
                        className="max-h-32 mx-auto"
                        style={{ maxWidth: '100%' }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUploadModal(false);
                      setArquivo(null);
                      setPreviewFile(null);
                    }}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={!arquivo || uploading}
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {uploading ? 'Enviando...' : (assinatura ? 'Substituir' : 'Cadastrar')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Preview */}
      <AnimatePresence>
        {showPreview && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-lg max-w-2xl w-full p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Visualizar Assinatura Física
                </h3>
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="border border-gray-200 rounded-lg p-8 bg-gray-50 text-center">
                <img 
                  src={`${api.defaults.baseURL}/assinaturas/fisica/visualizar`}
                  alt="Assinatura física" 
                  className="max-w-full max-h-96 mx-auto"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'block';
                  }}
                />
                <div className="hidden text-gray-500">
                  <FaImage className="w-12 h-12 mx-auto mb-2" />
                  <p>Erro ao carregar assinatura</p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Confirmação de Remoção */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-lg max-w-md w-full p-6"
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <FaTrash className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Remover Assinatura
                  </h3>
                  <p className="text-sm text-gray-600">
                    Esta ação não pode ser desfeita
                  </p>
                </div>
              </div>
              
              <p className="text-gray-700 mb-6">
                Tem certeza que deseja remover sua assinatura física? 
                Você precisará fazer upload de uma nova assinatura para usar nos laudos.
              </p>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleRemover}
                  disabled={removendo}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {removendo ? 'Removendo...' : 'Remover'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GerenciarAssinaturaFisica;
