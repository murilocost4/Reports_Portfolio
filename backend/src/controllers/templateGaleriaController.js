const TemplatePDF = require('../models/TemplatePDF');
const logger = require('../utils/logger');

/**
 * Buscar todos os templates da galeria
 */
const listarTemplatesGaleria = async (req, res) => {
  try {
    const templatesGaleria = TemplatePDF.getTemplatesGaleria();
    
    res.json({
      sucesso: true,
      templates: Object.values(templatesGaleria),
      total: Object.keys(templatesGaleria).length
    });

  } catch (error) {
    console.error('Erro ao listar templates da galeria:', error);
    res.status(500).json({
      erro: 'Erro interno do servidor'
    });
  }
};

/**
 * Buscar template específico da galeria
 */
const buscarTemplateGaleria = async (req, res) => {
  try {
    const { templateId } = req.params;
    const templatesGaleria = TemplatePDF.getTemplatesGaleria();
    
    const template = templatesGaleria[templateId];
    
    if (!template) {
      return res.status(404).json({
        erro: 'Template não encontrado na galeria'
      });
    }

    res.json({
      sucesso: true,
      template
    });

  } catch (error) {
    console.error('Erro ao buscar template da galeria:', error);
    res.status(500).json({
      erro: 'Erro interno do servidor'
    });
  }
};

/**
 * Aplicar template da galeria para um tenant
 */
const aplicarTemplateGaleria = async (req, res) => {
  try {
    const { templateId } = req.params;
    const tenantId = req.usuario.tenant_id;
    const templatesGaleria = TemplatePDF.getTemplatesGaleria();
    
    const templateGaleria = templatesGaleria[templateId];
    
    if (!templateGaleria) {
      return res.status(404).json({
        erro: 'Template não encontrado na galeria'
      });
    }

    // Verificar se já existe template para este tenant
    let template = await TemplatePDF.findOne({ tenant_id: tenantId });
    
    if (template) {
      // Atualizar template existente
      template.tipoTemplate = 'galeria';
      template.templateGaleriaId = templateId;
      template.nomeModelo = templateGaleria.nome;
      template.cores = templateGaleria.cores;
      template.layout = templateGaleria.layout;
      template.fonte = templateGaleria.fonte;
      template.tamanhoFonte = templateGaleria.tamanhoFonte;
      template.margens = templateGaleria.margens;
      template.estilosSecao = templateGaleria.estilosSecao;
      template.customPositions = {}; // Limpar customPositions para templates da galeria
      template.atualizadoPor = req.usuario.id;
    } else {
      // Criar novo template
      template = new TemplatePDF({
        tenant_id: tenantId,
        tipoTemplate: 'galeria',
        templateGaleriaId: templateId,
        nomeModelo: templateGaleria.nome,
        cores: templateGaleria.cores,
        layout: templateGaleria.layout,
        fonte: templateGaleria.fonte,
        tamanhoFonte: templateGaleria.tamanhoFonte,
        margens: templateGaleria.margens,
        estilosSecao: templateGaleria.estilosSecao,
        customPositions: {},
        criadoPor: req.usuario.id
      });
    }

    await template.save();

    logger.info(`Template da galeria ${templateId} aplicado para tenant ${tenantId}`, {
      templateId: template._id,
      templateGaleriaId: templateId,
      userId: req.usuario.id,
      tenantId
    });

    res.json({
      sucesso: true,
      mensagem: `Template "${templateGaleria.nome}" aplicado com sucesso`,
      template
    });

  } catch (error) {
    console.error('Erro ao aplicar template da galeria:', error);
    res.status(500).json({
      erro: 'Erro interno do servidor'
    });
  }
};

/**
 * Preview de um template da galeria (gerar PDF de exemplo)
 */
const previewTemplateGaleria = async (req, res) => {
  try {
    const { templateId } = req.params;
    const templatesGaleria = TemplatePDF.getTemplatesGaleria();
    
    const templateGaleria = templatesGaleria[templateId];
    
    if (!templateGaleria) {
      return res.status(404).json({
        erro: 'Template não encontrado na galeria'
      });
    }

    // Dados de exemplo para o preview
    const dadosExemplo = {
      paciente: {
        nome: 'João Silva Exemplo',
        dataNascimento: new Date('1985-03-15'),
        cpf: '123.456.789-00',
        convenio: 'Particular'
      },
      medico: {
        nome: 'Dr. Exemplo Médico',
        crm: '12345',
        especialidade: 'Cardiologia'
      },
      exame: {
        tipo: 'Exame de Exemplo',
        data: new Date(),
        resultado: 'Este é um exemplo de como o laudo ficará com este template.'
      },
      empresa: {
        nome: 'Clínica Exemplo',
        endereco: 'Rua Exemplo, 123',
        telefone: '(11) 1234-5678'
      }
    };

    // Aqui você implementaria a geração do PDF de preview
    // Por enquanto, retornamos apenas os dados do template
    res.json({
      sucesso: true,
      template: templateGaleria,
      dadosExemplo,
      mensagem: 'Preview do template (implementar geração de PDF)'
    });

  } catch (error) {
    console.error('Erro ao gerar preview do template:', error);
    res.status(500).json({
      erro: 'Erro interno do servidor'
    });
  }
};

module.exports = {
  listarTemplatesGaleria,
  buscarTemplateGaleria,
  aplicarTemplateGaleria,
  previewTemplateGaleria
};
