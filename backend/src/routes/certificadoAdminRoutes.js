const express = require('express');
const router = express.Router();
const certificadoAdminController = require('../controllers/certificadoAdminController');
const authMiddleware = require('../middleware/authMiddleware');
const { autorizacaoMiddleware } = require('../middleware/autorizacaoMiddleware');
const rateLimit = require('express-rate-limit');

// Rate limiting para operações administrativas sensíveis
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // Máximo 10 operações por 15 minutos
  message: { 
    erro: 'Muitas operações administrativas. Tente novamente em 15 minutos.' 
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Aplicar autenticação a todas as rotas
router.use(authMiddleware);

// === ROTAS ADMINISTRATIVAS ===

/**
 * @route GET /admin/certificados/estatisticas
 * @desc Obter estatísticas dos certificados
 * @access Admin/Gestor
 */
router.get('/estatisticas',
  autorizacaoMiddleware(['admin', 'gestor']),
  certificadoAdminController.obterEstatisticas
);

/**
 * @route POST /admin/certificados/migrar
 * @desc Migrar todos os certificados do filesystem para S3
 * @access Admin apenas
 */
router.post('/migrar',
  autorizacaoMiddleware(['admin']),
  adminLimiter,
  certificadoAdminController.migrarCertificados
);

/**
 * @route POST /admin/certificados/validar-integridade
 * @desc Validar integridade de todos os certificados
 * @access Admin apenas
 */
router.post('/validar-integridade',
  autorizacaoMiddleware(['admin']),
  adminLimiter,
  certificadoAdminController.validarIntegridade
);

/**
 * @route POST /admin/certificados/limpar-orfaos
 * @desc Limpar certificados órfãos no S3
 * @access Admin apenas
 */
router.post('/limpar-orfaos',
  autorizacaoMiddleware(['admin']),
  adminLimiter,
  certificadoAdminController.limparOrfaos
);

/**
 * @route POST /admin/certificados/:certificadoId/migrar
 * @desc Migrar um certificado específico para S3
 * @access Admin apenas
 */
router.post('/:certificadoId/migrar',
  autorizacaoMiddleware(['admin']),
  adminLimiter,
  certificadoAdminController.migrarCertificadoId
);

/**
 * @route GET /admin/certificados/testar-s3
 * @desc Testar conectividade com S3
 * @access Admin apenas
 */
router.get('/testar-s3',
  autorizacaoMiddleware(['admin']),
  certificadoAdminController.testarS3
);

module.exports = router;
