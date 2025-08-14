import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import templatePDFService from '../../services/templatePDFService';
import { toast } from 'react-hot-toast';
import { 
  FaCog, FaPalette, FaFont, FaRuler, FaEye, FaSave, FaSpinner, 
  FaUndo, FaImage, FaAlignCenter, FaAlignLeft, FaAlignRight,
  FaExpand, FaCompress, FaLayerGroup, FaCode, FaDownload, FaUpload
} from 'react-icons/fa';
import Modal from '../Common/Modal';

const AdvancedTemplateCustomizer = ({ currentTemplate, onTemplateUpdated, onPreview }) => {
  const { usuario, temRole, temAlgumaRole, isAdminMaster } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('cores');
  const [templateConfig, setTemplateConfig] = useState({
    nomeModelo: 'Template Personalizado',
    tipoTemplate: 'personalizado',
    cores: {
      primaria: '#2563eb',
      secundaria: '#64748b',
      terciaria: '#f8fafc',
      acento: '#3b82f6',
      texto: '#1e293b',
      fundo: '#ffffff'
    },
    fontes: {
      titulo: 'Inter',
      corpo: 'Inter',
      tamanhoTitulo: '24px',
      tamanhoCorpo: '14px',
      tamanhoSubtitulo: '18px'
    },
    layout: {
      margem: {
        superior: 20,
        inferior: 20,
        esquerda: 20,
        direita: 20
      },
      espacamento: {
        entreSecoes: 16,
        enteParagrafos: 8,
        entreLinhas: 1.5
      },
      alinhamento: {
        titulo: 'center',
        conteudo: 'left',
        assinatura: 'right'
      }
    },
    estilosSecao: {
      header: {
        altura: 80,
        corFundo: '#2563eb',
        mostrarLogo: true,
        posicaoLogo: 'esquerda',
        gradiente: true
      },
      patientInfo: {
        corFundo: '#f8fafc',
        corBorda: '#e2e8f0',
        bordaRaio: 8,
        padding: 16
      },
      content: {
        espacamento: 'normal',
        numerarParagrafos: false,
        destacarTitulos: true
      },
      footer: {
        altura: 60,
        corFundo: '#f1f5f9',
        mostrarPaginacao: true,
        textoFixo: ''
      }
    },
    configuracoesPDF: {
      formato: 'A4',
      orientacao: 'portrait',
      qualidade: 'alta',
      compressao: false
    }
  });

  const sections = [
    { id: 'cores', label: 'Cores e Tema', icon: FaPalette },
    { id: 'fontes', label: 'Tipografia', icon: FaFont },
    { id: 'layout', label: 'Layout e Espaçamento', icon: FaRuler },
    { id: 'secoes', label: 'Seções do Documento', icon: FaLayerGroup },
    { id: 'avancado', label: 'Configurações Avançadas', icon: FaCog }
  ];

  const fontOptions = [
    { value: 'Inter', label: 'Inter (Recomendado)' },
    { value: 'Roboto', label: 'Roboto' },
    { value: 'Open Sans', label: 'Open Sans' },
    { value: 'Lato', label: 'Lato' },
    { value: 'Montserrat', label: 'Montserrat' },
    { value: 'Source Sans Pro', label: 'Source Sans Pro' },
    { value: 'Arial', label: 'Arial' },
    { value: 'Helvetica', label: 'Helvetica' },
    { value: 'Times New Roman', label: 'Times New Roman' }
  ];

  const colorPresets = [
    { name: 'Azul Profissional', colors: { primaria: '#2563eb', secundaria: '#64748b', acento: '#3b82f6' }},
    { name: 'Verde Médico', colors: { primaria: '#059669', secundaria: '#6b7280', acento: '#10b981' }},
    { name: 'Roxo Elegante', colors: { primaria: '#7c3aed', secundaria: '#a78bfa', acento: '#8b5cf6' }},
    { name: 'Cinza Corporativo', colors: { primaria: '#374151', secundaria: '#9ca3af', acento: '#4b5563' }},
    { name: 'Laranja Vibrante', colors: { primaria: '#ea580c', secundaria: '#fdba74', acento: '#f97316' }}
  ];

  useEffect(() => {
    if (currentTemplate) {
      setTemplateConfig(prev => {
        const merged = {
          ...prev,
          ...currentTemplate
        };
        
        // Ensure all nested structures exist with fallbacks
        merged.cores = { ...prev.cores, ...(currentTemplate.cores || {}) };
        merged.fontes = { ...prev.fontes, ...(currentTemplate.fontes || {}) };
        merged.layout = {
          ...prev.layout,
          ...(currentTemplate.layout || {}),
          margem: { ...prev.layout.margem, ...(currentTemplate.layout?.margem || {}) },
          espacamento: { ...prev.layout.espacamento, ...(currentTemplate.layout?.espacamento || {}) },
          alinhamento: { ...prev.layout.alinhamento, ...(currentTemplate.layout?.alinhamento || {}) }
        };
        merged.estilosSecao = { ...prev.estilosSecao, ...(currentTemplate.estilosSecao || {}) };
        merged.configuracoesPDF = { ...prev.configuracoesPDF, ...(currentTemplate.configuracoesPDF || {}) };
        
        return merged;
      });
    }
  }, [currentTemplate]);

  const handleConfigChange = (section, key, value) => {
    setTemplateConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };

  const handleNestedConfigChange = (section, subsection, key, value) => {
    setTemplateConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [subsection]: {
          ...prev[section][subsection],
          [key]: value
        }
      }
    }));
  };

  const applyColorPreset = (preset) => {
    setTemplateConfig(prev => ({
      ...prev,
      cores: {
        ...prev.cores,
        ...preset.colors
      }
    }));
    toast.success(`Preset "${preset.name}" aplicado!`);
  };

  const saveTemplate = async () => {
    // Verificar se é admin
    const isAdmin = isAdminMaster || temAlgumaRole(['admin', 'adminMaster']);
    
    if (!isAdmin) {
      toast.error('Apenas administradores podem salvar templates');
      return;
    }

    try {
      setSaving(true);
      
      await templatePDFService.salvarTemplateTenant(templateConfig);
      toast.success('Template salvo com sucesso!');
      
      onTemplateUpdated?.();
    } catch (error) {
      console.error('Erro ao salvar template:', error);
      toast.error('Erro ao salvar template');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    setTemplateConfig({
      ...templateConfig,
      cores: {
        primaria: '#2563eb',
        secundaria: '#64748b',
        terciaria: '#f8fafc',
        acento: '#3b82f6',
        texto: '#1e293b',
        fundo: '#ffffff'
      }
    });
    toast.success('Configurações restauradas para o padrão');
  };

  const renderColorSection = () => (
    <div className="space-y-6">
      {/* Color Presets */}
      <div>
        <h4 className="font-medium text-gray-900 mb-3">Presets de Cores</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {colorPresets.map((preset, index) => (
            <button
              key={index}
              onClick={() => applyColorPreset(preset)}
              className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="flex gap-1">
                  {Object.values(preset.colors).map((color, idx) => (
                    <div
                      key={idx}
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <span className="text-sm font-medium">{preset.name}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Individual Colors */}
      <div>
        <h4 className="font-medium text-gray-900 mb-3">Cores Personalizadas</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Object.entries(templateConfig?.cores || {}).filter(([key, value]) => key && value).map(([key, value]) => (
            <div key={key} className="space-y-2">
              <label className="text-sm font-medium text-gray-700 capitalize">
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={value}
                  onChange={(e) => handleConfigChange('cores', key, e.target.value)}
                  className="w-12 h-10 rounded-lg border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={value}
                  onChange={(e) => handleConfigChange('cores', key, e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="#000000"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderFontSection = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Font Selection */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Fontes</h4>
          
          <div>
            <label className="text-sm font-medium text-gray-700">Fonte Principal</label>
            <select
              value={templateConfig?.fontes?.titulo || 'Helvetica'}
              onChange={(e) => handleConfigChange('fontes', 'titulo', e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {fontOptions.map(font => (
                <option key={font.value} value={font.value}>{font.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Fonte do Corpo</label>
            <select
              value={templateConfig?.fontes?.corpo || 'Helvetica'}
              onChange={(e) => handleConfigChange('fontes', 'corpo', e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {fontOptions.map(font => (
                <option key={font.value} value={font.value}>{font.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Font Sizes */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Tamanhos</h4>
          
          {['tamanhoTitulo', 'tamanhoSubtitulo', 'tamanhoCorpo'].map(key => (
            <div key={key}>
              <label className="text-sm font-medium text-gray-700 capitalize">
                {key.replace('tamanho', '').replace(/([A-Z])/g, ' $1').trim()}
              </label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="range"
                  min="8"
                  max="36"
                  value={parseInt(templateConfig.fontes[key])}
                  onChange={(e) => handleConfigChange('fontes', key, `${e.target.value}px`)}
                  className="flex-1"
                />
                <span className="text-sm text-gray-600 w-12">
                  {templateConfig.fontes[key]}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Font Preview */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h4 className="font-medium text-gray-900 mb-4">Preview da Tipografia</h4>
        <div className="space-y-4">
          <div 
            style={{ 
              fontFamily: templateConfig.fontes.titulo,
              fontSize: templateConfig.fontes.tamanhoTitulo,
              color: templateConfig.cores.primaria
            }}
          >
            Título Principal do Laudo
          </div>
          <div 
            style={{ 
              fontFamily: templateConfig.fontes.titulo,
              fontSize: templateConfig.fontes.tamanhoSubtitulo,
              color: templateConfig.cores.texto
            }}
          >
            Subtítulo da Seção
          </div>
          <div 
            style={{ 
              fontFamily: templateConfig.fontes.corpo,
              fontSize: templateConfig.fontes.tamanhoCorpo,
              color: templateConfig.cores.texto
            }}
          >
            Este é um exemplo de texto do corpo do laudo médico. Aqui você pode ver como ficará a tipografia com as configurações atuais.
          </div>
        </div>
      </div>
    </div>
  );

  const renderLayoutSection = () => (
    <div className="space-y-6">
      {/* Margins */}
      <div>
        <h4 className="font-medium text-gray-900 mb-3">Margens (mm)</h4>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(templateConfig?.layout?.margem || {}).filter(([key, value]) => key && value !== undefined).map(([key, value]) => (
            <div key={key}>
              <label className="text-sm font-medium text-gray-700 capitalize">
                {key}
              </label>
              <input
                type="number"
                value={value}
                onChange={(e) => handleNestedConfigChange('layout', 'margem', key, parseInt(e.target.value))}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                min="5"
                max="50"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Spacing */}
      <div>
        <h4 className="font-medium text-gray-900 mb-3">Espaçamento (px)</h4>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {Object.entries(templateConfig?.layout?.espacamento || {}).filter(([key, value]) => key && value !== undefined).map(([key, value]) => (
            <div key={key}>
              <label className="text-sm font-medium text-gray-700">
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </label>
              <input
                type="number"
                value={value}
                onChange={(e) => handleNestedConfigChange('layout', 'espacamento', key, parseFloat(e.target.value))}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                min="0"
                max="100"
                step={key === 'entreLinhas' ? '0.1' : '1'}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Alignment */}
      <div>
        <h4 className="font-medium text-gray-900 mb-3">Alinhamento</h4>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {Object.entries(templateConfig?.layout?.alinhamento || {}).map(([key, value]) => (
            <div key={key}>
              <label className="text-sm font-medium text-gray-700 capitalize">
                {key}
              </label>
              <div className="mt-1 flex gap-2">
                {['left', 'center', 'right'].map(align => (
                  <button
                    key={align}
                    onClick={() => handleNestedConfigChange('layout', 'alinhamento', key, align)}
                    className={`flex-1 px-3 py-2 border rounded-lg flex items-center justify-center ${
                      value === align 
                        ? 'bg-blue-500 text-white border-blue-500' 
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {align === 'left' && <FaAlignLeft />}
                    {align === 'center' && <FaAlignCenter />}
                    {align === 'right' && <FaAlignRight />}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSectionSection = () => (
    <div className="space-y-6">
      {/* Header Settings */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-3">Cabeçalho</h4>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Altura (px)</label>
            <input
              type="number"
              value={templateConfig.estilosSecao.header.altura}
              onChange={(e) => handleNestedConfigChange('estilosSecao', 'header', 'altura', parseInt(e.target.value))}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
              min="40"
              max="200"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Cor de Fundo</label>
            <input
              type="color"
              value={templateConfig.estilosSecao.header.corFundo}
              onChange={(e) => handleNestedConfigChange('estilosSecao', 'header', 'corFundo', e.target.value)}
              className="mt-1 w-full h-10 rounded-lg border border-gray-300"
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={templateConfig.estilosSecao.header.mostrarLogo}
              onChange={(e) => handleNestedConfigChange('estilosSecao', 'header', 'mostrarLogo', e.target.checked)}
              className="mr-2"
            />
            <label className="text-sm font-medium text-gray-700">Mostrar Logo</label>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={templateConfig.estilosSecao.header.gradiente}
              onChange={(e) => handleNestedConfigChange('estilosSecao', 'header', 'gradiente', e.target.checked)}
              className="mr-2"
            />
            <label className="text-sm font-medium text-gray-700">Usar Gradiente</label>
          </div>
        </div>
      </div>

      {/* Patient Info Settings */}
      <div className="bg-green-50 rounded-lg p-4">
        <h4 className="font-medium text-green-900 mb-3">Informações do Paciente</h4>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Cor de Fundo</label>
            <input
              type="color"
              value={templateConfig.estilosSecao.patientInfo.corFundo}
              onChange={(e) => handleNestedConfigChange('estilosSecao', 'patientInfo', 'corFundo', e.target.value)}
              className="mt-1 w-full h-10 rounded-lg border border-gray-300"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Cor da Borda</label>
            <input
              type="color"
              value={templateConfig.estilosSecao.patientInfo.corBorda}
              onChange={(e) => handleNestedConfigChange('estilosSecao', 'patientInfo', 'corBorda', e.target.value)}
              className="mt-1 w-full h-10 rounded-lg border border-gray-300"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Raio da Borda (px)</label>
            <input
              type="number"
              value={templateConfig.estilosSecao.patientInfo.bordaRaio}
              onChange={(e) => handleNestedConfigChange('estilosSecao', 'patientInfo', 'bordaRaio', parseInt(e.target.value))}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
              min="0"
              max="20"
            />
          </div>
        </div>
      </div>

      {/* Footer Settings */}
      <div className="bg-purple-50 rounded-lg p-4">
        <h4 className="font-medium text-purple-900 mb-3">Rodapé</h4>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Altura (px)</label>
            <input
              type="number"
              value={templateConfig.estilosSecao.footer.altura}
              onChange={(e) => handleNestedConfigChange('estilosSecao', 'footer', 'altura', parseInt(e.target.value))}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
              min="20"
              max="120"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Cor de Fundo</label>
            <input
              type="color"
              value={templateConfig.estilosSecao.footer.corFundo}
              onChange={(e) => handleNestedConfigChange('estilosSecao', 'footer', 'corFundo', e.target.value)}
              className="mt-1 w-full h-10 rounded-lg border border-gray-300"
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={templateConfig.estilosSecao.footer.mostrarPaginacao}
              onChange={(e) => handleNestedConfigChange('estilosSecao', 'footer', 'mostrarPaginacao', e.target.checked)}
              className="mr-2"
            />
            <label className="text-sm font-medium text-gray-700">Mostrar Paginação</label>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Texto Fixo</label>
            <input
              type="text"
              value={templateConfig.estilosSecao.footer.textoFixo}
              onChange={(e) => handleNestedConfigChange('estilosSecao', 'footer', 'textoFixo', e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Ex: © 2024 Minha Clínica"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderAdvancedSection = () => (
    <div className="space-y-6">
      {/* PDF Settings */}
      <div>
        <h4 className="font-medium text-gray-900 mb-3">Configurações do PDF</h4>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Formato</label>
            <select
              value={templateConfig.configuracoesPDF.formato}
              onChange={(e) => handleConfigChange('configuracoesPDF', 'formato', e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="A4">A4</option>
              <option value="A3">A3</option>
              <option value="Letter">Letter</option>
              <option value="Legal">Legal</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Orientação</label>
            <select
              value={templateConfig.configuracoesPDF.orientacao}
              onChange={(e) => handleConfigChange('configuracoesPDF', 'orientacao', e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="portrait">Retrato</option>
              <option value="landscape">Paisagem</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Qualidade</label>
            <select
              value={templateConfig.configuracoesPDF.qualidade}
              onChange={(e) => handleConfigChange('configuracoesPDF', 'qualidade', e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="baixa">Baixa</option>
              <option value="media">Média</option>
              <option value="alta">Alta</option>
            </select>
          </div>
        </div>
      </div>

      {/* Template Info */}
      <div>
        <h4 className="font-medium text-gray-900 mb-3">Informações do Template</h4>
        <div>
          <label className="text-sm font-medium text-gray-700">Nome do Template</label>
          <input
            type="text"
            value={templateConfig.nomeModelo}
            onChange={(e) => handleConfigChange('root', 'nomeModelo', e.target.value)}
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
            placeholder="Nome para identificar este template"
          />
        </div>
      </div>

      {/* Import/Export */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3">Importar/Exportar Configurações</h4>
        <div className="flex gap-3">
          <button
            onClick={() => {
              const data = JSON.stringify(templateConfig, null, 2);
              const blob = new Blob([data], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `template-${templateConfig.nomeModelo}.json`;
              a.click();
              toast.success('Configurações exportadas!');
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            <FaDownload />
            Exportar
          </button>
        </div>
      </div>
    </div>
  );

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'cores':
        return renderColorSection();
      case 'fontes':
        return renderFontSection();
      case 'layout':
        return renderLayoutSection();
      case 'secoes':
        return renderSectionSection();
      case 'avancado':
        return renderAdvancedSection();
      default:
        return renderColorSection();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-500 p-3 rounded-xl">
              <FaCog className="text-2xl text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Personalização Avançada
              </h2>
              <p className="text-gray-600">
                Configure todos os aspectos do seu template PDF
              </p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={resetToDefaults}
              className="flex items-center gap-2 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <FaUndo />
              Restaurar Padrões
            </button>
            
            <button
              onClick={() => onPreview?.(templateConfig)}
              className="flex items-center gap-2 px-4 py-2 border-2 border-blue-300 text-blue-700 rounded-xl hover:bg-blue-50 transition-colors"
            >
              <FaEye />
              Preview
            </button>
            
            <button
              onClick={saveTemplate}
              disabled={saving || (!isAdminMaster && !temAlgumaRole(['admin', 'adminMaster']))}
              className={`flex items-center gap-2 px-6 py-2 rounded-xl transition-colors shadow-lg ${
                !isAdminMaster && !temAlgumaRole(['admin', 'adminMaster'])
                  ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                  : 'bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50'
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
                  <FaCog />
                  Apenas Admin
                </>
              ) : (
                <>
                  <FaSave />
                  Salvar Template
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="flex overflow-x-auto">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center gap-3 px-6 py-4 whitespace-nowrap border-b-2 font-medium transition-colors ${
                  activeSection === section.id
                    ? 'border-indigo-500 text-indigo-600 bg-indigo-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon />
                {section.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {renderActiveSection()}
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-6">
        <h4 className="font-semibold text-green-900 mb-4">
          💡 Dicas para Personalização Avançada
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="bg-white rounded-lg p-4">
            <h5 className="font-medium text-gray-900 mb-2">🎨 Cores Harmoniosas</h5>
            <p className="text-gray-600">
              Use ferramentas como Adobe Color ou Coolors para criar paletas harmoniosas. 
              Mantenha contraste suficiente para legibilidade.
            </p>
          </div>
          
          <div className="bg-white rounded-lg p-4">
            <h5 className="font-medium text-gray-900 mb-2">📐 Layout Profissional</h5>
            <p className="text-gray-600">
              Mantenha margens consistentes e use espaçamento adequado. 
              Teste com diferentes tamanhos de conteúdo.
            </p>
          </div>
          
          <div className="bg-white rounded-lg p-4">
            <h5 className="font-medium text-gray-900 mb-2">🔤 Tipografia Legível</h5>
            <p className="text-gray-600">
              Fontes sans-serif funcionam melhor para textos médicos. 
              Mantenha tamanhos mínimos para leitura confortável.
            </p>
          </div>
          
          <div className="bg-white rounded-lg p-4">
            <h5 className="font-medium text-gray-900 mb-2">📄 PDF Otimizado</h5>
            <p className="text-gray-600">
              Configure qualidade alta para documentos oficiais. 
              Teste a impressão antes de finalizar.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedTemplateCustomizer;
