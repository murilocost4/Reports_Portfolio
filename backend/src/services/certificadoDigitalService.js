const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const forge = require('node-forge');
const CertificadoDigital = require('../models/CertificadoDigital');
const { encrypt } = require('../utils/crypto');
const certificadoStorageService = require('./certificadoStorageService');

class CertificadoDigitalService {
  constructor() {
    // Para compatibilidade com certificados antigos no filesystem
    this.certificadosDir = path.join(__dirname, '../../storage/certificados');
    // Preferir armazenamento no S3 para novos certificados
    this.useS3Storage = process.env.STORAGE_TYPE === 'aws' && process.env.AWS_S3_BUCKET;
    
    if (this.useS3Storage) {
      console.log('Usando armazenamento seguro S3 para certificados');
    } else {
      console.log('Usando armazenamento local para certificados (não recomendado para produção)');
      this.ensureDirectoryExists();
    }
  }

  async ensureDirectoryExists() {
    try {
      await fs.access(this.certificadosDir);
    } catch {
      await fs.mkdir(this.certificadosDir, { recursive: true, mode: 0o700 });
    }
  }

  /**
   * Analisa um certificado PFX/P12 e extrai informações
   */
  async analisarCertificado(bufferCertificado, senha) {
    try {
      // Converter buffer para base64 para o forge
      const p12Asn1 = forge.asn1.fromDer(bufferCertificado.toString('binary'));
      const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, senha);

      // Extrair certificado
      const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
      const cert = certBags[forge.pki.oids.certBag][0].cert;

      // Extrair chave privada
      const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
      const privateKey = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag][0].key;

      if (!cert || !privateKey) {
        throw new Error('Certificado ou chave privada não encontrados no arquivo');
      }

      // Extrair informações do certificado
      const subject = cert.subject.attributes;
      const issuer = cert.issuer.attributes;
      
      const nomeCompleto = subject.find(attr => attr.name === 'commonName')?.value || 
                          subject.find(attr => attr.shortName === 'CN')?.value || 'Nome não encontrado';
      
      const emissor = issuer.find(attr => attr.name === 'commonName')?.value || 
                     issuer.find(attr => attr.shortName === 'CN')?.value || 'Emissor não encontrado';

      // Gerar fingerprint
      const fingerprint = forge.md.sha256.create();
      fingerprint.update(forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes());
      
      return {
        valido: true,
        nomeCertificado: nomeCompleto,
        numeroSerie: cert.serialNumber,
        emissor: emissor,
        dataEmissao: cert.validity.notBefore,
        dataVencimento: cert.validity.notAfter,
        fingerprint: fingerprint.digest().toHex().toUpperCase(),
        algoritmoAssinatura: cert.signatureOid,
        tamanhoChave: privateKey.n ? privateKey.n.bitLength() : 2048,
        certificado: cert,
        chavePrivada: privateKey
      };
    } catch (error) {
      console.error('Erro ao analisar certificado');
      throw new Error(`Erro ao analisar certificado`);
    }
  }

  /**
   * Salva o certificado de forma segura (S3 ou filesystem)
   */
  async salvarCertificadoSeguro(medicoId, bufferCertificado, nomeOriginal) {
    try {
      if (this.useS3Storage) {
        // Usar armazenamento seguro S3
        const resultado = await certificadoStorageService.salvarCertificadoSeguro(
          medicoId, 
          bufferCertificado, 
          nomeOriginal,
          {
            'service': 'certificado-digital',
            'version': '2.0'
          }
        );
        
        return {
          caminhoArquivo: resultado.fileName, // S3 key
          nomeArquivo: path.basename(resultado.fileName),
          caminhoRelativo: resultado.fileName,
          storageType: 's3',
          location: resultado.location
        };
      } else {
        // Fallback para filesystem local (compatibilidade)
        return await this.salvarCertificadoLocal(medicoId, bufferCertificado, nomeOriginal);
      }
    } catch (error) {
      console.error('Erro ao salvar certificado seguro:', error);
      throw new Error('Erro ao salvar certificado no armazenamento seguro');
    }
  }

  /**
   * Método legacy para salvar no filesystem local
   */
  async salvarCertificadoLocal(medicoId, bufferCertificado, nomeOriginal) {
    try {
      // Gerar nome único para o arquivo
      const timestamp = Date.now();
      const hash = crypto.createHash('sha256').update(bufferCertificado).digest('hex').substring(0, 16);
      const extensao = path.extname(nomeOriginal) || '.pfx';
      const nomeArquivo = `cert_${medicoId}_${timestamp}_${hash}${extensao}`;
      
      const caminhoCompleto = path.join(this.certificadosDir, nomeArquivo);
      
      // Criptografar o conteúdo do arquivo antes de salvar
      const conteudoCriptografado = encrypt(bufferCertificado.toString('base64'));
      
      await fs.writeFile(caminhoCompleto, conteudoCriptografado, { mode: 0o600 });
      
      return {
        caminhoArquivo: caminhoCompleto,
        nomeArquivo: nomeArquivo,
        caminhoRelativo: `certificados/${nomeArquivo}`,
        storageType: 'filesystem'
      };
    } catch (error) {
      console.error('Erro ao salvar certificado local:', error);
      throw new Error('Erro ao salvar certificado no sistema de arquivos local');
    }
  }

  /**
   * Carrega um certificado do armazenamento seguro (S3 ou filesystem)
   */
  async carregarCertificado(caminhoArquivo) {
    try {
      // Verificar se é um caminho S3 ou filesystem
      if (caminhoArquivo.startsWith('certificados/')) {
        // Caminho S3
        if (this.useS3Storage) {
          const resultado = await certificadoStorageService.carregarCertificadoSeguro(caminhoArquivo);
          return resultado.buffer;
        } else {
          // Fallback para filesystem se S3 não estiver disponível
          return await this.carregarCertificadoLocal(path.join(this.certificadosDir, path.basename(caminhoArquivo)));
        }
      } else {
        // Caminho completo do filesystem (compatibilidade)
        return await this.carregarCertificadoLocal(caminhoArquivo);
      }
    } catch (error) {
      console.error('Erro ao carregar certificado:', error);
      throw new Error('Erro ao carregar certificado do armazenamento');
    }
  }

  /**
   * Método legacy para carregar do filesystem local
   */
  async carregarCertificadoLocal(caminhoArquivo) {
    try {
      const { decrypt } = require('../utils/crypto');
      const conteudoCriptografado = await fs.readFile(caminhoArquivo, 'utf8');
      const conteudoDescriptografado = decrypt(conteudoCriptografado);
      return Buffer.from(conteudoDescriptografado, 'base64');
    } catch (error) {
      console.error('Erro ao carregar certificado local:', error);
      throw new Error('Erro ao carregar certificado do sistema de arquivos local');
    }
  }

  /**
   * Registra um novo certificado para um médico
   */
  async registrarCertificado(medicoId, arquivoCertificado, senha, dadosAdicionais = {}, requestInfo = {}) {
    try {
      // Validar se já existe um certificado ativo para este médico
      const certificadoExistente = await CertificadoDigital.findOne({
        medicoId,
        ativo: true,
        dataVencimento: { $gt: new Date() }
      });

      if (certificadoExistente) {
        throw new Error('Já existe um certificado ativo para este médico. Desative o atual antes de cadastrar um novo.');
      }

      // Analisar o certificado
      const infoCertificado = await this.analisarCertificado(arquivoCertificado.buffer, senha);
      
      // Verificar se o certificado não está vencido
      if (infoCertificado.dataVencimento <= new Date()) {
        throw new Error('O certificado fornecido está vencido');
      }

      // Verificar se o fingerprint já existe
      const certificadoDuplicado = await CertificadoDigital.findOne({
        fingerprint: infoCertificado.fingerprint
      });

      if (certificadoDuplicado) {
        throw new Error('Este certificado já está cadastrado no sistema');
      }

      // Salvar arquivo de forma segura
      const arquivoInfo = await this.salvarCertificadoSeguro(
        medicoId, 
        arquivoCertificado.buffer, 
        arquivoCertificado.originalname
      );        // Criar registro no banco
        const bcrypt = require('bcryptjs');
        const senhaHash = await bcrypt.hash(senha, 10);
        
        const novoCertificado = new CertificadoDigital({
          medicoId,
          nomeCertificado: infoCertificado.nomeCertificado,
          numeroSerie: infoCertificado.numeroSerie,
          emissor: infoCertificado.emissor,
          dataEmissao: infoCertificado.dataEmissao,
          dataVencimento: infoCertificado.dataVencimento,
          arquivoCertificado: arquivoInfo.caminhoRelativo,
          storageType: arquivoInfo.storageType || 's3', // Indicar o tipo de armazenamento
          senhaCertificado: senha,  // Senha original criptografada
          senhaHash: senhaHash,     // Hash da senha para validação
          fingerprint: infoCertificado.fingerprint,
          algoritmoAssinatura: infoCertificado.algoritmoAssinatura,
          tamanhoChave: infoCertificado.tamanhoChave,
          validado: true, // Validação automática por análise bem-sucedida
          criadoPor: medicoId,
          ipCriacao: requestInfo.ip,
          userAgentCriacao: requestInfo.userAgent,
          ...dadosAdicionais
        });

      await novoCertificado.save();

      return {
        sucesso: true,
        certificadoId: novoCertificado._id,
        informacoes: {
          nome: infoCertificado.nomeCertificado,
          emissor: infoCertificado.emissor,
          dataVencimento: infoCertificado.dataVencimento,
          diasVencimento: novoCertificado.diasVencimento,
          status: novoCertificado.status
        }
      };
    } catch (error) {
      console.error('Erro ao registrar certificado');
      throw error;
    }
  }

  /**
   * Obtém o certificado ativo de um médico para assinatura
   */
  async obterCertificadoParaAssinatura(medicoId) {
    try {
      const certificado = await CertificadoDigital.findOne({
        medicoId,
        ativo: true,
        dataVencimento: { $gt: new Date() }
      }).populate('medicoId', 'nome crm');

      if (!certificado) {
        throw new Error('Nenhum certificado ativo encontrado para este médico');
      }

      if (certificado.estaVencido()) {
        throw new Error('O certificado está vencido');
      }

      // Carregar arquivo do certificado
      const bufferCertificado = await this.carregarCertificado(certificado.arquivoCertificado);

      return {
        certificadoId: certificado._id,
        bufferCertificado,
        senha: certificado.senhaCertificado, // Retorna a senha descriptografada
        informacoes: {
          nome: certificado.nomeCertificado,
          emissor: certificado.emissor,
          dataVencimento: certificado.dataVencimento,
          medico: certificado.medicoId.nome,
          storageType: certificado.storageType || 'filesystem'
        }
      };
    } catch (error) {
      console.error('Erro ao obter certificado para assinatura');
      throw error;
    }
  }

  /**
   * Valida um certificado e senha antes do uso
   */
  async validarCertificadoParaUso(certificadoId, senhaFornecida) {
    try {
      const certificado = await CertificadoDigital.findById(certificadoId);
      
      if (!certificado) {
        throw new Error('Certificado não encontrado');
      }

      if (!certificado.ativo) {
        throw new Error('Certificado inativo');
      }

      if (certificado.estaVencido()) {
        throw new Error('Certificado vencido');
      }

      if (!(await certificado.validarSenha(senhaFornecida))) {
        await certificado.registrarUso(false, null, 'Senha incorreta');
        throw new Error('Senha do certificado incorreta');
      }

      return true;
    } catch (error) {
      console.error('Erro ao validar certificado');
      throw error;
    }
  }

  /**
   * Remove um certificado (desativa e remove arquivo)
   */
  async removerCertificado(certificadoId, medicoId) {
    try {
      const certificado = await CertificadoDigital.findOne({
        _id: certificadoId,
        medicoId
      });

      if (!certificado) {
        throw new Error('Certificado não encontrado');
      }

      // Desativar no banco
      certificado.ativo = false;
      await certificado.save();

      // Remover arquivo físico (S3 ou filesystem)
      try {
        await this.removerArquivoCertificado(certificado.arquivoCertificado, certificado.storageType);
      } catch (error) {
        console.warn('Erro ao remover arquivo do certificado:', error.message);
      }

      return { sucesso: true };
    } catch (error) {
      console.error('Erro ao remover certificado');
      throw error;
    }
  }

  /**
   * Lista certificados de um médico
   */
  async listarCertificadosMedico(medicoId, incluirInativos = false) {
    try {
      const filtro = { medicoId };
      
      if (!incluirInativos) {
        filtro.ativo = true;
      }

      const certificados = await CertificadoDigital.find(filtro)
        .select('-senhaCertificado -arquivoCertificado -tentativasUso')
        .sort({ createdAt: -1 });

      return certificados.map(cert => ({
        id: cert._id,
        nomeCertificado: cert.nomeCertificado,
        emissor: cert.emissor,
        dataEmissao: cert.dataEmissao,
        dataVencimento: cert.dataVencimento,
        status: cert.status,
        diasVencimento: cert.diasVencimento,
        totalAssinaturas: cert.totalAssinaturas,
        ultimoUso: cert.ultimoUso,
        proximoVencimento: cert.proximoVencimento(),
        createdAt: cert.createdAt
      }));
    } catch (error) {
      console.error('Erro ao listar certificados');
      throw error;
    }
  }

  /**
   * Verifica certificados próximos do vencimento
   */
  async verificarVencimentosCertificados(diasAviso = 30) {
    try {
      const dataLimite = new Date();
      dataLimite.setDate(dataLimite.getDate() + diasAviso);

      const certificados = await CertificadoDigital.find({
        ativo: true,
        dataVencimento: {
          $gte: new Date(),
          $lte: dataLimite
        }
      }).populate('medicoId', 'nome email');

      return certificados.map(cert => ({
        certificadoId: cert._id,
        medico: {
          id: cert.medicoId._id,
          nome: cert.medicoId.nome,
          email: cert.medicoId.email
        },
        nomeCertificado: cert.nomeCertificado,
        dataVencimento: cert.dataVencimento,
        diasRestantes: cert.diasVencimento
      }));
    } catch (error) {
      console.error('Erro ao verificar vencimentos');
      throw error;
    }
  }

  /**
   * Remove arquivo de certificado (S3 ou filesystem)
   */
  async removerArquivoCertificado(caminhoArquivo, storageType) {
    try {
      if (storageType === 's3' || caminhoArquivo.startsWith('certificados/')) {
        // Remover do S3
        await certificadoStorageService.deletarCertificadoSeguro(caminhoArquivo);
      } else {
        // Remover do filesystem local (legacy)
        const fs = require('fs').promises;
        const caminhoCompleto = path.join(this.certificadosDir, path.basename(caminhoArquivo));
        await fs.unlink(caminhoCompleto);
      }
    } catch (error) {
      console.error('Erro ao remover arquivo do certificado:', error);
      throw error;
    }
  }

  /**
   * Migrar todos os certificados para S3
   */
  async migrarCertificadosParaS3() {
    console.log('Iniciando migração de certificados para S3...');
    
    try {
      const resultado = {
        total: 0,
        sucesso: 0,
        falhas: 0,
        detalhes: []
      };

      // Buscar certificados que ainda estão no filesystem
      const certificados = await CertificadoDigital.find({
        $or: [
          { storageType: 'filesystem' },
          { storageType: { $exists: false } }
        ]
      });

      resultado.total = certificados.length;

      if (resultado.total === 0) {
        console.log('Nenhum certificado para migrar');
        return resultado;
      }

      for (const certificado of certificados) {
        try {
          console.log(`Migrando certificado ${certificado._id}...`);

          // Carregar certificado do filesystem
          const caminhoLocal = path.join(this.certificadosDir, path.basename(certificado.arquivoCertificado));
          const bufferCertificado = await this.carregarCertificadoLocal(caminhoLocal);

          // Salvar no S3
          const resultadoS3 = await certificadoStorageService.salvarCertificadoSeguro(
            certificado.medicoId,
            bufferCertificado,
            `migrado_${certificado.nomeCertificado}.pfx`,
            {
              'migrated-from': 'filesystem',
              'migration-date': new Date().toISOString(),
              'original-path': certificado.arquivoCertificado
            }
          );

          // Atualizar registro no banco
          certificado.arquivoCertificado = resultadoS3.fileName;
          certificado.storageType = 's3';
          await certificado.save();

          // Remover arquivo local
          const fs = require('fs').promises;
          await fs.unlink(caminhoLocal);

          resultado.sucesso++;
          resultado.detalhes.push({
            certificadoId: certificado._id,
            status: 'sucesso',
            novoPath: resultadoS3.fileName
          });

          console.log(`✅ Certificado ${certificado._id} migrado com sucesso`);

        } catch (error) {
          console.error(`❌ Erro ao migrar certificado ${certificado._id}:`, error.message);
          resultado.falhas++;
          resultado.detalhes.push({
            certificadoId: certificado._id,
            status: 'falha',
            erro: error.message
          });
        }
      }

      console.log(`Migração concluída: ${resultado.sucesso} sucessos, ${resultado.falhas} falhas`);
      return resultado;

    } catch (error) {
      console.error('Erro geral na migração:', error);
      throw error;
    }
  }

  /**
   * Validar integridade de todos os certificados
   */
  async validarIntegridadeCertificados() {
    try {
      const certificados = await CertificadoDigital.find({});
      
      const resultado = {
        total: certificados.length,
        validos: 0,
        invalidos: 0,
        detalhes: []
      };

      for (const certificado of certificados) {
        try {
          // Tentar carregar o certificado
          const bufferCertificado = await this.carregarCertificado(certificado.arquivoCertificado);
          
          if (bufferCertificado && bufferCertificado.length > 0) {
            resultado.validos++;
            resultado.detalhes.push({
              certificadoId: certificado._id,
              status: 'válido',
              tamanho: bufferCertificado.length,
              storageType: certificado.storageType || 'filesystem'
            });
          } else {
            resultado.invalidos++;
            resultado.detalhes.push({
              certificadoId: certificado._id,
              status: 'inválido',
              erro: 'Certificado vazio'
            });
          }
        } catch (error) {
          resultado.invalidos++;
          resultado.detalhes.push({
            certificadoId: certificado._id,
            status: 'inválido',
            erro: error.message
          });
        }
      }

      return resultado;
    } catch (error) {
      console.error('Erro na validação de integridade:', error);
      throw error;
    }
  }

  /**
   * Limpar certificados órfãos
   */
  async limparCertificadosOrfaos() {
    try {
      const certificados = await CertificadoDigital.find({});
      
      const resultado = {
        certificadosNoBanco: certificados.length,
        orfaosRemovidos: 0,
        erros: []
      };

      // Para certificados no S3, verificar se existem
      for (const certificado of certificados) {
        if (certificado.storageType === 's3') {
          try {
            const existe = await certificadoStorageService.verificarExistenciaCertificado(certificado.arquivoCertificado);
            if (!existe) {
              console.log(`Certificado órfão encontrado: ${certificado._id}`);
              // Marcar como inativo em vez de deletar
              certificado.ativo = false;
              await certificado.save();
              resultado.orfaosRemovidos++;
            }
          } catch (error) {
            resultado.erros.push({
              certificadoId: certificado._id,
              erro: error.message
            });
          }
        }
      }

      return resultado;
    } catch (error) {
      console.error('Erro na limpeza de órfãos:', error);
      throw error;
    }
  }
}

module.exports = new CertificadoDigitalService();
