const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const os = require('os');

/**
 * Converte a primeira página de um PDF em PNG usando pdftoppm (Poppler)
 * @param {Buffer} pdfBuffer
 * @returns {Promise<Buffer>} PNG buffer
 */
async function pdfToPngBuffer(pdfBuffer) {
  const tmpDir = os.tmpdir();
  const pdfPath = path.join(tmpDir, `folha-timbrada-${Date.now()}.pdf`);
  const pngPath = path.join(tmpDir, `folha-timbrada-${Date.now()}.png`);

  // Salva PDF temporário
  fs.writeFileSync(pdfPath, pdfBuffer);

  // Converte para PNG (primeira página)
  await new Promise((resolve, reject) => {
    exec(`pdftoppm -png -singlefile -f 1 -l 1 "${pdfPath}" "${pngPath.replace(/\.png$/, '')}"`, (err, stdout, stderr) => {
      if (err) return reject(stderr || err);
      resolve();
    });
  });

  // Lê PNG gerado
  const pngBuffer = fs.readFileSync(pngPath);

  // Limpa arquivos temporários
  fs.unlinkSync(pdfPath);
  fs.unlinkSync(pngPath);

  return pngBuffer;
}

module.exports = { pdfToPngBuffer };
