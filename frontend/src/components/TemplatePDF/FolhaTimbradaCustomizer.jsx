import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import templatePDFService from '../../services/templatePDFService';
import { toast } from 'react-hot-toast';
import { FaUpload, FaImage, FaSave, FaSpinner, FaCloudUploadAlt, FaEye, FaArrowLeft, FaPalette, FaFont, FaTextHeight, FaAdjust } from 'react-icons/fa';

const FolhaTimbradaCustomizer = ({ currentTemplate, onTemplateUpdated, onOpenGallery }) => {
  const { usuario, temRole, temAlgumaRole, isAdminMaster } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [shouldReload, setShouldReload] = useState(true);
  const [folhaTimbradaUrl, setFolhaTimbradaUrl] = useState(currentTemplate?.folhaTimbradaUrl || '');
  const [folhaTimbradaFile, setFolhaTimbradaFile] = useState(null);
  const fileInputRef = useRef(null);

  const [textStyles, setTextStyles] = useState(() => {
    const defaultStyles = {
      colors: {
        primary: '#1f2937',
        secondary: '#374151',
        text: '#111827',
        accent: '#3b82f6'
      },
      fonts: {
        title: 16,
        subtitle: 14,
        body: 11,
        small: 9
      },
      spacing: {
        lineHeight: 1.4,
        paragraphSpacing: 12,
        sectionSpacing: 20
      },
      layout: {
        alignment: 'left',
        opacity: 1.0,
        fontWeight: 'normal'
      }
    };
    if (currentTemplate?.textStyles) {
      const mergedStyles = {
        ...defaultStyles,
        colors: {
          ...defaultStyles.colors,
          ...currentTemplate.textStyles.colors
        },
        fonts: {
          ...defaultStyles.fonts,
          ...currentTemplate.textStyles.fonts
        },
        spacing: {
          ...defaultStyles.spacing,
          ...currentTemplate.textStyles.spacing
        },
        layout: {
          ...defaultStyles.layout,
          ...currentTemplate.textStyles.layout
        }
      };
      return mergedStyles;
    }
    return defaultStyles;
  });

  useEffect(() => {
    if (currentTemplate?.folhaTimbradaUrl) {
      if (folhaTimbradaUrl && folhaTimbradaUrl.startsWith('blob:')) {
        URL.revokeObjectURL(folhaTimbradaUrl);
      }
      setFolhaTimbradaUrl(currentTemplate.folhaTimbradaUrl);
      setFolhaTimbradaFile(null);
    }
    if (currentTemplate?.textStyles && currentTemplate?.tipoTemplate && shouldReload) {
      setTextStyles(prev => {
        const newStyles = {
          ...prev,
          colors: {
            ...prev.colors,
            ...currentTemplate.textStyles.colors
          },
          fonts: {
            ...prev.fonts,
            ...currentTemplate.textStyles.fonts
          },
          spacing: {
            ...prev.spacing,
            ...currentTemplate.textStyles.spacing
          },
          layout: {
            ...prev.layout,
            ...currentTemplate.textStyles.layout
          }
        };
        return newStyles;
      });
      setShouldReload(false);
    }
    return () => {
      if (folhaTimbradaUrl && folhaTimbradaUrl.startsWith('blob:')) {
        URL.revokeObjectURL(folhaTimbradaUrl);
      }
    };
  }, [currentTemplate?.folhaTimbradaUrl, currentTemplate?.tipoTemplate, shouldReload]);

  useEffect(() => {
    if (currentTemplate?.textStyles) {
      setTextStyles(prev => {
        const newStyles = {
          ...prev,
          colors: {
            ...prev.colors,
            ...currentTemplate.textStyles.colors
          },
          fonts: {
            ...prev.fonts,
            ...currentTemplate.textStyles.fonts
          },
          spacing: {
            ...prev.spacing,
            ...currentTemplate.textStyles.spacing
          },
          layout: {
            ...prev.layout,
            ...currentTemplate.textStyles.layout
          }
        };
        return newStyles;
      });
    }
    if (currentTemplate?.folhaTimbradaUrl) {
      setFolhaTimbradaUrl(currentTemplate.folhaTimbradaUrl);
      setFolhaTimbradaFile(null);
    }
  }, [currentTemplate]);

  const updateTextStyle = (category, property, value) => {
    setTextStyles(prev => {
      const updated = {
        ...prev,
        [category]: {
          ...prev[category],
          [property]: value
        }
      };
      return updated;
    });
  };

  const resetTextStyles = () => {
    const defaultStyles = {
      colors: {
        primary: '#1f2937',
        secondary: '#374151',
        text: '#111827',
        accent: '#3b82f6'
      },
      fonts: {
        title: 16,
        subtitle: 14,
        body: 11,
        small: 9
      },
      spacing: {
        lineHeight: 1.4,
        paragraphSpacing: 12,
        sectionSpacing: 20
      },
      layout: {
        alignment: 'left',
        opacity: 1.0,
        fontWeight: 'normal'
      }
    };
    setTextStyles(defaultStyles);
    toast.success('🎨 Estilos resetados para o padrão!');
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) {
      return;
    }
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Tipo de arquivo não suportado. Use JPEG, PNG, GIF, WebP ou PDF.');
      return;
    }
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('Arquivo muito grande. Máximo 10MB permitido.');
      return;
    }
    try {
      setLoading(true);
      if (folhaTimbradaUrl && folhaTimbradaUrl.startsWith('blob:')) {
        URL.revokeObjectURL(folhaTimbradaUrl);
      }
      const previewUrl = URL.createObjectURL(file);
      setFolhaTimbradaUrl(previewUrl);
      setFolhaTimbradaFile(file);
      toast.success('✅ Folha timbrada carregada! Configure os estilos de texto e salve.');
    } catch (error) {
      toast.error('❌ Erro ao processar arquivo');
    } finally {
      setLoading(false);
    }
  };

  const saveConfiguration = async () => {
    const isAdmin = isAdminMaster || temAlgumaRole(['admin', 'adminMaster']);
    if (!isAdmin) {
      toast.error('❌ Apenas administradores podem salvar templates');
      return;
    }
    const temFolhaTimbrada = folhaTimbradaFile || folhaTimbradaUrl;
    if (!temFolhaTimbrada) {
      toast.error('❌ Faça upload de uma folha timbrada primeiro');
      return;
    }
    try {
      setSaving(true);
      const templateData = {
        tipoTemplate: 'folha_timbrada',
        nomeModelo: 'Folha Timbrada Simplificada',
        textStyles: textStyles,
        folhaTimbradaConfig: {
          largura: 210,
          altura: 297,
          usarImagemFundo: true,
          manterProporcoes: true,
          posicionamento: 'center'
        },
        layout: {
          mostrarLogo: false,
          mostrarCabecalho: false,
          mostrarRodape: false,
          mostrarDadosPaciente: true,
          mostrarDadosExame: true,
          mostrarQrCode: true,
          mostrarDataAssinatura: true,
          mostrarCabecalhoCompleto: false,
          usarFolhaComoFundo: true
        }
      };
      if (folhaTimbradaFile) {
        // arquivo novo será enviado
      }
      else if (folhaTimbradaUrl && !folhaTimbradaUrl.startsWith('blob:')) {
        templateData.folhaTimbradaUrl = folhaTimbradaUrl;
      } 
      else if (currentTemplate?.folhaTimbradaUrl) {
        templateData.folhaTimbradaUrl = currentTemplate.folhaTimbradaUrl;
      } 
      try {
        const response = await templatePDFService.salvarTemplateTenant(templateData, null, folhaTimbradaFile);
        setShouldReload(true);
        if (response.template) {
          if (response.template.textStyles) {
            setTextStyles(response.template.textStyles);
          }
          if (response.template.folhaTimbradaUrl) {
            setFolhaTimbradaUrl(response.template.folhaTimbradaUrl);
            setFolhaTimbradaFile(null);
          }
        }
        toast.success('✅ Folha timbrada salva com sucesso!');
        if (onTemplateUpdated) {
          onTemplateUpdated();
        }
      } catch (error) {
        toast.error('❌ Erro ao salvar configuração');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-purple-500 p-3 rounded-xl">
              <FaImage className="text-2xl text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Folha Timbrada Simplificada
              </h2>
              <p className="text-gray-600">
                Configure sua folha timbrada como imagem de fundo e personalize apenas as cores, tamanhos de fonte, 
                espaçamento e alinhamento dos textos. Interface simplificada com apenas os controladores funcionais.
              </p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => onOpenGallery?.()}
              className="flex items-center gap-2 px-4 py-2 border-2 border-purple-300 text-purple-700 rounded-xl hover:bg-purple-50 transition-all duration-200"
            >
              <FaArrowLeft />
              <FaPalette />
              <span>Voltar à Galeria</span>
            </button>
            
            <button
              onClick={resetTextStyles}
              className="flex items-center gap-2 px-4 py-2 border-2 border-blue-300 text-blue-700 rounded-xl hover:bg-blue-50 transition-all duration-200"
            >
              <FaPalette />
              <span>Resetar Estilos</span>
            </button>
            
            <button
              onClick={saveConfiguration}
              disabled={saving || !folhaTimbradaUrl || (!isAdminMaster && !temAlgumaRole(['admin', 'adminMaster']))}
              className={`flex items-center gap-2 px-6 py-2 rounded-xl transition-all duration-200 shadow-lg ${
                !isAdminMaster && !temAlgumaRole(['admin', 'adminMaster'])
                  ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                  : 'bg-purple-500 text-white hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
              title={!isAdminMaster && !temAlgumaRole(['admin', 'adminMaster']) ? 'Apenas administradores podem salvar templates' : ''}
            >
              {saving ? (
                <>
                  <FaSpinner className="animate-spin" />
                  Salvando...
                </>
              ) : !isAdminMaster && !temAlgumaRole(['admin', 'adminMaster']) ? (
                <>
                  <FaImage />
                  Apenas Admin
                </>
              ) : (
                <>
                  <FaSave />
                  Salvar Configuração
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Upload Section */}
      {!folhaTimbradaUrl ? (
        <div className="bg-white rounded-xl shadow-lg border-2 border-dashed border-purple-300 p-8">
          <div className="text-center">
            <div className="bg-purple-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <FaCloudUploadAlt className="text-3xl text-purple-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Upload da Folha Timbrada
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Faça upload da sua folha timbrada oficial. Ela será usada como imagem de fundo no PDF. 
              Aceita PNG, JPG, GIF, WebP ou PDF até 10MB.
            </p>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileUpload}
              className="hidden"
              id="folha-upload"
            />
            
            <label
              htmlFor="folha-upload"
              className="inline-flex items-center gap-2 px-6 py-3 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition-all duration-200 cursor-pointer shadow-lg"
            >
              {loading ? (
                <>
                  <FaSpinner className="animate-spin" />
                  Processando...
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
      ) : (
        /* Customizer Section */
        <div className="bg-white rounded-xl shadow-lg p-6">
          {/* Cabeçalho do Customizer */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-200">
            <div className="flex items-center gap-3">
              <div className="bg-green-500 p-2 rounded-lg">
                <FaEye className="text-white text-lg" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Folha Timbrada Configurada
                </h3>
                <p className="text-sm text-gray-600">
                  Configure os estilos dos textos que serão sobrepostos à folha timbrada
                </p>
              </div>
            </div>
            
            {/* Botão para trocar folha timbrada */}
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileUpload}
                className="hidden"
                id="folha-upload-change"
              />
              
              <label
                htmlFor="folha-upload-change"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-200 cursor-pointer text-sm"
                title="Substituir por nova folha timbrada"
              >
                {loading ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    Carregando...
                  </>
                ) : (
                  <>
                    <FaUpload />
                    Trocar Folha
                  </>
                )}
              </label>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sidebar - Configurações de Estilo */}
            <div className="lg:col-span-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FaPalette className="text-purple-500" />
                Estilos dos Textos
              </h3>
              
              <div className="space-y-6">
                {/* Cores */}
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <FaPalette className="text-purple-500" />
                    Cores
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Título Principal
                      </label>
                      <input
                        type="color"
                        value={textStyles.colors.primary}
                        onChange={(e) => updateTextStyle('colors', 'primary', e.target.value)}
                        className="w-full h-10 rounded border border-gray-300"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Subtítulos
                      </label>
                      <input
                        type="color"
                        value={textStyles.colors.secondary}
                        onChange={(e) => updateTextStyle('colors', 'secondary', e.target.value)}
                        className="w-full h-10 rounded border border-gray-300"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Texto Comum
                      </label>
                      <input
                        type="color"
                        value={textStyles.colors.text}
                        onChange={(e) => updateTextStyle('colors', 'text', e.target.value)}
                        className="w-full h-10 rounded border border-gray-300"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Destaques
                      </label>
                      <input
                        type="color"
                        value={textStyles.colors.accent}
                        onChange={(e) => updateTextStyle('colors', 'accent', e.target.value)}
                        className="w-full h-10 rounded border border-gray-300"
                      />
                    </div>
                  </div>
                </div>

                {/* Tamanhos de Fonte */}
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <FaTextHeight className="text-blue-500" />
                    Tamanhos de Fonte
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Título: {textStyles.fonts.title}px
                      </label>
                      <input
                        type="range"
                        min="12"
                        max="24"
                        value={textStyles.fonts.title}
                        onChange={(e) => updateTextStyle('fonts', 'title', parseInt(e.target.value))}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Subtítulo: {textStyles.fonts.subtitle}px
                      </label>
                      <input
                        type="range"
                        min="10"
                        max="18"
                        value={textStyles.fonts.subtitle}
                        onChange={(e) => updateTextStyle('fonts', 'subtitle', parseInt(e.target.value))}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Texto: {textStyles.fonts.body}px
                      </label>
                      <input
                        type="range"
                        min="8"
                        max="16"
                        value={textStyles.fonts.body}
                        onChange={(e) => updateTextStyle('fonts', 'body', parseInt(e.target.value))}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Pequeno: {textStyles.fonts.small}px
                      </label>
                      <input
                        type="range"
                        min="6"
                        max="12"
                        value={textStyles.fonts.small}
                        onChange={(e) => updateTextStyle('fonts', 'small', parseInt(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>

                {/* Espaçamento */}
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <FaAdjust className="text-green-500" />
                    Espaçamento
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Altura da Linha: {textStyles.spacing.lineHeight}
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="2"
                        step="0.1"
                        value={textStyles.spacing.lineHeight}
                        onChange={(e) => updateTextStyle('spacing', 'lineHeight', parseFloat(e.target.value))}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Entre Parágrafos: {textStyles.spacing.paragraphSpacing}px
                      </label>
                      <input
                        type="range"
                        min="6"
                        max="24"
                        value={textStyles.spacing.paragraphSpacing}
                        onChange={(e) => updateTextStyle('spacing', 'paragraphSpacing', parseInt(e.target.value))}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Entre Seções: {textStyles.spacing.sectionSpacing}px
                      </label>
                      <input
                        type="range"
                        min="10"
                        max="40"
                        value={textStyles.spacing.sectionSpacing}
                        onChange={(e) => updateTextStyle('spacing', 'sectionSpacing', parseInt(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>

                {/* Layout */}
                <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <FaFont className="text-yellow-500" />
                    Layout
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Alinhamento
                      </label>
                      <select
                        value={textStyles.layout.alignment}
                        onChange={(e) => updateTextStyle('layout', 'alignment', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="left">Esquerda</option>
                        <option value="center">Centro</option>
                        <option value="right">Direita</option>
                        <option value="justify">Justificado</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Opacidade: {Math.round(textStyles.layout.opacity * 100)}%
                      </label>
                      <input
                        type="range"
                        min="0.3"
                        max="1"
                        step="0.1"
                        value={textStyles.layout.opacity}
                        onChange={(e) => updateTextStyle('layout', 'opacity', parseFloat(e.target.value))}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Peso da Fonte
                      </label>
                      <select
                        value={textStyles.layout.fontWeight}
                        onChange={(e) => updateTextStyle('layout', 'fontWeight', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="normal">Normal</option>
                        <option value="bold">Negrito</option>
                        <option value="lighter">Mais Leve</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="lg:col-span-2">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FaEye className="text-green-500" />
                Preview da Folha Timbrada
              </h3>
              
              {/* Container do preview com proporção A4 */}
              <div className="relative bg-gray-100 rounded-xl p-6 shadow-inner">
                <div className="flex justify-center">
                  {/* Página A4 simulada com proporção correta (1:1.414) */}
                  <div 
                    className="relative bg-white shadow-xl border border-gray-300 overflow-hidden"
                    style={{
                      width: '400px',
                      height: '566px', // Proporção A4: 400 * 1.414 ≈ 566
                      backgroundImage: folhaTimbradaUrl ? `url(${folhaTimbradaUrl})` : 'none',
                      backgroundSize: 'cover',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'center'
                    }}
                  >
                    {/* Preview simplificado sem indicadores visuais */}
                    
                    {/* Área de conteúdo simplificada */}
                    <div className="absolute inset-8 overflow-hidden">
                      {/* Conteúdo interno */}
                      <div className="h-full w-full p-4 overflow-hidden">
                        {/* Preview do conteúdo do laudo */}
                        <div className="space-y-2 text-xs h-full flex flex-col">
                          {/* Cabeçalho */}
                          <div 
                            className="font-bold text-center bg-white bg-opacity-80 px-1 py-0.5 rounded"
                            style={{
                              color: textStyles.colors.primary,
                              fontSize: `${Math.max(textStyles.fonts.title * 0.5, 7)}px`,
                              lineHeight: textStyles.spacing.lineHeight,
                              opacity: textStyles.layout.opacity,
                              fontWeight: textStyles.layout.fontWeight
                            }}
                          >
                            LAUDO MÉDICO
                          </div>
                          
                          {/* Dados do Paciente */}
                          <div 
                            className="bg-white bg-opacity-70 p-1 rounded"
                            style={{
                              marginBottom: `${Math.max(textStyles.spacing.sectionSpacing * 0.2, 1)}px`
                            }}
                          >
                            <div 
                              className="font-semibold mb-0.5"
                              style={{
                                color: textStyles.colors.secondary,
                                fontSize: `${Math.max(textStyles.fonts.subtitle * 0.5, 6)}px`,
                                opacity: textStyles.layout.opacity,
                                fontWeight: textStyles.layout.fontWeight
                              }}
                            >
                              DADOS DO PACIENTE
                            </div>
                            <div 
                              style={{
                                color: textStyles.colors.text,
                                fontSize: `${Math.max(textStyles.fonts.body * 0.5, 5)}px`,
                                lineHeight: textStyles.spacing.lineHeight,
                                textAlign: textStyles.layout.alignment,
                                opacity: textStyles.layout.opacity,
                                fontWeight: textStyles.layout.fontWeight
                              }}
                            >
                              Nome: João Silva Santos<br />
                              CPF: 123.456.789-00<br />
                              Data Nasc: 15/05/1980
                            </div>
                          </div>
                          
                          {/* Dados do Exame */}
                          <div 
                            className="bg-white bg-opacity-70 p-1 rounded"
                            style={{
                              marginBottom: `${Math.max(textStyles.spacing.sectionSpacing * 0.2, 1)}px`
                            }}
                          >
                            <div 
                              className="font-semibold mb-0.5"
                              style={{
                                color: textStyles.colors.secondary,
                                fontSize: `${Math.max(textStyles.fonts.subtitle * 0.5, 6)}px`,
                                opacity: textStyles.layout.opacity,
                                fontWeight: textStyles.layout.fontWeight
                              }}
                            >
                              DADOS DO EXAME
                            </div>
                            <div 
                              style={{
                                color: textStyles.colors.text,
                                fontSize: `${Math.max(textStyles.fonts.body * 0.5, 5)}px`,
                                lineHeight: textStyles.spacing.lineHeight,
                                textAlign: textStyles.layout.alignment,
                                opacity: textStyles.layout.opacity,
                                fontWeight: textStyles.layout.fontWeight
                              }}
                            >
                              Tipo: Eletrocardiograma<br />
                              Data: {new Date().toLocaleDateString('pt-BR')}
                            </div>
                          </div>
                          
                          {/* Conclusão */}
                          <div 
                            className="flex-1 bg-white bg-opacity-70 p-1 rounded"
                          >
                            <div 
                              className="font-semibold mb-0.5"
                              style={{
                                color: textStyles.colors.secondary,
                                fontSize: `${Math.max(textStyles.fonts.subtitle * 0.5, 6)}px`,
                                opacity: textStyles.layout.opacity,
                                fontWeight: textStyles.layout.fontWeight
                              }}
                            >
                              ANÁLISE E CONCLUSÃO
                            </div>
                            <div 
                              style={{
                                color: textStyles.colors.text,
                                fontSize: `${Math.max(textStyles.fonts.body * 0.5, 5)}px`,
                                lineHeight: textStyles.spacing.lineHeight,
                                textAlign: textStyles.layout.alignment,
                                opacity: textStyles.layout.opacity,
                                fontWeight: textStyles.layout.fontWeight
                              }}
                            >
                              Exame dentro dos padrões normais. Ritmo sinusal regular com frequência cardíaca de 72 bpm. 
                              Não foram identificadas alterações significativas nos traçados analisados. 
                              Recomenda-se acompanhamento médico de rotina.
                            </div>
                          </div>
                          
                          {/* Área de Assinatura */}
                          <div className="mt-auto pt-2">
                            <div 
                              className="border-t border-gray-400 pt-1 text-center bg-white bg-opacity-80 rounded px-1"
                              style={{
                                color: textStyles.colors.accent,
                                fontSize: `${Math.max(textStyles.fonts.small * 0.5, 4)}px`,
                                opacity: textStyles.layout.opacity,
                                fontWeight: textStyles.layout.fontWeight
                              }}
                            >
                              Dr. Carlos Oliveira - CRM: 12345/SP
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Legenda simplificada */}
                <div className="mt-4 text-center text-xs text-gray-600 bg-white rounded-lg p-3 shadow-sm">
                  <div className="flex justify-center items-center gap-4">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-white bg-opacity-70 border border-gray-300"></div>
                      <span>Seções do laudo</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-white border border-gray-300"></div>
                      <span>Preview A4</span>
                    </div>
                  </div>
                </div>
                
                {/* Informações técnicas */}
                <div className="mt-2 text-center text-xs text-gray-500 bg-gray-50 py-2 rounded-lg">
                  📄 Preview: 400x566px (proporção A4) | PDF real: 595x842px
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FolhaTimbradaCustomizer;