const express = require('express');
const assinaturaController = require('../controllers/assinaturaController');
const authMiddleware = require('../middleware/authMiddleware');
const { autorizacaoMiddleware } = require('../middleware/autorizacaoMiddleware');
const tenantMiddleware = require('../middleware/tenantMiddleware');

const router = express.Router();

// Upload de assinatura física (PNG)
router.post(
  '/fisica',
  authMiddleware,
  tenantMiddleware,
  autorizacaoMiddleware(['medico']),
  assinaturaController.upload.single('assinatura'),
  assinaturaController.uploadAssinaturaFisica
);

// Obter informações da assinatura física
router.get(
  '/fisica',
  authMiddleware,
  tenantMiddleware,
  autorizacaoMiddleware(['medico']),
  assinaturaController.obterAssinaturaFisica
);

// Verificar se tem assinatura física cadastrada
router.get(
  '/fisica/verificar',
  authMiddleware,
  tenantMiddleware,
  autorizacaoMiddleware(['medico']),
  assinaturaController.verificarAssinaturaFisica
);

// Visualizar assinatura física
router.get(
  '/fisica/visualizar',
  authMiddleware,
  tenantMiddleware,
  autorizacaoMiddleware(['medico']),
  assinaturaController.visualizarAssinaturaFisica
);

// Remover assinatura física
router.delete(
  '/fisica',
  authMiddleware,
  tenantMiddleware,
  autorizacaoMiddleware(['medico']),
  assinaturaController.removerAssinaturaFisica
);

module.exports = router;
