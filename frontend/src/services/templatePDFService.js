import api from '../api';

/**
 * Service para gerenciar templates PDF personalizados
 */
class TemplatePDFService {
  
  /**
   * Criar novo template PDF
   * @param {Object} templateData - Dados do template
   * @param {File} logoFile - Arquivo de logo (opcional)
   * @returns {Promise} Response da API
   */
  async criarTemplate(templateData, logoFile = null) {
    try {
      const formData = new FormData();
      
      // Adicionar dados do template
      Object.keys(templateData).forEach(key => {
        if (templateData[key] && typeof templateData[key] === 'object') {
          // Para objetos aninhados (cores, layout, etc.)
          Object.keys(templateData[key]).forEach(subKey => {
            formData.append(`${key}[${subKey}]`, templateData[key][subKey]);
          });
        } else if (templateData[key] !== undefined && templateData[key] !== null) {
          formData.append(key, templateData[key]);
        }
      });
      
      // Adicionar arquivo de logo se fornecido
      if (logoFile) {
        formData.append('logo', logoFile);
      }
      
      const response = await api.post('/template-pdf', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response.data;
    } catch (error) {
      console.error('Erro ao criar template:', error);
      throw error;
    }
  }

  /**
   * Salvar template para o tenant (apenas admins)
   * @param {Object} templateData - Dados do template
   * @param {File} logoFile - Arquivo de logo (opcional)
   * @param {File} folhaTimbradaFile - Arquivo de folha timbrada (opcional)
   * @returns {Promise} Response da API
   */
  async salvarTemplateTenant(templateData, logoFile = null, folhaTimbradaFile = null) {
    try {
      console.log('🚀 [SERVICE] Iniciando salvarTemplateTenant...');
      console.log('📋 [SERVICE] templateData recebido:', templateData);
      console.log('🖼️ [SERVICE] logoFile:', logoFile);
      console.log('📄 [SERVICE] folhaTimbradaFile:', folhaTimbradaFile);
      
      const formData = new FormData();
      
      // Adicionar dados do template
      console.log('📝 [SERVICE] Processando dados do template...');
      Object.keys(templateData).forEach(key => {
        if (templateData[key] && typeof templateData[key] === 'object') {
          console.log(`🔍 [SERVICE] Processando objeto ${key}:`, templateData[key]);
          // Para objetos aninhados, serializar como JSON
          formData.append(key, JSON.stringify(templateData[key]));
          console.log(`📎 [SERVICE] Adicionado ${key} = ${JSON.stringify(templateData[key])}`);
        } else if (templateData[key] !== undefined && templateData[key] !== null) {
          formData.append(key, templateData[key]);
          console.log(`📎 [SERVICE] Adicionado ${key} = ${templateData[key]}`);
        }
      });
      
      // Adicionar arquivos se fornecidos
      if (logoFile) {
        formData.append('logo', logoFile);
        console.log('📷 [SERVICE] Logo file adicionado:', logoFile.name);
      }
      
      if (folhaTimbradaFile) {
        formData.append('folhaTimbrada', folhaTimbradaFile);
        console.log('📄 [SERVICE] Folha timbrada file adicionado:', {
          name: folhaTimbradaFile.name,
          size: folhaTimbradaFile.size,
          type: folhaTimbradaFile.type
        });
      }
      
      // Log do FormData (keys apenas, pois não consegue mostrar o conteúdo completo)
      console.log('📦 [SERVICE] FormData keys:', Array.from(formData.keys()));
      
      console.log('🌐 [SERVICE] Fazendo requisição POST para /template-pdf/tenant...');
      const response = await api.post('/template-pdf/tenant', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      console.log('✅ [SERVICE] Resposta da API recebida:', response.data);
      console.log('📊 [SERVICE] Status da resposta:', response.status);
      
      return response.data;
    } catch (error) {
      console.error('❌ [SERVICE] Erro ao salvar template do tenant:', error);
      console.error('❌ [SERVICE] Error response:', error.response?.data);
      console.error('❌ [SERVICE] Error status:', error.response?.status);
      console.error('❌ [SERVICE] Error headers:', error.response?.headers);
      throw error;
    }
  }

  /**
   * Buscar template do tenant atual
   * @param {string} tenantId - ID do tenant
   * @returns {Promise} Template encontrado ou configuração padrão
   */
  async buscarTemplate(tenantId) {
    try {
      const response = await api.get(`/template-pdf/${tenantId}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar template:', error);
      throw error;
    }
  }

  /**
   * Buscar template do tenant atual
   * @returns {Promise} Template do tenant ou configuração padrão
   */
  async buscarTemplateTenant() {
    try {
      const timestamp = new Date().getTime();
      const random = Math.random().toString(36).substring(7);
      const response = await api.get(`/template-pdf/tenant?_t=${timestamp}&_r=${random}`, {
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar template do tenant:', error);
      throw error;
    }
  }

  /**
   * Atualizar template existente
   * @param {string} tenantId - ID do tenant
   * @param {Object} templateData - Dados atualizados do template
   * @param {File} logoFile - Novo arquivo de logo (opcional)
   * @returns {Promise} Response da API
   */
  async atualizarTemplate(tenantId, templateData, logoFile = null) {
    try {
      const formData = new FormData();
      
      // Adicionar dados do template
      Object.keys(templateData).forEach(key => {
        if (templateData[key] && typeof templateData[key] === 'object') {
          // Para objetos aninhados (cores, layout, etc.)
          Object.keys(templateData[key]).forEach(subKey => {
            if (templateData[key][subKey] !== undefined && templateData[key][subKey] !== null) {
              formData.append(`${key}[${subKey}]`, templateData[key][subKey]);
            }
          });
        } else if (templateData[key] !== undefined && templateData[key] !== null) {
          formData.append(key, templateData[key]);
        }
      });
      
      // Adicionar novo arquivo de logo se fornecido
      if (logoFile) {
        formData.append('logo', logoFile);
      }
      
      const response = await api.put(`/template-pdf/${tenantId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response.data;
    } catch (error) {
      console.error('Erro ao atualizar template:', error);
      throw error;
    }
  }

  /**
   * Deletar template (desativar)
   * @param {string} tenantId - ID do tenant
   * @returns {Promise} Response da API
   */
  async deletarTemplate(tenantId) {
    try {
      const response = await api.delete(`/template-pdf/${tenantId}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao deletar template:', error);
      throw error;
    }
  }

  /**
   * Deletar template do tenant (apenas admins)
   * @returns {Promise} Response da API
   */
  async deletarTemplateTenant() {
    try {
      const response = await api.delete('/template-pdf/tenant');
      return response.data;
    } catch (error) {
      console.error('Erro ao deletar template do tenant:', error);
      throw error;
    }
  }

  /**
   * Validar template (verificar logo e configurações)
   * @param {string} tenantId - ID do tenant
   * @returns {Promise} Status de validação
   */
  async validarTemplate(tenantId) {
    try {
      const response = await api.get(`/template-pdf/${tenantId}/validar`);
      return response.data;
    } catch (error) {
      console.error('Erro ao validar template:', error);
      throw error;
    }
  }

  /**
   * Listar todos os templates (apenas admin)
   * @param {Object} params - Parâmetros de consulta (page, limit, ativo)
   * @returns {Promise} Lista de templates
   */
  async listarTemplates(params = {}) {
    try {
      const response = await api.get('/template-pdf', { params });
      return response.data;
    } catch (error) {
      console.error('Erro ao listar templates:', error);
      throw error;
    }
  }

  /**
   * Aplicar template da galeria para o tenant (apenas admins)
   * @param {string} templateId - ID do template da galeria
   * @param {Object} customColors - Cores personalizadas (opcional)
   * @returns {Promise} Response da API
   */
  async aplicarTemplateGaleria(templateId, customColors = null) {
    try {
      const data = customColors ? { customColors } : {};
      const response = await api.post(`/template-pdf/tenant/galeria/${templateId}/aplicar`, data);
      return response.data;
    } catch (error) {
      console.error('Erro ao aplicar template da galeria:', error);
      throw error;
    }
  }

  /**
   * Obter configuração padrão do template
   * @returns {Object} Configuração padrão
   */
  getConfigPadrao() {
    return {
      nomeModelo: 'Template Padrão',
      cores: {
        primaria: '#2563eb',
        secundaria: '#64748b',
        texto: '#1f2937',
        fundo: '#ffffff'
      },
      layout: {
        mostrarLogo: true,
        mostrarRodape: true,
        alinhamentoTitulo: 'center',
        mostrarQrCode: true,
        mostrarDadosPaciente: true,
        mostrarDataAssinatura: true,
        mostrarCabecalhoCompleto: true
      },
      estilosSecao: {
        header: {
          corFundo: '#f8fafc',
          corBorda: '#e2e8f0',
          larguraBorda: 1,
          tipoLinha: 'solid',
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
      customPositions: {},
      tipoTemplate: 'personalizado',
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
    };
  }

  /**
   * Validar cor hexadecimal
   * @param {string} cor - Cor em formato hexadecimal
   * @returns {boolean} Se a cor é válida
   */
  validarCor(cor) {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(cor);
  }

  /**
   * Validar arquivo de imagem
   * @param {File} file - Arquivo a ser validado
   * @returns {Object} Resultado da validação
   */
  validarArquivoLogo(file) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    if (!allowedTypes.includes(file.type)) {
      return {
        valido: false,
        erro: 'Tipo de arquivo não suportado. Use: JPEG, PNG, GIF, WebP ou SVG'
      };
    }
    
    if (file.size > maxSize) {
      return {
        valido: false,
        erro: 'Arquivo muito grande. Tamanho máximo: 5MB'
      };
    }
    
    return {
      valido: true,
      erro: null
    };
  }

  /**
   * Upload de folha timbrada
   * @param {File} folhaFile - Arquivo da folha timbrada
   * @returns {Promise} Response da API
   */
  async uploadFolhaTimbrada(folhaFile) {
    try {
      const formData = new FormData();
      formData.append('folhaTimbrada', folhaFile);
      
      const response = await api.post('/template-pdf/folha-timbrada', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response.data;
    } catch (error) {
      console.error('Erro ao fazer upload da folha timbrada:', error);
      throw error;
    }
  }

  /**
   * Remover folha timbrada
   * @returns {Promise} Response da API
   */
  async removerFolhaTimbrada() {
    try {
      const response = await api.delete('/template-pdf/folha-timbrada');
      return response.data;
    } catch (error) {
      console.error('Erro ao remover folha timbrada:', error);
      throw error;
    }
  }

  /**
   * Atualizar configurações da folha timbrada
   * @param {Object} config - Configurações da folha timbrada
   * @returns {Promise} Response da API
   */
  async atualizarFolhaTimbrada(config) {
    try {
      const response = await api.put('/template-pdf/folha-timbrada/config', {
        folhaTimbradaConfig: config
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao atualizar configurações da folha timbrada:', error);
      throw error;
    }
  }

  /**
   * Validar arquivo de folha timbrada
   * @param {File} file - Arquivo a ser validado
   * @returns {Object} Resultado da validação
   */
  validarArquivoFolhaTimbrada(file) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    if (!allowedTypes.includes(file.type)) {
      return {
        valido: false,
        erro: 'Tipo de arquivo não suportado. Use: JPEG, PNG, GIF, WebP ou PDF'
      };
    }
    
    if (file.size > maxSize) {
      return {
        valido: false,
        erro: 'Arquivo muito grande. Tamanho máximo: 10MB'
      };
    }
    
    return {
      valido: true,
      erro: null
    };
  }

  /**
   * Upload de logo da empresa
   * @param {File} logoFile - Arquivo de logo
   * @returns {Promise} Response da API
   */
  async uploadLogo(logoFile) {
    try {
      const formData = new FormData();
      formData.append('logo', logoFile);
      
      const response = await api.post('/template-pdf/logo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response.data;
    } catch (error) {
      console.error('Erro ao fazer upload do logo:', error);
      throw error;
    }
  }

  /**
   * Buscar logo atual da empresa
   * @returns {Promise} Informações do logo
   */
  async buscarLogo() {
    try {
      const response = await api.get('/template-pdf/logo');
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar logo:', error);
      throw error;
    }
  }

  /**
   * Remover logo da empresa
   * @returns {Promise} Response da API
   */
  async removerLogo() {
    try {
      const response = await api.delete('/template-pdf/logo');
      return response.data;
    } catch (error) {
      console.error('Erro ao remover logo:', error);
      throw error;
    }
  }

  /**
   * Validar arquivo de logo
   * @param {File} file - Arquivo a ser validado
   * @returns {Object} Resultado da validação
   */
  validarArquivoLogo(file) {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    if (!allowedTypes.includes(file.type)) {
      return {
        valido: false,
        erro: 'Tipo de arquivo não suportado. Use: JPEG, PNG, GIF ou WebP'
      };
    }
    
    if (file.size > maxSize) {
      return {
        valido: false,
        erro: 'Arquivo muito grande. Tamanho máximo: 5MB'
      };
    }
    
    return {
      valido: true,
      erro: null
    };
  }
}

export default new TemplatePDFService();
