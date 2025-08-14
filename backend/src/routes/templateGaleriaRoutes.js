const express = require('express');
const router = express.Router();
const {
  listarTemplatesGaleria,
  buscarTemplateGaleria,
  aplicarTemplateGaleria,
  previewTemplateGaleria
} = require('../controllers/templateGaleriaController');
const authMiddleware = require('../middleware/authMiddleware');

/**
 * @route GET /api/templates/galeria
 * @desc Listar todos os templates da galeria
 * @access Private
 */
router.get('/', authMiddleware, listarTemplatesGaleria);

/**
 * @route GET /api/templates/galeria/:templateId
 * @desc Buscar template específico da galeria
 * @access Private
 */
router.get('/:templateId', authMiddleware, buscarTemplateGaleria);

/**
 * @route POST /api/templates/galeria/:templateId/aplicar
 * @desc Aplicar template da galeria para o tenant do usuário
 * @access Private
 */
router.post('/:templateId/aplicar', authMiddleware, aplicarTemplateGaleria);

/**
 * @route GET /api/templates/galeria/:templateId/preview
 * @desc Gerar preview do template da galeria
 * @access Private
 */
router.get('/:templateId/preview', authMiddleware, previewTemplateGaleria);

module.exports = router;
