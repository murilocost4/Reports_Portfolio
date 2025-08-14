import api from '../api';

export const templateGaleriaService = {
  // Listar todos os templates da galeria
  async listarTemplates() {
    try {
      const response = await api.get('/templates/galeria');
      return response.data;
    } catch (error) {
      console.error('Erro ao listar templates da galeria:', error);
      throw error;
    }
  },

  // Buscar template específico da galeria
  async buscarTemplate(templateId) {
    try {
      const response = await api.get(`/templates/galeria/${templateId}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar template da galeria:', error);
      throw error;
    }
  },

  // Aplicar template da galeria para o tenant
  async aplicarTemplate(templateId, customColors = null) {
    try {
      const data = customColors ? { customColors } : {};
      const response = await api.post(`/template-pdf/tenant/galeria/${templateId}/aplicar`, data);
      return response.data;
    } catch (error) {
      console.error('Erro ao aplicar template da galeria:', error);
      throw error;
    }
  },

  // Gerar preview do template
  async previewTemplate(templateId) {
    try {
      const response = await api.get(`/templates/galeria/${templateId}/preview`);
      return response.data;
    } catch (error) {
      console.error('Erro ao gerar preview do template:', error);
      throw error;
    }
  }
};

export default templateGaleriaService;
