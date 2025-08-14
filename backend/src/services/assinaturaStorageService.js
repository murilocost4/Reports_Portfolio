const { S3Client } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const { DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');
const path = require('path');

// Configurar AWS SDK v3
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

/**
 * Função para gerar nome único do arquivo de assinatura
 */
const generateSignatureFileName = (medicoId, originalName) => {
  const timestamp = Date.now();
  const randomId = crypto.randomUUID();
  const extension = path.extname(originalName);
  return `assinaturas/${medicoId}/${timestamp}_${randomId}${extension}`;
};

/**
 * Upload de assinatura física para S3
 */
const uploadAssinaturaToS3 = async (fileBuffer, medicoId, originalName, tenantId) => {
  try {
    console.log('Debug uploadAssinaturaToS3:', {
      medicoId,
      originalName,
      tenantId,
      bufferLength: fileBuffer?.length
    });
    
    const fileName = generateSignatureFileName(medicoId, originalName);
    
    // Garantir que todos os metadados são strings válidas
    const metadata = {
      'tenant-id': String(tenantId || 'default'),
      'medico-id': String(medicoId || ''),
      'uploaded-by': String(medicoId || ''),
      'original-name': String(originalName || 'assinatura.png'),
      'upload-date': new Date().toISOString(),
      'file-type': 'assinatura-fisica'
    };
    
    console.log('Metadata S3:', metadata);
    
    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: process.env.AWS_S3_BUCKET,
        Key: fileName,
        Body: fileBuffer,
        ContentType: 'image/png',
        ServerSideEncryption: 'AES256',
        Metadata: metadata
      }
    });

    const result = await upload.done();
    
    return {
      key: fileName,
      url: result.Location,
      bucket: process.env.AWS_S3_BUCKET,
      success: true
    };
  } catch (error) {
    console.error('Erro ao fazer upload da assinatura para S3:', error);
    throw new Error('Falha no upload da assinatura física: ' + error.message);
  }
};

/**
 * Deletar assinatura física do S3
 */
const deleteAssinaturaFromS3 = async (fileKey) => {
  try {
    const command = new DeleteObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: fileKey
    });
    
    await s3Client.send(command);
    console.log(`Assinatura física deletada do S3: ${fileKey}`);
    return true;
  } catch (error) {
    console.error('Erro ao deletar assinatura física do S3:', error);
    return false;
  }
};

/**
 * Gerar URL assinada (temporária) para visualização da assinatura
 */
const getSignedUrlForAssinatura = async (fileKey, expiresIn = 3600) => {
  try {
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: fileKey
    });
    
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });
    return {
      url: signedUrl,
      expiresIn,
      success: true
    };
  } catch (error) {
    console.error('Erro ao gerar URL assinada para assinatura:', error);
    throw new Error('Falha ao gerar URL de visualização: ' + error.message);
  }
};

/**
 * Baixar assinatura física do S3 para uso local (ex: inserir em PDF)
 */
const downloadAssinaturaFromS3 = async (fileKey) => {
  try {
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: fileKey
    });
    
    const response = await s3Client.send(command);
    
    // Converter stream para buffer
    const chunks = [];
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }
    
    return Buffer.concat(chunks);
  } catch (error) {
    console.error('Erro ao baixar assinatura física do S3:', error);
    throw new Error('Falha ao baixar assinatura física: ' + error.message);
  }
};

module.exports = {
  uploadAssinaturaToS3,
  deleteAssinaturaFromS3,
  getSignedUrlForAssinatura,
  downloadAssinaturaFromS3,
  s3Client
};
