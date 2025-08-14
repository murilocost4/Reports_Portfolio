import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { templateGaleriaService } from '../../services/templateGaleriaService';
import { defaultTemplates } from '../../data/defaultTemplates';
import { toast } from 'react-hot-toast';
import { FaCheck, FaEye, FaPalette, FaSpinner, FaTimes, FaDownload, FaCog, FaImage, FaArrowRight, FaFilter } from 'react-icons/fa';
import Modal from '../Common/Modal';

const TemplateGallery = ({ onTemplateSelected, currentTemplateId, onOpenCustomizer }) => {
  const authData = useAuth();
  
  // Acessar corretamente o usuário e roles
  const usuario = authData.usuario;
  const todasRoles = authData.todasRoles || [];
  const roles = authData.roles || [];
  
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showColorCustomizer, setShowColorCustomizer] = useState(false);
  const [customColors, setCustomColors] = useState({});
  const [selectedCategory, setSelectedCategory] = useState('todos');

  // Verificar se é admin usando as diferentes fontes de roles
  const isAdmin = todasRoles.includes('admin') || todasRoles.includes('adminMaster') || 
                  roles.includes('admin') || roles.includes('adminMaster') ||
                  usuario?.role === 'admin' || usuario?.role === 'adminMaster';

  const categories = [
    { id: 'todos', label: 'Todos os Templates', icon: '🎨' },
    { id: 'profissional', label: 'Profissional', icon: '💼' },
    { id: 'moderno', label: 'Moderno', icon: '✨' },
    { id: 'corporativo', label: 'Corporativo', icon: '🏢' },
    { id: 'especialidade', label: 'Especialidade', icon: '⚕️' },
    { id: 'minimalista', label: 'Minimalista', icon: '🎯' }
  ];

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      try {
        // Tentar carregar templates da API primeiro
        const data = await templateGaleriaService.listarTemplates();
        setTemplates(data.templates || []);
      } catch (apiError) {
        // Se a API falhar, usar templates padrão
        console.warn('API indisponível, usando templates padrão:', apiError);
        setTemplates(defaultTemplates);
        toast('Usando templates padrão - API temporariamente indisponível', {
          icon: '⚠️',
          duration: 3000
        });
      }
    } catch (error) {
      console.error('Erro ao carregar templates:', error);
      // Como fallback final, usar templates padrão
      setTemplates(defaultTemplates);
      toast.error('Erro ao carregar galeria, usando templates padrão');
    } finally {
      setLoading(false);
    }
  };

  const applyTemplate = async (templateId, customColorsData = null) => {
    if (!isAdmin) {
      toast.error('Apenas administradores podem aplicar templates');
      return;
    }

    try {
      setApplying(templateId);
      await templateGaleriaService.aplicarTemplate(templateId, customColorsData);
      toast.success('Template aplicado com sucesso!');
      
      // Aguardar um pouco para garantir que o backend salvou
      setTimeout(() => {
        onTemplateSelected?.(templateId);
      }, 500);
      
    } catch (error) {
      console.error('Erro ao aplicar template:', error);
      toast.error(`Erro ao aplicar template: ${error.response?.data?.erro || error.message}`);
    } finally {
      setApplying(null);
      setShowColorCustomizer(false);
    }
  };

  const openPreview = (template) => {
    setSelectedTemplate(template);
    setShowPreviewModal(true);
  };

  const openColorCustomizer = (template) => {
    setSelectedTemplate(template);
    setCustomColors(template.cores || {});
    setShowColorCustomizer(true);
  };

  const handleColorChange = (colorKey, newColor) => {
    setCustomColors(prev => ({
      ...prev,
      [colorKey]: newColor
    }));
  };

  const generatePreview = (template, isCustom = false) => {
    const colors = isCustom ? customColors : template.cores;
    
    return (
      <div className="w-full h-full bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        {/* Header simulado */}
        <div 
          className="h-16 flex items-center justify-between px-4"
          style={{ 
            backgroundColor: colors?.primaria || '#2563eb',
            background: template.estilosSecao?.header?.gradiente 
              ? `linear-gradient(135deg, ${colors?.primaria || '#2563eb'}, ${template.estilosSecao?.header?.corGradiente2 || colors?.secundaria || '#64748b'})`
              : colors?.primaria || '#2563eb'
          }}
        >
          <div className="w-12 h-8 bg-white/20 rounded"></div>
          <div className="text-white font-semibold text-sm">LAUDO MÉDICO</div>
          <div className="w-8 h-8 bg-white/20 rounded"></div>
        </div>
        
        {/* Content simulado */}
        <div className="p-4 space-y-3">
          <div className="h-3 bg-gray-200 rounded w-3/4"></div>
          <div className="h-2 bg-gray-100 rounded w-full"></div>
          <div className="h-2 bg-gray-100 rounded w-5/6"></div>
          
          {/* Patient info simulado */}
          <div 
            className="p-3 rounded"
            style={{ 
              backgroundColor: template.estilosSecao?.patientInfo?.corFundo || '#f8fafc',
              border: `1px solid ${template.estilosSecao?.patientInfo?.corBorda || '#e2e8f0'}`
            }}
          >
            <div className="h-2 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-2 bg-gray-100 rounded w-2/3"></div>
          </div>
          
          {/* Content area simulado */}
          <div className="space-y-2">
            <div className="h-2 bg-gray-100 rounded w-full"></div>
            <div className="h-2 bg-gray-100 rounded w-4/5"></div>
            <div className="h-2 bg-gray-100 rounded w-3/4"></div>
          </div>
        </div>
        
        {/* Footer simulado */}
        <div 
          className="h-12 flex items-center justify-center border-t"
          style={{ 
            backgroundColor: template.estilosSecao?.footer?.corFundo || '#f1f5f9',
            borderColor: template.estilosSecao?.footer?.corBorda || '#cbd5e1'
          }}
        >
          <div className="h-2 bg-gray-300 rounded w-1/3"></div>
        </div>
      </div>
    );
  };

  const filteredTemplates = selectedCategory === 'todos' 
    ? templates 
    : templates.filter(template => template.categoria === selectedCategory);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <FaSpinner className="animate-spin text-2xl text-blue-500" />
        <span className="ml-2 text-gray-600">Carregando galeria...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-blue-500 p-3 rounded-xl">
              <FaPalette className="text-2xl text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Galeria de Templates Profissionais
              </h2>
              <p className="text-gray-600">
                Escolha um template pronto e personalize as cores conforme sua marca
              </p>
            </div>
          </div>
          
          <button
            onClick={() => onOpenCustomizer?.('folha_timbrada')}
            className="flex items-center gap-2 px-6 py-3 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <FaImage />
            <span>Usar Folha Timbrada</span>
            <FaArrowRight className="text-sm" />
          </button>
        </div>
      </div>

      {/* Category Filter */}
      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
        <div className="flex items-center gap-3 mb-3">
          <FaFilter className="text-blue-500" />
          <h3 className="font-semibold text-gray-900">Filtrar por Categoria</h3>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                selectedCategory === category.id
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span>{category.icon}</span>
              <span>{category.label}</span>
              <span className="text-xs opacity-75">
                ({category.id === 'todos' ? templates.length : templates.filter(t => t.categoria === category.id).length})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => {
          const isCurrentTemplate = currentTemplateId === template.id;
          
          return (
          <div
            key={template.id}
            className={`group bg-white rounded-xl shadow-lg border-2 transition-all duration-200 hover:shadow-xl transform hover:-translate-y-1 ${
              isCurrentTemplate
                ? 'border-green-500 ring-4 ring-green-100'
                : 'border-gray-200 hover:border-blue-300'
            }`}
          >
            {/* Preview Mockup */}
            <div className="relative h-64 p-4 bg-gray-50 rounded-t-xl">
              <div className="h-full transform scale-75 origin-top-left">
                {generatePreview(template)}
              </div>
              
              {/* Status Badge */}
              {isCurrentTemplate && (
                <div className="absolute top-3 right-3 bg-green-500 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2 shadow-lg">
                  <FaCheck className="text-xs" />
                  Template Ativo
                </div>
              )}

              {/* Quick Actions Overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-t-xl flex items-center justify-center gap-2">
                <button
                  onClick={() => openPreview(template)}
                  className="p-2 bg-white text-gray-800 rounded-lg hover:bg-gray-100 transition-colors"
                  title="Visualizar Preview"
                >
                  <FaEye />
                </button>
                <button
                  onClick={() => openColorCustomizer(template)}
                  className="p-2 bg-white text-gray-800 rounded-lg hover:bg-gray-100 transition-colors"
                  title="Personalizar Cores"
                >
                  <FaCog />
                </button>
              </div>
            </div>

            {/* Template Info */}
            <div className="p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-900 text-lg">
                  {template.nome}
                </h3>
                <div className="flex items-center gap-1">
                  {template.cores && Object.entries(template.cores).slice(0, 3).map(([key, cor]) => (
                    <div
                      key={key}
                      className="w-5 h-5 rounded-full border-2 border-white shadow-sm"
                      style={{ backgroundColor: cor }}
                      title={`${key}: ${cor}`}
                    />
                  ))}
                </div>
              </div>
              
              <p className="text-sm text-gray-600 mb-4 line-clamp-2 leading-relaxed">
                {template.descricao}
              </p>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => openPreview(template)}
                  className="flex-1 px-4 py-2 text-sm border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <FaEye />
                  Preview
                </button>
                
                <button
                  onClick={() => openColorCustomizer(template)}
                  className="px-4 py-2 text-sm border-2 border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 hover:border-blue-400 transition-all duration-200"
                  title="Personalizar cores"
                >
                  <FaCog />
                </button>
                
                <button
                  onClick={() => applyTemplate(template.id)}
                  disabled={applying === template.id || isCurrentTemplate || !isAdmin}
                  className={`flex-1 px-4 py-2 text-sm rounded-lg transition-all duration-200 flex items-center justify-center gap-2 font-medium ${
                    isCurrentTemplate
                      ? 'bg-green-100 text-green-700 cursor-not-allowed border-2 border-green-300'
                      : applying === template.id
                      ? 'bg-blue-100 text-blue-700 cursor-not-allowed border-2 border-blue-300'
                      : !isAdmin
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed border-2 border-gray-300'
                      : 'bg-blue-500 text-white hover:bg-blue-600 border-2 border-blue-500 hover:border-blue-600 shadow-md hover:shadow-lg'
                  }`}
                  title={!isAdmin ? 'Apenas administradores podem aplicar templates' : ''}
                >
                  {applying === template.id ? (
                    <>
                      <FaSpinner className="animate-spin" />
                      Aplicando...
                    </>
                  ) : isCurrentTemplate ? (
                    <>
                      <FaCheck />
                      Aplicado
                    </>
                  ) : (
                    <>
                      <FaDownload />
                      Aplicar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredTemplates.length === 0 && !loading && (
        <div className="text-center py-16">
          <div className="bg-gray-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
            <FaPalette className="text-4xl text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {selectedCategory === 'todos' ? 'Nenhum template encontrado' : `Nenhum template na categoria "${categories.find(c => c.id === selectedCategory)?.label}"`}
          </h3>
          <p className="text-gray-600 max-w-sm mx-auto mb-4">
            {selectedCategory === 'todos' 
              ? 'A galeria de templates não está disponível no momento.' 
              : 'Tente selecionar uma categoria diferente.'
            }
          </p>
          {selectedCategory !== 'todos' && (
            <button
              onClick={() => setSelectedCategory('todos')}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Ver Todos os Templates
            </button>
          )}
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && selectedTemplate && (
        <Modal
          isOpen={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          title={`Preview: ${selectedTemplate.nome}`}
          size="xl"
        >
          <div className="space-y-6">
            <div className="bg-gradient-to-b from-gray-50 to-gray-100 rounded-xl p-8">
              <div className="max-w-md mx-auto bg-white shadow-2xl rounded-xl overflow-hidden">
                {generatePreview(selectedTemplate)}
              </div>
            </div>
            
            <div className="text-center space-y-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-blue-800 leading-relaxed">
                  {selectedTemplate.descricao}
                </p>
              </div>
              
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => {
                    setShowPreviewModal(false);
                    openColorCustomizer(selectedTemplate);
                  }}
                  className="px-6 py-3 border-2 border-blue-500 text-blue-600 rounded-lg hover:bg-blue-50 font-medium transition-colors"
                >
                  Personalizar Cores
                </button>
                
                <button
                  onClick={() => {
                    applyTemplate(selectedTemplate.id);
                    setShowPreviewModal(false);
                  }}
                  disabled={currentTemplateId === selectedTemplate.id || !isAdmin}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                    currentTemplateId === selectedTemplate.id
                      ? 'bg-green-500 text-white cursor-not-allowed'
                      : !isAdmin
                      ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                  title={!isAdmin ? 'Apenas administradores podem aplicar templates' : ''}
                >
                  {currentTemplateId === selectedTemplate.id ? 'Template Atual' : !isAdmin ? 'Apenas Admin' : 'Aplicar Template'}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Color Customizer Modal */}
      {showColorCustomizer && selectedTemplate && (
        <Modal
          isOpen={showColorCustomizer}
          onClose={() => setShowColorCustomizer(false)}
          title={`Personalizar Cores: ${selectedTemplate.nome}`}
          size="2xl"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Color Controls */}
            <div className="space-y-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">🎨 Personalize as Cores</h3>
                <p className="text-blue-700 text-sm">
                  Ajuste as cores para combinar com a identidade visual da sua clínica
                </p>
              </div>
              
              <div className="space-y-4">
                {Object.entries(customColors).map(([key, color]) => (
                  <div key={key} className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-semibold text-gray-700 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </label>
                      <div
                        className="w-8 h-8 rounded-lg border-2 border-gray-300 shadow-sm"
                        style={{ backgroundColor: color }}
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={color}
                        onChange={(e) => handleColorChange(key, e.target.value)}
                        className="w-12 h-10 rounded-lg border border-gray-300 cursor-pointer shadow-sm"
                      />
                      <input
                        type="text"
                        value={color}
                        onChange={(e) => handleColorChange(key, e.target.value)}
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="#000000"
                      />
                    </div>
                  </div>
                ))}
              </div>
              
              <button
                onClick={() => setCustomColors(selectedTemplate.cores)}
                className="w-full text-sm text-blue-600 hover:text-blue-700 py-2 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
              >
                🔄 Restaurar cores originais
              </button>
            </div>
            
            {/* Preview */}
            <div className="space-y-6">
              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 mb-2">👁️ Preview Personalizado</h3>
                <p className="text-green-700 text-sm">
                  Veja como ficará o template com suas cores personalizadas
                </p>
              </div>
              
              <div className="bg-gradient-to-b from-gray-50 to-gray-100 rounded-xl p-6">
                <div className="max-w-sm mx-auto bg-white shadow-xl rounded-xl overflow-hidden">
                  {generatePreview(selectedTemplate, true)}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={() => setShowColorCustomizer(false)}
              className="px-6 py-2 text-gray-700 border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => applyTemplate(selectedTemplate.id, customColors)}
              disabled={applying === selectedTemplate.id || !isAdmin}
              className={`px-8 py-2 rounded-lg flex items-center gap-2 font-medium shadow-lg transition-colors ${
                !isAdmin
                  ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50'
              }`}
              title={!isAdmin ? 'Apenas administradores podem aplicar templates' : ''}
            >
              {applying === selectedTemplate.id ? (
                <>
                  <FaSpinner className="animate-spin" />
                  Aplicando...
                </>
              ) : !isAdmin ? (
                <>
                  <FaTimes />
                  Apenas Admin
                </>
              ) : (
                <>
                  <FaCheck />
                  Aplicar Template Personalizado
                </>
              )}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};
export default TemplateGallery;
