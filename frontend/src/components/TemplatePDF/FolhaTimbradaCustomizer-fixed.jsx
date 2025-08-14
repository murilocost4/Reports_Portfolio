import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import templatePDFService from '../../services/templatePDFService';
import { toast } from 'react-hot-toast';
import { FaUpload, FaImage, FaArrowsAlt, FaSave, FaSpinner, FaCloudUploadAlt, FaEye, FaArrowLeft, FaPalette, FaRedo } from 'react-icons/fa';

const FolhaTimbradaCustomizer = ({ currentTemplate, onTemplateUpdated, onOpenGallery }) => {
  const { usuario, temRole, temAlgumaRole, isAdminMaster } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [folhaTimbradaUrl, setFolhaTimbradaUrl] = useState(currentTemplate?.folhaTimbradaUrl || '');
  
  // Posições iniciais bem distribuídas - usando coordenadas percentuais (0-100%)
  const defaultPositions = {
    patientInfo: { x: 5, y: 5, width: 40, height: 12 },
    examInfo: { x: 50, y: 5, width: 40, height: 12 },
    conclusion: { x: 5, y: 25, width: 85, height: 18 },
    signature: { x: 55, y: 75, width: 35, height: 12 },
    qrcode: { x: 5, y: 80, width: 10, height: 10 },
    publicLink: { x: 20, y: 82, width: 30, height: 5 }
  };

  const [customPositions, setCustomPositions] = useState(() => {
    // Se tem template existente com posições, usar diretamente se já estão em percentual
    if (currentTemplate?.customPositions) {
      const pos = currentTemplate.customPositions;
      // Verificar se já estão em percentual (valores menores que 100)
      const isPercentage = Object.values(pos).every(p => p.x <= 100 && p.y <= 100);
      
      if (isPercentage) {
        return pos;
      } else {
        // Converter de mm para percentual (A4: 210x297mm)
        const converted = {};
        Object.keys(pos).forEach(key => {
          const position = pos[key];
          converted[key] = {
            x: (position.x / 210) * 100,
            y: (position.y / 297) * 100,
            width: (position.width / 210) * 100,
            height: (position.height / 297) * 100
          };
        });
        return converted;
      }
    }
    return defaultPositions;
  });
  
  const [draggedElement, setDraggedElement] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizingElement, setResizingElement] = useState(null);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const elements = [
    { 
      id: 'patientInfo', 
      label: 'Dados do Paciente', 
      color: '#3b82f6', 
      icon: '👤', 
      description: 'Nome, CPF, idade e dados básicos'
    },
    { 
      id: 'examInfo', 
      label: 'Dados do Exame', 
      color: '#10b981', 
      icon: '🔬', 
      description: 'Tipo de exame, data, local de realização'
    },
    { 
      id: 'conclusion', 
      label: 'Conclusão do Laudo', 
      color: '#f59e0b', 
      icon: '✅', 
      description: 'Conclusão e impressão diagnóstica completa'
    },
    { 
      id: 'signature', 
      label: 'Assinatura Médica', 
      color: '#ef4444', 
      icon: '✍️', 
      description: 'Nome do médico, CRM e assinatura digital'
    },
    { 
      id: 'qrcode', 
      label: 'QR Code', 
      color: '#6b7280', 
      icon: '📱', 
      description: 'QR Code para verificação de autenticidade'
    },
    { 
      id: 'publicLink', 
      label: 'Link de Verificação', 
      color: '#06b6d4', 
      icon: '🔗', 
      description: 'URL para verificar autenticidade online'
    }
  ];

  // Upload de arquivo
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validações
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Tipo de arquivo não suportado. Use JPEG, PNG, GIF, WebP ou PDF.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 10MB permitido.');
      return;
    }

    try {
      setLoading(true);
      const previewUrl = URL.createObjectURL(file);
      setFolhaTimbradaUrl(previewUrl);
      toast.success('✅ Imagem carregada! Configure as posições das seções e salve.');
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      toast.error('❌ Erro ao processar arquivo');
    } finally {
      setLoading(false);
    }
  };

  // Drag and Drop - início do arraste
  const handleMouseDown = useCallback((e, elementId) => {
    e.preventDefault();
    e.stopPropagation();
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const element = customPositions[elementId];
    if (!element) return;

    // Calcular offset dentro do elemento em percentual
    const percentX = ((e.clientX - rect.left) / rect.width) * 100;
    const percentY = ((e.clientY - rect.top) / rect.height) * 100;
    
    setDraggedElement(elementId);
    setIsDragging(true);
    setDragOffset({
      x: percentX - element.x,
      y: percentY - element.y
    });

  }, [customPositions]);

  // Drag and Drop - movimento
  const handleMouseMove = useCallback((e) => {
    if (!isDragging || !draggedElement) return;
    
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Converter coordenadas do mouse para percentual
    const percentX = ((e.clientX - rect.left) / rect.width) * 100;
    const percentY = ((e.clientY - rect.top) / rect.height) * 100;
    
    // Nova posição considerando o offset
    const newX = percentX - dragOffset.x;
    const newY = percentY - dragOffset.y;
    
    // Limites percentuais (0-100%)
    const element = customPositions[draggedElement];
    const maxX = 100 - element.width;
    const maxY = 100 - element.height;
    
    const constrainedX = Math.max(0, Math.min(newX, maxX));
    const constrainedY = Math.max(0, Math.min(newY, maxY));

    setCustomPositions(prev => ({
      ...prev,
      [draggedElement]: {
        ...prev[draggedElement],
        x: constrainedX,
        y: constrainedY
      }
    }));
  }, [isDragging, draggedElement, dragOffset, customPositions]);

  // Drag and Drop - fim do arraste
  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      setDraggedElement(null);
      setDragOffset({ x: 0, y: 0 });
    }
    
    if (isResizing) {
      setIsResizing(false);
      setResizingElement(null);
      setResizeStart({ x: 0, y: 0, width: 0, height: 0 });
    }
  }, [isDragging, isResizing, draggedElement]);

  // Resize - início
  const handleResizeStart = useCallback((e, elementId) => {
    e.preventDefault();
    e.stopPropagation();
    
    const element = customPositions[elementId];
    if (!element) return;
    
    setResizingElement(elementId);
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: element.width,
      height: element.height
    });

  }, [customPositions]);

  // Resize - movimento
  useEffect(() => {
    const handleResizeMove = (e) => {
      if (!isResizing || !resizingElement) return;
      
      e.preventDefault();
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;
      
      // Converter delta para escala percentual
      const scaleX = 100 / rect.width;
      const scaleY = 100 / rect.height;
      
      const newWidth = Math.max(5, resizeStart.width + (deltaX * scaleX));
      const newHeight = Math.max(3, resizeStart.height + (deltaY * scaleY));
      
      // Verificar limites percentuais
      const element = customPositions[resizingElement];
      const maxWidth = 100 - element.x;
      const maxHeight = 100 - element.y;
      
      const constrainedWidth = Math.min(newWidth, maxWidth);
      const constrainedHeight = Math.min(newHeight, maxHeight);

      setCustomPositions(prev => ({
        ...prev,
        [resizingElement]: {
          ...prev[resizingElement],
          width: constrainedWidth,
          height: constrainedHeight
        }
      }));
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
    }

    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
    };
  }, [isResizing, resizingElement, resizeStart, customPositions]);

  // Event listeners globais
  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  // Resetar posições
  const resetPositions = () => {
    setCustomPositions({ ...defaultPositions });
    toast.success('🔄 Posições resetadas para o padrão!');
  };

  // Salvar configuração
  const saveConfiguration = async () => {
    const isAdmin = isAdminMaster || temAlgumaRole(['admin', 'adminMaster']);
    
    if (!isAdmin) {
      toast.error('❌ Apenas administradores podem salvar templates');
      return;
    }

    if (!folhaTimbradaUrl) {
      toast.error('❌ Faça upload de uma folha timbrada primeiro');
      return;
    }

    try {
      setSaving(true);
      
      // Converter posições percentuais para mm (A4: 100% -> 210x297mm)
      const positionsInMm = {};
      Object.keys(customPositions).forEach(key => {
        const pos = customPositions[key];
        positionsInMm[key] = {
          x: (pos.x / 100) * 210,
          y: (pos.y / 100) * 297,
          width: (pos.width / 100) * 210,
          height: (pos.height / 100) * 297
        };
      });
      
      const templateData = {
        tipoTemplate: 'folha_timbrada',
        nomeModelo: 'Template Folha Timbrada',
        customPositions: positionsInMm,
        folhaTimbradaConfig: {
          largura: 210,
          altura: 297,
          margemSuperior: 20,
          margemInferior: 20,
          margemEsquerda: 20,
          margemDireita: 20
        },
        layout: {
          mostrarLogo: false,
          mostrarCabecalho: false,
          mostrarRodape: false,
          mostrarDadosPaciente: true,
          mostrarDadosExame: true,
          mostrarQrCode: true,
          mostrarDataAssinatura: true,
          mostrarCabecalhoCompleto: false
        },
        margens: { top: 50, bottom: 50, left: 40, right: 40 },
        tamanhoFonte: { base: 11, titulo: 14, subtitulo: 12 }
      };

      const folhaTimbradaFile = fileInputRef.current?.files?.[0] || null;
      
      await templatePDFService.salvarTemplateTenant(templateData, null, folhaTimbradaFile);
      
      toast.success('✅ Configuração salva com sucesso!');
      onTemplateUpdated?.();
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      toast.error('❌ Erro ao salvar configuração');
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
                Personalização com Folha Timbrada
              </h2>
              <p className="text-gray-600">
                Configure sua folha timbrada oficial e posicione apenas os elementos essenciais do laudo médico. 
                Sistema otimizado com coordenadas percentuais para melhor precisão.
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
              onClick={resetPositions}
              className="flex items-center gap-2 px-4 py-2 border-2 border-blue-300 text-blue-700 rounded-xl hover:bg-blue-50 transition-all duration-200"
            >
              <FaArrowsAlt />
              <span>Resetar Posições</span>
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
              Faça upload da sua folha timbrada oficial. Aceita PNG, JPG, GIF, WebP ou PDF até 10MB.
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
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FaArrowsAlt className="text-purple-500" />
                Seções Disponíveis
              </h3>
              
              <div className="space-y-3">
                {elements.map((element) => {
                  const position = customPositions[element.id];
                  if (!position) return null;
                  
                  return (
                    <div
                      key={element.id}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                        draggedElement === element.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      style={{ borderLeftColor: element.color, borderLeftWidth: '4px' }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{element.icon}</span>
                        <span className="font-medium text-gray-900">{element.label}</span>
                      </div>
                      <div className="text-xs text-gray-600 mb-2">
                        {element.description}
                      </div>
                      <div className="text-xs text-gray-500">
                        X: {Math.round(position.x)}%, Y: {Math.round(position.y)}%<br />
                        L: {Math.round(position.width)}%, A: {Math.round(position.height)}%
                      </div>
                    </div>
                  );
                })}
                
                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800">
                    <strong>💡 Como usar:</strong><br />
                    • <strong>Mover seções:</strong> Clique e arraste qualquer seção colorida<br />
                    • <strong>Redimensionar:</strong> Use o handle (⋲) no canto inferior direito<br />
                    • <strong>Resetar:</strong> Use o botão "Resetar Posições" para voltar ao padrão<br />
                    • Sistema com coordenadas percentuais para maior precisão<br />
                    • Apenas 6 seções essenciais para laudos médicos
                  </p>
                </div>
              </div>
            </div>

            {/* Canvas */}
            <div className="lg:col-span-3">
              <div className="relative border-2 border-gray-300 rounded-xl overflow-hidden bg-white shadow-inner">
                <div
                  ref={canvasRef}
                  className="relative w-full h-[700px] bg-gray-50"
                  style={{
                    backgroundImage: `url(${folhaTimbradaUrl})`,
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center'
                  }}
                >
                  {/* Positioned Elements */}
                  {elements.map((element) => {
                    const position = customPositions[element.id];
                    if (!position) return null;
                    
                    return (
                      <div
                        key={element.id}
                        className={`absolute border-2 rounded-lg cursor-move flex items-center justify-center text-xs font-bold text-white shadow-lg transition-all duration-200 select-none ${
                          draggedElement === element.id ? 'z-50 shadow-2xl ring-4 ring-blue-300' : 'z-10 hover:shadow-xl hover:ring-2 hover:ring-blue-200'
                        } ${resizingElement === element.id ? 'z-50 shadow-2xl ring-4 ring-green-300' : ''}`}
                        style={{
                          left: `${position.x}%`,
                          top: `${position.y}%`,
                          width: `${position.width}%`,
                          height: `${position.height}%`,
                          backgroundColor: element.color,
                          borderColor: element.color,
                          opacity: (draggedElement === element.id || resizingElement === element.id) ? 0.95 : 0.8,
                          cursor: draggedElement === element.id ? 'grabbing' : 'grab'
                        }}
                        onMouseDown={(e) => handleMouseDown(e, element.id)}
                      >
                        <div className="text-center px-1 py-1 overflow-hidden">
                          <div className="text-xs mb-1">{element.icon}</div>
                          <div className="text-xs leading-tight font-medium">
                            {element.id === 'patientInfo' && 'Paciente'}
                            {element.id === 'examInfo' && 'Exame'}
                            {element.id === 'conclusion' && 'Conclusão'}
                            {element.id === 'signature' && 'Assinatura'}
                            {element.id === 'qrcode' && 'QR'}
                            {element.id === 'publicLink' && 'Link'}
                          </div>
                        </div>
                        
                        {/* Resize Handle */}
                        <div
                          className="absolute bottom-0 right-0 w-3 h-3 bg-white border border-gray-400 cursor-se-resize"
                          style={{ marginBottom: '-1px', marginRight: '-1px' }}
                          onMouseDown={(e) => handleResizeStart(e, element.id)}
                        >
                          <div className="text-xs text-gray-600 leading-none">⋲</div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Grid overlay for better positioning */}
                  <div 
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      backgroundImage: 'linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)',
                      backgroundSize: '10% 10%',
                      opacity: 0.3
                    }}
                  />
                </div>
              </div>
              
              <div className="mt-3 text-sm text-gray-600 text-center bg-gray-50 py-2 rounded-lg">
                📄 Folha A4 - Sistema com coordenadas percentuais para máxima precisão
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FolhaTimbradaCustomizer;
