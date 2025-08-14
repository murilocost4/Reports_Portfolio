import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FaGripVertical, FaEye, FaEyeSlash, FaArrowsAlt, FaPalette, FaCog, FaTimes } from 'react-icons/fa';
import './VisualLayoutEditor.css';

// Componente para elementos arrastáveis
const DraggableElement = ({ 
  id, 
  children, 
  position, 
  onPositionChange, 
  isVisible = true, 
  onVisibilityChange,
  onStyleConfigOpen,
  label,
  minWidth = 100,
  minHeight = 50,
  resizable = false,
  isFolhaTimbrada = false
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const elementRef = useRef(null);
  const [size, setSize] = useState({ width: position.width || minWidth, height: position.height || minHeight });

  const handleMouseDown = (e) => {
    if (e.target.closest('.resize-handle') || e.target.closest('.element-controls')) return;
    
    setIsDragging(true);
    const rect = elementRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    e.preventDefault();
  };

  const handleResizeMouseDown = (e) => {
    setIsResizing(true);
    e.stopPropagation();
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) {
        const container = elementRef.current.parentElement;
        const containerRect = container.getBoundingClientRect();
        
        const newX = Math.max(0, Math.min(
          e.clientX - containerRect.left - dragOffset.x,
          containerRect.width - size.width
        ));
        const newY = Math.max(0, Math.min(
          e.clientY - containerRect.top - dragOffset.y,
          containerRect.height - size.height
        ));

        onPositionChange(id, { ...position, x: newX, y: newY });
      } else if (isResizing) {
        const rect = elementRef.current.getBoundingClientRect();
        const newWidth = Math.max(minWidth, e.clientX - rect.left);
        const newHeight = Math.max(minHeight, e.clientY - rect.top);
        
        const newSize = { width: newWidth, height: newHeight };
        setSize(newSize);
        onPositionChange(id, { ...position, ...newSize });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragOffset, position, size, onPositionChange, id, minWidth, minHeight]);

  return (
    <div
      ref={elementRef}
      className={`absolute border-2 ${
        isDragging ? 'border-blue-500 shadow-lg' : 'border-gray-300 hover:border-blue-400'
      } ${!isVisible ? 'opacity-50' : ''} ${isFolhaTimbrada ? '' : 'bg-white'} rounded-lg transition-all group`}
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        cursor: isDragging ? 'grabbing' : 'grab',
        zIndex: isDragging ? 1000 : position.zIndex || 1
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Controles do elemento */}
      <div className="element-controls absolute -top-8 left-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="bg-gray-800 text-white px-2 py-1 rounded text-xs font-medium">
          {label}
        </div>
        <button
          onClick={() => onStyleConfigOpen && onStyleConfigOpen(id)}
          className="bg-purple-600 hover:bg-purple-700 text-white p-1 rounded text-xs transition-colors"
          title="Configurar Estilo"
        >
          <FaPalette />
        </button>
        <button
          onClick={() => onVisibilityChange(id, !isVisible)}
          className={`${isVisible ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 hover:bg-gray-700'} text-white p-1 rounded text-xs transition-colors`}
          title={isVisible ? 'Ocultar' : 'Mostrar'}
        >
          {isVisible ? <FaEye /> : <FaEyeSlash />}
        </button>
      </div>

      {/* Conteúdo do elemento */}
      <div className="w-full h-full p-2 overflow-hidden">
        {children}
      </div>

      {/* Handle de redimensionamento */}
      {resizable && (
        <div
          className="resize-handle absolute bottom-0 right-0 w-4 h-4 bg-blue-600 hover:bg-blue-700 cursor-nw-resize rounded-tl-lg flex items-center justify-center"
          onMouseDown={handleResizeMouseDown}
          title="Arrastar para redimensionar"
        >
          <FaArrowsAlt className="text-white text-xs" />
        </div>
      )}
    </div>
  );
};

// Componente de painel de configuração de estilo
const StyleConfigPanel = ({ 
  elementId, 
  isOpen, 
  onClose, 
  currentStyle, 
  onStyleChange 
}) => {
  if (!isOpen) return null;

  const handleStyleChange = (property, value) => {
    onStyleChange(elementId, {
      ...currentStyle,
      [property]: value
    });
  };

  const borderTypes = [
    { value: 'solid', label: 'Sólida' },
    { value: 'dashed', label: 'Tracejada' },
    { value: 'dotted', label: 'Pontilhada' },
    { value: 'double', label: 'Dupla' },
    { value: 'none', label: 'Nenhuma' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 rounded-t-xl">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <FaPalette />
              Estilo - {elementId}
            </h3>
            <button 
              onClick={onClose}
              className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
            >
              <FaTimes />
            </button>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Cor de Fundo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cor de Fundo
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={currentStyle.corFundo || '#ffffff'}
                onChange={(e) => handleStyleChange('corFundo', e.target.value)}
                className="w-12 h-10 rounded border-2 border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                value={currentStyle.corFundo || '#ffffff'}
                onChange={(e) => handleStyleChange('corFundo', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                placeholder="#ffffff"
              />
            </div>
          </div>

          {/* Borda */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-700">Configurações de Borda</h4>
            
            {/* Cor da Borda */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cor da Borda
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={currentStyle.corBorda || '#e2e8f0'}
                  onChange={(e) => handleStyleChange('corBorda', e.target.value)}
                  className="w-12 h-10 rounded border-2 border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={currentStyle.corBorda || '#e2e8f0'}
                  onChange={(e) => handleStyleChange('corBorda', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                  placeholder="#e2e8f0"
                />
              </div>
            </div>

            {/* Largura da Borda */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Largura da Borda: {currentStyle.larguraBorda || 1}px
              </label>
              <input
                type="range"
                min="0"
                max="10"
                value={currentStyle.larguraBorda || 1}
                onChange={(e) => handleStyleChange('larguraBorda', parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Tipo de Linha */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Linha
              </label>
              <select
                value={currentStyle.tipoLinha || 'solid'}
                onChange={(e) => handleStyleChange('tipoLinha', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                {borderTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Raio dos Cantos */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Raio dos Cantos: {currentStyle.raioCantos || 0}px
            </label>
            <input
              type="range"
              min="0"
              max="20"
              value={currentStyle.raioCantos || 0}
              onChange={(e) => handleStyleChange('raioCantos', parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Padding */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Espaçamento Interno: {currentStyle.padding || 0}px
            </label>
            <input
              type="range"
              min="0"
              max="40"
              value={currentStyle.padding || 0}
              onChange={(e) => handleStyleChange('padding', parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Sombra */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={currentStyle.sombra || false}
                onChange={(e) => handleStyleChange('sombra', e.target.checked)}
                className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Adicionar Sombra
              </span>
            </label>
          </div>

          {/* Configurações especiais para Header */}
          {elementId === 'header' && (
            <div className="space-y-4 border-t pt-4">
              <h4 className="font-medium text-gray-700">Configurações do Header</h4>
              
              {/* Gradiente */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    checked={currentStyle.gradiente || false}
                    onChange={(e) => handleStyleChange('gradiente', e.target.checked)}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Usar Gradiente
                  </span>
                </label>

                {currentStyle.gradiente && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Cor 1</label>
                      <input
                        type="color"
                        value={currentStyle.corGradiente1 || '#3b82f6'}
                        onChange={(e) => handleStyleChange('corGradiente1', e.target.value)}
                        className="w-full h-8 rounded border border-gray-300 cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Cor 2</label>
                      <input
                        type="color"
                        value={currentStyle.corGradiente2 || '#8b5cf6'}
                        onChange={(e) => handleStyleChange('corGradiente2', e.target.value)}
                        className="w-full h-8 rounded border border-gray-300 cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Incluir Logo */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={currentStyle.incluirLogo !== false}
                    onChange={(e) => handleStyleChange('incluirLogo', e.target.checked)}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Incluir Logo no Header
                  </span>
                </label>
              </div>

              {/* Incluir Título */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={currentStyle.incluirTitulo !== false}
                    onChange={(e) => handleStyleChange('incluirTitulo', e.target.checked)}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Incluir Título no Header
                  </span>
                </label>
              </div>

              {/* Altura do Header */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Altura do Header: {currentStyle.altura || 80}px
                </label>
                <input
                  type="range"
                  min="60"
                  max="200"
                  value={currentStyle.altura || 80}
                  onChange={(e) => handleStyleChange('altura', parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Largura Completa */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={currentStyle.larguraCompleta !== false}
                    onChange={(e) => handleStyleChange('larguraCompleta', e.target.checked)}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Ocupar Largura Completa
                  </span>
                </label>
              </div>

              {/* Texto Personalizado */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    checked={currentStyle.mostrarTextoPersonalizado || false}
                    onChange={(e) => handleStyleChange('mostrarTextoPersonalizado', e.target.checked)}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Texto Personalizado
                  </span>
                </label>

                {currentStyle.mostrarTextoPersonalizado && (
                  <textarea
                    value={currentStyle.textoPersonalizado || ''}
                    onChange={(e) => handleStyleChange('textoPersonalizado', e.target.value)}
                    placeholder="Digite o texto do header..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    rows="2"
                  />
                )}
              </div>

              {/* Alinhamento do Texto */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alinhamento do Texto
                </label>
                <select
                  value={currentStyle.alinhamentoTexto || 'center'}
                  onChange={(e) => handleStyleChange('alinhamentoTexto', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="left">Esquerda</option>
                  <option value="center">Centro</option>
                  <option value="right">Direita</option>
                </select>
              </div>
            </div>
          )}

          {/* Configurações especiais para Footer */}
          {elementId === 'footer' && (
            <div className="space-y-4 border-t pt-4">
              <h4 className="font-medium text-gray-700">Configurações do Footer</h4>
              
              {/* Altura do Footer */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Altura do Footer: {currentStyle.altura || 60}px
                </label>
                <input
                  type="range"
                  min="40"
                  max="150"
                  value={currentStyle.altura || 60}
                  onChange={(e) => handleStyleChange('altura', parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Largura Completa */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={currentStyle.larguraCompleta !== false}
                    onChange={(e) => handleStyleChange('larguraCompleta', e.target.checked)}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Ocupar Largura Completa
                  </span>
                </label>
              </div>

              {/* Alinhamento do Texto */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alinhamento do Texto do Footer
                </label>
                <select
                  value={currentStyle.alinhamentoTexto || 'center'}
                  onChange={(e) => handleStyleChange('alinhamentoTexto', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="left">Esquerda</option>
                  <option value="center">Centro</option>
                  <option value="right">Direita</option>
                </select>
              </div>
            </div>
          )}

          {/* Configurações especiais para QR Code */}
          {elementId === 'qrcode' && (
            <div className="space-y-4 border-t pt-4">
              <h4 className="font-medium text-gray-700">Configurações do QR Code</h4>
              
              {/* Tamanho Mínimo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tamanho Mínimo: {currentStyle.tamanhoMinimo || 50}px
                </label>
                <input
                  type="range"
                  min="30"
                  max="100"
                  value={currentStyle.tamanhoMinimo || 50}
                  onChange={(e) => handleStyleChange('tamanhoMinimo', parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Tamanho Máximo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tamanho Máximo: {currentStyle.tamanhoMaximo || 200}px
                </label>
                <input
                  type="range"
                  min="100"
                  max="400"
                  value={currentStyle.tamanhoMaximo || 200}
                  onChange={(e) => handleStyleChange('tamanhoMaximo', parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Borda Personalizada */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    checked={currentStyle.bordaPersonalizada || false}
                    onChange={(e) => handleStyleChange('bordaPersonalizada', e.target.checked)}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Borda Personalizada
                  </span>
                </label>

                {currentStyle.bordaPersonalizada && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Cor da Borda</label>
                      <input
                        type="color"
                        value={currentStyle.corBorda || '#e2e8f0'}
                        onChange={(e) => handleStyleChange('corBorda', e.target.value)}
                        className="w-full h-8 rounded border border-gray-300 cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        Largura da Borda: {currentStyle.larguraBorda || 1}px
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="5"
                        value={currentStyle.larguraBorda || 1}
                        onChange={(e) => handleStyleChange('larguraBorda', parseInt(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Componente principal do editor visual
const VisualLayoutEditor = ({ 
  templateConfig, 
  onLayoutChange, 
  logoPreview,
  onPreview 
}) => {
  // Tamanho do canvas A4 simulado
  const canvasSize = { width: 550, height: 700 };
  const [styleConfigOpen, setStyleConfigOpen] = useState(false);
  const [selectedElementForStyle, setSelectedElementForStyle] = useState(null);

  // Verificar se é modo folha timbrada
  const isFolhaTimbrada = templateConfig.tipoTemplate === 'folha_timbrada' && templateConfig.folhaTimbradaUrl;
  const folhaConfig = templateConfig.folhaTimbradaConfig || {};
  
  // Calcular área útil quando folha timbrada está ativa
  const areaUtil = isFolhaTimbrada ? {
    x: folhaConfig.margemEsquerda || 20,
    y: folhaConfig.margemTopo || 20,
    width: canvasSize.width - (folhaConfig.margemEsquerda || 20) - (folhaConfig.margemDireita || 20),
    height: canvasSize.height - (folhaConfig.margemTopo || 20) - (folhaConfig.margemInferior || 20)
  } : { x: 0, y: 0, width: canvasSize.width, height: canvasSize.height };

  // Função para obter posições padrão
  // IMPORTANT: Estas posições devem ser EXATAMENTE as mesmas do TemplatePDFPreview
  const getDefaultPositions = () => {
    const basePositions = {
      header: { x: 10, y: 10, width: 530, height: 60, zIndex: 5 },
      logo: { x: 20, y: 20, width: 80, height: 30, zIndex: 10 },
      title: { x: 110, y: 25, width: 300, height: 30, zIndex: 10 },
      patientInfo: { x: 20, y: 80, width: 510, height: 85, zIndex: 5 },
      examInfo: { x: 20, y: 175, width: 510, height: 75, zIndex: 5 },
      content: { x: 20, y: 260, width: 510, height: 120, zIndex: 1 },
      signature: { x: 300, y: 390, width: 230, height: 80, zIndex: 5 },
      qrcode: { x: 20, y: 390, width: 70, height: 70, zIndex: 5 },
      footer: { x: 20, y: 480, width: 510, height: 25, zIndex: 1 }
    };

    // Ajustar posições para folha timbrada
    if (isFolhaTimbrada) {
      const adjustedPositions = {};
      Object.keys(basePositions).forEach(key => {
        const pos = basePositions[key];
        adjustedPositions[key] = {
          ...pos,
          x: Math.min(pos.x, areaUtil.width - pos.width),
          y: Math.min(pos.y, areaUtil.height - pos.height),
          width: Math.min(pos.width, areaUtil.width - pos.x),
          height: Math.min(pos.height, areaUtil.height - pos.y)
        };
      });
      return adjustedPositions;
    }

    return basePositions;
  };

  // Inicializar elementos com posições salvas ou padrão
  const initializeElements = useCallback(() => {
    const defaultPositions = getDefaultPositions();
    const savedPositions = templateConfig.customPositions || {};
    
    const elements = {};
    
    Object.keys(defaultPositions).forEach(elementId => {
      const defaultPos = defaultPositions[elementId];
      const savedPos = savedPositions[elementId] || {};
      
      elements[elementId] = {
        id: elementId,
        x: savedPos.x !== undefined ? savedPos.x : defaultPos.x,
        y: savedPos.y !== undefined ? savedPos.y : defaultPos.y,
        width: savedPos.width !== undefined ? savedPos.width : defaultPos.width,
        height: savedPos.height !== undefined ? savedPos.height : defaultPos.height,
        zIndex: savedPos.zIndex !== undefined ? savedPos.zIndex : defaultPos.zIndex,
        visible: getElementVisibility(elementId),
        label: getElementLabel(elementId)
      };
    });
    
    return elements;
  }, [templateConfig.customPositions, templateConfig.layout]);

  const getElementVisibility = (elementId) => {
    const visibilityMap = {
      header: templateConfig.layout?.mostrarCabecalho ?? true,
      logo: templateConfig.layout?.mostrarLogo ?? true,
      title: templateConfig.layout?.mostrarTitulo ?? true,
      patientInfo: templateConfig.layout?.mostrarDadosPaciente ?? true,
      examInfo: templateConfig.layout?.mostrarDadosExame ?? true,
      content: true, // Conteúdo sempre visível
      signature: templateConfig.layout?.mostrarDataAssinatura ?? true,
      qrcode: templateConfig.layout?.mostrarQrCode ?? true,
      footer: templateConfig.layout?.mostrarRodape ?? true
    };
    return visibilityMap[elementId] ?? true;
  };

  const getElementLabel = (elementId) => {
    const labelMap = {
      header: 'Cabeçalho',
      logo: 'Logo da Empresa',
      title: 'Título do Laudo',
      patientInfo: 'Dados do Paciente',
      examInfo: 'Informações do Exame',
      content: 'Conteúdo do Laudo',
      signature: 'Assinatura',
      qrcode: 'QR Code',
      footer: 'Rodapé'
    };
    return labelMap[elementId] || elementId;
  };

  const [elements, setElements] = useState(() => initializeElements());
  const elementsRef = useRef(elements);

  // Atualiza a ref sempre que elements mudar
  useEffect(() => {
    elementsRef.current = elements;
  }, [elements]);

  // Sync positions back to parent on unmount or when switching tabs
  useEffect(() => {
    return () => {
      syncPositionsToParent();
    };
  }, []);

  const syncPositionsToParent = () => {
    const currentElements = elementsRef.current;
    const customPositions = {};
    
    Object.keys(currentElements).forEach(elementId => {
      const element = currentElements[elementId];
      customPositions[elementId] = {
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
        zIndex: element.zIndex
      };
    });

    if (Object.keys(customPositions).length > 0) {
      onLayoutChange({
        ...templateConfig,
        customPositions
      });
    }
  };

  // Atualizar elementos quando templateConfig mudar
  useEffect(() => {
    const newElements = initializeElements();
    setElements(prevElements => {
      // Só atualizar se houver diferença real
      const hasChanges = Object.keys(newElements).some(key => {
        const prev = prevElements[key];
        const curr = newElements[key];
        return !prev || 
               prev.x !== curr.x || 
               prev.y !== curr.y || 
               prev.width !== curr.width || 
               prev.height !== curr.height ||
               prev.visible !== curr.visible;
      });
      
      return hasChanges ? newElements : prevElements;
    });
  }, [initializeElements]);

  const handlePositionChange = useCallback((elementId, newPosition) => {
    setElements(prev => {
      const updated = {
        ...prev,
        [elementId]: { ...prev[elementId], ...newPosition }
      };
      
      // Debounce para evitar muitas atualizações
      setTimeout(() => {
        const customPositions = {};
        Object.keys(updated).forEach(id => {
          const element = updated[id];
          customPositions[id] = {
            x: element.x,
            y: element.y,
            width: element.width,
            height: element.height,
            zIndex: element.zIndex
          };
        });

        // Update parent state with new positions
        onLayoutChange({
          ...templateConfig,
          customPositions
        });
      }, 50);

      return updated;
    });
  }, [templateConfig, onLayoutChange]);

  const handleVisibilityChange = (elementId, visible) => {
    setElements(prev => ({
      ...prev,
      [elementId]: { ...prev[elementId], visible }
    }));

    // Mapear visibilidade para as configurações de layout
    const visibilityMap = {
      header: 'mostrarCabecalho',
      logo: 'mostrarLogo',
      title: 'mostrarTitulo',
      patientInfo: 'mostrarDadosPaciente',
      examInfo: 'mostrarDadosExame',
      signature: 'mostrarDataAssinatura',
      qrcode: 'mostrarQrCode',
      footer: 'mostrarRodape'
    };

    if (visibilityMap[elementId]) {
      const updatedLayout = {
        ...templateConfig.layout,
        [visibilityMap[elementId]]: visible
      };
      
      onLayoutChange({
        ...templateConfig,
        layout: updatedLayout
      });
    }
  };

  const resetLayout = () => {
    // IMPORTANTE: Estas posições devem ser EXATAMENTE as mesmas do TemplatePDFPreview
    const defaultElements = {
      header: { x: 10, y: 10, width: 530, height: 60, zIndex: 5, visible: true },
      logo: { x: 20, y: 20, width: 80, height: 30, zIndex: 10, visible: true },
      title: { x: 110, y: 25, width: 300, height: 30, zIndex: 10, visible: true },
      patientInfo: { x: 20, y: 80, width: 510, height: 85, zIndex: 5, visible: true },
      examInfo: { x: 20, y: 175, width: 510, height: 75, zIndex: 5, visible: true },
      content: { x: 20, y: 260, width: 510, height: 120, zIndex: 1, visible: true },
      signature: { x: 300, y: 390, width: 230, height: 80, zIndex: 5, visible: true },
      qrcode: { x: 20, y: 390, width: 70, height: 70, zIndex: 5, visible: true },
      footer: { x: 20, y: 480, width: 510, height: 25, zIndex: 1, visible: true }
    };

    setElements(prev => {
      const updated = { ...prev };
      Object.keys(defaultElements).forEach(key => {
        updated[key] = { ...updated[key], ...defaultElements[key] };
      });
      return updated;
    });
  };

  const handleStyleConfigOpen = (elementId) => {
    setSelectedElementForStyle(elementId);
    setStyleConfigOpen(true);
  };

  const handleStyleConfigClose = () => {
    setStyleConfigOpen(false);
    setSelectedElementForStyle(null);
  };

  const handleStyleChange = (elementId, newStyle) => {
    const updatedConfig = {
      ...templateConfig,
      estilosSecao: {
        ...templateConfig.estilosSecao,
        [elementId]: newStyle
      }
    };
    onLayoutChange(updatedConfig);
  };

  const getCurrentStyle = (elementId) => {
    return templateConfig.estilosSecao?.[elementId] || {};
  };

  return (
    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <FaArrowsAlt className="text-purple-600" />
            Editor Visual de Layout
          </h3>
          <p className="text-gray-600 text-sm mt-1">
            Arraste os elementos para posicioná-los onde desejar
          </p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => {
              // Incluir folha timbrada no preview se estiver disponível
              const templateConfigComFolhaTimbrada = {
                ...templateConfig,
                // Se há folha timbrada configurada mas não tem URL, não mostrar
                folhaTimbradaUrl: templateConfig.tipoTemplate === 'folha_timbrada' ? templateConfig.folhaTimbradaUrl : null
              };
              onPreview(templateConfigComFolhaTimbrada, logoPreview);
            }}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 transition-all"
          >
            <FaEye />
            Preview
          </button>
          
          <button
            onClick={resetLayout}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2 transition-all"
          >
            <FaArrowsAlt />
            Reset Layout
          </button>
        </div>
      </div>

      {/* Canvas de edição */}
      <div className="flex justify-center items-center w-full" style={{ minHeight: 720 }}>
        {isFolhaTimbrada && (
          <div className="mb-4 p-3 bg-purple-100 border border-purple-300 rounded-lg max-w-md text-center">
            <h4 className="font-semibold text-purple-800 text-sm mb-1">Modo Folha Timbrada</h4>
            <p className="text-purple-700 text-xs">
              A folha timbrada é exibida como fundo. Posicione apenas o conteúdo sobre ela.
            </p>
          </div>
        )}
        
        <div
          className="relative"
          style={{
            width: canvasSize.width,
            height: canvasSize.height,
            background: isFolhaTimbrada && templateConfig.folhaTimbradaUrl ? 'transparent' : '#fff',
            borderRadius: 12,
            boxShadow: '0 8px 25px rgba(0,0,0,0.10)',
            border: '1.5px solid #e5e7eb',
            overflow: 'hidden',
            margin: '0 auto',
            display: 'block',
          }}
        >
          {/* Imagem de fundo da folha timbrada */}
          {isFolhaTimbrada && templateConfig.folhaTimbradaUrl && (
            <img 
              src={templateConfig.folhaTimbradaUrl} 
              alt="Folha Timbrada"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                zIndex: 0
              }}
            />
          )}
          
          {/* Área de conteúdo demarcada para folha timbrada */}
          {isFolhaTimbrada && (
            <div
              className="absolute border-2 border-dashed border-purple-400"
              style={{
                left: areaUtil.x,
                top: areaUtil.y,
                width: areaUtil.width,
                height: areaUtil.height,
                zIndex: 1
              }}
            >
              <div className="absolute -top-6 left-0 bg-purple-600 text-white px-2 py-1 rounded text-xs font-medium">
                Área de Conteúdo
              </div>
            </div>
          )}

          {/* Elementos arrastáveis - só mostrar elementos permitidos em modo folha timbrada */}
          {(!isFolhaTimbrada || !folhaConfig.ocultarLogo) && (
            <DraggableElement
              id="logo"
              position={{
                ...elements.logo,
                x: isFolhaTimbrada ? areaUtil.x + elements.logo.x : elements.logo.x,
                y: isFolhaTimbrada ? areaUtil.y + elements.logo.y : elements.logo.y
              }}
              onPositionChange={(id, pos) => {
                if (isFolhaTimbrada) {
                  // Ajustar posição relativa à área útil
                  handlePositionChange(id, {
                    ...pos,
                    x: Math.max(0, Math.min(pos.x - areaUtil.x, areaUtil.width - pos.width)),
                    y: Math.max(0, Math.min(pos.y - areaUtil.y, areaUtil.height - pos.height))
                  });
                } else {
                  handlePositionChange(id, pos);
                }
              }}
              isVisible={elements.logo.visible}
              onVisibilityChange={handleVisibilityChange}
              onStyleConfigOpen={handleStyleConfigOpen}
              label="Logo"
              resizable={true}
              isFolhaTimbrada={isFolhaTimbrada}
            >
              {logoPreview || templateConfig.logoUrl ? (
                <img 
                  src={logoPreview || templateConfig.logoUrl} 
                  alt="Logo" 
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className={`w-full h-full border-2 border-dashed border-gray-300 flex items-center justify-center text-xs text-gray-500 ${isFolhaTimbrada ? '' : 'bg-white bg-opacity-90'}`}>
                  Logo da Empresa
                </div>
              )}
            </DraggableElement>
          )}

          <DraggableElement
            id="title"
            position={{
              ...elements.title,
              x: isFolhaTimbrada ? areaUtil.x + elements.title.x : elements.title.x,
              y: isFolhaTimbrada ? areaUtil.y + elements.title.y : elements.title.y
            }}
            onPositionChange={(id, pos) => {
              if (isFolhaTimbrada) {
                handlePositionChange(id, {
                  ...pos,
                  x: Math.max(0, Math.min(pos.x - areaUtil.x, areaUtil.width - pos.width)),
                  y: Math.max(0, Math.min(pos.y - areaUtil.y, areaUtil.height - pos.height))
                });
              } else {
                handlePositionChange(id, pos);
              }
            }}
            isVisible={elements.title.visible}
            onVisibilityChange={handleVisibilityChange}
            onStyleConfigOpen={handleStyleConfigOpen}
            label="Título"
            resizable={true}
            isFolhaTimbrada={isFolhaTimbrada}
          >
            <div 
              className={`text-center font-bold ${isFolhaTimbrada ? '' : 'bg-white bg-opacity-90 rounded px-2 py-1'}`}
              style={{ 
                color: templateConfig.cores?.corTitulo || '#1e293b',
                fontSize: `${(templateConfig.tamanhoFonte?.titulo || 16) * 0.8}px`
              }}
            >
              LAUDO MÉDICO
            </div>
          </DraggableElement>

          <DraggableElement
            id="patientInfo"
            position={{
              ...elements.patientInfo,
              x: isFolhaTimbrada ? areaUtil.x + elements.patientInfo.x : elements.patientInfo.x,
              y: isFolhaTimbrada ? areaUtil.y + elements.patientInfo.y : elements.patientInfo.y
            }}
            onPositionChange={(id, pos) => {
              if (isFolhaTimbrada) {
                handlePositionChange(id, {
                  ...pos,
                  x: Math.max(0, Math.min(pos.x - areaUtil.x, areaUtil.width - pos.width)),
                  y: Math.max(0, Math.min(pos.y - areaUtil.y, areaUtil.height - pos.height))
                });
              } else {
                handlePositionChange(id, pos);
              }
            }}
            isVisible={elements.patientInfo.visible}
            onVisibilityChange={handleVisibilityChange}
            onStyleConfigOpen={handleStyleConfigOpen}
            label="Dados do Paciente"
            resizable={true}
            isFolhaTimbrada={isFolhaTimbrada}
          >
            <div 
              className={`text-xs ${isFolhaTimbrada ? '' : 'bg-white bg-opacity-95 rounded p-2'}`}
              style={{ color: templateConfig.cores?.texto || '#1f2937' }}
            >
              <div className="font-semibold mb-1" style={{ color: templateConfig.cores?.secundaria || '#64748b' }}>
                DADOS DO PACIENTE
              </div>
              <div>Nome: João Silva</div>
              <div>Data Nasc.: 15/03/1980</div>
              <div>CPF: 123.456.789-00</div>
            </div>
          </DraggableElement>

          <DraggableElement
            id="examInfo"
            position={{
              ...elements.examInfo,
              x: isFolhaTimbrada ? areaUtil.x + elements.examInfo.x : elements.examInfo.x,
              y: isFolhaTimbrada ? areaUtil.y + elements.examInfo.y : elements.examInfo.y
            }}
            onPositionChange={(id, pos) => {
              if (isFolhaTimbrada) {
                handlePositionChange(id, {
                  ...pos,
                  x: Math.max(0, Math.min(pos.x - areaUtil.x, areaUtil.width - pos.width)),
                  y: Math.max(0, Math.min(pos.y - areaUtil.y, areaUtil.height - pos.height))
                });
              } else {
                handlePositionChange(id, pos);
              }
            }}
            isVisible={elements.examInfo.visible}
            onVisibilityChange={handleVisibilityChange}
            onStyleConfigOpen={handleStyleConfigOpen}
            label="Informações do Exame"
            resizable={true}
            isFolhaTimbrada={isFolhaTimbrada}
          >
            <div 
              className={`text-xs ${isFolhaTimbrada ? '' : 'bg-white bg-opacity-95 rounded p-2'}`}
              style={{ color: templateConfig.cores?.texto || '#1f2937' }}
            >
              <div className="font-semibold mb-1" style={{ color: templateConfig.cores?.secundaria || '#64748b' }}>
                INFORMAÇÕES DO EXAME
              </div>
              <div>Data: {new Date().toLocaleDateString('pt-BR')}</div>
              <div>Tipo: Eletrocardiograma</div>
              <div>Status: Laudo realizado</div>
            </div>
          </DraggableElement>

          <DraggableElement
            id="content"
            position={{
              ...elements.content,
              x: isFolhaTimbrada ? areaUtil.x + elements.content.x : elements.content.x,
              y: isFolhaTimbrada ? areaUtil.y + elements.content.y : elements.content.y
            }}
            onPositionChange={(id, pos) => {
              if (isFolhaTimbrada) {
                handlePositionChange(id, {
                  ...pos,
                  x: Math.max(0, Math.min(pos.x - areaUtil.x, areaUtil.width - pos.width)),
                  y: Math.max(0, Math.min(pos.y - areaUtil.y, areaUtil.height - pos.height))
                });
              } else {
                handlePositionChange(id, pos);
              }
            }}
            isVisible={elements.content.visible}
            onVisibilityChange={handleVisibilityChange}
            onStyleConfigOpen={handleStyleConfigOpen}
            label="Conteúdo"
            resizable={true}
            isFolhaTimbrada={isFolhaTimbrada}
          >
            <div 
              className={`text-xs leading-relaxed ${isFolhaTimbrada ? '' : 'bg-white bg-opacity-98 rounded p-3'}`}
              style={{ color: templateConfig.cores?.texto || '#1f2937' }}
            >
              <div className="font-semibold mb-2" style={{ color: templateConfig.cores?.secundaria || '#64748b' }}>
                ANÁLISE E CONCLUSÃO
              </div>
              <p>Exame realizado em condições técnicas adequadas. Ritmo sinusal regular...</p>
            </div>
          </DraggableElement>

          <DraggableElement
            id="signature"
            position={{
              ...elements.signature,
              x: isFolhaTimbrada ? areaUtil.x + elements.signature.x : elements.signature.x,
              y: isFolhaTimbrada ? areaUtil.y + elements.signature.y : elements.signature.y
            }}
            onPositionChange={(id, pos) => {
              if (isFolhaTimbrada) {
                handlePositionChange(id, {
                  ...pos,
                  x: Math.max(0, Math.min(pos.x - areaUtil.x, areaUtil.width - pos.width)),
                  y: Math.max(0, Math.min(pos.y - areaUtil.y, areaUtil.height - pos.height))
                });
              } else {
                handlePositionChange(id, pos);
              }
            }}
            isVisible={elements.signature.visible}
            onVisibilityChange={handleVisibilityChange}
            onStyleConfigOpen={handleStyleConfigOpen}
            label="Assinatura"
            resizable={true}
            isFolhaTimbrada={isFolhaTimbrada}
          >
            <div 
              className={`text-center text-xs ${isFolhaTimbrada ? '' : 'bg-white bg-opacity-95 rounded p-2'}`}
              style={{ color: templateConfig.cores?.texto || '#1f2937' }}
            >
              <div className="border-t border-gray-400 mb-1"></div>
              <div className="font-semibold">Dr. Maria Santos</div>
              <div>CRM: 12345-SP</div>
              <div>{new Date().toLocaleDateString('pt-BR')}</div>
            </div>
          </DraggableElement>

          {(!isFolhaTimbrada || !folhaConfig.ocultarCabecalho) && (
            <DraggableElement
              id="header"
              position={{
                ...elements.header,
                x: isFolhaTimbrada ? areaUtil.x + elements.header.x : elements.header.x,
                y: isFolhaTimbrada ? areaUtil.y + elements.header.y : elements.header.y
              }}
              onPositionChange={(id, pos) => {
                if (isFolhaTimbrada) {
                  handlePositionChange(id, {
                    ...pos,
                    x: Math.max(0, Math.min(pos.x - areaUtil.x, areaUtil.width - pos.width)),
                    y: Math.max(0, Math.min(pos.y - areaUtil.y, areaUtil.height - pos.height))
                  });
                } else {
                  handlePositionChange(id, pos);
                }
              }}
              isVisible={elements.header.visible}
              onVisibilityChange={handleVisibilityChange}
              onStyleConfigOpen={handleStyleConfigOpen}
              label="Cabeçalho"
              resizable={true}
              isFolhaTimbrada={isFolhaTimbrada}
            >
              <div 
                className={`text-center font-bold text-xs ${isFolhaTimbrada ? '' : 'bg-white bg-opacity-90 rounded p-2'}`}
                style={{ color: templateConfig.cores?.primaria || '#2563eb' }}
              >
                CABEÇALHO PERSONALIZADO
              </div>
            </DraggableElement>
          )}

          <DraggableElement
            id="qrcode"
            position={{
              ...elements.qrcode,
              x: isFolhaTimbrada ? areaUtil.x + elements.qrcode.x : elements.qrcode.x,
              y: isFolhaTimbrada ? areaUtil.y + elements.qrcode.y : elements.qrcode.y
            }}
            onPositionChange={(id, pos) => {
              if (isFolhaTimbrada) {
                handlePositionChange(id, {
                  ...pos,
                  x: Math.max(0, Math.min(pos.x - areaUtil.x, areaUtil.width - pos.width)),
                  y: Math.max(0, Math.min(pos.y - areaUtil.y, areaUtil.height - pos.height))
                });
              } else {
                handlePositionChange(id, pos);
              }
            }}
            isVisible={elements.qrcode.visible}
            onVisibilityChange={handleVisibilityChange}
            onStyleConfigOpen={handleStyleConfigOpen}
            label="QR Code"
            resizable={true}
            minWidth={30}
            minHeight={30}
            isFolhaTimbrada={isFolhaTimbrada}
          >
            <div className={`w-full h-full bg-gray-800 flex items-center justify-content text-white text-xs rounded ${isFolhaTimbrada ? 'bg-opacity-90' : ''}`}>
              📱 QR
            </div>
          </DraggableElement>

          {(!isFolhaTimbrada || !folhaConfig.ocultarRodape) && (
            <DraggableElement
              id="footer"
              position={{
                ...elements.footer,
                x: isFolhaTimbrada ? areaUtil.x + elements.footer.x : elements.footer.x,
                y: isFolhaTimbrada ? areaUtil.y + elements.footer.y : elements.footer.y
              }}
              onPositionChange={(id, pos) => {
                if (isFolhaTimbrada) {
                  handlePositionChange(id, {
                    ...pos,
                    x: Math.max(0, Math.min(pos.x - areaUtil.x, areaUtil.width - pos.width)),
                    y: Math.max(0, Math.min(pos.y - areaUtil.y, areaUtil.height - pos.height))
                  });
                } else {
                  handlePositionChange(id, pos);
                }
              }}
              isVisible={elements.footer.visible}
              onVisibilityChange={handleVisibilityChange}
              onStyleConfigOpen={handleStyleConfigOpen}
              label="Rodapé"
              resizable={false}
              isFolhaTimbrada={isFolhaTimbrada}
            >
              <div 
                className={`text-center text-xs ${isFolhaTimbrada ? '' : 'bg-white bg-opacity-90 rounded p-1'}`}
                style={{ color: templateConfig.cores?.texto || '#1f2937' }}
              >
                {templateConfig.rodapeTexto || 'Texto do rodapé personalizado'}
              </div>
            </DraggableElement>
          )}

        </div>
      </div>

      {/* Painel de configuração de estilo */}
      <StyleConfigPanel 
        elementId={selectedElementForStyle}
        isOpen={styleConfigOpen}
        onClose={() => {
          setStyleConfigOpen(false);
          setSelectedElementForStyle(null);
        }}
        currentStyle={getCurrentStyle(selectedElementForStyle)}
        onStyleChange={handleStyleChange}
      />

      {/* Dicas */}
      <div className="mt-6 bg-purple-50 border border-purple-200 rounded-lg p-4">
        <h4 className="font-semibold text-purple-800 mb-2">
          💡 Dicas do Editor Visual {isFolhaTimbrada ? '(Modo Folha Timbrada)' : ''}
        </h4>
        <ul className="text-sm text-purple-700 space-y-1">
          <li>• Arraste os elementos para reposicioná-los no layout</li>
          <li>• Use os controles de visibilidade (👁️) para mostrar/ocultar elementos</li>
          <li>• Clique no ícone de paleta (🎨) para configurar estilos</li>
          {isFolhaTimbrada ? (
            <>
              <li>• A folha timbrada aparece como plano de fundo</li>
              <li>• Posicione o conteúdo na área demarcada para melhor legibilidade</li>
              <li>• Elementos têm fundo semi-transparente para destacar sobre a imagem</li>
            </>
          ) : (
            <>
              <li>• Use as alças de redimensionamento (↗️) nos cantos para ajustar tamanhos</li>
              <li>• As posições são salvas automaticamente conforme você arrasta</li>
            </>
          )}
          <li>• Clique em "Preview" para ver como ficará o PDF final</li>
        </ul>
      </div>
    </div>
  );
};

export default VisualLayoutEditor;
