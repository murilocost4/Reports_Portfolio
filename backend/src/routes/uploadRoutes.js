const express = require('express');
const multer = require('multer');
const { uploadPDFToUploadcare } = require('../services/uploadCareService');

const router = express.Router();
const uploadFiles = multer(); // armazena em memória

router.post('/upload', uploadFiles.single('arquivo'), async (req, res) => {
  try {
    const url = await uploadPDFToUploadcare(req.file);
    res.json({ url });
  } catch (err) {
    console.error('Erro no upload:', err.response?.data || err.message);
    res.status(500).json({ error: 'Falha ao enviar PDF pro Uploadcare' });
  }
});

module.exports = router;
