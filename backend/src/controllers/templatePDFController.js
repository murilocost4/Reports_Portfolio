const TemplatePDF = require('../models/TemplatePDF');
const { 
  uploadLogoToS3, 
  deleteLogoFromS3, 
  downloadLogoFromS3,
  uploadFolhaTimbradaToS3,
  downloadFolhaTimbradaFromS3,
  deleteFolhaTimbradaFromS3,
  getSignedUrlForFolhaTimbrada
} = require('../services/templateStorageService');
const logger = require('../utils/logger');
const { validationResult } = require('express-validator');
const { pdfToPngBuffer } = require('../utils/pdfToPng');

/**
 * Utilitário para extrair tenant_id que pode ser string ou array
 */
const extractTenantId = (tenantId) => {
  if (Array.isArray(tenantId)) {
    const firstTenant = tenantId[0];
    if (typeof firstTenant === 'object' && firstTenant._id) {
      return firstTenant._id;
    } else {
      return firstTenant;
    }
  } else if (typeof tenantId === 'object' && tenantId._id) {
    return tenantId._id;
  } else {
    return tenantId;
  }
};

/**
 * Criar template PDF para o tenant
 */
const criarTemplate = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        erro: 'Dados inválidos',
        detalhes: errors.array()
      });
    }

    const tenantId = req.usuario.tenant_id;
    const {
      nomeModelo,
      tipoTemplate = 'galeria',
      templateGaleriaId,
      cores,
      layout,
      logoUrl,
      rodapeTexto,
      fonte,
      tamanhoFonte,
      margens,
      customPositions,
      estilosSecao,
      folhaTimbradaConfig
    } = req.body;

    // Verificar se já existe template para este tenant
    const templateExistente = await TemplatePDF.findOne({ tenant_id: tenantId });
    if (templateExistente) {
      return res.status(409).json({
        erro: 'Template já existe para este tenant. Use PUT para atualizar.'
      });
    }

    let novoTemplate;

    if (tipoTemplate === 'galeria') {
      // Template da galeria
      if (!templateGaleriaId) {
        return res.status(400).json({
          erro: 'templateGaleriaId é obrigatório para templates da galeria'
        });
      }

      const templatesGaleria = TemplatePDF.getTemplatesGaleria();
      const templateGaleria = templatesGaleria[templateGaleriaId];
      
      if (!templateGaleria) {
        return res.status(400).json({
          erro: 'Template da galeria não encontrado'
        });
      }

      novoTemplate = new TemplatePDF({
        tenant_id: tenantId,
        tipoTemplate: 'galeria',
        templateGaleriaId,
        nomeModelo: nomeModelo || templateGaleria.nome,
        cores: templateGaleria.cores,
        layout: templateGaleria.layout,
        fonte: templateGaleria.fonte,
        tamanhoFonte: templateGaleria.tamanhoFonte,
        margens: templateGaleria.margens,
        estilosSecao: templateGaleria.estilosSecao,
        customPositions: {}, // Templates da galeria não têm customPositions
        rodapeTexto: rodapeTexto || '',
        criadoPor: req.usuario.id
      });

    } else if (tipoTemplate === 'folha_timbrada') {
      // Template com folha timbrada (permite customPositions)
      const layoutConfig = layout || TemplatePDF.getConfigPadrao().layout;
      
      // Para folha timbrada, SEMPRE forçar rodapé e QR Code
      layoutConfig.mostrarRodape = true;
      layoutConfig.mostrarQrCode = true;
      
      
      novoTemplate = new TemplatePDF({
        tenant_id: tenantId,
        tipoTemplate: 'folha_timbrada',
        nomeModelo: nomeModelo || 'Template Folha Timbrada',
        cores: cores || TemplatePDF.getConfigPadrao().cores,
        layout: layoutConfig,
        logoUrl,
        rodapeTexto: rodapeTexto || '',
        fonte: fonte || 'Helvetica',
        tamanhoFonte: tamanhoFonte || TemplatePDF.getConfigPadrao().tamanhoFonte,
        margens: margens || TemplatePDF.getConfigPadrao().margens,
        customPositions: customPositions || {},
        estilosSecao: estilosSecao || TemplatePDF.getConfigPadrao().estilosSecao,
        folhaTimbradaConfig: folhaTimbradaConfig || {},
        criadoPor: req.usuario.id
      });

    } else {
      // Template personalizado (legacy)
      novoTemplate = new TemplatePDF({
        tenant_id: tenantId,
        tipoTemplate: 'personalizado',
        nomeModelo: nomeModelo || 'Template Personalizado',
        cores,
        layout,
        logoUrl,
        rodapeTexto,
        fonte,
        tamanhoFonte,
        margens,
        customPositions: customPositions || {},
        estilosSecao: estilosSecao || {},
        folhaTimbradaConfig: folhaTimbradaConfig || {},
        criadoPor: req.usuario.id
      });
    }

    // Processar upload de logo se houver arquivo
    if (req.file) {
      try {
        const uploadResult = await uploadLogoToS3(
          req.file.buffer,
          tenantId,
          req.file.originalname
        );
        
        novoTemplate.logoS3Key = uploadResult.key;
        novoTemplate.logoS3Bucket = uploadResult.bucket;
        novoTemplate.logoUrl = uploadResult.url;
      } catch (uploadError) {
        console.error('Erro ao fazer upload do logo:', uploadError);
        return res.status(500).json({
          erro: 'Erro ao fazer upload do logo'
        });
      }
    }

    await novoTemplate.save();

    logger.info(`Template PDF criado para tenant ${tenantId}`, {
      templateId: novoTemplate._id,
      userId: req.usuario.id,
      tenantId
    });

    res.status(201).json({
      sucesso: true,
      mensagem: 'Template PDF criado com sucesso',
      template: novoTemplate
    });

  } catch (error) {
    console.error('Erro ao criar template PDF:', error);
    res.status(500).json({
      erro: 'Erro interno do servidor'
    });
  }
};

/**
 * Buscar template PDF de um tenant
 */
const buscarTemplate = async (req, res) => {
  try {
    const { tenantId } = req.params;
    
    // Verificar se usuário pode acessar esse tenant
    if (req.usuario.tenant_id !== tenantId && !req.usuario.temRole('admin')) {
      return res.status(403).json({
        erro: 'Acesso negado'
      });
    }

    const template = await TemplatePDF.findOne({ 
      tenant_id: tenantId,
      ativo: true 
    }).populate('criadoPor atualizadoPor', 'nome email');

    if (!template) {
      // Retornar configuração padrão se não houver template personalizado
      const configPadrao = TemplatePDF.getConfigPadrao();
      return res.json({
        template: {
          tenant_id: tenantId,
          usandoPadrao: true,
          ...configPadrao
        }
      });
    }

    res.json({
      template
    });

  } catch (error) {
    console.error('Erro ao buscar template PDF:', error);
    res.status(500).json({
      erro: 'Erro interno do servidor'
    });
  }
};

/**
 * Atualizar template PDF de um tenant
 */
const atualizarTemplate = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        erro: 'Dados inválidos',
        detalhes: errors.array()
      });
    }

    const { tenantId } = req.params;
    
    // Verificar se usuário pode modificar esse tenant
    if (req.usuario.tenant_id !== tenantId && !req.usuario.temRole('admin')) {
      return res.status(403).json({
        erro: 'Acesso negado'
      });
    }

    const {
      nomeModelo,
      tipoTemplate,
      templateGaleriaId,
      cores,
      layout,
      logoUrl,
      rodapeTexto,
      fonte,
      tamanhoFonte,
      margens,
      customPositions,
      estilosSecao,
      folhaTimbradaConfig,
      textStyles  // ← Adicionar textStyles para folha timbrada simplificada
    } = req.body;

    let template = await TemplatePDF.findOne({ tenant_id: tenantId });
    
    if (!template) {
      // Criar novo template se não existir
      template = new TemplatePDF({
        tenant_id: tenantId,
        criadoPor: req.usuario.id
      });
    }

    // Atualizar tipo de template
    if (tipoTemplate !== undefined) {
      template.tipoTemplate = tipoTemplate;
      
      if (tipoTemplate === 'galeria') {
        // Se mudou para galeria, aplicar configurações do template da galeria
        if (templateGaleriaId) {
          const templatesGaleria = TemplatePDF.getTemplatesGaleria();
          const templateGaleria = templatesGaleria[templateGaleriaId];
          
          if (templateGaleria) {
            template.templateGaleriaId = templateGaleriaId;
            template.cores = templateGaleria.cores;
            template.layout = templateGaleria.layout;
            template.fonte = templateGaleria.fonte;
            template.tamanhoFonte = templateGaleria.tamanhoFonte;
            template.margens = templateGaleria.margens;
            template.estilosSecao = templateGaleria.estilosSecao;
            template.customPositions = {}; // Limpar customPositions para galeria
          }
        }
      } else if (tipoTemplate === 'folha_timbrada') {
        // Folha timbrada permite customPositions
        template.customPositions = customPositions || template.customPositions || {};
        
        // Para folha timbrada, SEMPRE forçar rodapé e QR Code
        if (!template.layout) template.layout = {};
        template.layout.mostrarRodape = true;
        template.layout.mostrarQrCode = true;
        
      }
    }

    // Atualizar campos básicos
    if (nomeModelo !== undefined) template.nomeModelo = nomeModelo;
    if (templateGaleriaId !== undefined && template.tipoTemplate === 'galeria') {
      template.templateGaleriaId = templateGaleriaId;
    }
    if (logoUrl !== undefined) template.logoUrl = logoUrl;
    if (rodapeTexto !== undefined) template.rodapeTexto = rodapeTexto;
    
    // Atualizar campos apenas se não for template da galeria (galeria tem configurações fixas)
    if (template.tipoTemplate !== 'galeria') {
      if (cores !== undefined) template.cores = { ...template.cores, ...cores };
      if (layout !== undefined) template.layout = { ...template.layout, ...layout };
      if (fonte !== undefined) template.fonte = fonte;
      if (tamanhoFonte !== undefined) template.tamanhoFonte = { ...template.tamanhoFonte, ...tamanhoFonte };
      if (margens !== undefined) template.margens = { ...template.margens, ...margens };
      if (estilosSecao !== undefined) template.estilosSecao = { ...template.estilosSecao, ...estilosSecao };
      
      // Para folha timbrada, SEMPRE forçar rodapé e QR Code após qualquer atualização de layout
      if (template.tipoTemplate === 'folha_timbrada') {
        if (!template.layout) template.layout = {};
        template.layout.mostrarRodape = true;
        template.layout.mostrarQrCode = true;
        
      }
    }
    
    // Atualizar campos avançados apenas para folha timbrada
    if (template.tipoTemplate === 'folha_timbrada') {
      if (customPositions !== undefined) template.customPositions = { ...template.customPositions, ...customPositions };
      if (folhaTimbradaConfig !== undefined) template.folhaTimbradaConfig = { ...template.folhaTimbradaConfig, ...folhaTimbradaConfig };
      
      // ✨ CRÍTICO: Atualizar textStyles para folha timbrada simplificada
      if (textStyles !== undefined) {
        
        // Fazer merge profundo das propriedades aninhadas
        template.textStyles = {
          ...template.textStyles,
          ...textStyles,
          sections: {
            ...template.textStyles?.sections,
            ...textStyles?.sections
          },
          margins: {
            ...template.textStyles?.margins,
            ...textStyles?.margins
          }
        };
      }
    }
    
    template.atualizadoPor = req.usuario.id;

    // Processar novo upload de logo se houver arquivo
    if (req.file) {
      try {
        // Remover logo anterior se existir
        if (template.logoS3Key) {
          await deleteLogoFromS3(template.logoS3Key);
        }

        const uploadResult = await uploadLogoToS3(
          req.file.buffer,
          tenantId,
          req.file.originalname
        );
        
        template.logoS3Key = uploadResult.key;
        template.logoS3Bucket = uploadResult.bucket;
        template.logoUrl = uploadResult.url;
      } catch (uploadError) {
        console.error('Erro ao fazer upload do logo:', uploadError);
        return res.status(500).json({
          erro: 'Erro ao fazer upload do logo'
        });
      }
    }

    await template.save();

    logger.info(`Template PDF atualizado para tenant ${tenantId}`, {
      templateId: template._id,
      userId: req.usuario.id,
      tenantId
    });

    res.json({
      sucesso: true,
      mensagem: 'Template PDF atualizado com sucesso',
      template
    });

  } catch (error) {
    console.error('Erro ao atualizar template PDF:', error);
    res.status(500).json({
      erro: 'Erro interno do servidor'
    });
  }
};

/**
 * Deletar template PDF (desativar)
 */
const deletarTemplate = async (req, res) => {
  try {
    const { tenantId } = req.params;
    
    // Verificar se usuário pode modificar esse tenant
    if (req.usuario.tenant_id !== tenantId && !req.usuario.temRole('admin')) {
      return res.status(403).json({
        erro: 'Acesso negado'
      });
    }

    const template = await TemplatePDF.findOne({ tenant_id: tenantId });
    
    if (!template) {
      return res.status(404).json({
        erro: 'Template não encontrado'
      });
    }

    // Desativar template em vez de deletar (soft delete)
    template.ativo = false;
    template.atualizadoPor = req.usuario.id;
    await template.save();

    logger.info(`Template PDF desativado para tenant ${tenantId}`, {
      templateId: template._id,
      userId: req.usuario.id,
      tenantId
    });

    res.json({
      sucesso: true,
      mensagem: 'Template PDF desativado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao deletar template PDF:', error);
    res.status(500).json({
      erro: 'Erro interno do servidor'
    });
  }
};

/**
 * Listar todos os templates (admin only)
 */
const listarTemplates = async (req, res) => {
  try {
    if (!req.usuario.temRole('admin')) {
      return res.status(403).json({
        erro: 'Acesso negado. Apenas administradores podem listar todos os templates.'
      });
    }

    const { page = 1, limit = 10, ativo } = req.query;
    const skip = (page - 1) * limit;

    const filtro = {};
    if (ativo !== undefined) {
      filtro.ativo = ativo === 'true';
    }

    const templates = await TemplatePDF.find(filtro)
      .populate('criadoPor atualizadoPor', 'nome email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await TemplatePDF.countDocuments(filtro);

    res.json({
      templates,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Erro ao listar templates PDF:', error);
    res.status(500).json({
      erro: 'Erro interno do servidor'
    });
  }
};

/**
 * Validar template (verificar se logo existe e está acessível)
 */
const validarTemplate = async (req, res) => {
  try {
    const { tenantId } = req.params;
    
    // Verificar se usuário pode acessar esse tenant
    if (req.usuario.tenant_id !== tenantId && !req.usuario.temRole('admin')) {
      return res.status(403).json({
        erro: 'Acesso negado'
      });
    }

    const template = await TemplatePDF.findOne({ 
      tenant_id: tenantId,
      ativo: true 
    });

    if (!template) {
      return res.json({
        valido: true,
        mensagem: 'Usando configuração padrão',
        usandoPadrao: true
      });
    }

    // Validar logo
    const logoValido = await template.validarLogo();

    res.json({
      valido: logoValido,
      template: {
        id: template._id,
        nomeModelo: template.nomeModelo,
        temLogo: template.temLogo,
        logoValido
      },
      detalhes: {
        logoUrl: template.logoUrl,
        logoS3Key: template.logoS3Key,
        logoValido
      }
    });

  } catch (error) {
    console.error('Erro ao validar template PDF:', error);
    res.status(500).json({
      erro: 'Erro interno do servidor'
    });
  }
};

/**
 * Upload de folha timbrada
 */
const uploadFolhaTimbrada = async (req, res) => {
  try {
    if (!req.file) {
      logger.warn('Upload folha timbrada: arquivo não enviado');
      return res.status(400).json({ erro: 'Arquivo de folha timbrada é obrigatório' });
    }

    const tenantId = req.usuario.tenant_id;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      logger.warn('Upload folha timbrada: tipo não suportado', { mimetype: req.file.mimetype });
      return res.status(400).json({ erro: 'Tipo de arquivo não suportado. Use JPEG, PNG, GIF, WEBP ou PDF.' });
    }
    if (req.file.size > 10 * 1024 * 1024) {
      logger.warn('Upload folha timbrada: arquivo muito grande', { size: req.file.size });
      return res.status(400).json({ erro: 'Arquivo muito grande. Tamanho máximo: 10MB' });
    }

    let uploadResult;
    let isPdf = req.file.mimetype === 'application/pdf';
    let folhaBuffer = req.file.buffer;
    let folhaFilename = req.file.originalname;
    if (isPdf) {
      logger.info('Upload folha timbrada: convertendo PDF para PNG', { filename: folhaFilename });
      try {
        folhaBuffer = await pdfToPngBuffer(req.file.buffer);
        folhaFilename = folhaFilename.replace(/\.pdf$/i, '.png');
        logger.info('Upload folha timbrada: conversão PDF->PNG concluída', { filename: folhaFilename });
      } catch (err) {
        logger.error('Falha ao converter PDF para imagem', { err });
        return res.status(500).json({ erro: 'Falha ao converter PDF para imagem: ' + err });
      }
    }

    // Upload para S3
    logger.info('Upload folha timbrada: enviando para S3', { filename: folhaFilename });
    uploadResult = await uploadFolhaTimbradaToS3(
      folhaBuffer,
      tenantId,
      folhaFilename
    );

    if (!uploadResult.success) {
      logger.error('Upload folha timbrada: falha no upload S3', { uploadResult });
      return res.status(500).json({ erro: 'Falha no upload da folha timbrada' });
    }

    // Buscar template existente
    let template = await TemplatePDF.findOne({ tenant_id: tenantId });
    if (!template) {
      template = new TemplatePDF({
        tenant_id: tenantId,
        nomeModelo: 'Template com Folha Timbrada',
        tipoTemplate: 'folha_timbrada',
        folhaTimbradaUrl: uploadResult.url,
        folhaTimbradaS3Key: uploadResult.s3Key,
        folhaTimbradaS3Bucket: uploadResult.bucket,
        criadoPor: req.usuario.id
      });
    } else {
      // Deletar folha timbrada anterior se existir
      if (template.folhaTimbradaS3Key) {
        try {
          await deleteFolhaTimbradaFromS3(template.folhaTimbradaS3Key, template.folhaTimbradaS3Bucket);
        } catch (error) {
          logger.warn('Erro ao deletar folha timbrada anterior:', error);
        }
      }
      template.tipoTemplate = 'folha_timbrada';
      template.folhaTimbradaUrl = uploadResult.url;
      template.folhaTimbradaS3Key = uploadResult.s3Key;
      template.folhaTimbradaS3Bucket = uploadResult.bucket;
      template.atualizadoPor = req.usuario.id;
    }
    await template.save();
    logger.info('Folha timbrada uploaded e template salvo', {
      tenantId,
      s3Key: uploadResult.s3Key,
      templateId: template._id,
      folhaTimbradaUrl: uploadResult.url
    });
    return res.json({
      sucesso: true,
      folhaTimbradaUrl: uploadResult.url,
      folhaTimbradaS3Key: uploadResult.s3Key,
      folhaTimbradaS3Bucket: uploadResult.bucket
    });
  } catch (err) {
    logger.error('Erro inesperado no upload de folha timbrada', { err });
    return res.status(500).json({ erro: 'Erro inesperado no upload de folha timbrada', detalhes: err });
  }
};

/**
 * Remover folha timbrada
 */
const removerFolhaTimbrada = async (req, res) => {
  try {
    const tenantId = req.usuario.tenant_id;

    const template = await TemplatePDF.findOne({ tenant_id: tenantId });
    if (!template) {
      return res.status(404).json({
        erro: 'Template não encontrado'
      });
    }

    if (!template.folhaTimbradaS3Key) {
      return res.status(400).json({
        erro: 'Nenhuma folha timbrada para remover'
      });
    }

    // Deletar do S3
    try {
      await deleteFolhaTimbradaFromS3(template.folhaTimbradaS3Key, template.folhaTimbradaS3Bucket);
    } catch (error) {
      console.warn('Erro ao deletar folha timbrada do S3:', error);
    }

    // Remover do template
    template.tipoTemplate = 'personalizado';
    template.folhaTimbradaUrl = null;
    template.folhaTimbradaS3Key = null;
    template.folhaTimbradaS3Bucket = null;
    template.atualizadoPor = req.usuario.id;

    await template.save();

    logger.info('Folha timbrada removed successfully', {
      tenantId,
      templateId: template._id
    });

    res.status(200).json({
      sucesso: true,
      mensagem: 'Folha timbrada removida com sucesso'
    });

  } catch (error) {
    console.error('Erro ao remover folha timbrada:', error);
    res.status(500).json({
      erro: 'Erro interno do servidor'
    });
  }
};

/**
 * Atualizar configurações da folha timbrada
 */
const atualizarFolhaTimbrada = async (req, res) => {
  try {
    const tenantId = req.usuario.tenant_id;
    const { folhaTimbradaConfig } = req.body;

    const template = await TemplatePDF.findOne({ tenant_id: tenantId });
    if (!template) {
      return res.status(404).json({
        erro: 'Template não encontrado'
      });
    }

    if (template.tipoTemplate !== 'folha_timbrada') {
      return res.status(400).json({
        erro: 'Template não está configurado para folha timbrada'
      });
    }

    // Atualizar configurações
    if (folhaTimbradaConfig) {
      template.folhaTimbradaConfig = {
        ...template.folhaTimbradaConfig,
        ...folhaTimbradaConfig
      };
    }

    template.atualizadoPor = req.usuario.id;
    await template.save();

    res.status(200).json({
      sucesso: true,
      mensagem: 'Configurações da folha timbrada atualizadas',
      dados: {
        folhaTimbradaConfig: template.folhaTimbradaConfig
      }
    });

  } catch (error) {
    console.error('Erro ao atualizar folha timbrada:', error);
    res.status(500).json({
      erro: 'Erro interno do servidor'
    });
  }
};

/**
 * Salvar template para o tenant do usuário admin
 */
const salvarTemplateTenant = async (req, res) => {
  try {
    
    const usuarioId = req.usuario.id;
    const tenantId = extractTenantId(req.usuario.tenant_id);
    
    
    // Verificar se é admin do tenant
    const todasRoles = req.usuario.todasRoles || [req.usuario.role];
    
    if (!req.usuario.isAdminMaster && !todasRoles.includes('admin') && !todasRoles.includes('adminMaster')) {
      console.warn('❌ [CONTROLLER] Usuário sem permissão para configurar templates');
      return res.status(403).json({ 
        erro: 'Apenas administradores podem configurar templates' 
      });
    }
    

    const {
      nomeModelo,
      tipoTemplate,
      templateGaleriaId,
      cores,
      layout,
      fonte,
      tamanhoFonte,
      margens,
      rodapeTexto,
      estilosSecao,
      customPositions,
      folhaTimbradaConfig,
      textStyles,  // ← Nova propriedade para folha timbrada simplificada
      folhaTimbradaUrl  // ← URL da folha timbrada existente (para manter)
    } = req.body;

    // Parse dos objetos JSON que vêm como strings do FormData
    let parsedCores = cores;
    let parsedLayout = layout;
    let parsedTamanhoFonte = tamanhoFonte;
    let parsedMargens = margens;
    let parsedCustomPositions = customPositions;
    let parsedFolhaTimbradaConfig = folhaTimbradaConfig;
    let parsedEstilosSecao = estilosSecao;
    let parsedTextStyles = textStyles;  // ← Nova variável para textStyles

    try {
      if (typeof cores === 'string') {
        parsedCores = JSON.parse(cores);
      }
      if (typeof layout === 'string') {
        parsedLayout = JSON.parse(layout);
      }
      if (typeof tamanhoFonte === 'string') {
        parsedTamanhoFonte = JSON.parse(tamanhoFonte);
      }
      if (typeof margens === 'string') {
        parsedMargens = JSON.parse(margens);
      }
      if (typeof customPositions === 'string') {
        parsedCustomPositions = JSON.parse(customPositions);
      }
      if (typeof folhaTimbradaConfig === 'string') {
        parsedFolhaTimbradaConfig = JSON.parse(folhaTimbradaConfig);
      }
      if (typeof estilosSecao === 'string') {
        parsedEstilosSecao = JSON.parse(estilosSecao);
      }
      if (typeof textStyles === 'string') {
        parsedTextStyles = JSON.parse(textStyles);
      }
    } catch (parseError) {
      console.error('❌ [CONTROLLER] Erro ao fazer parse dos objetos JSON:', parseError);
      return res.status(400).json({
        erro: 'Erro ao processar dados do template'
      });
    }

    // Validar dados obrigatórios
    if (!nomeModelo || nomeModelo.trim().length < 3) {
      console.warn('❌ [CONTROLLER] Nome do modelo inválido:', nomeModelo);
      return res.status(400).json({
        erro: 'Nome do modelo deve ter pelo menos 3 caracteres'
      });
    }

    if (!tipoTemplate || !['galeria', 'folha_timbrada', 'personalizado'].includes(tipoTemplate)) {
      console.warn('❌ [CONTROLLER] Tipo de template inválido:', tipoTemplate);
      return res.status(400).json({
        erro: 'Tipo de template inválido'
      });
    }


    // Se é template da galeria, validar se o ID existe
    if (tipoTemplate === 'galeria' && !templateGaleriaId) {
      console.warn('❌ [CONTROLLER] Template da galeria sem ID:', templateGaleriaId);
      return res.status(400).json({
        erro: 'Template da galeria deve ter um ID válido'
      });
    }

    // Verificar se já existe template ativo para este tenant
    let template = await TemplatePDF.findOne({ 
      tenant_id: tenantId, 
      ativo: true 
    });

    let logoUrl = null;
    let logoS3Key = null;
    let processedFolhaTimbradaUrl = null;  // Renomeado para evitar conflito
    let folhaTimbradaS3Key = null;

    // Upload do logo se fornecido
    if (req.files && req.files.logo) {
      
      try {
        const logoResult = await uploadLogoToS3(
          req.files.logo.data,
          tenantId,
          req.files.logo.name
        );
        logoUrl = logoResult.url;
        logoS3Key = logoResult.key;
        
        
        // Deletar logo anterior se existir
        if (template && template.logoS3Key) {
          await deleteLogoFromS3(template.logoS3Key);
        }
      } catch (uploadError) {
        console.error('❌ [CONTROLLER] Erro no upload do logo:', uploadError);
        return res.status(500).json({
          erro: 'Erro ao fazer upload do logo'
        });
      }
    } else {
    }

    // Upload da folha timbrada se fornecido
    if (req.files && req.files.folhaTimbrada) {
      // Verificar se é array (multer pode retornar array)
      const folhaTimbradaFile = Array.isArray(req.files.folhaTimbrada) 
        ? req.files.folhaTimbrada[0] 
        : req.files.folhaTimbrada;
      
      try {
        // Tentar diferentes propriedades para o nome do arquivo
        const fileName = folhaTimbradaFile.name || 
                        folhaTimbradaFile.originalname || 
                        folhaTimbradaFile.filename || 
                        'folha-timbrada.jpg'; // fallback
        
        
        // Usar buffer ou data dependendo do multer
        const fileBuffer = folhaTimbradaFile.buffer || folhaTimbradaFile.data;
        
        const folhaResult = await uploadFolhaTimbradaToS3(
          fileBuffer,
          tenantId,
          fileName
        );
        processedFolhaTimbradaUrl = folhaResult.url;
        folhaTimbradaS3Key = folhaResult.s3Key; // Correto: .s3Key
        
        
        // Deletar folha anterior se existir
        if (template && template.folhaTimbradaS3Key) {
          await deleteFolhaTimbradaFromS3(template.folhaTimbradaS3Key);
        }
      } catch (uploadError) {
        console.error('❌ [CONTROLLER] Erro no upload da folha timbrada:', uploadError);
        return res.status(500).json({
          erro: 'Erro ao fazer upload da folha timbrada'
        });
      }
    } else {
      
      // Se há URL da folha timbrada enviada pelo frontend, usar ela
      if (folhaTimbradaUrl) {
        processedFolhaTimbradaUrl = folhaTimbradaUrl; // Usar a URL recebida do frontend
      }
    }

    const templateData = {
      tenant_id: tenantId,
      nomeModelo: nomeModelo.trim(),
      tipoTemplate,
      templateGaleriaId: tipoTemplate === 'galeria' ? templateGaleriaId : undefined,
      cores: parsedCores || {
        primaria: '#2563eb',
        corTitulo: '#1e293b',
        secundaria: '#64748b',
        texto: '#1f2937',
        fundo: '#ffffff'
      },
      layout: parsedLayout || {
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
      fonte: fonte || 'Helvetica',
      tamanhoFonte: parsedTamanhoFonte || {
        base: 11,
        titulo: 16,
        subtitulo: 14
      },
      // Para folha timbrada simplificada, NÃO incluir campo margens (usar apenas textStyles.margins)
      // Para outros templates, incluir margens padrão
      ...(tipoTemplate === 'folha_timbrada' && parsedTextStyles ? {} : {
        margens: parsedMargens || {
          top: 40,
          bottom: 40,
          left: 40,
          right: 40
        }
      }),
      rodapeTexto: rodapeTexto || '',
      estilosSecao: parsedEstilosSecao || {},
      // Para folha timbrada simplificada, usar textStyles em vez de customPositions
      customPositions: tipoTemplate === 'folha_timbrada' && parsedTextStyles ? {} : (parsedCustomPositions || {}),
      textStyles: parsedTextStyles || null, // ← Nova propriedade para estilos de texto simplificados
      folhaTimbradaConfig: parsedFolhaTimbradaConfig || {
        largura: 210,
        altura: 297,
        margemSuperior: 20,
        margemInferior: 20,
        margemEsquerda: 20,
        margemDireita: 20,
        usarImagemFundo: tipoTemplate === 'folha_timbrada' && parsedTextStyles ? true : false,
        usarFolhaComoFundo: tipoTemplate === 'folha_timbrada' && parsedTextStyles ? true : false
      },
      ativo: true,
      atualizadoPor: usuarioId
    };

    // Manter URLs existentes se não foram atualizadas
    if (logoUrl) {
      templateData.logoUrl = logoUrl;
      templateData.logoS3Key = logoS3Key;
    } else if (template) {
      templateData.logoUrl = template.logoUrl;
      templateData.logoS3Key = template.logoS3Key;
    }

    if (processedFolhaTimbradaUrl) {
      templateData.folhaTimbradaUrl = processedFolhaTimbradaUrl;
      templateData.folhaTimbradaS3Key = folhaTimbradaS3Key;
    } else if (template) {
      templateData.folhaTimbradaUrl = template.folhaTimbradaUrl;
      templateData.folhaTimbradaS3Key = template.folhaTimbradaS3Key;
    }

    
    if (template) {
      // Atualizar template existente
      Object.assign(template, templateData);
      await template.save();
    } else {
      // Criar novo template
      templateData.criadoPor = usuarioId;
      template = new TemplatePDF(templateData);
      await template.save();
    }

    logger.info(`Template ${template.isNew ? 'criado' : 'atualizado'} para tenant ${tenantId}`, {
      templateId: template._id,
      usuarioId,
      tenantId
    });

    // ✨ Gerar URL assinada para folha timbrada se existir
    let signedFolhaTimbradaUrl = template.folhaTimbradaUrl;
    if (template.folhaTimbradaS3Key) {
      try {
        const signedResult = await getSignedUrlForFolhaTimbrada(template.folhaTimbradaS3Key, 3600);
        signedFolhaTimbradaUrl = signedResult.url;
      } catch (signedError) {
        console.error('⚠️ [CONTROLLER] Erro ao gerar URL assinada, usando URL original:', signedError);
        // Manter URL original em caso de erro
      }
    }

    res.json({
      sucesso: true,
      mensagem: 'Template salvo com sucesso!',
      template: {
        id: template._id,
        nomeModelo: template.nomeModelo,
        tipoTemplate: template.tipoTemplate,
        templateGaleriaId: template.templateGaleriaId,
        ativo: template.ativo,
        criadoEm: template.createdAt,
        atualizadoEm: template.updatedAt,
        folhaTimbradaUrl: signedFolhaTimbradaUrl, // ✨ URL assinada
        folhaTimbradaS3Key: template.folhaTimbradaS3Key,
        textStyles: template.textStyles, // ✨ Incluir textStyles na resposta
        // Log das seções para debug
        _debugSections: template.textStyles?.sections ? {
          backgroundColor: template.textStyles.sections.backgroundColor,
          backgroundOpacity: template.textStyles.sections.backgroundOpacity,
          showBorder: template.textStyles.sections.showBorder,
          showShadow: template.textStyles.sections.showShadow
        } : 'Nenhuma seção configurada'
      }
    });

  } catch (error) {
    console.error('❌ [CONTROLLER] Erro ao salvar template do tenant:', error);
    console.error('❌ [CONTROLLER] Stack trace:', error.stack);
    res.status(500).json({
      erro: 'Erro interno do servidor',
      detalhes: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Buscar template do tenant
 */
const buscarTemplateTenant = async (req, res) => {
  try {
    const usuario = req.usuario || req.user;
    
    if (!usuario || !usuario.tenant_id) {
      return res.status(401).json({ erro: 'Usuário não autenticado ou tenant_id ausente' });
    }
    
    const tenantId = extractTenantId(usuario.tenant_id);
    
    const template = await TemplatePDF.findOne({ 
      tenant_id: tenantId
    }).populate('criadoPor', 'nome email');

    if (!template) {
      const configPadrao = TemplatePDF.getConfigPadrao();
      return res.json({
        template: {
          tenant_id: 'tenant',
          usandoPadrao: true,
          nomeModelo: configPadrao.nomeModelo,
          tipoTemplate: configPadrao.tipoTemplate,
          templateGaleriaId: configPadrao.templateGaleriaId,
          cores: configPadrao.cores,
          layout: configPadrao.layout,
          fonte: configPadrao.fonte,
          tamanhoFonte: configPadrao.tamanhoFonte,
          margens: configPadrao.margens,
          estilosSecao: configPadrao.estilosSecao,
          ativo: true
        },
        usandoPadrao: true
      });
    }

    // ✨ Gerar URL assinada para folha timbrada se existir
    let templateComUrlAssinada = template.toObject();
    if (template.folhaTimbradaS3Key) {
      try {
        const signedResult = await getSignedUrlForFolhaTimbrada(template.folhaTimbradaS3Key, 3600);
        templateComUrlAssinada.folhaTimbradaUrl = signedResult.url;
      } catch (signedError) {
        console.error('⚠️ [BUSCAR] Erro ao gerar URL assinada, usando URL original:', signedError);
        // Manter URL original em caso de erro
      }
    }

    res.json({
      template: templateComUrlAssinada,
      usandoPadrao: false
    });

  } catch (error) {
    console.error('❌ [BUSCAR] Erro ao buscar template do tenant:', error);
    res.status(500).json({
      erro: 'Erro ao buscar template',
      detalhes: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Aplicar template da galeria para o tenant
 */
const aplicarTemplateGaleria = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const tenantId = extractTenantId(req.usuario.tenant_id);
    const { templateId } = req.params;
    const { customColors } = req.body;
    
    // Verificar se é admin do tenant
    const todasRoles = req.usuario.todasRoles || [req.usuario.role];
    if (!req.usuario.isAdminMaster && !todasRoles.includes('admin') && !todasRoles.includes('adminMaster')) {
      return res.status(403).json({ 
        erro: 'Apenas administradores podem aplicar templates' 
      });
    }

    // Buscar template da galeria
    const templatesGaleria = TemplatePDF.getTemplatesGaleria();
    const templateGaleria = templatesGaleria[templateId];
    
    if (!templateGaleria) {
      return res.status(404).json({
        erro: 'Template da galeria não encontrado'
      });
    }

    // Buscar template do tenant (único por tenant_id devido ao índice único)
    let template = await TemplatePDF.findOne({ tenant_id: tenantId });

    const templateData = {
      tenant_id: tenantId,
      nomeModelo: templateGaleria.nome,
      tipoTemplate: 'galeria',
      templateGaleriaId: templateId,
      cores: customColors || templateGaleria.cores,
      layout: templateGaleria.layout || TemplatePDF.getConfigPadrao().layout,
      fonte: templateGaleria.fonte || 'Helvetica',
      tamanhoFonte: templateGaleria.tamanhoFonte || TemplatePDF.getConfigPadrao().tamanhoFonte,
      margens: templateGaleria.margens || TemplatePDF.getConfigPadrao().margens,
      estilosSecao: templateGaleria.estilosSecao || {},
      ativo: true,
      atualizadoPor: usuarioId
    };

    if (template) {
      
      Object.assign(template, templateData);
      await template.save();
    } else {
      // Criar novo template
      templateData.criadoPor = usuarioId;
      template = new TemplatePDF(templateData);
      await template.save();
    }

    // Verificar se o template foi salvo corretamente - com nova busca do banco
    const templateVerificacao = await TemplatePDF.findOne({ tenant_id: tenantId });

    logger.info(`Template da galeria ${templateId} aplicado para tenant ${tenantId}`, {
      templateId: template._id,
      usuarioId,
      tenantId
    });

    res.json({
      sucesso: true,
      mensagem: 'Template da galeria aplicado com sucesso!',
      template: {
        id: template._id,
        nomeModelo: template.nomeModelo,
        tipoTemplate: template.tipoTemplate,
        templateGaleriaId: template.templateGaleriaId,
        ativo: template.ativo
      }
    });

  } catch (error) {
    console.error('Erro ao aplicar template da galeria:', error);
    res.status(500).json({
      erro: 'Erro interno do servidor'
    });
  }
};

/**
 * Deletar template do tenant
 */
const deletarTemplateTenant = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const tenantId = extractTenantId(req.usuario.tenant_id);
    
    // Verificar se é admin do tenant
    const todasRoles = req.usuario.todasRoles || [req.usuario.role];
    if (!req.usuario.isAdminMaster && !todasRoles.includes('admin') && !todasRoles.includes('adminMaster')) {
      return res.status(403).json({ 
        erro: 'Apenas administradores podem deletar templates' 
      });
    }

    const template = await TemplatePDF.findOne({ 
      tenant_id: tenantId,
      ativo: true 
    });

    if (!template) {
      return res.status(404).json({
        erro: 'Template não encontrado'
      });
    }

    // Deletar arquivos do S3 se existirem
    if (template.logoS3Key) {
      try {
        await deleteLogoFromS3(template.logoS3Key);
      } catch (error) {
        console.error('Erro ao deletar logo do S3:', error);
      }
    }
    
    if (template.folhaTimbradaS3Key) {
      try {
        await deleteFolhaTimbradaFromS3(template.folhaTimbradaS3Key);
      } catch (error) {
        console.error('Erro ao deletar folha timbrada do S3:', error);
      }
    }

    // Marcar como inativo em vez de deletar
    template.ativo = false;
    template.atualizadoPor = usuarioId;
    await template.save();

    logger.info(`Template removido para tenant ${tenantId}`, {
      templateId: template._id,
      usuarioId,
      tenantId
    });

    res.json({
      sucesso: true,
      mensagem: 'Template removido com sucesso!'
    });

  } catch (error) {
    console.error('Erro ao deletar template do tenant:', error);
    res.status(500).json({
      erro: 'Erro interno do servidor'
    });
  }
};

/**
 * Upload de logo da empresa
 */
const uploadLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        erro: 'Nenhum arquivo de logo foi enviado'
      });
    }

    // Validar arquivo de imagem
    try {
      const { validateImageFile } = require('../services/templateStorageService');
      validateImageFile(req.file.buffer, req.file.originalname);
    } catch (validationError) {
      return res.status(400).json({
        erro: validationError.message
      });
    }

    const tenantId = extractTenantId(req.usuario.tenant_id);
    
    // Upload para S3
    const uploadResult = await uploadLogoToS3(
      req.file.buffer,
      tenantId,
      req.file.originalname
    );

    // Buscar ou criar template do tenant
    let template = await TemplatePDF.findOne({ 
      tenant_id: tenantId,
      ativo: true 
    });

    if (!template) {
      // Criar template padrão se não existir
      template = new TemplatePDF({
        tenant_id: tenantId,
        nomeModelo: 'Template Personalizado',
        ...TemplatePDF.getConfigPadrao(),
        criadoPor: req.usuario.id
      });
    }

    // Remover logo anterior se existir
    if (template.logoS3Key) {
      try {
        await deleteLogoFromS3(template.logoS3Key);
      } catch (error) {
        console.error('Erro ao deletar logo anterior:', error);
      }
    }

    // Atualizar template com novo logo
    template.logoS3Key = uploadResult.key;
    template.logoUrl = uploadResult.url;
    template.layout.mostrarLogo = true;
    template.atualizadoPor = req.usuario.id;
    
    await template.save();

    logger.info(`Logo da empresa atualizado para tenant ${tenantId}`, {
      templateId: template._id,
      logoS3Key: uploadResult.key,
      usuarioId: req.usuario.id
    });

    res.json({
      sucesso: true,
      mensagem: 'Logo da empresa carregado com sucesso!',
      logo: {
        url: uploadResult.url,
        s3Key: uploadResult.key
      }
    });

  } catch (error) {
    console.error('Erro ao fazer upload da logo:', error);
    res.status(500).json({
      erro: 'Erro interno do servidor'
    });
  }
};

/**
 * Remover logo da empresa
 */
const removerLogo = async (req, res) => {
  try {
    const tenantId = extractTenantId(req.usuario.tenant_id);
    
    const template = await TemplatePDF.findOne({
      tenant_id: tenantId,
      ativo: true
    });

    if (!template) {
      return res.status(404).json({
        erro: 'Template não encontrado'
      });
    }

    if (!template.logoS3Key) {
      return res.status(400).json({
        erro: 'Nenhum logo encontrado para remover'
      });
    }

    // Deletar logo do S3
    try {
      await deleteLogoFromS3(template.logoS3Key);
    } catch (error) {
      console.error('Erro ao deletar logo do S3:', error);
    }

    // Atualizar template
    template.logoS3Key = undefined;
    template.logoUrl = undefined;
    template.layout.mostrarLogo = false;
    template.atualizadoPor = req.usuario.id;
    
    await template.save();

    logger.info(`Logo da empresa removido para tenant ${tenantId}`, {
      templateId: template._id,
      usuarioId: req.usuario.id
    });

    res.json({
      sucesso: true,
      mensagem: 'Logo da empresa removido com sucesso!'
    });

  } catch (error) {
    console.error('Erro ao remover logo:', error);
    res.status(500).json({
      erro: 'Erro interno do servidor'
    });
  }
};

/**
 * Buscar informações da logo atual
 */
const buscarLogo = async (req, res) => {
  try {
    const tenantId = extractTenantId(req.usuario.tenant_id);
    
    const template = await TemplatePDF.findOne({
      tenant_id: tenantId,
      ativo: true
    });

    if (!template || !template.logoS3Key) {
      return res.json({
        temLogo: false,
        logo: null
      });
    }

    res.json({
      temLogo: true,
      logo: {
        url: template.logoUrl,
        s3Key: template.logoS3Key,
        mostrarLogo: template.layout.mostrarLogo
      }
    });

  } catch (error) {
    console.error('Erro ao buscar logo:', error);
    res.status(500).json({
      erro: 'Erro interno do servidor'
    });
  }
};

module.exports = {
  criarTemplate,
  buscarTemplate,
  atualizarTemplate,
  deletarTemplate,
  listarTemplates,
  validarTemplate,
  uploadFolhaTimbrada,
  removerFolhaTimbrada,
  atualizarFolhaTimbrada,
  salvarTemplateTenant,
  buscarTemplateTenant,
  aplicarTemplateGaleria,
  deletarTemplateTenant,
  uploadLogo,
  removerLogo,
  buscarLogo
};
