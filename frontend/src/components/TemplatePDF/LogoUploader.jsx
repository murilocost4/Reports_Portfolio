import React, { useState, useEffect, useCallback } from 'react';
import { 
  FaUpload, 
  FaTrash, 
  FaImage, 
  FaCheck, 
  FaTimes, 
  FaSpinner,
  FaExclamationTriangle,
  FaInfoCircle
} from 'react-icons/fa';
import templatePDFService from '../../services/templatePDFService';

const LogoUploader = ({ onLogoUpdated, className = '' }) => {
  const [logoInfo, setLogoInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // Carregar logo atual
  const loadLogo = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await templatePDFService.buscarLogo();
      setLogoInfo(response);
      
      if (response.temLogo && response.logo?.url) {
        setPreviewUrl(response.logo.url);
      } else {
        setPreviewUrl(null);
      }
    } catch (error) {
      console.error('Erro ao carregar logo:', error);
      setError('Erro ao carregar informações do logo');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLogo();
  }, [loadLogo]);

  // Upload de logo
  const handleUpload = async (file) => {
    if (!file) return;

    // Validar arquivo
    const validacao = templatePDFService.validarArquivoLogo(file);
    if (!validacao.valido) {
      setError(validacao.erro);
      return;
    }

    try {
      setUploading(true);
      setError(null);
      setSuccess(null);

      // Criar preview local
      const fileReader = new FileReader();
      fileReader.onload = (e) => {
        setPreviewUrl(e.target.result);
      };
      fileReader.readAsDataURL(file);

      const response = await templatePDFService.uploadLogo(file);
      
      setSuccess('Logo carregado com sucesso!');
      await loadLogo();
      
      if (onLogoUpdated) {
        onLogoUpdated(response);
      }

      // Limpar mensagem de sucesso após 3 segundos
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (error) {
      console.error('Erro no upload:', error);
      setError(error.response?.data?.erro || 'Erro ao fazer upload do logo');
      setPreviewUrl(logoInfo?.logo?.url || null); // Reverter preview
    } finally {
      setUploading(false);
    }
  };

  // Remover logo
  const handleRemove = async () => {
    if (!window.confirm('Tem certeza que deseja remover o logo da empresa?')) {
      return;
    }

    try {
      setRemoving(true);
      setError(null);
      setSuccess(null);

      await templatePDFService.removerLogo();
      
      setSuccess('Logo removido com sucesso!');
      setPreviewUrl(null);
      await loadLogo();
      
      if (onLogoUpdated) {
        onLogoUpdated(null);
      }

      setTimeout(() => setSuccess(null), 3000);
      
    } catch (error) {
      console.error('Erro ao remover logo:', error);
      setError(error.response?.data?.erro || 'Erro ao remover logo');
    } finally {
      setRemoving(false);
    }
  };

  // Handlers para drag and drop
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleUpload(e.target.files[0]);
    }
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <FaSpinner className="animate-spin text-gray-400 mr-2" />
          <span className="text-gray-600">Carregando informações do logo...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-blue-100 p-2 rounded-lg">
          <FaImage className="text-blue-600 text-lg" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Logo da Empresa</h3>
          <p className="text-sm text-gray-600">
            Adicione o logo da sua empresa para aparecer nos PDFs de laudos
          </p>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
          <FaExclamationTriangle className="text-red-500 flex-shrink-0" />
          <span className="text-red-700 text-sm">{error}</span>
          <button 
            onClick={() => setError(null)}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            <FaTimes />
          </button>
        </div>
      )}

      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2">
          <FaCheck className="text-green-500 flex-shrink-0" />
          <span className="text-green-700 text-sm">{success}</span>
          <button 
            onClick={() => setSuccess(null)}
            className="ml-auto text-green-500 hover:text-green-700"
          >
            <FaTimes />
          </button>
        </div>
      )}

      {/* Preview Area */}
      <div className="mb-6">
        {previewUrl ? (
          <div className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-gray-700">Logo Atual:</span>
              <button
                onClick={handleRemove}
                disabled={removing}
                className="flex items-center gap-2 px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {removing ? (
                  <FaSpinner className="animate-spin" />
                ) : (
                  <FaTrash />
                )}
                {removing ? 'Removendo...' : 'Remover'}
              </button>
            </div>
            <div className="flex justify-center">
              <img 
                src={previewUrl}
                alt="Logo da empresa"
                className="max-w-xs max-h-24 object-contain border border-gray-200 rounded"
              />
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <FaImage className="mx-auto text-4xl mb-2 text-gray-300" />
            <p>Nenhum logo carregado</p>
          </div>
        )}
      </div>

      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragActive 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="space-y-4">
          <div className="flex justify-center">
            {uploading ? (
              <FaSpinner className="animate-spin text-4xl text-blue-500" />
            ) : (
              <FaUpload className="text-4xl text-gray-400" />
            )}
          </div>
          
          <div>
            <p className="text-lg font-medium text-gray-900 mb-2">
              {uploading ? 'Fazendo upload...' : 'Arraste e solte ou clique para selecionar'}
            </p>
            <p className="text-sm text-gray-600">
              Formatos aceitos: JPG, PNG, GIF, WebP • Tamanho máximo: 5MB
            </p>
          </div>

          <div>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileInput}
              disabled={uploading}
              className="hidden"
              id="logo-upload"
            />
            <label
              htmlFor="logo-upload"
              className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors cursor-pointer ${
                uploading
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {uploading ? (
                <>
                  <FaSpinner className="animate-spin" />
                  Fazendo upload...
                </>
              ) : (
                <>
                  <FaUpload />
                  Selecionar Arquivo
                </>
              )}
            </label>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <FaInfoCircle className="text-blue-500 mt-1 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Como funciona:</p>
            <ul className="space-y-1 text-xs">
              <li>• O logo aparecerá no header de todos os PDFs de laudos</li>
              <li>• Tamanho de exibição: 120x60px (proporção mantida)</li>
              <li>• Posicionamento baseado no alinhamento do título</li>
              <li>• Para melhor qualidade, use imagens com boa resolução</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogoUploader;
