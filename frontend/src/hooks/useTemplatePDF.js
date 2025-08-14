import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import templatePDFService from '../services/templatePDFService';
import { useAuth } from '../contexts/AuthContext';

/**
 * Hook personalizado para gerenciar templates PDF
 */
export const useTemplatePDF = () => {
  const { user } = useAuth();
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [usandoPadrao, setUsandoPadrao] = useState(false);

  // Carregar template do tenant atual
  const carregarTemplate = async () => {
    if (!user?.tenant_id) return;

    try {
      setLoading(true);
      const response = await templatePDFService.buscarTemplate(user.tenant_id);
      
      if (response.template) {
        setTemplate(response.template);
        setUsandoPadrao(response.template.usandoPadrao || false);
      }
    } catch (error) {
      console.error('Erro ao carregar template:', error);
      toast.error('Erro ao carregar configurações do template');
    } finally {
      setLoading(false);
    }
  };

  // Criar novo template
  const criarTemplate = async (templateData, logoFile = null) => {
    try {
      setLoading(true);
      const response = await templatePDFService.criarTemplate(templateData, logoFile);
      
      if (response.sucesso) {
        toast.success(response.mensagem || 'Template criado com sucesso!');
        await carregarTemplate();
        return response;
      }
    } catch (error) {
      console.error('Erro ao criar template:', error);
      const errorMessage = error.response?.data?.erro || 'Erro ao criar template';
      toast.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Atualizar template existente
  const atualizarTemplate = async (templateData, logoFile = null) => {
    if (!user?.tenant_id) return;

    try {
      setLoading(true);
      const response = await templatePDFService.atualizarTemplate(
        user.tenant_id,
        templateData,
        logoFile
      );
      
      if (response.sucesso) {
        toast.success(response.mensagem || 'Template atualizado com sucesso!');
        await carregarTemplate();
        return response;
      }
    } catch (error) {
      console.error('Erro ao atualizar template:', error);
      const errorMessage = error.response?.data?.erro || 'Erro ao atualizar template';
      toast.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Deletar template (resetar para padrão)
  const deletarTemplate = async () => {
    if (!user?.tenant_id) return;

    try {
      setLoading(true);
      await templatePDFService.deletarTemplate(user.tenant_id);
      toast.success('Template resetado para configuração padrão');
      await carregarTemplate();
    } catch (error) {
      console.error('Erro ao deletar template:', error);
      toast.error('Erro ao resetar template');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Validar template
  const validarTemplate = async () => {
    if (!user?.tenant_id) return;

    try {
      const response = await templatePDFService.validarTemplate(user.tenant_id);
      
      if (response.valido) {
        toast.success('Template válido!');
      } else {
        toast.error('Template inválido. Verifique as configurações.');
      }
      
      return response;
    } catch (error) {
      console.error('Erro ao validar template:', error);
      toast.error('Erro ao validar template');
      throw error;
    }
  };

  // Obter configuração padrão
  const getConfigPadrao = () => {
    return templatePDFService.getConfigPadrao();
  };

  // Validar cor hexadecimal
  const validarCor = (cor) => {
    return templatePDFService.validarCor(cor);
  };

  // Validar arquivo de logo
  const validarArquivoLogo = (file) => {
    return templatePDFService.validarArquivoLogo(file);
  };

  // Carregar template automaticamente quando o user muda
  useEffect(() => {
    if (user?.tenant_id) {
      carregarTemplate();
    }
  }, [user?.tenant_id]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    // Estado
    template,
    loading,
    usandoPadrao,
    
    // Ações
    carregarTemplate,
    criarTemplate,
    atualizarTemplate,
    deletarTemplate,
    validarTemplate,
    
    // Utilitários
    getConfigPadrao,
    validarCor,
    validarArquivoLogo
  };
};

/**
 * Hook para administradores gerenciarem todos os templates
 */
export const useTemplatePDFAdmin = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });

  // Listar todos os templates
  const listarTemplates = async (params = {}) => {
    try {
      setLoading(true);
      const response = await templatePDFService.listarTemplates({
        page: pagination.page,
        limit: pagination.limit,
        ...params
      });
      
      setTemplates(response.templates || []);
      setPagination(prev => ({
        ...prev,
        total: response.pagination?.total || 0,
        pages: response.pagination?.pages || 0
      }));
    } catch (error) {
      console.error('Erro ao listar templates:', error);
      toast.error('Erro ao carregar lista de templates');
    } finally {
      setLoading(false);
    }
  };

  // Deletar template específico
  const deletarTemplate = async (tenantId) => {
    try {
      await templatePDFService.deletarTemplate(tenantId);
      toast.success('Template desativado com sucesso');
      await listarTemplates();
    } catch (error) {
      console.error('Erro ao deletar template:', error);
      toast.error('Erro ao desativar template');
    }
  };

  // Validar template específico
  const validarTemplate = async (tenantId) => {
    try {
      const response = await templatePDFService.validarTemplate(tenantId);
      
      if (response.valido) {
        toast.success(`Template do tenant ${tenantId} é válido`);
      } else {
        toast.error(`Template do tenant ${tenantId} tem problemas`);
      }
      
      return response;
    } catch (error) {
      console.error('Erro ao validar template:', error);
      toast.error('Erro ao validar template');
    }
  };

  // Mudar página
  const mudarPagina = (novaPagina) => {
    setPagination(prev => ({
      ...prev,
      page: novaPagina
    }));
  };

  return {
    // Estado
    templates,
    loading,
    pagination,
    
    // Ações
    listarTemplates,
    deletarTemplate,
    validarTemplate,
    mudarPagina
  };
};
