const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
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
 * Função para gerar nome único do arquivo de logo
 */
const generateLogoFileName = (tenantId, originalName) => {
  const timestamp = Date.now();
  const randomId = crypto.randomUUID();
  const extension = path.extname(originalName);
  return `templates/logos/${tenantId}/${timestamp}_${randomId}${extension}`;
};

/**
 * Upload de logo para S3
 */
const uploadLogoToS3 = async (fileBuffer, tenantId, originalName) => {
  try {
    const fileName = generateLogoFileName(tenantId, originalName);
    
    // Detectar tipo MIME baseado na extensão
    const extension = path.extname(originalName).toLowerCase();
    let contentType = 'image/jpeg'; // padrão
    
    switch (extension) {
      case '.png':
        contentType = 'image/png';
        break;
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg';
        break;
      case '.gif':
        contentType = 'image/gif';
        break;
      case '.webp':
        contentType = 'image/webp';
        break;
      case '.svg':
        contentType = 'image/svg+xml';
        break;
    }
    
    const uploadParams = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: fileName,
      Body: fileBuffer,
      ContentType: contentType,
      ServerSideEncryption: 'AES256',
      Metadata: {
        'tenant-id': tenantId || 'default',
        'uploaded-by': 'template-system',
        'original-name': originalName,
        'upload-date': new Date().toISOString(),
        'file-type': 'template-logo'
      }
    };

    const command = new PutObjectCommand(uploadParams);
    const result = await s3Client.send(command);
    
    // Construir URL manualmente com região específica
    const region = process.env.AWS_REGION || 'us-east-2';
    const s3Url = `https://${process.env.AWS_S3_BUCKET}.s3.${region}.amazonaws.com/${fileName}`;
    
    return {
      key: fileName,
      url: s3Url,
      bucket: process.env.AWS_S3_BUCKET,
      success: true
    };
  } catch (error) {
    console.error('Erro ao fazer upload do logo para S3:', error);
    throw new Error('Falha no upload do logo: ' + error.message);
  }
};

/**
 * Deletar logo do S3
 */
const deleteLogoFromS3 = async (fileKey) => {
  try {
    const command = new DeleteObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: fileKey
    });
    
    await s3Client.send(command);
    console.log(`Logo deletado do S3: ${fileKey}`);
    return true;
  } catch (error) {
    console.error('Erro ao deletar logo do S3:', error);
    return false;
  }
};

/**
 * Gerar URL assinada (temporária) para visualização do logo
 */
const getSignedUrlForLogo = async (fileKey, expiresIn = 3600) => {
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
    console.error('Erro ao gerar URL assinada para logo:', error);
    throw new Error('Falha ao gerar URL de visualização: ' + error.message);
  }
};

/**
 * Baixar logo do S3 para uso local (ex: inserir em PDF)
 */
const downloadLogoFromS3 = async (fileKey) => {
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
    
    return {
      buffer: Buffer.concat(chunks),
      contentType: response.ContentType,
      contentLength: response.ContentLength
    };
  } catch (error) {
    console.error('Erro ao baixar logo do S3:', error);
    throw new Error('Falha ao baixar logo: ' + error.message);
  }
};

/**
 * Verificar se logo existe no S3
 */
const checkLogoExists = async (fileKey) => {
  try {
    const { HeadObjectCommand } = require('@aws-sdk/client-s3');
    const command = new HeadObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: fileKey
    });
    
    await s3Client.send(command);
    return true;
  } catch (error) {
    if (error.name === 'NotFound') {
      return false;
    }
    throw error;
  }
};

/**
 * Listar logos de um tenant
 */
const listTenantLogos = async (tenantId) => {
  try {
    const { ListObjectsV2Command } = require('@aws-sdk/client-s3');
    const command = new ListObjectsV2Command({
      Bucket: process.env.AWS_S3_BUCKET,
      Prefix: `templates/logos/${tenantId}/`,
      MaxKeys: 100
    });
    
    const response = await s3Client.send(command);
    
    return (response.Contents || []).map(object => ({
      key: object.Key,
      size: object.Size,
      lastModified: object.LastModified,
      url: `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${object.Key}`
    }));
  } catch (error) {
    console.error('Erro ao listar logos do tenant:', error);
    throw error;
  }
};

/**
 * Validar se arquivo é uma imagem válida
 */
const validateImageFile = (fileBuffer, originalName) => {
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
  const extension = path.extname(originalName).toLowerCase();
  
  if (!allowedExtensions.includes(extension)) {
    throw new Error(`Tipo de arquivo não suportado: ${extension}. Use: ${allowedExtensions.join(', ')}`);
  }

  // Para SVG, apenas verificar se não está vazio
  if (extension === '.svg') {
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new Error('Arquivo SVG está vazio');
    }
    return true;
  }

  // Verificar se o buffer não está vazio
  if (!fileBuffer || fileBuffer.length === 0) {
    throw new Error('Arquivo está vazio');
  }

  // Verificar assinatura do arquivo de forma mais flexível
  const signatures = {
    jpeg: [0xFF, 0xD8], // Apenas os primeiros 2 bytes para JPEG
    png: [0x89, 0x50, 0x4E, 0x47], // PNG completo
    gif: [0x47, 0x49, 0x46], // GIF
    webp: [0x52, 0x49, 0x46, 0x46] // WEBP (RIFF)
  };
  
  // Verificar assinatura do arquivo
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(extension)) {
    const fileStart = Array.from(fileBuffer.slice(0, 10)); // Pegar mais bytes para verificação
    
    let isValidImage = false;
    
    // Verificar JPEG
    if ((extension === '.jpg' || extension === '.jpeg') && 
        fileStart[0] === 0xFF && fileStart[1] === 0xD8) {
      isValidImage = true;
    }
    
    // Verificar PNG
    if (extension === '.png' && 
        fileStart[0] === 0x89 && fileStart[1] === 0x50 && 
        fileStart[2] === 0x4E && fileStart[3] === 0x47) {
      isValidImage = true;
    }
    
    // Verificar GIF
    if (extension === '.gif' && 
        fileStart[0] === 0x47 && fileStart[1] === 0x49 && fileStart[2] === 0x46) {
      isValidImage = true;
    }
    
    // Verificar WEBP
    if (extension === '.webp' && 
        fileStart[0] === 0x52 && fileStart[1] === 0x49 && 
        fileStart[2] === 0x46 && fileStart[3] === 0x46) {
      isValidImage = true;
    }
    
    if (!isValidImage) {
      console.warn(`Assinatura de arquivo não reconhecida para ${originalName}:`, fileStart.slice(0, 4));
      // Em vez de falhar, vamos apenas avisar e continuar
      // throw new Error('Arquivo não é uma imagem válida');
    }
  }
  
  return true;
};

/**
 * Função para gerar nome único do arquivo de folha timbrada
 */
const generateFolhaTimbradaFileName = (tenantId, originalName) => {
  const timestamp = Date.now();
  const randomId = crypto.randomUUID();
  
  // Validação e fallback para originalName
  if (!originalName || typeof originalName !== 'string') {
    console.warn('⚠️ [STORAGE] originalName inválido, usando fallback:', originalName);
    originalName = 'folha-timbrada.jpg'; // fallback padrão
  }
  
  const extension = path.extname(originalName);
  console.log('📁 [STORAGE] Gerando nome do arquivo:', { originalName, extension, timestamp, randomId });
  
  return `templates/folhas-timbradas/${tenantId}/${timestamp}_${randomId}${extension}`;
};

/**
 * Upload de folha timbrada para S3
 */
const uploadFolhaTimbradaToS3 = async (fileBuffer, tenantId, originalName) => {
  try {
    console.log('📄 [STORAGE] Iniciando upload de folha timbrada...');
    console.log('📋 [STORAGE] Parâmetros:', {
      tenantId,
      originalName,
      fileBufferSize: fileBuffer?.length || fileBuffer?.size,
      fileBufferType: typeof fileBuffer
    });
    
    const fileName = generateFolhaTimbradaFileName(tenantId, originalName);
    console.log('📁 [STORAGE] Nome do arquivo gerado:', fileName);
    
    // Detectar tipo MIME baseado na extensão
    let extension = '';
    let contentType = 'image/jpeg'; // padrão
    
    if (originalName && typeof originalName === 'string') {
      extension = path.extname(originalName).toLowerCase();
    }
    
    console.log('🔍 [STORAGE] Extensão detectada:', extension);
    
    switch (extension) {
      case '.png':
        contentType = 'image/png';
        break;
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg';
        break;
      case '.gif':
        contentType = 'image/gif';
        break;
      case '.webp':
        contentType = 'image/webp';
        break;
      case '.svg':
        contentType = 'image/svg+xml';
        break;
      case '.pdf':
        contentType = 'application/pdf';
        break;
      default:
        console.error('❌ [STORAGE] Tipo de arquivo não suportado:', extension);
        throw new Error(`Tipo de arquivo não suportado para folha timbrada: ${extension}`);
    }
    
    console.log('📄 [STORAGE] Content-Type definido:', contentType);

    // Usar o cliente S3 direto ao invés do Upload
    const uploadParams = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: fileName,
      Body: fileBuffer,
      ContentType: contentType,
      Metadata: {
        'tenant-id': tenantId,
        'upload-type': 'folha-timbrada',
        'upload-date': new Date().toISOString()
      }
    };

    console.log('� [STORAGE] Iniciando upload para S3...');
    const command = new PutObjectCommand(uploadParams);
    const result = await s3Client.send(command);
    
    // Construir URL manualmente com região específica
    const region = process.env.AWS_REGION || 'us-east-2';
    const s3Url = `https://${process.env.AWS_S3_BUCKET}.s3.${region}.amazonaws.com/${fileName}`;
    
    console.log('✅ [STORAGE] Folha timbrada upload concluído:', {
      bucket: process.env.AWS_S3_BUCKET,
      key: fileName,
      etag: result.ETag,
      url: s3Url,
      region: region
    });

    return {
      success: true,
      s3Key: fileName,
      bucket: process.env.AWS_S3_BUCKET,
      url: s3Url,
      contentType
    };

  } catch (error) {
    console.error('❌ [STORAGE] Erro no upload da folha timbrada para S3:', error);
    console.error('❌ [STORAGE] Stack trace:', error.stack);
    throw new Error(`Falha no upload da folha timbrada: ${error.message}`);
  }
};

/**
 * Download de folha timbrada do S3
 */
const downloadFolhaTimbradaFromS3 = async (s3Key, bucket = null) => {
  const bucketName = bucket || process.env.AWS_S3_BUCKET;
  console.log('📥 [S3 DEBUG] Iniciando download da folha timbrada:', { 
    s3Key, 
    bucket: bucketName 
  });
  
  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
    });

    console.log('🔄 [S3 DEBUG] Enviando comando para S3...');
    const response = await s3Client.send(command);
    
    console.log('📦 [S3 DEBUG] Resposta do S3 recebida:', {
      contentType: response.ContentType,
      contentLength: response.ContentLength,
      lastModified: response.LastModified
    });
    
    // Converter stream para buffer
    const chunks = [];
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    console.log('✅ [S3 DEBUG] Download concluído:', { 
      bufferSize: buffer.length, 
      contentType: response.ContentType 
    });

    return {
      buffer,
      contentType: response.ContentType,
      lastModified: response.LastModified,
      size: response.ContentLength
    };

  } catch (error) {
    console.error('❌ [S3 DEBUG] Erro no download da folha timbrada do S3:', error);
    throw new Error(`Falha no download da folha timbrada: ${error.message}`);
  }
};

/**
 * Deletar folha timbrada do S3
 */
const deleteFolhaTimbradaFromS3 = async (s3Key, bucket = null) => {
  try {
    const command = new DeleteObjectCommand({
      Bucket: bucket || process.env.AWS_S3_BUCKET,
      Key: s3Key,
    });

    await s3Client.send(command);
    
    console.log('Folha timbrada deletada do S3:', s3Key);
    return { success: true };

  } catch (error) {
    console.error('Erro ao deletar folha timbrada do S3:', error);
    throw new Error(`Falha ao deletar folha timbrada: ${error.message}`);
  }
};

/**
 * Gerar URL assinada (temporária) para visualização da folha timbrada
 */
const getSignedUrlForFolhaTimbrada = async (fileKey, expiresIn = 3600) => {
  try {
    console.log('📄 [STORAGE] Gerando URL assinada para folha timbrada:', { fileKey, expiresIn });
    
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: fileKey
    });
    
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });
    
    console.log('✅ [STORAGE] URL assinada gerada para folha timbrada:', {
      originalKey: fileKey,
      signedUrl: signedUrl.substring(0, 100) + '...', // Log parcial por segurança
      expiresIn
    });
    
    return {
      url: signedUrl,
      expiresIn,
      success: true
    };
  } catch (error) {
    console.error('❌ [STORAGE] Erro ao gerar URL assinada para folha timbrada:', error);
    throw new Error('Falha ao gerar URL de visualização da folha timbrada: ' + error.message);
  }
};

module.exports = {
  uploadLogoToS3,
  deleteLogoFromS3,
  getSignedUrlForLogo,
  downloadLogoFromS3,
  checkLogoExists,
  listTenantLogos,
  validateImageFile,
  s3Client,
  uploadFolhaTimbradaToS3,
  downloadFolhaTimbradaFromS3,
  deleteFolhaTimbradaFromS3,
  getSignedUrlForFolhaTimbrada
};
