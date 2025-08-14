const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');
const path = require('path');
const { encrypt, decrypt } = require('../utils/crypto');

class CertificadoStorageService {
  constructor() {
    // Inicializar cliente S3
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
    
    this.bucket = process.env.AWS_S3_BUCKET;
    this.certificadosPrefix = 'certificados/';
    
    if (!this.bucket) {
      throw new Error('AWS_S3_BUCKET não configurado');
    }
  }

  /**
   * Gera um nome único e seguro para o certificado
   */
  generateSecureFileName(medicoId, originalName) {
    const timestamp = Date.now();
    const randomId = crypto.randomUUID();
    const hash = crypto.createHash('sha256')
      .update(`${medicoId}_${timestamp}_${randomId}`)
      .digest('hex')
      .substring(0, 16);
    
    const extension = path.extname(originalName) || '.pfx';
    return `${this.certificadosPrefix}${medicoId}/${timestamp}_${hash}${extension}`;
  }

  /**
   * Salva um certificado de forma segura no S3
   */
  async salvarCertificadoSeguro(medicoId, bufferCertificado, nomeOriginal, metadados = {}) {
    try {
      // Gerar nome único para o arquivo
      const fileName = this.generateSecureFileName(medicoId, nomeOriginal);
      
      // Criptografar o conteúdo do certificado antes de salvar
      const conteudoCriptografado = encrypt(bufferCertificado.toString('base64'));
      
      // Preparar comando de upload
      const uploadCommand = new PutObjectCommand({
        Bucket: this.bucket,
        Key: fileName,
        Body: Buffer.from(conteudoCriptografado),
        ContentType: 'application/octet-stream',
        ServerSideEncryption: 'AES256',
        StorageClass: 'STANDARD_IA', // Classe de armazenamento para arquivos de acesso pouco frequente
        Metadata: {
          'medico-id': medicoId.toString(),
          'original-name': nomeOriginal,
          'upload-date': new Date().toISOString(),
          'content-type': 'certificate',
          'encrypted': 'true',
          ...metadados
        },
        TagSet: [
          { Key: 'Type', Value: 'Certificate' },
          { Key: 'MedicoId', Value: medicoId.toString() },
          { Key: 'Encrypted', Value: 'true' }
        ]
      });
      
      const result = await this.s3Client.send(uploadCommand);
      
      console.log(`Certificado salvo com segurança no S3: ${fileName}`);
      
      return {
        success: true,
        fileName: fileName,
        etag: result.ETag,
        location: `s3://${this.bucket}/${fileName}`,
        metadata: {
          medicoId,
          originalName: nomeOriginal,
          uploadDate: new Date().toISOString(),
          encrypted: true
        }
      };
    } catch (error) {
      console.error('Erro ao salvar certificado no S3:', error);
      throw new Error(`Erro ao salvar certificado de forma segura: ${error.message}`);
    }
  }

  /**
   * Carrega um certificado do S3 de forma segura
   */
  async carregarCertificadoSeguro(fileName) {
    try {
      const getCommand = new GetObjectCommand({
        Bucket: this.bucket,
        Key: fileName
      });
      
      const response = await this.s3Client.send(getCommand);
      
      // Ler o conteúdo do stream
      const chunks = [];
      for await (const chunk of response.Body) {
        chunks.push(chunk);
      }
      const conteudoCriptografado = Buffer.concat(chunks).toString();
      
      // Descriptografar o conteúdo
      const conteudoDescriptografado = decrypt(conteudoCriptografado);
      
      return {
        success: true,
        buffer: Buffer.from(conteudoDescriptografado, 'base64'),
        metadata: response.Metadata
      };
    } catch (error) {
      console.error('Erro ao carregar certificado do S3:', error);
      throw new Error(`Erro ao carregar certificado: ${error.message}`);
    }
  }

  /**
   * Deleta um certificado do S3
   */
  async deletarCertificadoSeguro(fileName) {
    try {
      const deleteCommand = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: fileName
      });
      
      await this.s3Client.send(deleteCommand);
      
      console.log(`Certificado deletado do S3: ${fileName}`);
      
      return {
        success: true,
        message: 'Certificado deletado com sucesso'
      };
    } catch (error) {
      console.error('Erro ao deletar certificado do S3:', error);
      throw new Error(`Erro ao deletar certificado: ${error.message}`);
    }
  }

  /**
   * Verifica se um certificado existe no S3
   */
  async verificarExistenciaCertificado(fileName) {
    try {
      const getCommand = new GetObjectCommand({
        Bucket: this.bucket,
        Key: fileName
      });
      
      await this.s3Client.send(getCommand);
      return true;
    } catch (error) {
      if (error.name === 'NoSuchKey') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Gera uma URL assinada temporária para acesso ao certificado (apenas para debug/admin)
   */
  async gerarUrlAssinadaTemporaria(fileName, expiresIn = 3600) {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: fileName
      });
      
      const signedUrl = await getSignedUrl(this.s3Client, command, { expiresIn });
      
      return {
        success: true,
        url: signedUrl,
        expiresIn: expiresIn
      };
    } catch (error) {
      console.error('Erro ao gerar URL assinada:', error);
      throw new Error(`Erro ao gerar URL temporária: ${error.message}`);
    }
  }

  /**
   * Lista certificados de um médico específico
   */
  async listarCertificadosMedico(medicoId) {
    try {
      const { ListObjectsV2Command } = require('@aws-sdk/client-s3');
      
      const listCommand = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: `${this.certificadosPrefix}${medicoId}/`,
        MaxKeys: 100
      });
      
      const response = await this.s3Client.send(listCommand);
      
      const certificados = response.Contents ? response.Contents.map(obj => ({
        fileName: obj.Key,
        size: obj.Size,
        lastModified: obj.LastModified,
        etag: obj.ETag
      })) : [];
      
      return {
        success: true,
        certificados,
        count: certificados.length
      };
    } catch (error) {
      console.error('Erro ao listar certificados do médico:', error);
      throw new Error(`Erro ao listar certificados: ${error.message}`);
    }
  }

  /**
   * Migra um certificado do filesystem local para o S3
   */
  async migrarCertificadoParaS3(caminhoLocal, medicoId, nomeOriginal) {
    try {
      const fs = require('fs').promises;
      
      // Ler certificado do filesystem local
      const conteudoLocal = await fs.readFile(caminhoLocal);
      
      // Descriptografar se necessário (assumindo que já está criptografado)
      let bufferCertificado;
      try {
        // Tentar descriptografar (se estiver criptografado)
        const conteudoDescriptografado = decrypt(conteudoLocal.toString());
        bufferCertificado = Buffer.from(conteudoDescriptografado, 'base64');
      } catch {
        // Se não conseguir descriptografar, assumir que é raw
        bufferCertificado = conteudoLocal;
      }
      
      // Salvar no S3
      const resultado = await this.salvarCertificadoSeguro(
        medicoId, 
        bufferCertificado, 
        nomeOriginal,
        {
          'migrated-from': 'filesystem',
          'migration-date': new Date().toISOString()
        }
      );
      
      return resultado;
    } catch (error) {
      console.error('Erro ao migrar certificado:', error);
      throw new Error(`Erro na migração: ${error.message}`);
    }
  }

  /**
   * Validar integridade de um certificado no S3
   */
  async validarIntegridadeCertificado(fileName) {
    try {
      const resultado = await this.carregarCertificadoSeguro(fileName);
      
      if (!resultado.success || !resultado.buffer) {
        return {
          valid: false,
          error: 'Certificado não pôde ser carregado'
        };
      }
      
      // Verificar se o buffer não está vazio
      if (resultado.buffer.length === 0) {
        return {
          valid: false,
          error: 'Certificado está vazio'
        };
      }
      
      return {
        valid: true,
        size: resultado.buffer.length,
        metadata: resultado.metadata
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }
}

module.exports = new CertificadoStorageService();
