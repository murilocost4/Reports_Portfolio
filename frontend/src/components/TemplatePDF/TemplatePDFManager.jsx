import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { 
  FaPalette, FaUpload, FaEye, FaSave, FaTrash, FaUndo, FaImage, 
  FaExpandArrowsAlt, FaFont, FaAlignCenter, FaAlignLeft, FaAlignRight,
  FaCheck, FaTimes, FaInfoCircle, FaDownload, FaArrowsAlt, FaCog, FaEdit
} from 'react-icons/fa';
import templatePDFService from '../../services/templatePDFService';
import { useAuth } from '../../contexts/AuthContext';
import VisualLayoutEditor from './VisualLayoutEditor';
import LogoUploader from './LogoUploader';
import './TemplatePDF.css';

// Componente para seleção de cores predefinidas
const ColorPicker = ({ label, value, onChange, presetColors = [] }) => {
  const [showCustom, setShowCustom] = useState(false);
  
  const defaultColors = [
    '#2563eb', '#dc2626', '#059669', '#d97706', '#7c3aed', '#db2777',
    '#0891b2', '#65a30d', '#ea580c', '#be123c', '#9333ea', '#0284c7',
    '#1f2937', '#374151', '#6b7280', '#9ca3af', '#ffffff', '#f9fafb'
  ];
  
  const colors = presetColors.length > 0 ? presetColors : defaultColors;
  
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      
      {/* Preview da cor atual */}
      <div className="flex items-center gap-3 mb-3">
        <div 
          className="w-10 h-10 rounded-lg border-2 border-gray-300 shadow-sm"
          style={{ backgroundColor: value }}
        />
        <span className="text-sm font-mono text-gray-600">{value}</span>
      </div>
      
      {/* Paleta de cores predefinidas */}
      <div className="grid grid-cols-6 gap-2 mb-3">
        {colors.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            className={`w-8 h-8 rounded-lg border-2 hover:scale-110 transition-transform ${
              value === color ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-300'
            }`}
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
      </div>
      
      {/* Seletor de cor personalizada */}
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
        />
        <span className="text-sm text-gray-600">Cor personalizada</span>
      </div>
    </div>
  );
};

// Componente para controles deslizantes
const SliderControl = ({ label, value, onChange, min = 0, max = 100, step = 1, unit = 'px', description }) => {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
        <span className="text-sm font-mono text-gray-600">
          {value}{unit}
        </span>
      </div>
      
      {description && (
        <p className="text-xs text-gray-500 mb-2">{description}</p>
      )}
      
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-400">{min}</span>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
        />
        <span className="text-xs text-gray-400">{max}</span>
      </div>
      
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        min={min}
        max={max}
        step={step}
        className="mt-1 w-20 px-2 py-1 text-sm border border-gray-300 rounded text-center"
      />
    </div>
  );
};

// Componente para toggle com visual atraente
const ToggleSwitch = ({ label, checked, onChange, description }) => {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex-1">
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
        {description && (
          <p className="text-xs text-gray-500 mt-1">{description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-blue-600' : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
};

// Componente para seleção de alinhamento visual
const AlignmentSelector = ({ value, onChange }) => {
  const options = [
    { value: 'left', icon: FaAlignLeft, label: 'Esquerda' },
    { value: 'center', icon: FaAlignCenter, label: 'Centro' },
    { value: 'right', icon: FaAlignRight, label: 'Direita' }
  ];
  
  return (
    <div className="flex gap-2">
      {options.map(({ value: optionValue, icon: Icon, label }) => (
        <button
          key={optionValue}
          type="button"
          onClick={() => onChange(optionValue)}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
            value === optionValue
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
          title={label}
        >
          <Icon className="text-sm" />
          <span className="text-sm">{label}</span>
        </button>
      ))}
    </div>
  );
};

const TemplatePDFManager = ({ onPreview }) => {
  const { usuario, tenant_id, isAuthenticated } = useAuth();
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [usandoPadrao, setUsandoPadrao] = useState(false);
  const [activeMode, setActiveMode] = useState('visual'); // 'visual' ou 'config'
  const [templateCarregado, setTemplateCarregado] = useState(false);
  const [folhaTimbradaFile, setFolhaTimbradaFile] = useState(null);
  const [folhaTimbradaPreview, setFolhaTimbradaPreview] = useState(null);

  // Estado do formulário
  const [formData, setFormData] = useState({
    nomeModelo: '',
    tipoTemplate: 'personalizado', // 'personalizado' ou 'folha_timbrada'
    cores: {
      primaria: '#2563eb',
      corTitulo: '#1e293b',
      secundaria: '#64748b',
      texto: '#1f2937',
      fundo: '#ffffff'
    },
    layout: {
      mostrarLogo: true,
      mostrarRodape: true,
      mostrarCabecalho: true,
      mostrarTitulo: true,
      mostrarDadosExame: true,
      alinhamentoTitulo: 'center',
      mostrarQrCode: true,
      mostrarDadosPaciente: true,
      mostrarDataAssinatura: true,
      mostrarCabecalhoCompleto: true
    },
    // Configurações avançadas de estilo para cada seção
    estilosSecao: {
      header: {
        corFundo: '#f8fafc',
        corBorda: '#e2e8f0',
        larguraBorda: 1,
        tipoLinha: 'solid', // solid, dashed, dotted, double
        raioCantos: 8,
        padding: 16,
        incluirLogo: true,
        incluirTitulo: true,
        gradiente: false,
        corGradiente1: '#3b82f6',
        corGradiente2: '#8b5cf6',
        larguraCompleta: true,
        altura: 80,
        alinhamentoTexto: 'center',
        textoPersonalizado: '',
        mostrarTextoPersonalizado: false
      },
      patientInfo: {
        corFundo: '#ffffff',
        corBorda: '#d1d5db',
        larguraBorda: 1,
        tipoLinha: 'solid',
        raioCantos: 6,
        padding: 12,
        sombra: true
      },
      content: {
        corFundo: '#ffffff',
        corBorda: '#e5e7eb',
        larguraBorda: 0,
        tipoLinha: 'solid',
        raioCantos: 0,
        padding: 16,
        sombra: false
      },
      signature: {
        corFundo: '#f9fafb',
        corBorda: '#9ca3af',
        larguraBorda: 1,
        tipoLinha: 'solid',
        raioCantos: 4,
        padding: 12,
        sombra: false
      },
      footer: {
        corFundo: '#f1f5f9',
        corBorda: '#cbd5e1',
        larguraBorda: 1,
        tipoLinha: 'solid',
        raioCantos: 6,
        padding: 10,
        sombra: false,
        larguraCompleta: true,
        altura: 60,
        alinhamentoTexto: 'center'
      },
      qrcode: {
        tamanhoMinimo: 50,
        tamanhoMaximo: 200,
        bordaPersonalizada: false,
        corBorda: '#e2e8f0',
        larguraBorda: 1
      }
    },
    fonte: 'Helvetica',
    tamanhoFonte: {
      base: 11,
      titulo: 16,
      subtitulo: 14
    },
    margens: {
      top: 40,
      bottom: 40,
      left: 40,
      right: 40
    },
    rodapeTexto: '',
    customPositions: {}, // Posições customizadas dos elementos
    folhaTimbradaUrl: null,
    folhaTimbradaS3Key: null,
    folhaTimbradaConfig: {
      largura: 210,
      altura: 297,
      margemSuperior: 20,
      margemInferior: 20,
      margemEsquerda: 20,
      margemDireita: 20
    }
  });

  useEffect(() => {
    if (isAuthenticated && tenant_id && !templateCarregado) {
      carregarTemplate();
    }
  }, [isAuthenticated, tenant_id, templateCarregado]);

  const carregarTemplate = async () => {
    if (!isAuthenticated || !tenant_id) {
      console.warn('Usuário não autenticado ou tenant_id não disponível');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await templatePDFService.buscarTemplate(tenant_id);
      
      if (response.template) {
        setTemplate(response.template);
        setUsandoPadrao(response.template.usandoPadrao || false);
        
        if (!response.template.usandoPadrao) {
          setFormData({
            nomeModelo: response.template.nomeModelo || '',
            tipoTemplate: response.template.tipoTemplate || 'personalizado',
            cores: response.template.cores || formData.cores,
            layout: response.template.layout || formData.layout,
            estilosSecao: response.template.estilosSecao || formData.estilosSecao,
            fonte: response.template.fonte || 'Helvetica',
            tamanhoFonte: response.template.tamanhoFonte || formData.tamanhoFonte,
            margens: response.template.margens || formData.margens,
            rodapeTexto: response.template.rodapeTexto || '',
            customPositions: response.template.customPositions || {},
            folhaTimbradaUrl: response.template.folhaTimbradaUrl || null,
            folhaTimbradaS3Key: response.template.folhaTimbradaS3Key || null,
            folhaTimbradaConfig: response.template.folhaTimbradaConfig || formData.folhaTimbradaConfig
          });
        } else {
          // Usar configuração padrão
          const configPadrao = templatePDFService.getConfigPadrao();
          setFormData(configPadrao);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar template:', error);
      toast.error('Erro ao carregar configurações do template');
    } finally {
      setLoading(false);
      setTemplateCarregado(true);
    }
  };

  const handleInputChange = (section, field, value) => {
    if (section) {
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...(prev[section] || {}),
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validation = templatePDFService.validarArquivoLogo(file);
    if (!validation.valido) {
      toast.error(validation.erro);
      return;
    }

    setLogoFile(file);
    
    // Criar preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setLogoPreview(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleFolhaTimbradaChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validation = templatePDFService.validarArquivoFolhaTimbrada(file);
    if (!validation.valido) {
      toast.error(validation.erro);
      return;
    }

    setFolhaTimbradaFile(file);
    
    // Criar preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setFolhaTimbradaPreview(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const removerFolhaTimbrada = () => {
    setFolhaTimbradaFile(null);
    setFolhaTimbradaPreview(null);
    handleInputChange(null, 'folhaTimbradaUrl', null);
    handleInputChange(null, 'folhaTimbradaS3Key', null);
  };

  const handleTipoTemplateChange = (novoTipo) => {
    handleInputChange(null, 'tipoTemplate', novoTipo);
    
    // Se mudou para folha timbrada, ajustar configurações padrão
    if (novoTipo === 'folha_timbrada') {
      handleInputChange('layout', 'mostrarCabecalho', false);
      handleInputChange('layout', 'mostrarLogo', false);
      handleInputChange('layout', 'mostrarTitulo', false);
      handleInputChange('layout', 'mostrarRodape', false);
      handleInputChange('layout', 'mostrarQrCode', false);
    }
  };

  const salvarTemplate = async () => {
    if (!isAuthenticated || !tenant_id) {
      toast.error('Usuário não autenticado');
      return;
    }

    try {
      setSaving(true);

      // Validar cores
      const cores = ['primaria', 'secundaria', 'texto', 'fundo'];
      for (const cor of cores) {
        if (formData.cores[cor] && !templatePDFService.validarCor(formData.cores[cor])) {
          toast.error(`Cor ${cor} inválida. Use formato hexadecimal (#RRGGBB)`);
          return;
        }
      }

      // Se há arquivo de folha timbrada para upload
      if (folhaTimbradaFile) {
        const uploadResponse = await templatePDFService.uploadFolhaTimbrada(folhaTimbradaFile);
        if (uploadResponse.sucesso) {
          handleInputChange(null, 'folhaTimbradaUrl', uploadResponse.url);
          handleInputChange(null, 'folhaTimbradaS3Key', uploadResponse.s3Key);
        }
      }

      let response;
      if (template && !usandoPadrao) {
        // Atualizar template existente
        response = await templatePDFService.atualizarTemplate(
          tenant_id,
          formData,
          logoFile
        );
      } else {
        // Criar novo template
        response = await templatePDFService.criarTemplate(
          formData,
          logoFile
        );
      }

      if (response.sucesso) {
        toast.success(response.mensagem || 'Template salvo com sucesso!');
        setTemplateCarregado(false); // Permitir recarregar
        await carregarTemplate();
        setLogoFile(null);
        setLogoPreview(null);
        setFolhaTimbradaFile(null);
        setFolhaTimbradaPreview(null);
      }
    } catch (error) {
      console.error('Erro ao salvar template:', error);
      const errorMessage = error.response?.data?.erro || 'Erro ao salvar template';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const resetarParaPadrao = async () => {
    if (!isAuthenticated || !tenant_id) {
      toast.error('Usuário não autenticado');
      return;
    }

    if (window.confirm('Tem certeza que deseja resetar para as configurações padrão?')) {
      try {
        if (template && !usandoPadrao) {
          await templatePDFService.deletarTemplate(tenant_id);
        }
        
        const configPadrao = templatePDFService.getConfigPadrao();
        setFormData(configPadrao);
        setLogoFile(null);
        setLogoPreview(null);
        toast.success('Configurações resetadas para o padrão');
        setTemplateCarregado(false); // Permitir recarregar
        await carregarTemplate();
      } catch (error) {
        console.error('Erro ao resetar template:', error);
        toast.error('Erro ao resetar configurações');
      }
    }
  };

  const validarTemplate = async () => {
    if (!isAuthenticated || !tenant_id) {
      toast.error('Usuário não autenticado');
      return;
    }

    try {
      const response = await templatePDFService.validarTemplate(tenant_id);
      
      if (response.valido) {
        toast.success('Template válido!');
      } else {
        toast.error('Template inválido. Verifique as configurações.');
      }
    } catch (error) {
      console.error('Erro ao validar template:', error);
      toast.error('Erro ao validar template');
    }
  };

  const handleLayoutChange = (updatedConfig) => {
    setFormData(updatedConfig);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-3xl font-bold flex items-center gap-3">
              <FaPalette className="text-2xl" />
              Designer de Templates PDF
            </h2>
            <p className="text-blue-100 mt-2">
              Crie um template personalizado para seus laudos de forma simples e visual
            </p>
          </div>
          
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const templateConfigComFolhaTimbrada = {
                    ...formData,
                    folhaTimbradaUrl: folhaTimbradaPreview || formData.folhaTimbradaUrl
                  };
                  onPreview && onPreview(templateConfigComFolhaTimbrada, logoPreview);
                }}
                className="px-6 py-3 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 flex items-center gap-2 transition-all"
              >
                <FaEye />
                Visualizar
              </button>
              
              {/* Botão de teste para folha timbrada */}
              <button
                onClick={() => {
                  
                  // Criar uma imagem data URL simples
                  const canvas = document.createElement('canvas');
                  canvas.width = 550;
                  canvas.height = 700;
                  const ctx = canvas.getContext('2d');
                  
                  // Fundo gradiente
                  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
                  gradient.addColorStop(0, '#f1f5f9');
                  gradient.addColorStop(0.5, '#e2e8f0');
                  gradient.addColorStop(1, '#cbd5e1');
                  
                  ctx.fillStyle = gradient;
                  ctx.fillRect(0, 0, canvas.width, canvas.height);
                  
                  // Texto de cabeçalho
                  ctx.fillStyle = '#1e293b';
                  ctx.font = 'bold 32px Arial';
                  ctx.textAlign = 'center';
                  ctx.fillText('CLÍNICA MÉDICA', canvas.width / 2, 60);
                  
                  ctx.font = 'bold 24px Arial';
                  ctx.fillStyle = '#3b82f6';
                  ctx.fillText('EXEMPLO LTDA', canvas.width / 2, 95);
                  
                  // Linha decorativa
                  ctx.strokeStyle = '#3b82f6';
                  ctx.lineWidth = 4;
                  ctx.beginPath();
                  ctx.moveTo(50, 120);
                  ctx.lineTo(canvas.width - 50, 120);
                  ctx.stroke();
                  
                  const folhaTimbradaDataUrl = canvas.toDataURL('image/png');
                  
                  const templateTeste = {
                    ...formData,
                    tipoTemplate: 'folha_timbrada',
                    folhaTimbradaUrl: folhaTimbradaDataUrl,
                    folhaTimbradaConfig: {
                      margemTopo: 40,
                      margemEsquerda: 30,
                      margemDireita: 30,
                      margemInferior: 40,
                      fundoTransparente: false,
                      cantoArredondado: true,
                      bordaVisivel: false,
                      sombraVisivel: true
                    }
                  };
                  onPreview && onPreview(templateTeste, logoPreview);
                }}
                className="px-4 py-3 bg-purple-600/80 backdrop-blur-sm text-white rounded-lg hover:bg-purple-700/80 flex items-center gap-2 transition-all text-sm"
              >
                <FaImage />
                Teste Folha
              </button>
              
              <button
                onClick={resetarParaPadrao}
                className="px-6 py-3 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 flex items-center gap-2 transition-all"
              >
                <FaUndo />
                Resetar
              </button>
            </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveMode('visual')}
            className={`px-6 py-3 rounded-lg flex items-center gap-2 transition-all ${
              activeMode === 'visual'
                ? 'bg-white text-blue-600 font-semibold'
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            <FaArrowsAlt />
            Editor Visual
          </button>
          
          <button
            onClick={() => setActiveMode('logo')}
            className={`px-6 py-3 rounded-lg flex items-center gap-2 transition-all ${
              activeMode === 'logo'
                ? 'bg-white text-blue-600 font-semibold'
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            <FaImage />
            Logo da Empresa
          </button>
          
          <button
            onClick={() => setActiveMode('config')}
            className={`px-6 py-3 rounded-lg flex items-center gap-2 transition-all ${
              activeMode === 'config'
                ? 'bg-white text-blue-600 font-semibold'
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            <FaCog />
            Configurações
          </button>
        </div>
      </div>

      {usandoPadrao && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-400 p-4 m-6">
          <div className="flex items-center gap-3">
            <FaInfoCircle className="text-blue-600 text-xl" />
            <div>
              <p className="text-blue-800 font-medium">
                Você está usando o template padrão
              </p>
              <p className="text-blue-700 text-sm">
                Personalize as configurações abaixo para criar seu template exclusivo
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo baseado na aba selecionada */}
      {activeMode === 'visual' ? (
        <div className="p-6">
          <VisualLayoutEditor
            templateConfig={{
              ...formData,
              folhaTimbradaUrl: folhaTimbradaPreview || formData.folhaTimbradaUrl
            }}
            onLayoutChange={handleLayoutChange}
            logoPreview={logoPreview}
            onPreview={(config, logo) => {
              const templateConfigComFolhaTimbrada = {
                ...config,
                folhaTimbradaUrl: folhaTimbradaPreview || config.folhaTimbradaUrl
              };
              onPreview && onPreview(templateConfigComFolhaTimbrada, logo);
            }}
          />
        </div>
      ) : (
        <div className="p-6 space-y-8">
          {/* Informações Básicas */}
          <div className="bg-gray-50 rounded-xl p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <FaInfoCircle className="text-blue-600" />
              Informações Básicas
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome do Template
              </label>
              <input
                type="text"
                value={formData.nomeModelo}
                onChange={(e) => handleInputChange(null, 'nomeModelo', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ex: Template Corporativo da Empresa"
                maxLength={100}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fonte Principal
              </label>
              <select
                value={formData.fonte}
                onChange={(e) => handleInputChange(null, 'fonte', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Helvetica">Helvetica (Moderna e Limpa)</option>
                <option value="Times-Roman">Times Roman (Clássica e Formal)</option>
                <option value="Courier">Courier (Monoespaçada)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tipo de Template */}
        <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <FaCog className="text-violet-600" />
            Tipo de Template
          </h3>
          
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => handleTipoTemplateChange('personalizado')}
                className={`p-6 rounded-xl border-2 transition-all hover:shadow-lg ${
                  formData.tipoTemplate === 'personalizado'
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-300 bg-white hover:border-gray-400'
                }`}
              >
                <div className="text-center space-y-3">
                  <FaPalette className={`text-3xl mx-auto ${
                    formData.tipoTemplate === 'personalizado' ? 'text-blue-600' : 'text-gray-400'
                  }`} />
                  <h4 className="font-bold text-lg">PDF Personalizado</h4>
                  <p className="text-sm text-gray-600">
                    Crie um template totalmente personalizável com cores, logos e layout customizados
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleTipoTemplateChange('folha_timbrada')}
                className={`p-6 rounded-xl border-2 transition-all hover:shadow-lg ${
                  formData.tipoTemplate === 'folha_timbrada'
                    ? 'border-purple-500 bg-purple-50 shadow-md'
                    : 'border-gray-300 bg-white hover:border-gray-400'
                }`}
              >
                <div className="text-center space-y-3">
                  <FaImage className={`text-3xl mx-auto ${
                    formData.tipoTemplate === 'folha_timbrada' ? 'text-purple-600' : 'text-gray-400'
                  }`} />
                  <h4 className="font-bold text-lg">Folha Timbrada</h4>
                  <p className="text-sm text-gray-600">
                    Use uma imagem ou PDF como fundo e posicione apenas o conteúdo sobre ele
                  </p>
                </div>
              </button>
            </div>

            {formData.tipoTemplate === 'folha_timbrada' && (
              <div className="bg-white rounded-lg p-6 border border-purple-200">
                <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <FaImage className="text-purple-600" />
                  Configurações da Folha Timbrada
                </h4>

                <div className="space-y-6">
                  {/* Upload da Folha Timbrada */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Arquivo da Folha Timbrada
                    </label>
                    
                    {!folhaTimbradaPreview && !formData.folhaTimbradaUrl ? (
                      <div className="relative">
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={handleFolhaTimbradaChange}
                          className="hidden"
                          id="folha-timbrada-upload"
                        />
                        <label
                          htmlFor="folha-timbrada-upload"
                          className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-purple-300 rounded-lg cursor-pointer bg-purple-50 hover:bg-purple-100 transition-colors"
                        >
                          <FaUpload className="text-2xl text-purple-400 mb-2" />
                          <span className="text-sm text-purple-600 font-medium">
                            Clique para escolher a folha timbrada
                          </span>
                          <span className="text-xs text-gray-500 mt-1">
                            Formatos aceitos: JPG, PNG, GIF, WebP, PDF (máx. 10MB)
                          </span>
                        </label>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="relative bg-gray-100 rounded-lg p-4">
                          {folhaTimbradaPreview ? (
                            <div className="flex items-center gap-4">
                              <div className="w-16 h-16 bg-white rounded border border-gray-300 flex items-center justify-center overflow-hidden">
                                {folhaTimbradaFile?.type.startsWith('image/') ? (
                                  <img
                                    src={folhaTimbradaPreview}
                                    alt="Preview"
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <FaImage className="text-2xl text-gray-400" />
                                )}
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-gray-800">
                                  {folhaTimbradaFile?.name}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {(folhaTimbradaFile?.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={removerFolhaTimbrada}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Remover arquivo"
                              >
                                <FaTrash />
                              </button>
                            </div>
                          ) : formData.folhaTimbradaUrl && (
                            <div className="flex items-center gap-4">
                              <div className="w-16 h-16 bg-white rounded border border-gray-300 flex items-center justify-center">
                                <FaImage className="text-2xl text-gray-400" />
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-gray-800">
                                  Folha timbrada atual
                                </p>
                                <p className="text-sm text-gray-600">
                                  Arquivo já carregado no servidor
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={removerFolhaTimbrada}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Remover arquivo"
                              >
                                <FaTrash />
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="text-center">
                          <label
                            htmlFor="folha-timbrada-upload"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 cursor-pointer transition-colors"
                          >
                            <FaUpload />
                            Alterar Arquivo
                          </label>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Configurações de Margens */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h5 className="font-medium text-gray-700">Margens do Conteúdo</h5>
                      
                      <SliderControl
                        label="⬆️ Superior"
                        value={formData.folhaTimbradaConfig?.margemSuperior || 20}
                        onChange={(value) => handleInputChange('folhaTimbradaConfig', 'margemSuperior', value)}
                        min={0}
                        max={100}
                        unit="mm"
                        description="Espaço do topo da folha até o conteúdo"
                      />
                      
                      <SliderControl
                        label="⬇️ Inferior"
                        value={formData.folhaTimbradaConfig?.margemInferior || 20}
                        onChange={(value) => handleInputChange('folhaTimbradaConfig', 'margemInferior', value)}
                        min={0}
                        max={100}
                        unit="mm"
                        description="Espaço do conteúdo até o final da folha"
                      />
                    </div>
                    
                    <div className="space-y-4">
                      <h5 className="font-medium text-gray-700">Margens Laterais</h5>
                      
                      <SliderControl
                        label="⬅️ Esquerda"
                        value={formData.folhaTimbradaConfig?.margemEsquerda || 20}
                        onChange={(value) => handleInputChange('folhaTimbradaConfig', 'margemEsquerda', value)}
                        min={0}
                        max={60}
                        unit="mm"
                        description="Espaço da borda esquerda"
                      />
                      
                      <SliderControl
                        label="➡️ Direita"
                        value={formData.folhaTimbradaConfig?.margemDireita || 20}
                        onChange={(value) => handleInputChange('folhaTimbradaConfig', 'margemDireita', value)}
                        min={0}
                        max={60}
                        unit="mm"
                        description="Espaço da borda direita"
                      />
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <FaInfoCircle className="text-blue-600 mt-0.5" />
                      <div className="text-sm text-blue-800">
                        <p className="font-medium mb-1">Dica sobre Folha Timbrada:</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>O arquivo será usado como fundo do documento</li>
                          <li>Apenas o conteúdo principal será posicionado sobre a imagem</li>
                          <li>Cabeçalho, rodapé e logo ficam desabilitados neste modo</li>
                          <li>Ajuste as margens para posicionar o conteúdo corretamente</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Seções condicionais baseadas no tipo de template */}
        {formData.tipoTemplate === 'personalizado' && (
          <>

        {/* Cores */}
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <FaPalette className="text-purple-600" />
            Paleta de Cores
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <ColorPicker
                label="🎨 Cor Principal"
                value={formData.cores.primaria}
                onChange={(color) => handleInputChange('cores', 'primaria', color)}
                description="Usada em elementos destacados e bordas"
              />
              
              <ColorPicker
                label="📌 Cor do Título"
                value={formData.cores.corTitulo}
                onChange={(color) => handleInputChange('cores', 'corTitulo', color)}
                description="Cor específica para o título principal do laudo"
              />
              
              <ColorPicker
                label="🎭 Cor Secundária"
                value={formData.cores.secundaria}
                onChange={(color) => handleInputChange('cores', 'secundaria', color)}
                description="Usada em subtítulos e elementos de apoio"
              />
            </div>
            
            <div className="space-y-6">
              <ColorPicker
                label="📝 Cor do Texto"
                value={formData.cores.texto}
                onChange={(color) => handleInputChange('cores', 'texto', color)}
                description="Cor principal do texto do laudo"
              />
              
              <ColorPicker
                label="🎯 Cor de Fundo"
                value={formData.cores.fundo}
                onChange={(color) => handleInputChange('cores', 'fundo', color)}
                description="Cor de fundo do documento"
              />
            </div>
          </div>
        </div>

        {/* Logo */}
        <div className="bg-gradient-to-br from-green-50 to-teal-50 rounded-xl p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <FaImage className="text-green-600" />
            Logo da Empresa
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Escolher Logo
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                    id="logo-upload"
                  />
                  <label
                    htmlFor="logo-upload"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <FaUpload className="text-2xl text-gray-400 mb-2" />
                    <span className="text-sm text-gray-600">
                      Clique para escolher uma imagem
                    </span>
                    <span className="text-xs text-gray-500 mt-1">
                      JPEG, PNG, GIF, WebP, SVG (máx. 5MB)
                    </span>
                  </label>
                </div>
              </div>
              
              <ToggleSwitch
                label="Mostrar Logo no Documento"
                checked={formData.layout.mostrarLogo}
                onChange={(checked) => handleInputChange('layout', 'mostrarLogo', checked)}
                description="Exibir o logo no cabeçalho do laudo"
              />
            </div>
            
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-4 border-2 border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Preview do Logo</h4>
                {logoPreview || (template && template.logoUrl) ? (
                  <div className="flex flex-col items-center space-y-2">
                    <img
                      src={logoPreview || template.logoUrl}
                      alt="Logo preview"
                      className="max-w-full max-h-32 object-contain rounded-lg shadow-sm"
                    />
                    <span className="text-xs text-gray-600">
                      {logoPreview ? 'Novo logo (não salvo)' : 'Logo atual'}
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                    <FaImage className="text-3xl mb-2" />
                    <span className="text-sm">Nenhum logo selecionado</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tamanhos e Layout */}
        <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-xl p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <FaExpandArrowsAlt className="text-orange-600" />
            Tamanhos e Espaçamento
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Tamanhos de Fonte */}
            <div className="space-y-6">
              <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                <FaFont className="text-orange-600" />
                Tamanhos de Fonte
              </h4>
              
              <SliderControl
                label="📰 Título Principal"
                value={formData.tamanhoFonte.titulo}
                onChange={(value) => handleInputChange('tamanhoFonte', 'titulo', value)}
                min={12}
                max={24}
                unit="pt"
                description="Tamanho da fonte dos títulos principais"
              />
              
              <SliderControl
                label="📝 Subtítulos"
                value={formData.tamanhoFonte.subtitulo}
                onChange={(value) => handleInputChange('tamanhoFonte', 'subtitulo', value)}
                min={10}
                max={20}
                unit="pt"
                description="Tamanho da fonte dos subtítulos"
              />
              
              <SliderControl
                label="📄 Texto Normal"
                value={formData.tamanhoFonte.base}
                onChange={(value) => handleInputChange('tamanhoFonte', 'base', value)}
                min={8}
                max={16}
                unit="pt"
                description="Tamanho da fonte do texto do laudo"
              />
            </div>
            
            {/* Margens */}
            <div className="space-y-6">
              <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                <FaExpandArrowsAlt className="text-orange-600" />
                Margens do Documento
              </h4>
              
              <SliderControl
                label="⬆️ Margem Superior"
                value={formData.margens.top}
                onChange={(value) => handleInputChange('margens', 'top', value)}
                min={10}
                max={80}
                unit="pt"
                description="Espaço no topo da página"
              />
              
              <SliderControl
                label="⬇️ Margem Inferior"
                value={formData.margens.bottom}
                onChange={(value) => handleInputChange('margens', 'bottom', value)}
                min={10}
                max={80}
                unit="pt"
                description="Espaço na parte inferior da página"
              />
              
              <div className="grid grid-cols-2 gap-4">
                <SliderControl
                  label="⬅️ Esquerda"
                  value={formData.margens.left}
                  onChange={(value) => handleInputChange('margens', 'left', value)}
                  min={10}
                  max={80}
                  unit="pt"
                />
                
                <SliderControl
                  label="➡️ Direita"
                  value={formData.margens.right}
                  onChange={(value) => handleInputChange('margens', 'right', value)}
                  min={10}
                  max={80}
                  unit="pt"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Configurações de Layout */}
        <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <FaAlignCenter className="text-teal-600" />
            Configurações de Layout
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-700">Elementos do Documento</h4>
              
              <ToggleSwitch
                label="📋 Mostrar Cabeçalho"
                checked={formData.layout.mostrarCabecalho}
                onChange={(checked) => handleInputChange('layout', 'mostrarCabecalho', checked)}
                description="Exibir área do cabeçalho no documento"
              />
              
              <ToggleSwitch
                label="🏢 Mostrar Logo"
                checked={formData.layout.mostrarLogo}
                onChange={(checked) => handleInputChange('layout', 'mostrarLogo', checked)}
                description="Exibir logo da empresa no cabeçalho"
              />
              
              <ToggleSwitch
                label="🏷️ Mostrar Título"
                checked={formData.layout.mostrarTitulo}
                onChange={(checked) => handleInputChange('layout', 'mostrarTitulo', checked)}
                description="Exibir título do documento"
              />
              
              <ToggleSwitch
                label="👤 Dados do Paciente"
                checked={formData.layout.mostrarDadosPaciente}
                onChange={(checked) => handleInputChange('layout', 'mostrarDadosPaciente', checked)}
                description="Exibir seção com dados do paciente"
              />
              
              <ToggleSwitch
                label="🔬 Dados do Exame"
                checked={formData.layout.mostrarDadosExame}
                onChange={(checked) => handleInputChange('layout', 'mostrarDadosExame', checked)}
                description="Exibir informações do exame realizado"
              />
              
              <ToggleSwitch
                label="📅 Data de Assinatura"
                checked={formData.layout.mostrarDataAssinatura}
                onChange={(checked) => handleInputChange('layout', 'mostrarDataAssinatura', checked)}
                description="Mostrar data e hora da assinatura"
              />
            </div>
            
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-700">Elementos Adicionais</h4>
              
              <ToggleSwitch
                label="📱 QR Code"
                checked={formData.layout.mostrarQrCode}
                onChange={(checked) => handleInputChange('layout', 'mostrarQrCode', checked)}
                description="Incluir QR Code para verificação"
              />
              
              <ToggleSwitch
                label="📄 Rodapé"
                checked={formData.layout.mostrarRodape}
                onChange={(checked) => handleInputChange('layout', 'mostrarRodape', checked)}
                description="Exibir rodapé personalizado"
              />
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  ↔️ Alinhamento do Título
                </label>
                <AlignmentSelector
                  value={formData.layout.alinhamentoTitulo}
                  onChange={(value) => handleInputChange('layout', 'alinhamentoTitulo', value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé Personalizado */}
        {formData.layout.mostrarRodape && (
          <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-xl p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <FaFont className="text-rose-600" />
              Texto do Rodapé
            </h3>
            
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">
                Personalize o texto que aparecerá no rodapé de todos os laudos
              </label>
              
              <textarea
                value={formData.rodapeTexto}
                onChange={(e) => handleInputChange(null, 'rodapeTexto', e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent resize-none"
                placeholder="Ex: Este laudo foi emitido eletronicamente e tem validade legal.&#10;Para verificar a autenticidade, acesse nosso site com o código QR."
                maxLength={500}
              />
              
              <div className="flex justify-between items-center text-sm text-gray-600">
                <span>💡 Dica: Use quebras de linha para organizar melhor o texto</span>
                <span>{formData.rodapeTexto.length}/500 caracteres</span>
              </div>
            </div>
          </div>
        )}

          </>
        )}

        {/* Botões de Ação */}
        <div className="flex flex-col sm:flex-row justify-end gap-4 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => onPreview && onPreview(formData, logoPreview)}
            className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 flex items-center justify-center gap-2 transition-all transform hover:scale-105"
          >
            <FaEye />
            Visualizar Template
          </button>
          
          <button
            type="button"
            onClick={validarTemplate}
            className="px-8 py-3 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg hover:from-green-700 hover:to-teal-700 flex items-center justify-center gap-2 transition-all transform hover:scale-105"
          >
            <FaCheck />
            Validar Configurações
          </button>
          
          <button
            type="button"
            onClick={salvarTemplate}
            disabled={saving}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 flex items-center justify-center gap-2 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Salvando...
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
      )}
    </div>
  );
};

export default TemplatePDFManager;
