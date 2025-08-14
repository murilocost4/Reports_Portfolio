import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import AdvancedTemplateCustomizer from '../../components/TemplatePDF/AdvancedTemplateCustomizer';
import TemplateGallery from '../../components/TemplatePDF/TemplateGallery';
import FolhaTimbradaCustomizer from '../../components/TemplatePDF/FolhaTimbradaCustomizer';
import LogoUploader from '../../components/TemplatePDF/LogoUploader';
import AdminTemplateList from '../../components/TemplatePDF/AdminTemplateList';
import TemplatePDFPreview from '../../components/TemplatePDF/TemplatePDFPreview';
import templatePDFService from '../../services/templatePDFService';
import { FaPalette, FaList, FaEye, FaImage, FaCog, FaBuilding } from 'react-icons/fa';

const TemplatePDFPage = () => {
  const { usuario, temRole, temAlgumaRole, isAdminMaster } = useAuth();
  const [activeTab, setActiveTab] = useState('gallery');
  const [showPreview, setShowPreview] = useState(false);
  const [previewConfig, setPreviewConfig] = useState(null);
  const [previewLogo, setPreviewLogo] = useState(null);
  const [currentTemplate, setCurrentTemplate] = useState(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = isAdminMaster || temAlgumaRole(['admin', 'adminMaster']);

  useEffect(() => {
    loadCurrentTemplate();
  }, [usuario]);

  const loadCurrentTemplate = async () => {
    try {
      setLoading(true);
      const response = await templatePDFService.buscarTemplateTenant();
      setCurrentTemplate(response.template);
    } catch (error) {
      console.error('Erro ao carregar template atual:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    {
      id: 'gallery',
      label: 'Galeria de Templates',
      icon: FaPalette,
      component: TemplateGallery,
      description: 'Escolha um template profissional pronto'
    },
    {
      id: 'logo',
      label: 'Logo da Empresa',
      icon: FaBuilding,
      component: LogoUploader,
      description: 'Adicione o logo da sua empresa nos PDFs'
    },
    {
      id: 'folha_timbrada',
      label: 'Folha Timbrada',
      icon: FaImage,
      component: FolhaTimbradaCustomizer,
      description: 'Personalize com sua folha timbrada'
    },
    {
      id: 'custom',
      label: 'Personalização Avançada',
      icon: FaCog,
      component: AdvancedTemplateCustomizer,
      description: 'Configuração detalhada manual'
    }
  ];

  if (isAdmin) {
    tabs.push({
      id: 'admin',
      label: 'Todos os Templates',
      icon: FaList,
      component: AdminTemplateList,
      description: 'Gerenciar templates de todas as empresas'
    });
  }

  const handlePreview = (config, logoPreview = null) => {
    setPreviewConfig(config);
    setPreviewLogo(logoPreview);
    setShowPreview(true);
  };

  const handleTemplateUpdated = () => {
    loadCurrentTemplate();
  };

  const handleTemplateSelected = async (templateId) => {
    try {
      await loadCurrentTemplate();
    } catch (error) {
      console.error('Erro ao recarregar template após seleção:', error);
    }
  };

  const handleSwitchToCustomizer = (customizerType) => {
    setActiveTab(customizerType);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Personalização de Templates PDF
              </h1>
              <p className="text-gray-600 mt-2">
                Customize a aparência dos seus laudos médicos com templates profissionais ou personalizações avançadas.
              </p>
            </div>
            
            {/* Current Template Info */}
            {currentTemplate && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 lg:max-w-xs">
                <h3 className="font-semibold text-blue-900 mb-1">Template Atual:</h3>
                <p className="text-blue-700 text-sm">
                  {currentTemplate.nomeModelo || 'Template Personalizado'}
                </p>
                <p className="text-blue-600 text-xs mt-1">
                  Tipo: {
                    currentTemplate.tipoTemplate === 'galeria' ? 'Galeria' :
                    currentTemplate.tipoTemplate === 'folha_timbrada' ? 'Folha Timbrada' :
                    'Personalizado'
                  }
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6 overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
          
          {/* Tab Description */}
          <div className="px-6 py-3 bg-gray-50">
            <p className="text-sm text-gray-600">
              {tabs.find(tab => tab.id === activeTab)?.description}
            </p>
          </div>
        </div>

        {/* Content */}
        <div>
          {tabs.map((tab) => {
            const Component = tab.component;
            let componentProps = { onPreview: handlePreview };
            
            // Add specific props for each component
            if (tab.id === 'gallery') {
              componentProps = {
                ...componentProps,
                onTemplateSelected: handleTemplateSelected,
                currentTemplateId: currentTemplate?.templateGaleriaId,
                onOpenCustomizer: handleSwitchToCustomizer
              };
            } else if (tab.id === 'logo') {
              componentProps = {
                onLogoUpdated: handleTemplateUpdated
              };
            } else if (tab.id === 'folha_timbrada') {
              componentProps = {
                ...componentProps,
                currentTemplate,
                onTemplateUpdated: handleTemplateUpdated,
                onOpenGallery: () => handleSwitchToCustomizer('gallery')
              };
            } else if (tab.id === 'custom') {
              componentProps = {
                ...componentProps,
                currentTemplate,
                onTemplateUpdated: handleTemplateUpdated
              };
            }
            
            return (
              <div
                key={tab.id}
                className={activeTab === tab.id ? 'block' : 'hidden'}
              >
                <Component {...componentProps} />
              </div>
            );
          })}
        </div>

        {/* Preview Modal */}
        {showPreview && previewConfig && (
          <TemplatePDFPreview
            templateConfig={previewConfig}
            logoPreview={previewLogo}
            onClose={() => {
              setShowPreview(false);
              setPreviewLogo(null);
            }}
          />
        )}

        {/* Help Section */}
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">
            💡 Guia de Personalização de Templates
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-sm text-blue-800">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <FaPalette className="text-blue-500" />
                Galeria de Templates
              </h4>
              <p>Escolha entre templates profissionais pré-definidos. Rápido e fácil - basta clicar em "Aplicar".</p>
            </div>
            
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <FaBuilding className="text-orange-500" />
                Logo da Empresa
              </h4>
              <p>Faça upload do logo da sua empresa para aparecer automaticamente no header dos PDFs.</p>
            </div>
            
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <FaImage className="text-green-500" />
                Folha Timbrada
              </h4>
              <p>Upload da sua folha timbrada oficial e posicione os elementos com drag-and-drop.</p>
            </div>
            
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <FaCog className="text-purple-500" />
                Personalização Avançada
              </h4>
              <p>Configure manualmente cores, fontes, margens e todos os detalhes do template.</p>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-blue-100 rounded-lg">
            <p className="text-blue-900">
              <strong>🎯 Recomendação:</strong> Para a maioria dos usuários, recomendamos começar com a 
              <strong> Galeria de Templates</strong> e adicionar o <strong>Logo da Empresa</strong>. Use 
              <strong> Folha Timbrada</strong> se você já tem um papel timbrado oficial, ou 
              <strong> Personalização Avançada</strong> para controle total.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplatePDFPage;
