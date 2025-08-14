const certificadoService = require('../services/certificadoDigitalService');
const certificadoStorageService = require('../services/certificadoStorageService');

/**
 * Controlador administrativo para gerenciamento de certificados
 * Apenas usuários com role 'admin' podem acessar estas funcionalidades
 */

/**
 * Migrar certificados do filesystem para S3
 */
exports.migrarCertificados = async (req, res) => {
  try {
    // Verificar se o usuário é admin
    if (req.usuario.role !== 'admin') {
      return res.status(403).json({
        erro: 'Acesso negado. Apenas administradores podem executar migrações.'
      });
    }

    console.log(`Admin ${req.usuario.nome} iniciou migração de certificados`);

    const resultado = await certificadoService.migrarCertificadosParaS3();

    res.json({
      sucesso: true,
      mensagem: 'Migração de certificados concluída',
      resultado: {
        total: resultado.total,
        migrados: resultado.sucesso,
        falhas: resultado.falhas,
        detalhes: resultado.detalhes
      }
    });

  } catch (error) {
    console.error('Erro na migração de certificados:', error);
    res.status(500).json({
      erro: 'Erro interno ao migrar certificados',
      detalhes: error.message
    });
  }
};

/**
 * Validar integridade de todos os certificados
 */
exports.validarIntegridade = async (req, res) => {
  try {
    if (req.usuario.role !== 'admin') {
      return res.status(403).json({
        erro: 'Acesso negado. Apenas administradores podem validar certificados.'
      });
    }

    const resultado = await certificadoService.validarIntegridadeCertificados();

    res.json({
      sucesso: true,
      resultado: {
        total: resultado.total,
        validos: resultado.validos,
        invalidos: resultado.invalidos,
        detalhes: resultado.detalhes
      }
    });

  } catch (error) {
    console.error('Erro na validação de integridade:', error);
    res.status(500).json({
      erro: 'Erro interno ao validar certificados',
      detalhes: error.message
    });
  }
};

/**
 * Obter estatísticas dos certificados
 */
exports.obterEstatisticas = async (req, res) => {
  try {
    if (!['admin', 'gestor'].includes(req.usuario.role)) {
      return res.status(403).json({
        erro: 'Acesso negado. Apenas administradores e gestores podem ver estatísticas.'
      });
    }

    const CertificadoDigital = require('../models/CertificadoDigital');
    
    const total = await CertificadoDigital.countDocuments();
    const ativos = await CertificadoDigital.countDocuments({ ativo: true });
    const vencidos = await CertificadoDigital.countDocuments({ 
      dataVencimento: { $lt: new Date() } 
    });
    const s3Storage = await CertificadoDigital.countDocuments({ 
      storageType: 's3' 
    });
    const filesystemStorage = await CertificadoDigital.countDocuments({ 
      $or: [
        { storageType: 'filesystem' },
        { storageType: { $exists: false } }
      ]
    });

    // Próximos vencimentos (30 dias)
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() + 30);
    
    const proximosVencimentos = await CertificadoDigital.find({
      ativo: true,
      dataVencimento: { 
        $gte: new Date(),
        $lte: dataLimite 
      }
    }).populate('medicoId', 'nome').limit(10);

    res.json({
      sucesso: true,
      estatisticas: {
        total,
        ativos,
        vencidos,
        armazenamento: {
          s3: s3Storage,
          filesystem: filesystemStorage
        },
        proximosVencimentos: proximosVencimentos.map(cert => ({
          id: cert._id,
          nome: cert.nomeCertificado,
          medico: cert.medicoId?.nome || 'N/A',
          dataVencimento: cert.dataVencimento,
          diasRestantes: Math.ceil((cert.dataVencimento - new Date()) / (1000 * 60 * 60 * 24))
        }))
      }
    });

  } catch (error) {
    console.error('Erro ao obter estatísticas:', error);
    res.status(500).json({
      erro: 'Erro interno ao obter estatísticas',
      detalhes: error.message
    });
  }
};

/**
 * Limpar certificados órfãos
 */
exports.limparOrfaos = async (req, res) => {
  try {
    if (req.usuario.role !== 'admin') {
      return res.status(403).json({
        erro: 'Acesso negado. Apenas administradores podem limpar órfãos.'
      });
    }

    const resultado = await certificadoService.limparCertificadosOrfaos();

    res.json({
      sucesso: true,
      mensagem: 'Limpeza de certificados órfãos concluída',
      resultado
    });

  } catch (error) {
    console.error('Erro na limpeza de órfãos:', error);
    res.status(500).json({
      erro: 'Erro interno ao limpar órfãos',
      detalhes: error.message
    });
  }
};

/**
 * Forçar migração de um certificado específico
 */
exports.migrarCertificadoId = async (req, res) => {
  try {
    if (req.usuario.role !== 'admin') {
      return res.status(403).json({
        erro: 'Acesso negado. Apenas administradores podem migrar certificados.'
      });
    }

    const { certificadoId } = req.params;
    const CertificadoDigital = require('../models/CertificadoDigital');
    
    const certificado = await CertificadoDigital.findById(certificadoId);
    if (!certificado) {
      return res.status(404).json({
        erro: 'Certificado não encontrado'
      });
    }

    if (certificado.storageType === 's3') {
      return res.status(400).json({
        erro: 'Certificado já está no S3'
      });
    }

    // Migrar certificado específico
    const fs = require('fs').promises;
    const path = require('path');
    
    const caminhoLocal = path.join(
      __dirname, 
      '../../storage/certificados', 
      path.basename(certificado.arquivoCertificado)
    );

    const bufferCertificado = await certificadoService.carregarCertificadoLocal(caminhoLocal);
    
    const resultado = await certificadoStorageService.salvarCertificadoSeguro(
      certificado.medicoId,
      bufferCertificado,
      `migrado_${certificado.nomeCertificado}.pfx`,
      {
        'migrated-from': 'filesystem',
        'migration-date': new Date().toISOString(),
        'manual-migration': 'true',
        'admin-user': req.usuario.id
      }
    );

    // Atualizar registro
    certificado.arquivoCertificado = resultado.fileName;
    certificado.storageType = 's3';
    await certificado.save();

    // Remover arquivo local
    try {
      await fs.unlink(caminhoLocal);
    } catch (unlinkError) {
      console.warn('Arquivo local não pôde ser removido:', unlinkError.message);
    }

    res.json({
      sucesso: true,
      mensagem: 'Certificado migrado com sucesso',
      certificado: {
        id: certificado._id,
        nome: certificado.nomeCertificado,
        novoPath: resultado.fileName,
        storageType: 's3'
      }
    });

  } catch (error) {
    console.error('Erro ao migrar certificado específico:', error);
    res.status(500).json({
      erro: 'Erro interno ao migrar certificado',
      detalhes: error.message
    });
  }
};

/**
 * Testar conectividade com S3
 */
exports.testarS3 = async (req, res) => {
  try {
    if (req.usuario.role !== 'admin') {
      return res.status(403).json({
        erro: 'Acesso negado'
      });
    }

    // Testar conexão básica com S3
    const testBuffer = Buffer.from('teste-conectividade-s3', 'utf8');
    const nomeArquivoTeste = `teste-s3-${Date.now()}.txt`;

    const resultado = await certificadoStorageService.salvarCertificadoSeguro(
      'teste',
      testBuffer,
      nomeArquivoTeste,
      { 'test': 'true' }
    );

    // Verificar se consegue ler
    const dadosLidos = await certificadoStorageService.carregarCertificadoSeguro(resultado.fileName);

    // Limpar arquivo de teste
    await certificadoStorageService.deletarCertificadoSeguro(resultado.fileName);

    res.json({
      sucesso: true,
      mensagem: 'Conectividade com S3 OK',
      teste: {
        arquivoSalvo: resultado.success,
        arquivoLido: dadosLidos.success,
        tamanhoOriginal: testBuffer.length,
        tamanhoLido: dadosLidos.buffer?.length || 0
      }
    });

  } catch (error) {
    console.error('Erro no teste S3:', error);
    res.status(500).json({
      erro: 'Erro no teste de conectividade S3',
      detalhes: error.message
    });
  }
};
