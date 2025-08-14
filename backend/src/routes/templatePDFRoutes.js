const express = require('express');
const multer = require('multer');
const { body, param } = require('express-validator');
const templatePDFController = require('../controllers/templatePDFController');
const authMiddleware = require('../middleware/authMiddleware');
const { autorizacaoMiddleware } = require('../middleware/autorizacaoMiddleware');
const tenantMiddleware = require('../middleware/tenantMiddleware');
const { validateImageFile } = require('../services/templateStorageService');

const router = express.Router();

// Configuração do multer para upload de logos em memória
const storage = multer.memoryStorage();

// Filtro para aceitar apenas imagens
const fileFilter = (req, file, cb) => {
  // Validação básica apenas por extensão (validação completa será feita no controller)
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
  const extension = require('path').extname(file.originalname).toLowerCase();
  
  if (!allowedExtensions.includes(extension)) {
    cb(new Error(`Tipo de arquivo não suportado: ${extension}. Use: ${allowedExtensions.join(', ')}`), false);
  } else {
    cb(null, true);
  }
};

const uploadLogo = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB máximo para logos
  }
});

// Configuração do multer para upload de folhas timbradas
const folhaTimbradaFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de arquivo não suportado para folha timbrada. Use JPEG, PNG, GIF, WEBP ou PDF.'), false);
  }
};

const uploadFolhaTimbrada = multer({
  storage: storage,
  fileFilter: folhaTimbradaFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB máximo para folhas timbradas
  }
});

// Configuração do multer para uploads múltiplos (logo + folha timbrada)
const uploadMultiple = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'logo') {
      // Para logo: apenas imagens
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Logo deve ser uma imagem'), false);
      }
    } else if (file.fieldname === 'folhaTimbrada') {
      // Para folha timbrada: imagens e PDF
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Folha timbrada deve ser uma imagem ou PDF'), false);
      }
    } else {
      cb(new Error('Campo de arquivo não reconhecido'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB máximo
    files: 2 // Logo + Folha Timbrada
  }
});

// Validadores
const validarCor = (campo) => {
  return body(campo)
    .optional()
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .withMessage(`${campo} deve estar no formato hexadecimal (#RRGGBB ou #RGB)`);
};

const validarTemplate = [
  body('nomeModelo')
    .notEmpty()
    .withMessage('Nome do modelo é obrigatório')
    .isLength({ max: 100 })
    .withMessage('Nome do modelo deve ter no máximo 100 caracteres'),
  
  validarCor('cores.primaria'),
  validarCor('cores.secundaria'),
  validarCor('cores.texto'),
  validarCor('cores.fundo'),
  
  body('layout.alinhamentoTitulo')
    .optional()
    .isIn(['left', 'center', 'right'])
    .withMessage('Alinhamento do título deve ser left, center ou right'),
  
  body('fonte')
    .optional()
    .isIn(['Helvetica', 'Times-Roman', 'Courier'])
    .withMessage('Fonte deve ser Helvetica, Times-Roman ou Courier'),
  
  body('logoUrl')
    .optional()
    .isURL()
    .withMessage('Logo URL deve ser uma URL válida'),
  
  body('rodapeTexto')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Texto do rodapé deve ter no máximo 500 caracteres'),
  
  body('tamanhoFonte.base')
    .optional()
    .isInt({ min: 8, max: 16 })
    .withMessage('Tamanho da fonte base deve estar entre 8 e 16'),
  
  body('tamanhoFonte.titulo')
    .optional()
    .isInt({ min: 12, max: 24 })
    .withMessage('Tamanho da fonte do título deve estar entre 12 e 24'),
  
  body('tamanhoFonte.subtitulo')
    .optional()
    .isInt({ min: 10, max: 20 })
    .withMessage('Tamanho da fonte do subtítulo deve estar entre 10 e 20'),
  
  body('margens.top')
    .optional()
    .isInt({ min: 20, max: 80 })
    .withMessage('Margem superior deve estar entre 20 e 80'),
  
  body('margens.bottom')
    .optional()
    .isInt({ min: 20, max: 80 })
    .withMessage('Margem inferior deve estar entre 20 e 80'),
  
  body('margens.left')
    .optional()
    .isInt({ min: 20, max: 80 })
    .withMessage('Margem esquerda deve estar entre 20 e 80'),
  
  body('margens.right')
    .optional()
    .isInt({ min: 20, max: 80 })
    .withMessage('Margem direita deve estar entre 20 e 80')
];

const validarTenantId = [
  param('tenantId')
    .notEmpty()
    .withMessage('Tenant ID é obrigatório')
    .isLength({ min: 1, max: 50 })
    .withMessage('Tenant ID deve ter entre 1 e 50 caracteres')
];

// Rotas

/**
 * POST /api/template-pdf
 * Criar template PDF para o tenant atual
 */
router.post(
  '/',
  authMiddleware,
  tenantMiddleware,
  autorizacaoMiddleware(['admin', 'gerente']),
  uploadLogo.single('logo'),
  validarTemplate,
  templatePDFController.criarTemplate
);

// ===== ROTAS ESPECÍFICAS /tenant (DEVEM VIR ANTES DE /:tenantId) =====

// Salvar/Atualizar template do tenant (admin)
router.post('/tenant',
  authMiddleware,
  tenantMiddleware,
  autorizacaoMiddleware(['admin', 'adminMaster']),
  uploadMultiple.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'folhaTimbrada', maxCount: 1 }
  ]),
  [
    body('nomeModelo')
      .notEmpty()
      .isLength({ min: 3, max: 100 })
      .withMessage('Nome do modelo deve ter entre 3 e 100 caracteres'),
    body('tipoTemplate')
      .isIn(['galeria', 'folha_timbrada', 'personalizado'])
      .withMessage('Tipo de template inválido')
  ],
  templatePDFController.salvarTemplateTenant
);

// Buscar template do tenant
router.get('/tenant',
  authMiddleware,
  tenantMiddleware,
  templatePDFController.buscarTemplateTenant
);

// Deletar template do tenant (admin)
router.delete('/tenant',
  authMiddleware,
  tenantMiddleware,
  autorizacaoMiddleware(['admin', 'adminMaster']),
  templatePDFController.deletarTemplateTenant
);

/**
 * GET /api/template-pdf/:tenantId
 * Buscar template PDF de um tenant específico
 */
router.get(
  '/:tenantId',
  authMiddleware,
  tenantMiddleware,
  validarTenantId,
  templatePDFController.buscarTemplate
);

/**
 * PUT /api/template-pdf/:tenantId
 * Atualizar template PDF de um tenant
 */
router.put(
  '/:tenantId',
  authMiddleware,
  tenantMiddleware,
  autorizacaoMiddleware(['admin', 'gerente']),
  uploadLogo.single('logo'),
  validarTenantId,
  validarTemplate,
  templatePDFController.atualizarTemplate
);

/**
 * DELETE /api/template-pdf/:tenantId
 * Deletar (desativar) template PDF de um tenant
 */
router.delete(
  '/:tenantId',
  authMiddleware,
  tenantMiddleware,
  autorizacaoMiddleware(['admin']),
  validarTenantId,
  templatePDFController.deletarTemplate
);

/**
 * GET /api/template-pdf/:tenantId/validar
 * Validar template PDF (verificar se logo existe e está acessível)
 */
router.get(
  '/:tenantId/validar',
  authMiddleware,
  tenantMiddleware,
  validarTenantId,
  templatePDFController.validarTemplate
);

/**
 * GET /api/template-pdf
 * Listar todos os templates (apenas para admins)
 */
router.get(
  '/',
  authMiddleware,
  tenantMiddleware,
  autorizacaoMiddleware(['admin']),
  templatePDFController.listarTemplates
);

// ===== ROTAS PARA LOGO DA EMPRESA =====

/**
 * @route POST /api/template-pdf/logo
 * @desc Upload de logo da empresa para o template
 * @access Private (Admin/Editor)
 */
router.post('/logo',
  authMiddleware,
  tenantMiddleware,
  autorizacaoMiddleware(['admin', 'editor']),
  uploadLogo.single('logo'),
  templatePDFController.uploadLogo
);

/**
 * @route DELETE /api/template-pdf/logo
 * @desc Remover logo da empresa do template
 * @access Private (Admin/Editor)
 */
router.delete('/logo',
  authMiddleware,
  tenantMiddleware,
  autorizacaoMiddleware(['admin', 'editor']),
  templatePDFController.removerLogo
);

/**
 * @route GET /api/template-pdf/logo
 * @desc Buscar informações da logo atual
 * @access Private (Admin/Editor)
 */
router.get('/logo',
  authMiddleware,
  tenantMiddleware,
  templatePDFController.buscarLogo
);

// ===== ROTAS PARA FOLHA TIMBRADA =====

/**
 * @route POST /api/template-pdf/folha-timbrada
 * @desc Upload de folha timbrada para o template
 * @access Private (Admin/Editor)
 */
router.post('/folha-timbrada',
  authMiddleware,
  tenantMiddleware,
  autorizacaoMiddleware(['admin', 'editor']),
  uploadFolhaTimbrada.single('folhaTimbrada'),
  templatePDFController.uploadFolhaTimbrada
);

/**
 * @route DELETE /api/template-pdf/folha-timbrada
 * @desc Remover folha timbrada do template
 * @access Private (Admin/Editor)
 */
router.delete('/folha-timbrada',
  authMiddleware,
  tenantMiddleware,
  autorizacaoMiddleware(['admin', 'editor']),
  templatePDFController.removerFolhaTimbrada
);

/**
 * @route PUT /api/template-pdf/folha-timbrada/config
 * @desc Atualizar configurações da folha timbrada
 * @access Private (Admin/Editor)
 */
router.put('/folha-timbrada/config',
  authMiddleware,
  tenantMiddleware,
  autorizacaoMiddleware(['admin', 'editor']),
  [
    body('folhaTimbradaConfig.largura')
      .optional()
      .isFloat({ min: 100, max: 300 })
      .withMessage('Largura deve estar entre 100 e 300mm'),
    body('folhaTimbradaConfig.altura')
      .optional()
      .isFloat({ min: 100, max: 420 })
      .withMessage('Altura deve estar entre 100 e 420mm'),
    body('folhaTimbradaConfig.margemSuperior')
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage('Margem superior deve estar entre 0 e 100mm'),
    body('folhaTimbradaConfig.margemInferior')
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage('Margem inferior deve estar entre 0 e 100mm'),
    body('folhaTimbradaConfig.margemEsquerda')
      .optional()
      .isFloat({ min: 0, max: 50 })
      .withMessage('Margem esquerda deve estar entre 0 e 50mm'),
    body('folhaTimbradaConfig.margemDireita')
      .optional()
      .isFloat({ min: 0, max: 50 })
      .withMessage('Margem direita deve estar entre 0 e 50mm')
  ],
  templatePDFController.atualizarFolhaTimbrada
);

// Rotas específicas para gestão de templates por tenant (admins)
// Aplicar template da galeria para o tenant (admin)
router.post('/tenant/galeria/:templateId/aplicar',
  authMiddleware,
  tenantMiddleware,
  autorizacaoMiddleware(['admin', 'adminMaster']),
  [
    param('templateId')
      .notEmpty()
      .withMessage('ID do template é obrigatório')
  ],
  templatePDFController.aplicarTemplateGaleria
);

// Middleware de tratamento de erros para multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        erro: 'Arquivo muito grande. Tamanho máximo: 5MB'
      });
    }
    return res.status(400).json({
      erro: 'Erro no upload do arquivo: ' + error.message
    });
  }
  
  if (error.message.includes('Tipo de arquivo não suportado') || 
      error.message.includes('não é uma imagem válida')) {
    return res.status(400).json({
      erro: error.message
    });
  }
  
  next(error);
});

module.exports = router;
