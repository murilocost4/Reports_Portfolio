const multer = require('multer');
const Usuario = require('../models/Usuario');
const logger = require('../utils/logger');
const { validationResult } = require('express-validator');
const imageSize = require('image-size');
const { 
  uploadAssinaturaToS3, 
  deleteAssinaturaFromS3, 
  getSignedUrlForAssinatura,
  downloadAssinaturaFromS3 
} = require('../services/assinaturaStorageService');

// Configuração do multer para upload de assinaturas em memória
const storage = multer.memoryStorage();

// Filtro para aceitar apenas imagens PNG
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'image/png') {
    cb(null, true);
  } else {
    cb(new Error('Apenas arquivos PNG são permitidos para assinatura física'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB máximo
  }
});

// Upload de assinatura física
const uploadAssinaturaFisica = async (req, res) => {
  try {
    const userId = req.usuario.id;
    
    // Verificar se é médico
    const usuario = await Usuario.findById(userId);
    if (!usuario || !usuario.temRole('medico')) {
      return res.status(403).json({
        erro: 'Apenas médicos podem cadastrar assinatura física'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        erro: 'Nenhum arquivo foi enviado'
      });
    }

    // Validar dimensões da imagem usando buffer (já que agora usa memória)
    try {
      const dimensions = imageSize(req.file.buffer);
      
      // Verificar se as dimensões são muito extremas (validação básica)
      if (dimensions.width > 2000 || dimensions.height > 1000) {
        return res.status(400).json({
          erro: 'Dimensões da assinatura muito grandes. Máximo recomendado: 2000x1000 pixels'
        });
      }
      
      if (dimensions.width < 50 || dimensions.height < 25) {
        return res.status(400).json({
          erro: 'Dimensões da assinatura muito pequenas. Mínimo: 50x25 pixels'
        });
      }
    } catch (error) {
      console.error('Erro ao validar dimensões da imagem:', error);
      // Não falhar se não conseguir validar dimensões - continuar com o upload
      // A validação é opcional, o importante é que seja um PNG válido
    }

    // Remover assinatura S3 anterior se existir
    if (usuario.assinaturaFisica && usuario.assinaturaFisica.s3Key) {
      try {
        await deleteAssinaturaFromS3(usuario.assinaturaFisica.s3Key);
        console.log(`Assinatura anterior removida do S3: ${usuario.assinaturaFisica.s3Key}`);
      } catch (error) {
        console.error('Erro ao remover assinatura anterior do S3:', error);
      }
    }

    // Upload para S3
    const tenantId = req.usuario?.tenant_id || req.tenant_id || 'default';
    
    console.log('Debug upload assinatura:', {
      userId,
      tenantId,
      originalname: req.file.originalname,
      bufferSize: req.file.buffer.length
    });
    
    const uploadResult = await uploadAssinaturaToS3(
      req.file.buffer,
      userId,
      req.file.originalname,
      tenantId
    );

    // Atualizar usuário com nova assinatura S3
    usuario.assinaturaFisica = {
      filename: req.file.originalname,
      s3Key: uploadResult.key,
      s3Bucket: uploadResult.bucket,
      mimetype: req.file.mimetype,
      size: req.file.size,
      uploadedAt: new Date()
    };

    await usuario.save();

    logger.info(`Assinatura física cadastrada no S3 para médico ${usuario.nome}`, {
      userId: usuario._id,
      filename: req.file.originalname,
      s3Key: uploadResult.key,
      size: req.file.size
    });

    res.json({
      sucesso: true,
      mensagem: 'Assinatura física cadastrada com sucesso',
      assinatura: {
        filename: usuario.assinaturaFisica.filename,
        size: usuario.assinaturaFisica.size,
        uploadedAt: usuario.assinaturaFisica.uploadedAt,
        s3Key: uploadResult.key
      }
    });

  } catch (error) {
    console.error('Erro ao fazer upload da assinatura física:', error);
    
    res.status(500).json({
      erro: 'Erro interno do servidor ao processar assinatura'
    });
  }
};

// Obter informações da assinatura física do médico
const obterAssinaturaFisica = async (req, res) => {
  try {
    const userId = req.usuario.id;
    
    const usuario = await Usuario.findById(userId);
    if (!usuario || !usuario.temRole('medico')) {
      return res.status(403).json({
        erro: 'Apenas médicos podem acessar informações de assinatura física'
      });
    }

    if (!usuario.assinaturaFisica || !usuario.assinaturaFisica.s3Key) {
      return res.status(404).json({
        erro: 'Nenhuma assinatura física cadastrada'
      });
    }

    res.json({
      assinatura: {
        filename: usuario.assinaturaFisica.filename,
        size: usuario.assinaturaFisica.size,
        uploadedAt: usuario.assinaturaFisica.uploadedAt,
        temAssinatura: true,
        s3Key: usuario.assinaturaFisica.s3Key
      }
    });

  } catch (error) {
    console.error('Erro ao obter assinatura física:', error);
    res.status(500).json({
      erro: 'Erro interno do servidor'
    });
  }
};

// Visualizar assinatura física
const visualizarAssinaturaFisica = async (req, res) => {
  try {
    const userId = req.usuario.id;
    
    const usuario = await Usuario.findById(userId);
    if (!usuario || !usuario.temRole('medico')) {
      return res.status(403).json({
        erro: 'Acesso negado'
      });
    }

    if (!usuario.assinaturaFisica || !usuario.assinaturaFisica.s3Key) {
      return res.status(404).json({
        erro: 'Nenhuma assinatura física cadastrada'
      });
    }

    // Gerar URL assinada para visualização
    const signedUrlResult = await getSignedUrlForAssinatura(usuario.assinaturaFisica.s3Key, 3600);
    
    res.json({
      url: signedUrlResult.url,
      expiresIn: signedUrlResult.expiresIn
    });

  } catch (error) {
    console.error('Erro ao visualizar assinatura física:', error);
    res.status(500).json({
      erro: 'Erro interno do servidor'
    });
  }
};

// Remover assinatura física
const removerAssinaturaFisica = async (req, res) => {
  try {
    const userId = req.usuario.id;
    
    const usuario = await Usuario.findById(userId);
    if (!usuario || !usuario.temRole('medico')) {
      return res.status(403).json({
        erro: 'Apenas médicos podem remover assinatura física'
      });
    }

    if (!usuario.assinaturaFisica || !usuario.assinaturaFisica.s3Key) {
      return res.status(404).json({
        erro: 'Nenhuma assinatura física cadastrada'
      });
    }

    // Remover arquivo do S3
    try {
      await deleteAssinaturaFromS3(usuario.assinaturaFisica.s3Key);
    } catch (error) {
      console.error('Erro ao remover arquivo de assinatura do S3:', error);
      // Não falhar se não conseguir remover do S3 - continuar com a remoção do banco
    }

    // Remover referência do banco
    usuario.assinaturaFisica = undefined;
    await usuario.save();

    logger.info(`Assinatura física removida para médico ${usuario.nome}`, {
      userId: usuario._id
    });

    res.json({
      sucesso: true,
      mensagem: 'Assinatura física removida com sucesso'
    });

  } catch (error) {
    console.error('Erro ao remover assinatura física:', error);
    res.status(500).json({
      erro: 'Erro interno do servidor'
    });
  }
};

// Verificar se o médico tem assinatura física cadastrada
const verificarAssinaturaFisica = async (req, res) => {
  try {
    const medicoId = req.usuario.id;
    
    const usuario = await Usuario.findById(medicoId);
    if (!usuario) {
      return res.status(404).json({ erro: 'Usuário não encontrado' });
    }

    const temAssinatura = !!(usuario.assinaturaFisica && 
                            usuario.assinaturaFisica.s3Key);

    res.json({
      temAssinatura,
      detalhes: temAssinatura ? {
        uploadedAt: usuario.assinaturaFisica.uploadedAt,
        filename: usuario.assinaturaFisica.filename,
        size: usuario.assinaturaFisica.size
      } : null
    });

  } catch (error) {
    console.error('Erro ao verificar assinatura física:', error);
    res.status(500).json({ 
      erro: 'Erro interno do servidor',
      detalhes: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  upload,
  uploadAssinaturaFisica,
  obterAssinaturaFisica,
  visualizarAssinaturaFisica,
  removerAssinaturaFisica,
  verificarAssinaturaFisica
};
