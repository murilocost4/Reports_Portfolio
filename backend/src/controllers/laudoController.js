const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const mongoose = require('mongoose');
const Laudo = require('../models/Laudo');
const Exame = require('../models/Exame');
const { sendMedicalReport } = require('../services/emailService');
const logger = require('../utils/logger');
const QRCode = require('qrcode');
const AuditLog = require('../models/AuditModel');
const Usuario = require('../models/Usuario');
const { uploadPDFToUploadcare } = require('../services/uploadcareService');
const { 
  uploadLaudoToS3, 
  deleteLaudoFromS3, 
  getSignedUrlForLaudo,
  uploadLaudoStreamToS3 
} = require('../services/laudoStorageService');
const imageSize = require('image-size');
const { plainAddPlaceholder } = require('@signpdf/placeholder-plain');
const {
  getTemplateConfig,
  applyTemplateConfig,
  applyFolhaTimbradaBackground,
  addCustomHeader,
  addCustomFooter,
  getTemplateStyles,
  shouldShowElement,
  applyAdvancedSectionStyle,
  calculateElementPosition,
  addAdvancedHeader,
  addAdvancedPatientInfo,
  addAdvancedExamInfo,
  addAdvancedConclusion,
  addAdvancedAuthSection,
  addAdvancedFooter,
  // Novas funções para folha timbrada simplificada
  applySimplifiedTextStyles,
  getSimplifiedSpacing,
  shouldUseSimplifiedLayout,
  renderSimplifiedText
} = require('../utils/templatePDFUtils');
const { encrypt, decrypt } = require('../utils/crypto');
const { validationResult } = require('express-validator');
const { format } = require('date-fns');

// Configurações de diretórios
const LAUDOS_DIR = path.join(__dirname, '../../laudos');
const LAUDOS_ASSINADOS_DIR = path.join(LAUDOS_DIR, 'assinado');
const LOGO_PATH = path.join(__dirname, '../assets/logo-png.png');
const LOGO_LAUDOFY = path.join(__dirname, '../assets/laudofy-logo.png');
const ASSINATURA_PATH = path.join(__dirname, '../assets/assinatura_sem_fundo.png');
const CERTIFICATE_PATH = path.join(__dirname, '../config/certificado.pfx');

// Criar diretórios se não existirem
try {
  [LAUDOS_DIR, LAUDOS_ASSINADOS_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
} catch (err) {
  console.error('Could not create directories:');
  process.exit(1);
}

// Função auxiliar para calcular idade
function calcularIdade(dataNascimento) {
  const hoje = new Date();
  const nascimento = new Date(dataNascimento);
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const m = hoje.getMonth() - nascimento.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) {
    idade--;
  }
  return idade;
}

// Função auxiliar para obter laudo com dados descriptografados
const obterLaudoPorId = async (laudoId) => {
  const laudo = await Laudo.findById(laudoId)
    .populate({
      path: 'exame',
      populate: [
        {
          path: 'paciente',
          select: 'nome dataNascimento email cpf endereco telefone'
        },
        {
          path: 'tipoExame',
          select: 'nome descricao'
        }
      ]
    })
    .populate('medicoResponsavelId', 'nome crm email especialidades')
    .populate('tenant_id', 'nomeFantasia razaoSocial cnpj endereco telefone email');

  if (!laudo) {
    return null;
  }

  // Converter para JSON usando toObject para aplicar getters
  const laudoJson = laudo.toObject();

  // Descriptografar campos do laudo (verificar se ainda estão criptografados)
  const laudoFields = ['conclusao', 'medicoResponsavel'];
  laudoFields.forEach(field => {
    if (laudoJson[field] && typeof laudoJson[field] === 'string' && laudoJson[field].includes(':')) {
      try {
        laudoJson[field] = decrypt(laudoJson[field]) || laudoJson[field];
      } catch (error) {
        console.error(`Erro ao descriptografar laudo.${field}:`);
      }
    }
  });

  // Descriptografar dados do paciente
  if (laudoJson.exame?.paciente) {
    const paciente = laudoJson.exame.paciente;
    
    // Verificar se os campos do paciente precisam ser descriptografados
    const pacienteFields = ['nome', 'cpf', 'endereco', 'telefone', 'email', 'dataNascimento'];
    
    pacienteFields.forEach(field => {
      if (paciente[field] && typeof paciente[field] === 'string' && paciente[field].includes(':')) {
        try {
          paciente[field] = decrypt(paciente[field]) || paciente[field];
        } catch (error) {
          console.error(`Erro ao descriptografar paciente.${field}:`);
        }
      }
    });

    // Calcular idade se dataNascimento existir
    if (paciente.dataNascimento) {
      try {
        const dataNasc = new Date(paciente.dataNascimento);
        if (!isNaN(dataNasc)) {
          const hoje = new Date();
          let idade = hoje.getFullYear() - dataNasc.getFullYear();
          const m = hoje.getMonth() - dataNasc.getMonth();
          if (m < 0 || (m === 0 && hoje.getDate() < dataNasc.getDate())) {
            idade--;
          }
          paciente.idade = idade;
        }
      } catch (error) {
        console.error('Erro ao calcular idade:');
      }
    }
  }

  // Descriptografar dados do exame
  if (laudoJson.exame) {
    const exame = laudoJson.exame;
    
    // Verificar se os campos do exame precisam ser descriptografados
    const exameFields = ['arquivo', 'observacoes', 'status', 'altura', 'peso', 'frequenciaCardiaca', 'segmentoPR', 'duracaoQRS'];
    
    exameFields.forEach(field => {
      if (exame[field] && typeof exame[field] === 'string' && exame[field].includes(':')) {
        try {
          exame[field] = decrypt(exame[field]) || exame[field];
        } catch (error) {
          console.error(`Erro ao descriptografar exame.${field}:`);
        }
      }
    });
  }

  return laudoJson;
};

// Define default styles if none are provided - OTIMIZADO PARA UMA PÁGINA
const defaultStyles = {
  colors: {
    primary: '#334155',    // Slate 700 - mais escuro
    secondary: '#475569',  // Slate 600
    accent: '#64748b',     // Slate 500
    light: '#ffffff',
    dark: '#0f172a',       // Slate 900
    gray: '#64748b',       // Slate 500
    text: '#1e293b',       // Slate 800
    lightText: '#475569',  // Slate 600
    background: '#f8fafc', // Slate 50
    border: '#cbd5e1',     // Slate 300
    success: '#059669',    // Emerald 600
    warning: '#d97706',    // Amber 600
    error: '#dc2626'       // Red 600
  },
  margins: {
    left: 40,
    right: 40,
    headerRight: 40,
    top: 30,        // Reduzido
    bottom: 30      // Reduzido
  },
  fonts: {
    small: 8,       // Reduzido
    normal: 10,     // Reduzido
    label: 9,       // Reduzido
    title: 16,      // Reduzido
    section: 12,    // Reduzido
    large: 14       // Reduzido
  },
  spacing: {
    section: 18,    // Reduzido
    paragraph: 12,  // Reduzido
    line: 6,        // Reduzido
    header: 15,     // Reduzido
    element: 10     // Reduzido
  }
};

// Função base para gerar o conteúdo do PDF do laudo - MELHORADA
async function gerarConteudoPdfLaudo(doc, laudo, exame, usuarioMedico, medicoNome, conclusao, publicLink, styles, tenantId = null) {
  try {
    // Obter configuração do template do tenant
    const tenantIdFinal = tenantId || exame?.tenant_id || laudo?.tenant_id || 'default';
    console.log('🔍 [DEBUG LAUDO] Buscando template para tenant:', tenantIdFinal);
    
    const { config: templateConfig } = await getTemplateConfig(tenantIdFinal);
    console.log('📋 [DEBUG LAUDO] Template config obtido:', {
      tipoTemplate: templateConfig.tipoTemplate,
      folhaTimbradaUrl: templateConfig.folhaTimbradaUrl ? 'URL presente' : 'URL ausente',
      folhaTimbradaS3Key: templateConfig.folhaTimbradaS3Key ? 'S3Key presente' : 'S3Key ausente',
      customPositions: templateConfig.customPositions ? 'Posições presentes' : 'Posições ausentes',
      textStyles: templateConfig.textStyles ? 'TextStyles presente' : 'TextStyles ausente'
    });
    
    // Aplicar configurações do template ao documento
    await applyTemplateConfig(doc, templateConfig);
    
    console.log('🔧 [DEBUG LAUDO] Template config aplicado ao doc:', {
      tipoTemplate: doc._templateConfig?.tipoTemplate,
      temFolhaTimbradaBuffer: !!doc._templateConfig?.folhaTimbradaBuffer,
      bufferSize: doc._templateConfig?.folhaTimbradaBuffer?.length || 0,
      customPositions: doc._templateConfig?.customPositions ? 'Posições aplicadas' : 'Posições ausentes',
      textStyles: doc._templateConfig?.textStyles ? 'TextStyles aplicado' : 'TextStyles ausente'
    });
    
    // Aplicar folha timbrada como fundo se disponível
    applyFolhaTimbradaBackground(doc, doc._templateConfig);
    console.log('🎨 [DEBUG LAUDO] Folha timbrada aplicada (se disponível)');

    // Verificar se deve usar layout simplificado para folha timbrada
    const usarLayoutSimplificado = shouldUseSimplifiedLayout(doc._templateConfig);
    console.log('🔄 [DEBUG LAUDO] Usar layout simplificado:', usarLayoutSimplificado);

    if (usarLayoutSimplificado) {
      console.log('🎯 [DEBUG LAUDO] Iniciando renderização com layout simplificado');
      return await gerarConteudoSimplificado(doc, laudo, exame, usuarioMedico, medicoNome, conclusao, publicLink, doc._templateConfig);
    }
    
    // Obter estilos baseados no template
    const templateStyles = getTemplateStyles(doc._templateConfig);
    
    // Combinar estilos padrão com estilos do template
    styles = {
      ...defaultStyles,
      ...templateStyles,
      ...(styles || {})
    };

    // Os dados já vêm descriptografados através da função obterLaudoPorId
    const laudoDescriptografado = laudo;
    const exameDescriptografado = exame;
    const pacienteDescriptografado = exame?.paciente;

    // Usar função de cabeçalho avançado unificado
    let currentY = addAdvancedHeader(doc, doc._templateConfig, {
      laudoId: laudoDescriptografado._id,
      dataEmissao: new Date().toLocaleDateString('pt-BR'),
      tipoExame: exameDescriptografado.tipoExame?.nome || 'Exame'
    }) || 150;

  // Logo de fundo mais sutil (apenas se não estiver usando folha timbrada)
  if (LOGO_LAUDOFY && fs.existsSync(LOGO_LAUDOFY) && doc._templateConfig.tipoTemplate !== 'folha_timbrada') {
    doc.opacity(0.03);
    try {
      doc.image(LOGO_LAUDOFY, doc.page.width / 2 - 250, doc.page.height / 2 - 250, { width: 500 });
    } catch (error) {
      console.error('Erro ao inserir logo de fundo:', error);
    }
    doc.opacity(1);
  }

  // Funções auxiliares melhoradas
  const formatValue = (value, suffix = '') => {
    if (value === undefined || value === null) return 'Não informado';
    return `${value}${suffix}`;
  };

  const drawSection = (title, content, startY) => {
    const pageWidth = doc.page.width;
    const configTemplate = doc._templateConfig;
    
    // Título da seção com design moderno
    const titleY = startY;
    
    // Background do título
    doc.fillColor(configTemplate.cores.primaria || '#1e40af')
       .rect(40, titleY, pageWidth - 80, 35)
       .fill();
    
    // Ícone e título
    doc.fillColor('#ffffff')
       .font('Helvetica-Bold')
       .fontSize(14)
       .text('📋 ' + title, 55, titleY + 10);

    let sectionY = titleY + 50;
    
    // Card container moderno
    const cardPadding = 20;
    const itemHeight = 22;
    const cardHeight = Math.max(content.length * itemHeight + (cardPadding * 2), 80);
    const cardWidth = pageWidth - 80;
    
    // Sombra do card
    doc.fillColor('rgba(0, 0, 0, 0.08)')
       .rect(43, sectionY + 3, cardWidth, cardHeight)
       .fill();
    
    // Background do card
    doc.fillColor('#ffffff')
       .rect(40, sectionY, cardWidth, cardHeight)
       .fill();
    
    // Borda do card
    doc.strokeColor(configTemplate.cores.secundaria || '#e5e7eb')
       .lineWidth(1)
       .rect(40, sectionY, cardWidth, cardHeight)
       .stroke();
    
    // Barra lateral colorida
    doc.fillColor(configTemplate.cores.primaria || '#1e40af')
       .rect(40, sectionY, 4, cardHeight)
       .fill();

    sectionY += cardPadding;

    // Renderizar conteúdo em duas colunas
    const colWidth = (cardWidth - cardPadding * 3) / 2;
    let col1Y = sectionY;
    let col2Y = sectionY;
    let isCol1 = true;

    content.forEach((item, index) => {
      const currentX = isCol1 ? 60 : 60 + colWidth + cardPadding;
      const currentY = isCol1 ? col1Y : col2Y;

      // Label com cor secundária
      doc.fillColor(configTemplate.cores.secundaria || '#64748b')
         .font('Helvetica-Bold')
         .fontSize(10)
         .text(item.label, currentX, currentY);

      // Valor com destaque
      doc.fillColor(configTemplate.cores.texto || '#1f2937')
         .font('Helvetica')
         .fontSize(11)
         .text(item.value, currentX, currentY + 12, {
           width: colWidth - 20,
           ellipsis: true
         });

      if (isCol1) {
        col1Y += itemHeight;
      } else {
        col2Y += itemHeight;
      }
      
      isCol1 = !isCol1;
    });

    return titleY + 35 + cardHeight + 30;
  };

  // Seção: Dados do Paciente
  const dadosPaciente = [
    { label: 'Nome:', value: pacienteDescriptografado?.nome || 'Não informado' },
    { label: 'CPF:', value: pacienteDescriptografado?.cpf || 'Não informado' }
  ];

  // Adicionar data de nascimento e idade com validação melhorada
  if (pacienteDescriptografado?.dataNascimento) {
    try {
      let dataProcessada;
      const dataNascString = String(pacienteDescriptografado.dataNascimento).trim();
      
      // Verificar diferentes formatos de data
      if (dataNascString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Formato YYYY-MM-DD (ISO)
        const [ano, mes, dia] = dataNascString.split('-');
        dataProcessada = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
      } else if (dataNascString.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        // Formato DD/MM/YYYY (Brasil)
        const [dia, mes, ano] = dataNascString.split('/');
        dataProcessada = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
      } else if (dataNascString.match(/^\d{4}\/\d{2}\/\d{2}$/)) {
        // Formato YYYY/MM/DD
        const [ano, mes, dia] = dataNascString.split('/');
        dataProcessada = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
      } else if (dataNascString.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
        // Formato ISO completo com horário
        dataProcessada = new Date(dataNascString);
      } else {
        // Tentar criar data diretamente
        dataProcessada = new Date(dataNascString);
      }
      
      // Verificar se a data é válida com validação mais flexível
      const anoAtual = new Date().getFullYear();
      if (!isNaN(dataProcessada.getTime()) && 
          dataProcessada.getFullYear() > 1900 && 
          dataProcessada.getFullYear() <= anoAtual &&
          dataProcessada.getMonth() >= 0 && 
          dataProcessada.getMonth() <= 11) {
        
        dadosPaciente.push({ 
          label: 'Nascimento:', 
          value: dataProcessada.toLocaleDateString('pt-BR') 
        });
        
        const idade = calcularIdade(dataProcessada);
        if (!isNaN(idade) && idade >= 0 && idade <= 150) {
          dadosPaciente.push({ 
            label: 'Idade:', 
            value: idade + ' anos' 
          });
        }
      } else {
        console.error('Data de nascimento inválida após processamento');
        dadosPaciente.push({ label: 'Nascimento:', value: 'Data inválida' });
      }
    } catch (error) {
      console.error('Erro ao processar data de nascimento:');
      dadosPaciente.push({ label: 'Nascimento:', value: 'Erro na data' });
    }
  } else {
    dadosPaciente.push({ label: 'Nascimento:', value: 'Não informado' });
  }

  // Adicionar dados opcionais do paciente
  if (pacienteDescriptografado?.email) {
    dadosPaciente.push({ label: 'Email:', value: pacienteDescriptografado.email });
  }

  // Adicionar dados do exame com validação
  if (exameDescriptografado?.altura) {
    const altura = parseFloat(exameDescriptografado.altura);
    if (!isNaN(altura)) {
      dadosPaciente.push({ label: 'Altura:', value: altura + ' cm' });
    }
  }
  
  if (exameDescriptografado?.peso) {
    const peso = parseFloat(exameDescriptografado.peso);
    if (!isNaN(peso)) {
      dadosPaciente.push({ label: 'Peso:', value: peso + ' kg' });
    }
  }

  // Seção: Dados do Paciente com estilos avançados
  if (shouldShowElement(doc._templateConfig, 'dados_paciente')) {
    // Usar função avançada para dados do paciente
    currentY = addAdvancedPatientInfo(doc, doc._templateConfig, {
      nome: pacienteDescriptografado?.nome || 'Não informado',
      cpf: pacienteDescriptografado?.cpf || 'Não informado',
      dataNascimento: pacienteDescriptografado?.dataNascimento,
      email: pacienteDescriptografado?.email,
      altura: exameDescriptografado?.altura,
      peso: exameDescriptografado?.peso
    }, currentY);
  } else {
    // Fallback para seção básica se não houver configurações avançadas
    currentY = drawSection('DADOS DO PACIENTE', dadosPaciente, currentY);
  }

  // Seção: Dados do Exame - SEM MÉDICO, apenas data e tipo de exame
  const dadosExame = [
    { label: 'Data do Exame:', value: exameDescriptografado?.dataExame ? 
      new Date(exameDescriptografado.dataExame).toLocaleDateString('pt-BR') : 'Não informado' },
    { label: 'Tipo de Exame:', value: exameDescriptografado?.tipoExame?.nome || 'Não informado' }
  ];

  // Adicionar dados médicos específicos se disponíveis (apenas parâmetros técnicos)
  if (exameDescriptografado?.frequenciaCardiaca) {
    const fc = parseFloat(exameDescriptografado.frequenciaCardiaca);
    if (!isNaN(fc)) {
      dadosExame.push({ label: 'FC:', value: fc + ' bpm' });
    }
  }
  
  if (exameDescriptografado?.segmentoPR) {
    const pr = parseFloat(exameDescriptografado.segmentoPR);
    if (!isNaN(pr)) {
      dadosExame.push({ label: 'PR:', value: pr + ' ms' });
    }
  }
  
  if (exameDescriptografado?.duracaoQRS) {
    const qrs = parseFloat(exameDescriptografado.duracaoQRS);
    if (!isNaN(qrs)) {
      dadosExame.push({ label: 'QRS:', value: qrs + ' ms' });
    }
  }

  // REMOVIDO: CRM do médico nos dados do exame (ficará apenas na área de assinatura)

  currentY = addAdvancedExamInfo(doc, doc._templateConfig, dadosExame, currentY);

  // Processar conclusão
  let conclusaoFinal = conclusao || laudoDescriptografado.conclusao || 'Conclusão não informada';
  
  // Se a conclusão ainda está criptografada, descriptografar
  if (typeof conclusaoFinal === 'string' && conclusaoFinal.includes(':')) {
    try {
      conclusaoFinal = decrypt(conclusaoFinal) || conclusaoFinal;
    } catch (error) {
      console.error('Erro ao descriptografar conclusão:');
    }
  }

  // Seção de conclusão com design moderno
  currentY = addAdvancedConclusion(doc, doc._templateConfig, conclusaoFinal, currentY);

  // Remover seção de verificação aqui - será mostrada apenas no rodapé
  // if (publicLink && publicLink.trim() !== '') {
  //   currentY = addAdvancedAuthSection(doc, doc._templateConfig, publicLink, currentY);
  // }

  // SEMPRE adicionar área de assinatura no laudo ANTES do rodapé
  // Isso garante que o laudo original sempre tenha o espaço preparado para assinatura
  currentY = await adicionarAreaAssinaturaMedica(
    doc,
    medicoNome,
    usuarioMedico,
    currentY,
    false, // Não é assinatura digital (para laudo original)
    null, // Sem data de assinatura
    null, // Sem certificado
    false // Não usar assinatura física
  ) || currentY;

  // Adicionar rodapé personalizado APÓS a área de assinatura
  if (shouldShowElement(doc._templateConfig, 'rodape')) {
    await addAdvancedFooter(doc, doc._templateConfig, publicLink);
  }

  return currentY;
  
  } catch (error) {
    console.error('Erro ao gerar conteúdo PDF do laudo:', error);
    throw error;
  }
}

/**
 * Gerar conteúdo PDF simplificado para folha timbrada
 * Usa as mesmas funções avançadas do sistema normal, mas com textStyles aplicados
 */
async function gerarConteudoSimplificado(doc, laudo, exame, usuarioMedico, medicoNome, conclusao, publicLink, templateConfig) {
  try {
    console.log('🎯 [DEBUG SIMPLIFICADO] Iniciando geração de conteúdo simplificado');
    console.log('📋 [DEBUG SIMPLIFICADO] Dados recebidos:', {
      laudoId: laudo?._id,
      exameId: exame?._id, 
      medicoNome,
      temConclusao: !!conclusao,
      publicLink,
      templateConfig: {
        tipoTemplate: templateConfig.tipoTemplate,
        temTextStyles: !!templateConfig.textStyles,
        temMargens: !!templateConfig.margens,
        layout: templateConfig.layout
      }
    });
    
    const textStyles = templateConfig.textStyles;
    
    // CORREÇÃO: Garantir configuração padrão para folha timbrada mesmo sem textStyles
    console.log('🔧 [DEBUG SIMPLIFICADO] textStyles presente:', !!textStyles);
    if (!textStyles) {
      console.log('⚠️ [DEBUG SIMPLIFICADO] textStyles ausente, usando configuração padrão para folha timbrada');
    }
    
    // Aplicar textStyles às configurações do template para usar as funções existentes
    const templateConfigComTextStyles = {
      ...templateConfig,
      cores: {
        primaria: textStyles?.colors?.primary || templateConfig.cores?.primaria || '#1e3a8a',
        secundaria: textStyles?.colors?.secondary || templateConfig.cores?.secundaria || '#64748b',
        texto: textStyles?.colors?.text || templateConfig.cores?.texto || '#1f2937',
        accent: textStyles?.colors?.accent || templateConfig.cores?.accent || '#059669'
      },
      fonte: 'Helvetica',
      tamanhoFonte: {
        titulo: textStyles?.fonts?.title || templateConfig.tamanhoFonte?.titulo || 18,
        subtitulo: textStyles?.fonts?.subtitle || templateConfig.tamanhoFonte?.subtitulo || 14,
        base: textStyles?.fonts?.body || templateConfig.tamanhoFonte?.base || 12,
        pequeno: textStyles?.fonts?.small || 10
      },
      margens: {
        top: textStyles?.margins?.top || templateConfig.margens?.top || 150,
        left: textStyles?.margins?.left || templateConfig.margens?.left || 50,
        right: textStyles?.margins?.right || templateConfig.margens?.right || 50,
        bottom: textStyles?.margins?.bottom || templateConfig.margens?.bottom || 80,
        sectionTop: textStyles?.margins?.sectionTop || 20,
        sectionSides: textStyles?.margins?.sectionSides || 0,
        sectionBottom: textStyles?.margins?.sectionBottom || 20
      },
      layout: {
        mostrarLogo: false, // Para folha timbrada, não mostrar logo adicional
        mostrarRodape: true, // SEMPRE mostrar rodapé para folha timbrada
        mostrarQrCode: true, // SEMPRE mostrar QR Code para folha timbrada
        mostrarDadosPaciente: true,
        mostrarCabecalhoCompleto: true,
        mostrarDataAssinatura: true,
        // Aplicar layout do template, mas garantir que rodapé e QR fiquem ativos
        ...templateConfig.layout,
        // Forçar ativação do rodapé e QR code para folha timbrada
        mostrarRodape: true,
        mostrarQrCode: true
      },
      rodapeTexto: templateConfig.rodapeTexto || ''
    };

    // Os dados já vêm descriptografados através da função obterLaudoPorId
    const laudoDescriptografado = laudo;
    const exameDescriptografado = exame;
    const pacienteDescriptografado = exame?.paciente;

    // Usar função de cabeçalho avançado unificado (mas sem logo para folha timbrada)
    let currentY = addAdvancedHeader(doc, templateConfigComTextStyles, {
      laudoId: laudoDescriptografado._id,
      dataEmissao: new Date().toLocaleDateString('pt-BR'),
      tipoExame: exameDescriptografado.tipoExame?.nome || 'Exame'
    }) || 150;

    console.log('📝 [DEBUG SIMPLIFICADO] Cabeçalho renderizado, currentY:', currentY);
    console.log('📐 [DEBUG SIMPLIFICADO] Margens configuradas:', templateConfigComTextStyles.margens);

    // Preparar dados do paciente seguindo o mesmo padrão do sistema normal
    const dadosPacienteProcessados = {
      nome: pacienteDescriptografado?.nome || 'Não informado',
      cpf: pacienteDescriptografado?.cpf || 'Não informado'
    };

    // Adicionar data de nascimento e idade com validação melhorada
    if (pacienteDescriptografado?.dataNascimento) {
      try {
        let dataProcessada;
        const dataNascString = String(pacienteDescriptografado.dataNascimento).trim();
        
        // Verificar diferentes formatos de data
        if (dataNascString.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const [ano, mes, dia] = dataNascString.split('-');
          dataProcessada = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
        } else if (dataNascString.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
          const [dia, mes, ano] = dataNascString.split('/');
          dataProcessada = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
        } else if (dataNascString.match(/^\d{4}\/\d{2}\/\d{2}$/)) {
          const [ano, mes, dia] = dataNascString.split('/');
          dataProcessada = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
        } else if (dataNascString.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
          dataProcessada = new Date(dataNascString);
        } else {
          dataProcessada = new Date(dataNascString);
        }
        
        const anoAtual = new Date().getFullYear();
        if (!isNaN(dataProcessada.getTime()) && 
            dataProcessada.getFullYear() > 1900 && 
            dataProcessada.getFullYear() <= anoAtual &&
            dataProcessada.getMonth() >= 0 && 
            dataProcessada.getMonth() <= 11) {
          
          dadosPacienteProcessados.dataNascimento = dataProcessada.toLocaleDateString('pt-BR');
          
          const idade = calcularIdade(dataProcessada);
          if (!isNaN(idade) && idade >= 0 && idade <= 150) {
            dadosPacienteProcessados.idade = idade + ' anos';
          }
        }
      } catch (error) {
        console.error('❌ [DEBUG SIMPLIFICADO] Erro ao processar data de nascimento:', error);
        dadosPacienteProcessados.dataNascimento = 'Data inválida';
      }
    }

    // Adicionar dados opcionais do paciente
    if (pacienteDescriptografado?.email) {
      dadosPacienteProcessados.email = pacienteDescriptografado.email;
    }

    if (exameDescriptografado?.altura) {
      const altura = parseFloat(exameDescriptografado.altura);
      if (!isNaN(altura)) {
        dadosPacienteProcessados.altura = altura + ' cm';
      }
    }
    
    if (exameDescriptografado?.peso) {
      const peso = parseFloat(exameDescriptografado.peso);
      if (!isNaN(peso)) {
        dadosPacienteProcessados.peso = peso + ' kg';
      }
    }

    // Usar função avançada para dados do paciente
    currentY = addAdvancedPatientInfo(doc, templateConfigComTextStyles, dadosPacienteProcessados, currentY);
    console.log('📝 [DEBUG SIMPLIFICADO] Dados do paciente renderizados, currentY:', currentY);
    console.log('👤 [DEBUG SIMPLIFICADO] Dados do paciente processados:', dadosPacienteProcessados);

    // Preparar dados do exame seguindo o mesmo padrão
    const dadosExame = [
      { label: 'Data do Exame:', value: exameDescriptografado?.dataExame ? 
        new Date(exameDescriptografado.dataExame).toLocaleDateString('pt-BR') : 'Não informado' },
      { label: 'Tipo de Exame:', value: exameDescriptografado?.tipoExame?.nome || 'Não informado' }
    ];

    // Adicionar dados médicos específicos se disponíveis
    if (exameDescriptografado?.frequenciaCardiaca) {
      const fc = parseFloat(exameDescriptografado.frequenciaCardiaca);
      if (!isNaN(fc)) {
        dadosExame.push({ label: 'FC:', value: fc + ' bpm' });
      }
    }
    
    if (exameDescriptografado?.segmentoPR) {
      const pr = parseFloat(exameDescriptografado.segmentoPR);
      if (!isNaN(pr)) {
        dadosExame.push({ label: 'PR:', value: pr + ' ms' });
      }
    }
    
    if (exameDescriptografado?.duracaoQRS) {
      const qrs = parseFloat(exameDescriptografado.duracaoQRS);
      if (!isNaN(qrs)) {
        dadosExame.push({ label: 'QRS:', value: qrs + ' ms' });
      }
    }

    // Usar função avançada para dados do exame
    currentY = addAdvancedExamInfo(doc, templateConfigComTextStyles, dadosExame, currentY);
    console.log('📝 [DEBUG SIMPLIFICADO] Dados do exame renderizados, currentY:', currentY);
    console.log('🔬 [DEBUG SIMPLIFICADO] Dados do exame processados:', dadosExame);

    // Processar conclusão
    let conclusaoFinal = conclusao || laudoDescriptografado.conclusao || 'Conclusão não informada';
    
    // Se a conclusão ainda está criptografada, descriptografar
    if (typeof conclusaoFinal === 'string' && conclusaoFinal.includes(':')) {
      try {
        conclusaoFinal = decrypt(conclusaoFinal) || conclusaoFinal;
      } catch (error) {
        console.error('❌ [DEBUG SIMPLIFICADO] Erro ao descriptografar conclusão:', error);
      }
    }

    // Usar função avançada para conclusão
    currentY = addAdvancedConclusion(doc, templateConfigComTextStyles, conclusaoFinal, currentY);
    console.log('📝 [DEBUG SIMPLIFICADO] Conclusão renderizada, currentY:', currentY);
    console.log('📄 [DEBUG SIMPLIFICADO] Conclusão processada (primeiros 100 chars):', conclusaoFinal.substring(0, 100) + '...');

    // Adicionar área de assinatura usando a função original
    console.log('✍️ [DEBUG SIMPLIFICADO] Iniciando adição de área de assinatura...');
    console.log('✍️ [DEBUG SIMPLIFICADO] Parâmetros de assinatura:', {
      medicoNome,
      usuarioMedico: {
        crm: usuarioMedico?.crm,
        nome: usuarioMedico?.nome
      },
      currentY
    });
    
    currentY = await adicionarAreaAssinaturaMedica(
      doc,
      medicoNome,
      usuarioMedico,
      currentY,
      false, // Não é assinatura digital (para laudo original)
      null, // Sem data de assinatura
      null, // Sem certificado
      false // Não usar assinatura física
    ) || currentY;

    console.log('📝 [DEBUG SIMPLIFICADO] Área de assinatura renderizada, currentY:', currentY);

    // Adicionar rodapé personalizado com QR Code
    console.log('🔗 [DEBUG SIMPLIFICADO] Verificando condições para rodapé...');
    console.log('🔗 [DEBUG SIMPLIFICADO] shouldShowElement result:', shouldShowElement(templateConfigComTextStyles, 'rodape'));
    console.log('🔗 [DEBUG SIMPLIFICADO] layout.mostrarRodape:', templateConfigComTextStyles.layout?.mostrarRodape);
    console.log('🔗 [DEBUG SIMPLIFICADO] layout.mostrarQrCode:', templateConfigComTextStyles.layout?.mostrarQrCode);
    console.log('🔗 [DEBUG SIMPLIFICADO] publicLink:', publicLink ? 'presente' : 'ausente');
    
    if (shouldShowElement(templateConfigComTextStyles, 'rodape')) {
      console.log('🔗 [DEBUG SIMPLIFICADO] Adicionando rodapé com QR Code...');
      await addAdvancedFooter(doc, templateConfigComTextStyles, publicLink);
      console.log('🔗 [DEBUG SIMPLIFICADO] Rodapé adicionado com sucesso');
    } else {
      console.log('❌ [DEBUG SIMPLIFICADO] Rodapé não será adicionado - condições não atendidas');
    }

    console.log('✅ [DEBUG SIMPLIFICADO] Conteúdo simplificado gerado com sucesso usando funções avançadas');
    return currentY;

  } catch (error) {
    console.error('❌ [DEBUG SIMPLIFICADO] Erro ao gerar conteúdo simplificado:', error);
    throw error;
  }
}

// Helper function to handle encryption
const encryptFields = (data) => {
    const fieldsToEncrypt = ['conteudo', 'conclusao', 'observacoes'];
    const encrypted = { ...data };
    
    fieldsToEncrypt.forEach(field => {
        if (encrypted[field]) {
            encrypted[field] = encrypt(encrypted[field]);
        }
    });
    
    return encrypted;
};

// Helper function to handle decryption
const decryptFields = (data) => {
    const fieldsToDecrypt = ['conteudo', 'conclusao', 'observacoes'];
    const decrypted = { ...data };
    
    fieldsToDecrypt.forEach(field => {
        if (decrypted[field]) {
            try {
                decrypted[field] = decrypt(decrypted[field]);
            } catch (err) {
                console.error(`Error decrypting ${field}:`);
            }
        }
    });
    
    return decrypted;
};

// Função para adicionar texto de verificação no final do documento
function adicionarTextoVerificacaoFinal(doc, styles) {
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const margemFinal = 30;
  
  const textoVerificacao = `Este documento foi assinado digitalmente com certificado ICP-Brasil e pode ser verificado ` +
    `em sistemas como Adobe Reader, Assinador GOV.BR, ou outros validadores de assinatura digital. ` +
    `A autenticidade e integridade do documento são garantidas pela assinatura criptográfica.`;
  
  // Posição no final da página
  const textoY = pageHeight - margemFinal - 30;
  
  // Caixa de fundo para o texto
  doc.fillColor('#f8fafc')
    .rect(styles.margins.left - 5, textoY - 10, pageWidth - styles.margins.left - styles.margins.right + 10, 40)
    .fill();
  
  doc.strokeColor('#e2e8f0')
    .lineWidth(0.5)
    .rect(styles.margins.left - 5, textoY - 10, pageWidth - styles.margins.left - styles.margins.right + 10, 40)
    .stroke();
  
  // Texto de verificação
  doc.fillColor('#475569')
    .font('Helvetica')
    .fontSize(8)
    .text(textoVerificacao, styles.margins.left, textoY, {
      width: pageWidth - styles.margins.left - styles.margins.right,
      align: 'justify',
      lineGap: 2
    });
  
  return textoY;
}

// Função para adicionar área de assinatura médica - VERSÃO OTIMIZADA PARA UMA PÁGINA
async function adicionarAreaAssinaturaMedica(doc, medicoNome, usuarioMedico, currentY, assinadoDigitalmente = false, dataAssinatura = null, certificadoInfo = null, usarAssinaturaFisica = false) {
  console.log('✍️ [DEBUG ASSINATURA] Iniciando função adicionarAreaAssinaturaMedica');
  console.log('✍️ [DEBUG ASSINATURA] Parâmetros:', {
    medicoNome,
    usuarioMedico: { nome: usuarioMedico?.nome, crm: usuarioMedico?.crm },
    currentY,
    assinadoDigitalmente,
    dataAssinatura,
    usarAssinaturaFisica
  });
  
  const styles = defaultStyles;
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const centerX = pageWidth / 2;
  
  // Calcular espaço necessário - ULTRA CONSERVADOR para garantir que caiba em uma página
  const espacoNecessario = assinadoDigitalmente ? 0 : 0; // Reduzido para garantir que caiba

  
  // Verificar se há espaço na página atual - critério mais rigoroso
  if (currentY > pageHeight - espacoNecessario) {
    doc.addPage();
    currentY = styles.margins.top;
  }
  
  // Posição da assinatura - MAIS PARA BAIXO but com espaço garantido para o carimbo
  const espacoDisponivelParaAssinatura = (pageHeight - 100) - currentY; 
  const posicaoIdealAssinatura = currentY + (espacoDisponivelParaAssinatura * 0.75); // Área de assinatura mais para baixo
  const assinaturaY = Math.min(posicaoIdealAssinatura, pageHeight - espacoNecessario);
  
  // Se assinado digitalmente, adicionar carimbo digital MINIMALISTA e PEQUENO
  if (assinadoDigitalmente) {
    const carimboWidth = 200; // Carimbo menor e mais discreto
    const carimboHeight = 30; // Altura reduzida para apenas 2 linhas essenciais
    
    // Posicionar ACIMA da área de assinatura - um pouco mais para cima
    const carimboX = centerX - (carimboWidth / 2);
    const carimboY = assinaturaY - 100; // Mais espaçamento da assinatura
    
    // Fundo neutro e discreto
    doc.fillColor('#f9f9f9')
      .rect(carimboX, carimboY, carimboWidth, carimboHeight)
      .fill();
    
    // Borda discreta
    doc.strokeColor('#ddd')
      .lineWidth(0.5)
      .rect(carimboX, carimboY, carimboWidth, carimboHeight)
      .stroke();
    
    // Conteúdo do carimbo - SOMENTE informações essenciais
    const dataFormatada = dataAssinatura.toLocaleDateString('pt-BR');
    const horaFormatada = dataAssinatura.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    // Linha 1: Nome e CRM em uma linha só
    const nomeCrm = usuarioMedico?.crm ? `${medicoNome} - CRM: ${usuarioMedico.crm}` : medicoNome;
    doc.fillColor('#555')
      .font('Helvetica-Bold')
      .fontSize(8)
      .text(nomeCrm, carimboX + 6, carimboY + 4, { width: carimboWidth - 12, align: 'center' });
    
    // Linha 2: Data/hora e indicação de assinatura digital
    doc.fillColor('#666')
      .font('Helvetica')
      .fontSize(7)
      .text(`🔐 Assinado Digitalmente - ${dataFormatada} ${horaFormatada}`, carimboX + 6, carimboY + 16, { width: carimboWidth - 12, align: 'center' });

  } else if (usarAssinaturaFisica && usuarioMedico?.assinaturaFisica?.s3Key) {
    // Usar assinatura física PNG do S3 se disponível
    try {
      // Baixar assinatura física do S3
      const { downloadAssinaturaFromS3 } = require('../services/assinaturaStorageService');
      const assinaturaBuffer = await downloadAssinaturaFromS3(usuarioMedico.assinaturaFisica.s3Key);
      
      // PRIMEIRO: Desenhar os elementos base (linha e texto) que ficam por baixo
      const linhaWidth = 240; // Linha maior para simular documento impresso
      const linhaX = centerX - (linhaWidth / 2);
      
      // Linha base do documento (como se fosse impressa)
      doc.strokeColor(styles.colors.border)
        .lineWidth(0.8)
        .moveTo(linhaX, assinaturaY - 35)
        .lineTo(linhaX + linhaWidth, assinaturaY - 35)
        .stroke();
        
      // Texto indicativo base
      doc.fillColor(styles.colors.lightText)
        .font('Helvetica')
        .fontSize(7);
      
      // DEPOIS: Inserir imagem da assinatura física POR CIMA (simulando assinatura real)
      const assinaturaWidth = 250; // Ainda maior para parecer mais realista
      const assinaturaHeight = 125; // Proporcionalmente maior
      const assinaturaX = centerX - (assinaturaWidth / 2);
      const assinaturaImgY = assinaturaY - 120; // Mais para cima para cobrir bem o espaço
      
      doc.image(assinaturaBuffer, assinaturaX, assinaturaImgY, {
        width: assinaturaWidth,
        height: assinaturaHeight,
        fit: [assinaturaWidth, assinaturaHeight],
        align: 'center'
      });
      
    } catch (assinaturaError) {
      console.error('Erro ao carregar assinatura física do S3:', assinaturaError);
      // Fallback para linha de assinatura
      const linhaWidth = 200;
      const linhaX = centerX - (linhaWidth / 2);
    }
  } else {
    // SEMPRE mostrar área para assinatura com nome do médico e CRM
    // Isso garante que o laudo original tenha espaço preparado para assinatura
    
    // Linha para assinatura manual - SEMPRE presente no laudo original
    const linhaWidth = 200;
    const linhaX = centerX - (linhaWidth / 2);
    const linhaY = assinaturaY - 30; // Posição da linha de assinatura mais para baixo
    
    doc.strokeColor('#333333')
      .lineWidth(1.5)
      .moveTo(linhaX, linhaY)
      .lineTo(linhaX + linhaWidth, linhaY)
      .stroke();
      
    // Nome do médico e CRM - APENAS para assinatura manual (linha vazia)
    const nomeY = assinaturaY - 15; // Posição para o nome do médico (mais para baixo)
    const crmY = assinaturaY;       // Posição para o CRM (mais para baixo)
    
    doc.fillColor('#333333')
      .font('Helvetica-Bold')
      .fontSize(12)
      .text(medicoNome || 'Médico Responsável', 0, nomeY, {
        width: pageWidth,
        align: 'center'
      });
    
    // CRM do médico - centralizado abaixo do nome
    if (usuarioMedico?.crm) {
      doc.fillColor('#555555')
        .font('Helvetica')
        .fontSize(10)
        .text(`CRM: ${usuarioMedico.crm}`, 0, crmY, {
          width: pageWidth,
          align: 'center'
        });
    }
  }
  
  // Adicionar link público e QR code discretos na parte inferior
  if (doc._publicLinkInfo && doc._publicLinkInfo.shouldAdd && doc._publicLinkInfo.link) {
    const linkPublico = doc._publicLinkInfo.link;
    const bottomY = pageHeight - 35; // Posição na parte inferior da página
    
    try {
      // Gerar QR code pequeno e discreto
      const QRCode = require('qrcode');
      const qrCodeDataURL = await QRCode.toDataURL(linkPublico, {
        width: 40, // Muito pequeno e discreto
        margin: 1,
        color: {
          dark: '#666666',
          light: '#FFFFFF'
        }
      });
      
      // Converter data URL para buffer
      const qrCodeBuffer = Buffer.from(qrCodeDataURL.split(',')[1], 'base64');
      
      // Posicionar QR code pequeno no canto direito
      const qrX = pageWidth - 50;
      const qrY = bottomY - 20;
      
      doc.image(qrCodeBuffer, qrX, qrY, { width: 30, height: 30 });
      
      // Link público discreto ao lado do QR code
      doc.fillColor('#888888')
        .font('Helvetica')
        .fontSize(6)
        .text('Verifique o Status do laudo:', styles.margins.left, bottomY - 22)
        .text(linkPublico, styles.margens.left, bottomY - 13, {
          width: pageWidth - 70, // Deixar espaço para o QR code
          link: linkPublico
        });
        
    } catch (qrError) {
      console.error('Erro ao gerar QR Code:', qrError);
      // Se não conseguir gerar QR code, apenas adicionar o link
      doc.fillColor('#888888')
        .font('Helvetica')
        .fontSize(6)
        .text(`Verifique o Status do laudo: ${linkPublico}`, styles.margens.left, bottomY - 10, {
          width: pageWidth - styles.margens.left - styles.margens.right,
          link: linkPublico
        });
    }
  }
  
  console.log('✅ [DEBUG ASSINATURA] Área de assinatura concluída, retornando Y:', assinaturaY);
  return assinaturaY;
}
// Função para gerar PDF assinado - ATUALIZADA PARA USAR CERTIFICADOS DOS MÉDICOS
exports.gerarPdfLaudoAssinado = async (laudoId, exame, tipoExame, medicoNome, medicoId, conclusao, tenantId = 'default', senhaCertificado = null) => {
  try {
    // Obter dados completos e descriptografados
    const laudoCompleto = await obterLaudoPorId(laudoId);
    if (!laudoCompleto) {
      throw new Error('Laudo não encontrado');
    }

    const usuarioMedico = await Usuario.findById(medicoId).populate('crm');

    const pdfBuffers = [];
    const doc = new PDFDocument({ size: 'A4', margin: 30, bufferPages: true });
    doc.on('data', chunk => pdfBuffers.push(chunk));

    // Gerar link público para o laudo
    const publicLink = `${process.env.FRONTEND_URL || 'https://reports.codeytech.com.br'}/publico/${laudoId}`;

    // Gerar conteúdo do PDF usando dados descriptografados
    const currentY = await gerarConteudoPdfLaudo(
      doc, 
      laudoCompleto, 
      laudoCompleto.exame, 
      usuarioMedico, 
      medicoNome, 
      conclusao, 
      publicLink, 
      defaultStyles
    );

    // Buscar certificado digital do médico para obter informações
    const certificadoService = require('../services/certificadoDigitalService');
    let certificadoInfo = null;
    
    try {
      const certInfo = await certificadoService.obterCertificadoParaAssinatura(medicoId);
      certificadoInfo = certInfo.informacoes;
    } catch (certificadoError) {
      console.warn(`Certificado digital não encontrado para médico ${medicoId}:`, certificadoError.message);
    }

    // SEMPRE adicionar área de assinatura no laudo original (independente do status)
    // Isso garante que o laudo tenha o espaço preparado para assinatura
    const assinadoCom = laudoCompleto.assinadoCom || 'sem_assinatura';
    
    // Para laudos originais, sempre mostrar área de assinatura
    const assinadoDigitalmente = assinadoCom === 'certificado_medico' || assinadoCom === 'certificado_sistema';
    const usarAssinaturaFisica = assinadoCom === 'upload_manual';
    
    // (REMOVIDO: assinatura já é desenhada corretamente na área do template)
    // Adicionar área de assinatura baseada no campo assinadoCom do laudo
    // if (assinadoCom !== 'sem_assinatura') {
    //   const assinadoDigitalmente = assinadoCom === 'certificado_medico' || assinadoCom === 'certificado_sistema';
    //   const usarAssinaturaFisica = assinadoCom === 'upload_manual';
    //   await adicionarAreaAssinaturaMedica(
    //     doc, 
    //     usuarioNome, 
    //     usuarioMedico, 
    //     doc.y || 600, 
    //     assinadoDigitalmente, // Baseado no assinadoCom
    //     assinadoCom === 'upload_manual' ? null : new Date(), // Data apenas se não for upload manual
    //     null, // certificadoInfo
    //     usarAssinaturaFisica // Usar assinatura física apenas se upload_manual
    //   );
    // }

    await new Promise((resolve, reject) => {
      doc.on('end', resolve);
      doc.on('error', reject);
      doc.end();
    });

    const pdfBuffer = Buffer.concat(pdfBuffers);

    // Buscar certificado digital do médico para assinatura
    let certificadoParaAssinatura = null;
    
    try {
      certificadoParaAssinatura = await certificadoService.obterCertificadoParaAssinatura(medicoId);
    } catch (certificadoError) {
      console.warn(`Certificado digital não encontrado para médico ${medicoId}:`, certificadoError.message);
      
      // Se não há certificado do médico, fazer upload sem assinatura para S3
      try {
        const uploadResult = await uploadLaudoToS3(
          pdfBuffer, 
          laudoId, 
          tenantId, 
          'assinado', 
          `laudo_${laudoId}.pdf`
        );
        
        return { 
          success: true, 
          fileUrl: uploadResult.url,
          fileKey: uploadResult.key,
          s3Key: uploadResult.key, // Compatibilidade
          assinadoCom: 'sem_assinatura',
          storage: 's3'
        };
      } catch (s3Error) {
        console.error('Erro no upload para S3, tentando UploadCare:', s3Error);
        
        // Fallback para UploadCare se S3 falhar
        const pdfFile = {
          buffer: pdfBuffer,
          originalname: `laudo_${laudoId}.pdf`,
          mimetype: 'application/pdf',
          size: pdfBuffer.length,
          stream: () => {
            const stream = new require('stream').Readable();
            stream.push(pdfBuffer);
            stream.push(null);
            return stream;
          }
        };

        const uploadcareUrl = await uploadPDFToUploadcare(pdfFile);
        return { 
          success: true, 
          fileUrl: uploadcareUrl, 
          assinadoCom: 'sem_assinatura',
          storage: 'uploadcare'
        };
      }
    }

    // Assinar com certificado do médico
    try {
      const { SignPdf } = await import('@signpdf/signpdf');
      const { P12Signer } = await import('@signpdf/signer-p12');
      
      const bufferCertificado = certificadoParaAssinatura.bufferCertificado;
      const senhaOriginal = certificadoParaAssinatura.senha; // Senha original descriptografada
      
      // Testar diferentes variações da senha
      const senhasParaTestar = [
        senhaOriginal,
        senhaOriginal?.trim(),
        senhaOriginal?.toLowerCase(),
        senhaOriginal?.toUpperCase(),
        ''  // senha vazia
      ].filter(Boolean);
      
      const forge = require('node-forge');
      let senhaCorreta = null;
      let signedPdf = null;
      
      for (let i = 0; i < senhasParaTestar.length; i++) {
        try {
          const senhaTest = senhasParaTestar[i];
          
          // Validar senha com node-forge primeiro
          const p12Asn1 = forge.asn1.fromDer(bufferCertificado.toString('binary'));
          const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, senhaTest);
          
          // Se a validação passou, tentar assinar o PDF
          const pdfWithPlaceholder = plainAddPlaceholder({
            pdfBuffer,
            reason: 'Assinatura Digital Laudo Médico',
            name: certificadoParaAssinatura.informacoes.medico,
            location: 'Sistema LaudoFy',
          });

          const signer = new P12Signer(bufferCertificado, { passphrase: senhaTest });
          const signPdf = new SignPdf();
          
          signedPdf = await signPdf.sign(pdfWithPlaceholder, signer);
          
          senhaCorreta = senhaTest;
          break; // Sair do loop, encontramos a senha correta
          
        } catch (testError) {
          // Continuar testando próxima variação
        }
      }
      
      if (!senhaCorreta || !signedPdf) {
        throw new Error('Nenhuma variação de senha funcionou para assinatura');
      }

      // Registrar uso do certificado
      const CertificadoDigital = require('../models/CertificadoDigital');
      const certificado = await CertificadoDigital.findById(certificadoParaAssinatura.certificadoId);
      if (certificado) {
        await certificado.registrarUso(true);
      }

      // Upload do PDF assinado para S3
      try {
        const uploadResult = await uploadLaudoToS3(
          signedPdf, 
          laudoId, 
          tenantId, 
          'assinado', 
          `laudo_assinado_${laudoId}.pdf`
        );
        
        return { 
          success: true, 
          fileUrl: uploadResult.url,
          fileKey: uploadResult.key,
          s3Key: uploadResult.key, // Compatibilidade
          assinadoCom: 'certificado_medico',
          certificadoId: certificadoParaAssinatura.certificadoId,
          storage: 's3'
        };
      } catch (s3Error) {
        console.error('Erro no upload para S3, tentando UploadCare:', s3Error);
        
        // Fallback para UploadCare se S3 falhar
        const pdfFile = {
          buffer: signedPdf,
          originalname: `laudo_assinado_${laudoId}.pdf`,
          mimetype: 'application/pdf',
          size: signedPdf.length,
          stream: () => {
            const stream = new require('stream').Readable();
            stream.push(signedPdf);
            stream.push(null);
            return stream;
          }
        };

        const uploadcareUrl = await uploadPDFToUploadcare(pdfFile);
        return { 
          success: true, 
          fileUrl: uploadcareUrl, 
          assinadoCom: 'certificado_medico',
          certificadoId: certificadoParaAssinatura.certificadoId,
          storage: 'uploadcare'
        };
      }
    } catch (signError) {
      console.error('Error signing PDF');
      
      // Fall back to unsigned PDF if signing fails - upload para S3
      try {
        const uploadResult = await uploadLaudoToS3(
          pdfBuffer, 
          laudoId, 
          tenantId, 
          'assinado', 
          `laudo_${laudoId}.pdf`
        );
        
        return { 
          success: true, 
          fileUrl: uploadResult.url,
          fileKey: uploadResult.key,
          s3Key: uploadResult.key, // Compatibilidade
          signed: false,
          storage: 's3'
        };
      } catch (s3Error) {
        console.error('Erro no upload para S3, tentando UploadCare:', s3Error);
        
        // Fallback para UploadCare
        const pdfFile = {
          buffer: pdfBuffer,
          originalname: `laudo_${laudoId}.pdf`,
          mimetype: 'application/pdf',
          size: pdfBuffer.length,
          stream: () => {
            const stream = new require('stream').Readable();
            stream.push(pdfBuffer);
            stream.push(null);
            return stream;
          }
        };

        const uploadcareUrl = await uploadPDFToUploadcare(pdfFile);
        return { 
          success: true, 
          fileUrl: uploadcareUrl, 
          signed: false,
          storage: 'uploadcare'
        };
      }
    }
  } catch (err) {
    console.error('Erro na assinatura digital');
    throw err;
  }
};

// --- CRIAÇÃO DO LAUDO JÁ ASSINADO ---
exports.criarLaudo = async (req, res) => {
  let laudo;
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { exameId, conclusao } = req.body;
    const usuarioId = req.usuario.id;
    const usuarioNome = req.usuarioNome;

    // **CORRIGIDO: Validar campos obrigatórios do usuário**
    if (!usuarioId) {
      return res.status(400).json({ erro: 'ID do usuário é obrigatório' });
    }

    if (!usuarioNome) {
      return res.status(400).json({ erro: 'Nome do usuário é obrigatório' });
    }

    if (!exameId || !conclusao) {
      return res.status(400).json({ erro: 'Exame e conclusão são obrigatórios' });
    }

    const exame = await Exame.findById(exameId)
      .populate('paciente')
      .populate('tipoExame');

    if (!exame) {
      return res.status(404).json({ erro: 'Exame não encontrado' });
    }

    const tenantId = exame.tenant_id;

    const laudoExistente = await Laudo.findOne({ exame: exameId, valido: true });
    if (laudoExistente) {
      return res.status(400).json({ erro: 'Já existe um laudo válido para este exame' });
    }

    const gerarCodigoAcesso = () => Math.floor(1000 + Math.random() * 9000).toString();
    const codigoAcesso = gerarCodigoAcesso();

    // Buscar médico para obter especialidade
    const medico = await Usuario.findById(usuarioId).populate('especialidades');

    // Verificar se o médico tem certificado digital ativo
    const CertificadoDigital = require('../models/CertificadoDigital');
    const certificadoAtivo = await CertificadoDigital.findOne({
      medicoId: usuarioId,
      ativo: true,
      dataVencimento: { $gt: new Date() }
    });

    // Cria o laudo com status baseado na presença de certificado
    const laudoData = {
      exame: exameId,
      medicoResponsavel: usuarioNome,
      medicoResponsavelId: usuarioId,
      conclusao,
      status: 'Laudo pronto para assinatura',
      valido: true,
      criadoPor: usuarioNome,
      criadoPorId: usuarioId,
      codigoAcesso,
      tenant_id: tenantId,
      tipoExameId: exame.tipoExame,
      especialidadeId: medico?.especialidades?.[0] || null,
      assinadoCom: 'sem_assinatura' // Inicialmente sem assinatura, será atualizado quando assinado
    };

    // Encrypt sensitive fields
    const encryptedData = encryptFields(laudoData);

    laudo = new Laudo(encryptedData);

    // Calcular valor do laudo se os IDs necessários estão disponíveis
    if (laudo.tipoExameId && laudo.especialidadeId) {
      await laudo.calcularValorPago();
    }

    await laudo.save();

    // === GERAR E SALVAR PDF ORIGINAL NO S3 ===
    try {
      // Obter dados completos do laudo para gerar PDF
      const laudoCompleto = await obterLaudoPorId(laudo._id);
      if (!laudoCompleto) {
        throw new Error('Erro ao obter dados do laudo criado');
      }

      // Buscar usuário médico
      const usuarioMedico = await Usuario.findById(usuarioId);

      // Gerar PDF original
      const pdfBuffers = [];
      const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
      
      doc.on('data', chunk => pdfBuffers.push(chunk));

      // Gerar link público para o laudo original
      const publicLink = `${process.env.FRONTEND_URL || 'https://reports.codeytech.com.br/'}/publico/${laudo._id}`;

      // Gerar conteúdo do PDF
      await gerarConteudoPdfLaudo(
        doc, 
        laudoCompleto, 
        laudoCompleto.exame, 
        usuarioMedico, 
        usuarioNome, 
        laudoCompleto.conclusao, 
        publicLink, 
        defaultStyles
      );

      // Adicionar área de assinatura baseada no campo assinadoCom do laudo
      // (REMOVIDO: assinatura já é desenhada corretamente na área do template)
      // const assinadoCom = laudo.assinadoCom || 'upload_manual';
      // if (assinadoCom !== 'sem_assinatura') {
      //   const assinadoDigitalmente = assinadoCom === 'certificado_medico' || assinadoCom === 'certificado_sistema';
      //   const usarAssinaturaFisica = assinadoCom === 'upload_manual';
      //   await adicionarAreaAssinaturaMedica(
      //     doc, 
      //     usuarioNome, 
      //     usuarioMedico, 
      //     doc.y || 600, 
      //     assinadoDigitalmente, // Baseado no assinadoCom
      //     assinadoCom === 'upload_manual' ? null : new Date(), // Data apenas se não for upload manual
      //     null, // certificadoInfo
      //     usarAssinaturaFisica // Usar assinatura física apenas se upload_manual
      //   );
      // }

      await new Promise((resolve, reject) => {
        doc.on('end', resolve);
        doc.on('error', reject);
        doc.end();
      });

      const pdfBuffer = Buffer.concat(pdfBuffers);

      // Fazer upload do PDF original para S3
      const { uploadLaudoToS3 } = require('../services/laudoStorageService');
      
      try {
        const uploadResult = await uploadLaudoToS3(
          pdfBuffer, 
          laudo._id, 
          tenantId, 
          'original', 
          `laudo_original_${laudo._id}.pdf`
        );
        
        // Salvar chave S3 no laudo
        laudo.laudoOriginalKey = uploadResult.key;
        laudo.laudoOriginal = uploadResult.url; // Manter compatibilidade com UploadCare legado
        
        await laudo.save();
        
        console.log(`PDF original salvo no S3: ${uploadResult.key}`);
        
      } catch (s3Error) {
        console.error('Erro ao fazer upload do PDF original para S3:', s3Error);
        // Continuar sem falhar - o PDF será gerado dinamicamente quando necessário
      }
      
    } catch (pdfError) {
      console.error('Erro ao gerar PDF original:', pdfError);
      // Continuar sem falhar - o PDF será gerado dinamicamente quando necessário
    }

    // Atualizar status do exame - sempre "Laudo pronto para assinatura" até ser assinado
    exame.status = 'Laudo pronto para assinatura';
    exame.laudo = laudo._id;
    await exame.save();

    await AuditLog.create({
      userId: usuarioId,
      action: 'create',
      description: `Novo laudo criado para exame ${exameId} - Status: ${laudo.status}`,
      collectionName: 'laudos',
      documentId: laudo._id,
      before: null,
      after: laudo.toObject(),
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      additionalInfo: {
        pacienteId: exame.paciente._id,
        tipoExame: exame.tipoExame.nome,
        temCertificado: !!certificadoAtivo
      },
      tenant_id: tenantId
    });

    res.status(201).json({
      mensagem: certificadoAtivo ? 'Laudo criado! Você pode assinar automaticamente ou fazer upload do laudo assinado.' : 'Laudo criado! Faça upload do laudo assinado para finalizar.',
      laudo: {
        id: laudo._id,
        exame: exameId,
        status: laudo.status,
        criadoEm: laudo.createdAt,
        valorPago: laudo.valorPago,
        temCertificado: !!certificadoAtivo
      },
      temCertificado: !!certificadoAtivo,
      valido: true
    });

  } catch (err) {
    logger.error('Erro ao criar laudo:', err);

    if (laudo?._id) {
      await Laudo.findByIdAndUpdate(laudo._id, {
        status: 'Erro ao gerar PDF'
      });
    }

    res.status(500).json({
      erro: 'Erro ao criar laudo',
      detalhes: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// --- REFAZER LAUDO ---
exports.refazerLaudo = async (req, res) => {
  let novoLaudo;
  let laudoOriginal; // Declarar no escopo da função para acessar no catch
  
  try {
    const laudoId = req.params.id;
    const { conclusao, motivo } = req.body;
    const usuarioId = req.usuarioId;
    const usuarioNome = req.usuarioNome;
    
    // **VALIDAÇÕES DE SEGURANÇA**
    if (!usuarioId) {
      return res.status(400).json({ 
        erro: 'ID do usuário é obrigatório para criar o laudo' 
      });
    }

    if (!usuarioNome) {
      return res.status(400).json({ 
        erro: 'Nome do usuário é obrigatório para criar o laudo' 
      });
    }

    if (!conclusao || !conclusao.trim()) {
      return res.status(400).json({ 
        erro: 'Nova conclusão é obrigatória para refazer o laudo' 
      });
    }
    
    // **CORRIGIDO: Garantir que tenant_id seja um ObjectId válido**
    let tenantId = req.tenant_id;
    if (Array.isArray(tenantId)) {
      tenantId = tenantId[0];
    }
    if (typeof tenantId === 'object' && tenantId._id) {
      tenantId = tenantId._id;
    }

    // Busca o laudo original
    laudoOriginal = await Laudo.findById(laudoId).populate({
      path: 'exame',
      populate: { path: 'paciente tipoExame' }
    });

    if (!laudoOriginal) {
      return res.status(404).json({ erro: 'Laudo original não encontrado' });
    }

    // **NOVO: Verifica se o laudo original pode ser refeito**
    if (laudoOriginal.status === 'Laudo refeito') {
      return res.status(400).json({ 
        erro: 'Este laudo já foi refeito anteriormente. Não é possível refazer um laudo que já foi refeito.' 
      });
    }

    // **NOVO: Atualizar status do laudo original para "Laudo refeito"**
    laudoOriginal.status = 'Laudo refeito';
    laudoOriginal.historico = [
      ...(laudoOriginal.historico || []),
      {
        data: new Date(),
        usuario: usuarioId,
        nomeUsuario: usuarioNome,
        acao: 'Atualização',
        detalhes: `Status alterado para "Laudo refeito" - Motivo: ${motivo || 'Não informado'}`,
        versao: (laudoOriginal.historico?.length || 0) + 1
      }
    ];
    await laudoOriginal.save();

    // Gerar código de acesso para o novo laudo
    const gerarCodigoAcesso = () => Math.floor(1000 + Math.random() * 9000).toString();
    const codigoAcesso = gerarCodigoAcesso();

    // **NOVO: Criar novo laudo sempre com status "Laudo pronto para assinatura"**
    // Não gerar PDF automaticamente - deixar para o médico escolher método de assinatura
    novoLaudo = new Laudo({
      exame: laudoOriginal.exame._id,
      medicoResponsavel: usuarioNome,
      medicoResponsavelId: usuarioId,
      conclusao: conclusao.trim(),
      status: 'Laudo pronto para assinatura',
      valido: true,
      criadoPor: usuarioNome,
      criadoPorId: usuarioId,
      codigoAcesso,
      historico: [
        {
          data: new Date(),
          usuario: usuarioId,
          nomeUsuario: usuarioNome,
          acao: 'Criação',
          detalhes: `Laudo refeito - Referência ao laudo anterior: ${laudoOriginal._id}`,
          versao: 1
        }
      ],
      tenant_id: tenantId,
      tipoExameId: laudoOriginal.tipoExameId,
      especialidadeId: laudoOriginal.especialidadeId,
      laudoAnteriorId: laudoOriginal._id, // Referência ao laudo original
      versaoLaudo: (laudoOriginal.versaoLaudo || 1) + 1 // Incrementar versão
    });

    // Calcular valor do novo laudo
    if (novoLaudo.tipoExameId && novoLaudo.especialidadeId) {
          
           await novoLaudo.calcularValorPago();
    }

    await novoLaudo.save();

    // **NOVO: Atualizar exame para apontar para o novo laudo**
    laudoOriginal.exame.laudo = novoLaudo._id;
    laudoOriginal.exame.status = 'Laudo realizado';
    await laudoOriginal.exame.save();

    // **NOVO: Auditoria para ambos os laudos**
    await AuditLog.create({
      userId: usuarioId,
      action: 'recreate',
      description: `Laudo refeito - Novo laudo criado: ${novoLaudo._id}, Laudo anterior: ${laudoOriginal._id}`,
      collectionName: 'laudos',
      documentId: novoLaudo._id,
      before: laudoOriginal.toObject(),
      after: novoLaudo.toObject(),
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      additionalInfo: {
        pacienteId: laudoOriginal.exame.paciente._id,
        tipoExame: laudoOriginal.exame.tipoExame.nome,
        motivo: motivo || 'Não informado',
        laudoAnteriorId: laudoOriginal._id,
        novaVersao: novoLaudo.versaoLaudo
      },
      tenant_id: tenantId
    });

    // **NOVO: Resposta sempre redireciona para página de detalhes do novo laudo**
    res.status(201).json({
      mensagem: 'Laudo refeito com sucesso! Redirecionando para o novo laudo.',
      laudo: {
        id: novoLaudo._id,
        _id: novoLaudo._id,
        exame: laudoOriginal.exame._id,
        status: novoLaudo.status,
        conclusao: novoLaudo.conclusao,
        criadoEm: novoLaudo.createdAt,
        valorPago: novoLaudo.valorPago,
        codigoAcesso: novoLaudo.codigoAcesso,
        versaoLaudo: novoLaudo.versaoLaudo,
        laudoAnteriorId: laudoOriginal._id
      },
      redirect: true, // Flag para o frontend saber que deve redirecionar
      redirectTo: `/laudos/${novoLaudo._id}`, // URL para redirecionamento
      valido: true
    });

  } catch (err) {
    logger.error('Erro ao refazer laudo:', err);

    // Se houve erro, reverter status do laudo original
    if (laudoOriginal && laudoOriginal._id) {
      try {
        // Remover a última entrada do histórico se foi adicionada
        if (laudoOriginal.historico && laudoOriginal.historico.length > 0) {
          laudoOriginal.historico.pop();
        }
        laudoOriginal.status = laudoOriginal.status === 'Laudo refeito' ? 'Laudo assinado' : laudoOriginal.status;
        await laudoOriginal.save();
      } catch (revertErr) {
        logger.error('Erro ao reverter status do laudo original:', revertErr);
      }
    }

    // Se o novo laudo foi criado mas deu erro, removê-lo
    if (novoLaudo?._id) {
      try {
        await Laudo.findByIdAndDelete(novoLaudo._id);
      } catch (deleteErr) {
        logger.error('Erro ao deletar novo laudo após falha:', deleteErr);
      }
    }

    res.status(500).json({
      erro: 'Erro ao refazer laudo',
      detalhes: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Listar laudos por paciente
exports.listarLaudosPorPaciente = async (req, res) => {
  try {
    const pacienteId = req.params.id;
    
    // Verificar se o pacienteId é um ObjectId válido
    if (!mongoose.Types.ObjectId.isValid(pacienteId)) {
      return res.status(400).json({ erro: 'ID do paciente inválido' });
    }

    // Primeiro, buscar todos os exames do paciente
    const examesDoPaciente = await Exame.find({ 
      paciente: pacienteId 
    }).select('_id');
    
    const exameIds = examesDoPaciente.map(exame => exame._id);
    
    if (exameIds.length === 0) {
      return res.json({ 
        success: true, 
        laudos: [], 
        message: 'Nenhum exame encontrado para este paciente' 
      });
    }

    // Buscar laudos dos exames do paciente
    let query = { exame: { $in: exameIds } };
    
    // Aplicar filtro de tenant se não for adminMaster
    if (req.usuario.role !== 'adminMaster') {
      if (Array.isArray(req.tenant_id)) {
        query.tenant_id = { $in: req.tenant_id };
      } else {
        query.tenant_id = req.tenant_id;
      }
    }

    const laudos = await Laudo.find(query)
      .populate({
        path: 'exame',
        populate: [
          {
            path: 'paciente',
            select: 'nome dataNascimento email cpf'
          },
          {
            path: 'tipoExame',
            select: 'nome descricao'
          }
        ]
      })
      .populate('medicoResponsavelId', 'nome crm email especialidades')
      .sort({ createdAt: -1 }); // Ordenar do mais recente para o mais antigo

    // Descriptografar campos necessários
    const laudosProcessados = laudos.map(laudo => {
      const laudoObj = laudo.toObject();
      
      // Aplicar getters para descriptografar
      if (laudoObj.conclusao) {
        try {
          laudoObj.conclusao = decrypt(laudoObj.conclusao);
        } catch (error) {
          console.error('Erro ao descriptografar conclusão:', error);
          laudoObj.conclusao = 'Erro na descriptografia';
        }
      }
      
      if (laudoObj.medicoResponsavel) {
        try {
          laudoObj.medicoResponsavel = decrypt(laudoObj.medicoResponsavel);
        } catch (error) {
          console.error('Erro ao descriptografar médico responsável:', error);
        }
      }

      return laudoObj;
    });
    
    res.json({ 
      success: true, 
      laudos: laudosProcessados,
      total: laudosProcessados.length 
    });
  } catch (err) {
    logger.error('Erro ao listar laudos por paciente:', err);
    res.status(500).json({ erro: 'Erro ao listar laudos por paciente' });
  }
};

// Listar todos os laudos - FILTRO DE PACIENTE CORRIGIDO
exports.listarLaudos = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sort = req.query.sort || '-createdAt';
    const skip = (page - 1) * limit;

    // Build base query
    const baseQuery = {};
    
    // Filtrar por role do usuário
    if (req.usuario.role === 'medico') {
      baseQuery.medicoResponsavelId = req.usuario.id;
    } else if (req.usuario.role !== 'adminMaster') {
      if (Array.isArray(req.tenant_id)) {
        baseQuery.tenant_id = { $in: req.tenant_id };
      } else {
        baseQuery.tenant_id = req.tenant_id;
      }
    }
    
    // Aplicar filtros básicos
    if (req.query.status && req.query.status.trim() !== '') {
      baseQuery.status = req.query.status.trim();
    }
    
    if (req.query.exameId && req.query.exameId.trim() !== '') {
      baseQuery.exame = req.query.exameId.trim();
    }

    // Filtro de datas
    if (req.query.dataInicio || req.query.dataFim) {
      baseQuery.createdAt = {};
      if (req.query.dataInicio && req.query.dataInicio.trim() !== '') {
        baseQuery.createdAt.$gte = new Date(req.query.dataInicio);
      }
      if (req.query.dataFim && req.query.dataFim.trim() !== '') {
        const dataFim = new Date(req.query.dataFim);
        dataFim.setHours(23, 59, 59, 999);
        baseQuery.createdAt.$lte = dataFim;
      }
    }

    // NOVA ABORDAGEM: Buscar primeiro os pacientes pelo nome e depois os laudos
    let laudos, total;

    if (req.query.paciente && req.query.paciente.trim() !== '') {
      const termoPaciente = req.query.paciente.trim();

      // Primeiro, buscar todos os pacientes que correspondem ao filtro
      const Paciente = require('../models/Paciente');
      
      // Como o nome está criptografado, vamos buscar todos os pacientes 
      // e descriptografar no lado da aplicação
      const pacientes = await Paciente.find({}).select('_id nome');
            
      // Filtrar pacientes cujo nome descriptografado contém o termo
      const pacientesMatched = [];
      
      for (const paciente of pacientes) {
        try {
          // Usar o getter que já descriptografam
          const nomeDescriptografado = paciente.nome; // O getter do modelo faz a descriptografia
          
          if (nomeDescriptografado && 
              nomeDescriptografado.toLowerCase().includes(termoPaciente.toLowerCase())) {
            pacientesMatched.push(paciente._id);
          }
        } catch (error) {
          console.error('Erro ao descriptografar nome do paciente');
        }
      }
            
      if (pacientesMatched.length === 0) {
        // Nenhum paciente encontrado, retornar resultado vazio
        return res.json({
          laudos: [],
          page,
          limit,
          total: 0,
          totalPages: 0
        });
      }

      // Agora buscar os exames desses pacientes
      const Exame = require('../models/Exame');
      const exames = await Exame.find({ 
        paciente: { $in: pacientesMatched } 
      }).select('_id');
      
      const exameIds = exames.map(exame => exame._id);
      
      if (exameIds.length === 0) {
        return res.json({
          laudos: [],
          page,
          limit,
          total: 0,
          totalPages: 0
        });
      }

      // Adicionar filtro de exames à query base
      baseQuery.exame = { $in: exameIds };
    }

    // Filtro adicional para médico por ID
    if (req.query.medicoId && req.query.medicoId.trim() !== '' && mongoose.isValidObjectId(req.query.medicoId)) {
      baseQuery.medicoResponsavelId = req.query.medicoId.trim();
    }

    // Query com populate    
    [laudos, total] = await Promise.all([
      Laudo.find(baseQuery)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate({
          path: 'exame',
          populate: [
            {
              path: 'paciente',
              select: 'nome idade dataNascimento email cpf'
            },
            {
              path: 'tipoExame',
              select: 'nome'
            }
          ]
        })
        .populate('medicoResponsavelId', 'nome crm')
        .populate('tenant_id', 'nomeFantasia'),
      Laudo.countDocuments(baseQuery)
    ]);

    // Converter para JSON e garantir que os getters sejam aplicados corretamente
    const laudosFormatted = laudos.map(laudo => {
      // Usar toJSON() para aplicar todos os getters e transform
      const laudoJson = laudo.toJSON();
      
      // Garantir estrutura correta do exame
      if (laudoJson.exame?.tipoExame && typeof laudoJson.exame.tipoExame === 'string') {
        laudoJson.exame.tipoExame = { nome: 'Tipo não informado' };
      }

      // Verificar se a conclusão foi descriptografada corretamente
      if (laudoJson.conclusao && typeof laudoJson.conclusao === 'string' && laudoJson.conclusao.includes(':')) {
        try {
          laudoJson.conclusao = decrypt(laudoJson.conclusao) || laudoJson.conclusao;
        } catch (error) {
          console.error('Erro ao descriptografar conclusão');
        }
      }

      // Garantir descriptografia do nome do paciente
      if (laudoJson.exame?.paciente?.nome && typeof laudoJson.exame.paciente.nome === 'string' && laudoJson.exame.paciente.nome.includes(':')) {
        try {
          laudoJson.exame.paciente.nome = decrypt(laudoJson.exame.paciente.nome) || laudoJson.exame.paciente.nome;
        } catch (error) {
          console.error('Erro ao descriptografar nome do paciente');
        }
      }

      return laudoJson;
    });

    res.json({
      laudos: laudosFormatted,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    });

  } catch (err) {
    res.status(500).json({
      message: 'Error retrieving reports',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Obter um laudo por ID - CORRIGIDO
exports.obterLaudo = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.usuario; // CORRIGIDO: era req.user

    // Validar ObjectId
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ erro: 'ID do laudo inválido' });
    }

    let query = { _id: id };

    // AdminMaster pode acessar qualquer laudo
    if (user.role !== 'adminMaster') {
      // Para outros usuários, aplicar filtro de tenant
      if (Array.isArray(req.tenant_id)) {
        query.tenant_id = { $in: req.tenant_id };
      } else {
        query.tenant_id = req.tenant_id;
      }
    }

    // Médicos só podem ver seus próprios laudos
    if (user.role === 'medico') {
      query.medicoResponsavelId = user.id;
    }

    const laudo = await Laudo.findOne(query)
      .populate({
        path: 'exame',
        populate: [
          {
            path: 'paciente',
            select: 'nome dataNascimento email cpf endereco telefone'
          },
          {
            path: 'tipoExame',
            select: 'nome descricao'
          }
        ]
      })
      .populate('medicoResponsavelId', 'nome crm email especialidades')
      .populate('tenant_id', 'nomeFantasia cnpj status');

    if (!laudo) {
      return res.status(404).json({ erro: 'Laudo não encontrado' });
    }

    // Converter para JSON para aplicar getters
    const laudoJson = laudo.toJSON();

    // Verificar e descriptografar campos sensíveis do laudo
    const fieldsToCheck = ['conclusao', 'medicoResponsavel', 'laudoOriginal', 'laudoAssinado', 'observacoesPagamento'];
    
    fieldsToCheck.forEach(field => {
      if (laudoJson[field] && typeof laudoJson[field] === 'string' && laudoJson[field].includes(':')) {
        try {
          laudoJson[field] = decrypt(laudoJson[field]) || laudoJson[field];
        } catch (error) {
          console.error(`Erro ao descriptografar ${field}`);
        }
      }
    });

    // Garantir que os dados do paciente estejam descriptografados
    if (laudoJson.exame?.paciente) {
      const paciente = laudoJson.exame.paciente;
      
      // Verificar se os campos do paciente precisam ser descriptografados
      const pacienteFields = ['nome', 'cpf', 'endereco', 'telefone', 'email'];
      
      pacienteFields.forEach(field => {
        if (paciente[field] && typeof paciente[field] === 'string' && paciente[field].includes(':')) {
          try {
            paciente[field] = decrypt(paciente[field]) || paciente[field];
          } catch (error) {
            console.error(`Erro ao descriptografar paciente.${field}`);
          }
        }
      });

      // Calcular idade se dataNascimento existir
      if (paciente.dataNascimento) {
        try {
          const dataNasc = new Date(paciente.dataNascimento);
          if (!isNaN(dataNasc)) {
            const hoje = new Date();
            let idade = hoje.getFullYear() - dataNasc.getFullYear();
            const m = hoje.getMonth() - dataNasc.getMonth();
            if (m < 0 || (m === 0 && hoje.getDate() < dataNasc.getDate())) {
              idade--;
            }
            paciente.idade = idade;
          }
        } catch (error) {
          console.error('Erro ao calcular idade');
        }
      }
    }

    // Garantir que os dados do exame estejam descriptografados
    if (laudoJson.exame) {
      const exame = laudoJson.exame;
      
      // Verificar se os campos do exame precisam ser descriptografados
      const exameFields = ['arquivo', 'observacoes', 'status'];
      
      exameFields.forEach(field => {
        if (exame[field] && typeof exame[field] === 'string' && exame[field].includes(':')) {
          try {
            exame[field] = decrypt(exame[field]) || exame[field];
          } catch (error) {
            console.error(`Erro ao descriptografar exame.${field}:`);
          }
        }
      });
    }

    // Descriptografar histórico
    if (laudoJson.historico && Array.isArray(laudoJson.historico)) {
      laudoJson.historico = laudoJson.historico.map(item => {
        const historicoFields = ['usuario', 'nomeUsuario', 'detalhes', 'destinatarioEmail', 'mensagemErro'];
        
        historicoFields.forEach(field => {
          if (item[field] && typeof item[field] === 'string' && item[field].includes(':')) {
            try {
              item[field] = decrypt(item[field]) || item[field];
            } catch (error) {
              console.error(`Erro ao descriptografar historico.${field}:`);
            }
          }
        });
        
        return item;
      });
    }

    res.json(laudoJson);
  } catch (err) {
    console.error('Erro ao obter laudo');
    logger.error('Erro ao obter laudo');
    res.status(500).json({ 
      erro: 'Erro interno do servidor',
      detalhes: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Histórico de versões do laudo
exports.getHistoricoLaudo = async (req, res) => {
  try {
    const laudo = await Laudo.findById(req.params.id);
    if (!laudo) {
      return res.status(404).json({ erro: 'Laudo não encontrado' });
    }
    res.json(laudo.historico || []);
  } catch (err) {
    logger.error('Erro ao obter histórico do laudo:', err);
    res.status(500).json({ erro: 'Erro ao obter histórico do laudo' });
  }
};

// Gerar PDF do laudo (original, sem assinatura)
exports.gerarPdfLaudo = async (req, res) => {
  try {
    const laudo = await Laudo.findById(req.params.id).populate({
      path: 'exame',
      populate: { path: 'paciente tipoExame' }
    });
    if (!laudo) {
      return res.status(404).json({ erro: 'Laudo não encontrado' });
    }

    // Verificar se o laudo tem PDF original
    if (laudo.laudoOriginalKey || laudo.laudoOriginal) {
      // Se tem S3 key, buscar do S3
      if (laudo.laudoOriginalKey) {
        const { getSignedUrlForLaudo } = require('../services/laudoStorageService');
        try {
          const signedUrl = await getSignedUrlForLaudo(laudo.laudoOriginalKey);
          return res.redirect(signedUrl);
        } catch (error) {
          console.error('Erro ao obter URL assinada do S3:', error);
        }
      }
      
      // Fallback para URL do UploadCare (legado)
      if (laudo.laudoOriginal) {
        return res.redirect(laudo.laudoOriginal);
      }
    }

    // Último recurso: Gerar PDF dinamicamente se não existir no S3 nem UploadCare
    console.log('PDF original não encontrado no S3 ou UploadCare, gerando dinamicamente...');      
      // Obter dados completos do laudo
      const laudoCompleto = await obterLaudoPorId(req.params.id);
      if (!laudoCompleto) {
        return res.status(404).json({ erro: 'Dados do laudo não encontrados' });
      }

      // Buscar usuário médico
      const usuarioMedico = await Usuario.findById(laudoCompleto.medicoResponsavelId);
      const medicoNome = usuarioMedico ? usuarioMedico.nome : laudoCompleto.medicoResponsavel;

      // Gerar PDF original
      const pdfBuffers = [];
      const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
      
      doc.on('data', chunk => pdfBuffers.push(chunk));

      // Gerar link público para o laudo
      const publicLink = `${process.env.FRONTEND_URL || 'https://reports.codeytech.com.br/'}/publico/${req.params.id}`;

      // Gerar conteúdo do PDF
      const currentY = await gerarConteudoPdfLaudo(
        doc, 
        laudoCompleto, 
        laudoCompleto.exame, 
        usuarioMedico, 
        medicoNome, 
        laudoCompleto.conclusao, 
        publicLink, 
        defaultStyles
      );

      // (REMOVIDO: assinatura já é desenhada corretamente na área do template)
      // Adicionar área de assinatura baseada no campo assinadoCom do laudo
      // const assinadoCom = laudo.assinadoCom || 'upload_manual';
      // if (assinadoCom !== 'sem_assinatura') {
      //   const assinadoDigitalmente = assinadoCom === 'certificado_medico' || assinadoCom === 'certificado_sistema';
      //   const usarAssinaturaFisica = assinadoCom === 'upload_manual';
      //   await adicionarAreaAssinaturaMedica(
      //     doc, 
      //     usuarioNome, 
      //     usuarioMedico, 
      //     doc.y || 600, 
      //     assinadoDigitalmente, // Baseado no assinadoCom
      //     assinadoCom === 'upload_manual' ? null : new Date(), // Data apenas se não for upload manual
      //     null, // certificadoInfo
      //     usarAssinaturaFisica // Usar assinatura física apenas se upload_manual
      //   );
      // }

      // Finalizar documento
      await new Promise((resolve, reject) => {
        doc.on('end', resolve);
        doc.on('error', reject);
        doc.end();
      });

      const pdfBuffer = Buffer.concat(pdfBuffers);

      // Definir headers para download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="laudo_original_${laudo._id}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.setHeader('Cache-Control', 'no-cache');
      
      return res.send(pdfBuffer);

  } catch (err) {
    console.error('Erro ao fazer download do laudo original:', err);
    res.status(500).json({ erro: 'Erro ao fazer download do laudo original' });
  }
};

// Download do laudo assinado
exports.downloadLaudoAssinado = async (req, res) => {
  try {
    const laudo = await Laudo.findById(req.params.id);
    if (!laudo) {
      return res.status(404).json({ erro: 'Laudo não encontrado' });
    }

    // Priorizar S3 se disponível
    if (laudo.laudoAssinadoKey) {
      try {
        const signedUrlResult = await getSignedUrlForLaudo(laudo.laudoAssinadoKey, 3600);
        
        // Verificar se a operação foi bem-sucedida
        if (!signedUrlResult.success) {
          throw new Error(signedUrlResult.error || 'Erro ao gerar URL assinada');
        }
        
        const signedUrl = signedUrlResult.url;
        
        // Fazer o download do arquivo do S3 e retornar como stream
        const https = require('https');
        const http = require('http');
        const url = require('url');
        
        const parsedUrl = url.parse(signedUrl);
        const protocol = parsedUrl.protocol === 'https:' ? https : http;
        
        protocol.get(signedUrl, (response) => {
          if (response.statusCode !== 200) {
            return res.status(500).json({ erro: 'Erro ao baixar arquivo do S3' });
          }
          
          // Configurar headers para download
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="laudo_assinado_${laudo._id}.pdf"`);
          res.setHeader('Cache-Control', 'no-cache');
          
          // Pipe do stream do S3 para a resposta
          response.pipe(res);
        }).on('error', (error) => {
          console.error('Erro ao baixar do S3:', error);
          res.status(500).json({ erro: 'Erro ao baixar arquivo' });
        });
        
        return; // Importante: retornar aqui para não continuar executando o resto da função
        
      } catch (error) {
        console.error('Erro ao gerar URL pré-assinada para laudo assinado:', error);
        return res.status(500).json({ erro: 'Erro ao gerar link de download' });
      }
    }

    // Verificar se existe arquivo assinado (arquivoPath é o novo campo, laudoAssinado é para compatibilidade)
    const arquivoUrl = laudo.arquivoPath || laudo.laudoAssinado;
    
    if (!arquivoUrl) {
      return res.status(404).json({ erro: 'Arquivo assinado não encontrado' });
    }

    // Se for uma URL externa (UploadCare), fazer download e retornar
    if (arquivoUrl.includes('ucarecdn.com') || arquivoUrl.startsWith('http')) {
      const https = require('https');
      const http = require('http');
      const url = require('url');
      
      const parsedUrl = url.parse(arquivoUrl);
      const protocol = parsedUrl.protocol === 'https:' ? https : http;
      
      protocol.get(arquivoUrl, (response) => {
        if (response.statusCode !== 200) {
          return res.status(500).json({ erro: 'Erro ao baixar arquivo do UploadCare' });
        }
        
        // Configurar headers para download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="laudo_assinado_${laudo._id}.pdf"`);
        res.setHeader('Cache-Control', 'no-cache');
        
        // Pipe do stream do UploadCare para a resposta
        response.pipe(res);
      }).on('error', (error) => {
        console.error('Erro ao baixar do UploadCare:', error);
        res.status(500).json({ erro: 'Erro ao baixar arquivo' });
      });
      
      return; // Importante: retornar aqui para não continuar executando
    } else {
      // Se for um arquivo local (para compatibilidade com versões antigas)
      res.status(501).json({ erro: 'Download de arquivos locais não implementado' });
    }
  } catch (err) {
    logger.error('Erro ao baixar laudo assinado:', err);
    res.status(500).json({ erro: 'Erro ao baixar laudo assinado' });
  }
};

// Estatísticas de laudos
exports.getEstatisticas = async (req, res) => {
  try {
    const total = await Laudo.countDocuments();
    const assinados = await Laudo.countDocuments({ status: 'Laudo assinado' });
    res.json({ total, assinados });
  } catch (err) {
    logger.error('Erro ao obter estatísticas:', err);
    res.status(500).json({ erro: 'Erro ao obter estatísticas' });
  }
};

// Relatório de laudos por status
exports.getLaudosPorStatus = async (req, res) => {
  try {
    const stats = await Laudo.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    res.json(stats);
  } catch (err) {
    logger.error('Erro ao obter relatório por status:', err);
    res.status(500).json({ erro: 'Erro ao obter relatório por status' });
  }
};

// Listar laudos por exame
exports.getLaudosPorExame = async (req, res) => {
  try {
    const exameId = req.params.id;
    const laudos = await Laudo.find({ exame: exameId });
    res.json(laudos);
  } catch (err) {
    logger.error('Erro ao listar laudos por exame:', err);
    res.status(500).json({ erro: 'Erro ao listar laudos por exame' });
  }
};

// Enviar laudo por e-mail
exports.enviarEmailLaudo = async (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ erro: 'E-mail do destinatário inválido' });
    }

    // Validar se o laudo existe
    const laudo = await obterLaudoPorId(id);
    if (!laudo) {
      return res.status(404).json({ erro: 'Laudo não encontrado' });
    }

    // Verificar se o laudo está em um status válido para envio
    if (laudo.status !== 'Laudo assinado') {
      return res.status(400).json({ 
        erro: 'Apenas laudos assinados podem ser enviados por email' 
      });
    }

    // Importar o serviço de email
    const emailService = require('../services/emailService');

    // Preparar dados do laudo para o email
    const dadosLaudo = {
      id: laudo._id,
      codigoValidacao: laudo._id.toString().slice(-8).toUpperCase(),
      paciente: {
        nome: laudo.exame?.paciente?.nome || 'Não informado'
      },
      exame: {
        tipo: laudo.exame?.tipoExame?.nome || 'Exame',
        data: laudo.exame?.dataExame
      },
      medico: laudo.medicoResponsavel || 'Médico responsável',
      dataEmissao: laudo.createdAt,
      linkVisualizacao: `${process.env.FRONTEND_URL || 'https://reports.codeytech.com.br/'}/publico/${laudo._id}`
    };

    // Enviar email
    let resultadoEnvio = null;
    let sucesso = false;
    let erroEnvio = null;
    try {
      const resultado = await emailService.enviarLaudo(email, dadosLaudo);
      resultadoEnvio = {
        email: email,
        sucesso: true,
        messageId: resultado.id
      };
      sucesso = true;
    } catch (error) {
      logger.error(`Erro ao enviar email para ${email}:`, error);
      resultadoEnvio = {
        email: email,
        sucesso: false,
        erro: error.message
      };
      erroEnvio = error.message;
    }

    // Registrar histórico de envio no laudo
    try {
      const Laudo = require('../models/Laudo');
      await Laudo.findByIdAndUpdate(id, {
        $push: {
          enviosEmail: {
            data: new Date(),
            email: email,
            status: sucesso ? 'sucesso' : 'erro',
            detalhes: resultadoEnvio
          }
        }
      });
    } catch (error) {
      logger.error('Erro ao registrar histórico de envio:', error);
    }
    
    if (sucesso) {
      res.json({
        message: `Email enviado com sucesso para ${email}`,
        destinatario: email,
        resultado: resultadoEnvio,
        laudo: laudo
      });
    } else {
      res.status(500).json({
        erro: `Erro ao enviar email para ${email}`,
        destinatario: email,
        resultado: resultadoEnvio,
        laudo: laudo
      });
    }

  } catch (err) {
    logger.error('Erro ao enviar laudo por e-mail:', err);
    res.status(500).json({ erro: 'Erro interno ao enviar laudo por e-mail' });
  }
};

// Visualizar laudo público
exports.visualizarLaudoPublico = async (req, res) => {
  try {
    const { id } = req.params;
    
    const laudoCompleto = await obterLaudoPorId(id);
    if (!laudoCompleto) {
      return res.status(404).json({ erro: 'Laudo não encontrado' });
    }

    // Retornar dados formatados para visualização pública
    const laudoPublico = {
      id: laudoCompleto._id,
      codigoValidacao: laudoCompleto._id.toString().slice(-8).toUpperCase(),
      versao: laudoCompleto.versao,
      status: laudoCompleto.status === 'Laudo assinado' ? 'ativo' : 'inativo',
      dataEmissao: laudoCompleto.createdAt,
      temPdfAssinado: !!laudoCompleto.laudoAssinado || !!laudoCompleto.laudoAssinadoKey,
      // Informações sobre o tipo de assinatura
      assinadoDigitalmente: laudoCompleto.assinadoDigitalmente || false,
      assinadoCom: laudoCompleto.assinadoCom || 'sem_assinatura',
      dataAssinatura: laudoCompleto.dataAssinatura,
      paciente: {
        nome: laudoCompleto.exame?.paciente?.nome || 'Não informado',
        idade: laudoCompleto.exame?.paciente?.dataNascimento ? 
          calcularIdade(laudoCompleto.exame.paciente.dataNascimento) : null,
        dataNascimento: laudoCompleto.exame?.paciente?.dataNascimento
      },
      exame: {
        tipo: laudoCompleto.exame?.tipoExame?.nome || 'Não informado',
        data: laudoCompleto.exame?.dataExame
      },
      conclusao: laudoCompleto.conclusao,
      medico: laudoCompleto.medicoResponsavel || 'Médico não informado'
    };

    res.json(laudoPublico);
  } catch (err) {
    logger.error('Erro ao visualizar laudo público:', err);
    res.status(500).json({ erro: 'Erro ao visualizar laudo público' });
  }
};

// Gerar PDF público do laudo
exports.gerarPdfLaudoPublico = async (req, res) => {
  try {
    const { id } = req.params;
    
    const laudoCompleto = await obterLaudoPorId(id);
    if (!laudoCompleto) {
      return res.status(404).json({ erro: 'Laudo não encontrado' });
    }

    // Verificar se laudo tem PDF assinado
    if (laudoCompleto.laudoAssinadoKey || laudoCompleto.laudoAssinado) {
      // Se tem S3 key, buscar do S3
      if (laudoCompleto.laudoAssinadoKey) {
        const { getSignedUrlForLaudo } = require('../services/laudoStorageService');
        try {
          const signedUrl = await getSignedUrlForLaudo(laudoCompleto.laudoAssinadoKey);
          return res.redirect(signedUrl);
        } catch (error) {
          console.error('Erro ao obter URL assinada do S3:', error);
        }
      }
      
      // Fallback para URL do UploadCare (legado)
      if (laudoCompleto.laudoAssinado) {
        return res.redirect(laudoCompleto.laudoAssinado);
      }
    }

    // Se não tem PDF assinado, gerar PDF dinâmico com link público e QR code
    const PDFDocument = require('pdfkit');
    const QRCode = require('qrcode');
    
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 40, bottom: 40, left: 40, right: 40 }
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="laudo_${laudoCompleto._id}.pdf"`);
    
    doc.pipe(res);

    const pdfBuffers = [];
    doc.on('data', chunk => pdfBuffers.push(chunk));

    // Gerar link público
    const publicLink = `${process.env.FRONTEND_URL || 'https://reports.codeytech.com.br'}/publico/${id}`;
    
    // Gerar QR Code
    let qrCodeDataUrl;
    try {
      qrCodeDataUrl = await QRCode.toDataURL(publicLink, {
        width: 150,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
    } catch (qrError) {
      console.error('Erro ao gerar QR Code:', qrError);
    }

    // Gerar conteúdo do PDF
    const usuarioMedico = await Usuario.findById(laudoCompleto.medicoResponsavelId);
    
    await gerarConteudoPdfLaudo(
      doc, 
      laudoCompleto, 
      laudoCompleto.exame, 
      usuarioMedico, 
      laudoCompleto.medicoResponsavel, 
      laudoCompleto.conclusao, 
      publicLink, 
      defaultStyles
    );

    // Adicionar área de assinatura baseada no campo assinadoCom
    const currentY = doc.y + 20; // Reduzido o espaçamento
    const assinadoCom = laudoCompleto.assinadoCom || 'sem_assinatura';
    
    if (assinadoCom !== 'sem_assinatura') {
      const assinadoDigitalmente = assinadoCom === 'certificado_medico' || assinadoCom === 'certificado_sistema';
      const usarAssinaturaFisica = assinadoCom === 'upload_manual';
      
      await adicionarAreaAssinaturaMedica(
        doc, 
        laudoCompleto.medicoResponsavel, 
        usuarioMedico, 
        currentY, 
        assinadoDigitalmente, // Baseado no assinadoCom
        laudoCompleto.dataAssinatura,
        null, // certificadoInfo será passado se necessário
        usarAssinaturaFisica // Usar assinatura física apenas se upload_manual
      );
    }

    doc.end();

  } catch (err) {
    logger.error('Erro ao gerar PDF público:', err);
    res.status(500).json({ erro: 'Erro ao gerar PDF público' });
  }
};

// Autenticar laudo público (removido - não é mais necessário)
exports.autenticarLaudoPublico = async (req, res) => {
  try {
    res.status(410).json({ erro: 'Autenticação não é mais necessária. O laudo é público.' });
  } catch (err) {
    logger.error('Erro ao autenticar laudo público:', err);
    res.status(500).json({ erro: 'Erro ao autenticar laudo público' });
  }
};

// Invalidar laudo
exports.invalidarLaudo = async (req, res) => {
  try {
    const laudo = await Laudo.findByIdAndUpdate(
      req.params.id,
      { valido: false, status: 'Invalidado' },
      { new: true }
    );
    if (!laudo) {
      return res.status(404).json({ erro: 'Laudo não encontrado' });
    }
    res.json({ mensagem: 'Laudo invalidado com sucesso', laudo });
  } catch (err) {
    logger.error('Erro ao invalidar laudo:', err);
    res.status(500).json({ erro: 'Erro ao invalidar laudo' });
  }
};

// Gerar relatório
exports.gerarRelatorio = async (req, res) => {
  try {
    const { medicoId, tipoExame, status, dataInicio, dataFim } = req.query;
    
    // Construir query base
    const query = {};
    
    // Filtrar por tenant
    if (req.usuario.role !== 'adminMaster') {
      if (Array.isArray(req.tenant_id)) {
        query.tenant_id = { $in: req.tenant_id };
      } else {
        query.tenant_id = req.tenant_id;
      }
    }
    
    // Médicos só veem seus próprios laudos
    if (req.usuario.role === 'medico') {
      query.medicoResponsavelId = req.usuario.id;
    } else if (medicoId && medicoId.trim() !== '') {
      query.medicoResponsavelId = medicoId;
    }

    // Filtros adicionais
    if (status && status.trim() !== '') {
      query.status = status;
    }

    if (dataInicio || dataFim) {
      query.createdAt = {};
      if (dataInicio) {
        query.createdAt.$gte = new Date(dataInicio);
      }
      if (dataFim) {
        const dataFimAjustada = new Date(dataFim);
        dataFimAjustada.setHours(23, 59, 59, 999);
        query.createdAt.$lte = dataFimAjustada;
      }
    }

    // Buscar laudos com populate
    const laudos = await Laudo.find(query)
      .populate({
        path: 'exame',
        populate: [
          {
            path: 'paciente',
            select: 'nome dataNascimento email cpf'
          },
          {
            path: 'tipoExame',
            select: 'nome descricao'
          }
        ]
      })
      .populate('medicoResponsavelId', 'nome crm email especialidades')
      .sort({ createdAt: -1 })
      .lean();

    // Aplicar filtro de tipo de exame após o populate
    let laudosFiltrados = laudos;
    if (tipoExame && tipoExame.trim() !== '') {
      laudosFiltrados = laudos.filter(laudo => 
        laudo.exame?.tipoExame?.nome === tipoExame
      );
    }

    // Descriptografar dados sensíveis
    const laudosProcessados = laudosFiltrados.map(laudo => {
      try {
        // Descriptografar campos do laudo
        if (laudo.conclusao && typeof laudo.conclusao === 'string' && laudo.conclusao.includes(':')) {
          laudo.conclusao = decrypt(laudo.conclusao);
        }
        if (laudo.medicoResponsavel && typeof laudo.medicoResponsavel === 'string' && laudo.medicoResponsavel.includes(':')) {
          laudo.medicoResponsavel = decrypt(laudo.medicoResponsavel);
        }

        // Descriptografar dados do paciente
        if (laudo.exame?.paciente) {
          const paciente = laudo.exame.paciente;
          const camposPaciente = ['nome', 'email', 'cpf'];
          camposPaciente.forEach(field => {
            if (paciente[field] && typeof paciente[field] === 'string' && paciente[field].includes(':')) {
              paciente[field] = decrypt(paciente[field]);
            }
          });
        }
      } catch (decryptError) {
        console.error('Erro ao descriptografar dados do laudo:', decryptError);
      }
      return laudo;
    });

    // Estatísticas gerais
    const estatisticas = {
      total: laudosProcessados.length,
      assinados: laudosProcessados.filter(l => l.status === 'Laudo assinado').length,
      pendentes: laudosProcessados.filter(l => l.status !== 'Laudo assinado').length,
      realizados: laudosProcessados.filter(l => l.status === 'Laudo realizado').length,
      cancelados: laudosProcessados.filter(l => l.status === 'Cancelado').length
    };

    // Estatísticas por médico
    const estatisticasPorMedico = {};
    laudosProcessados.forEach(laudo => {
      const medico = laudo.medicoResponsavelId?.nome || laudo.medicoResponsavel || 'Não informado';
      if (!estatisticasPorMedico[medico]) {
        estatisticasPorMedico[medico] = {
          total: 0,
          assinados: 0,
          pendentes: 0
        };
      }
      estatisticasPorMedico[medico].total++;
      if (laudo.status === 'Laudo assinado') {
        estatisticasPorMedico[medico].assinados++;
      } else {
        estatisticasPorMedico[medico].pendentes++;
      }
    });

    // Estatísticas por tipo de exame
    const estatisticasPorTipo = {};
    laudosProcessados.forEach(laudo => {
      const tipo = laudo.exame?.tipoExame?.nome || 'Não informado';
      if (!estatisticasPorTipo[tipo]) {
        estatisticasPorTipo[tipo] = 0;
      }
      estatisticasPorTipo[tipo]++;
    });

    res.json({
      success: true,
      data: {
        estatisticas,
        estatisticasPorMedico,
        estatisticasPorTipo,
        laudos: laudosProcessados
      }
    });

  } catch (err) {
    logger.error('Erro ao gerar relatório:', err);
    res.status(500).json({ 
      success: false,
      erro: 'Erro interno do servidor' 
    });
  }
};

// Exportar relatório em PDF
exports.relatorioPdf = async (req, res) => {
  try {
    const { medicoId, tipoExame, status, dataInicio, dataFim } = req.query;
    
    // Reutilizar a lógica do gerarRelatorio para obter os dados
    const query = {};
    
    // Filtrar por tenant
    if (req.usuario.role !== 'adminMaster') {
      if (Array.isArray(req.tenant_id)) {
        query.tenant_id = { $in: req.tenant_id };
      } else {
        query.tenant_id = req.tenant_id;
      }
    }
    
    // Médicos só veem seus próprios laudos
    if (req.usuario.role === 'medico') {
      query.medicoResponsavelId = req.usuario.id;
    } else if (medicoId && medicoId.trim() !== '') {
      query.medicoResponsavelId = medicoId;
    }
    
    if (status && status.trim() !== '') {
      query.status = status;
    }
    
    if (dataInicio || dataFim) {
      query.createdAt = {};
      if (dataInicio) {
        query.createdAt.$gte = new Date(dataInicio);
      }
      if (dataFim) {
        const dataFimAjustada = new Date(dataFim);
        dataFimAjustada.setHours(23, 59, 59, 999);
        query.createdAt.$lte = dataFimAjustada;
      }
    }
    
    const laudos = await Laudo.find(query)
      .populate({
        path: 'exame',
        populate: [
          {
            path: 'paciente',
            select: 'nome dataNascimento email cpf'
          },
          {
            path: 'tipoExame',
            select: 'nome descricao'
          }
        ]
      })
      .populate('medicoResponsavelId', 'nome crm email especialidades')
      .sort({ createdAt: -1 })
      .lean();
    
    // Criar o PDF
    const doc = new PDFDocument();
    const filename = `relatorio_laudos_${new Date().toISOString().split('T')[0]}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    doc.pipe(res);
    
    // Cabeçalho do relatório
    doc.fontSize(18).text('Relatório de Laudos', 50, 50);
    doc.fontSize(12).text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 50, 80);
    
    // Filtros aplicados
    let filtrosTexto = 'Filtros aplicados: ';
    if (dataInicio) filtrosTexto += `Data início: ${new Date(dataInicio).toLocaleDateString('pt-BR')} `;
    if (dataFim) filtrosTexto += `Data fim: ${new Date(dataFim).toLocaleDateString('pt-BR')} `;
    if (status) filtrosTexto += `Status: ${status} `;
    if (tipoExame) filtrosTexto += `Tipo de exame: ${tipoExame}`;
    
    doc.fontSize(10).text(filtrosTexto, 50, 110);
    
    // Estatísticas
    const totais = {
      quantidade: laudos.length,
      assinados: laudos.filter(l => l.status === 'Laudo assinado').length,
      pendentes: laudos.filter(l => l.status !== 'Laudo assinado').length
    };
    
    let yPosition = 140;
    doc.fontSize(14).text('Resumo:', 50, yPosition);
    yPosition += 25;
    doc.fontSize(11)
      .text(`Total de laudos: ${totais.quantidade}`, 50, yPosition)
      .text(`Laudos assinados: ${totais.assinados}`, 50, yPosition + 15)
      .text(`Laudos pendentes: ${totais.pendentes}`, 50, yPosition + 30);
    
    yPosition += 60;
    
    // Lista de laudos
    doc.fontSize(14).text('Detalhes dos Laudos:', 50, yPosition);
    yPosition += 25;
    
    laudos.forEach((laudo, index) => {
      // Verificar se precisa de nova página
      if (yPosition > 700) {
        doc.addPage();
        yPosition = 50;
      }
      
      try {
        // Descriptografar dados se necessário
        let pacienteNome = 'Não informado';
        if (laudo.exame?.paciente?.nome) {
          pacienteNome = laudo.exame.paciente.nome;
          if (typeof pacienteNome === 'string' && pacienteNome.includes(':')) {
            pacienteNome = decrypt(pacienteNome);
          }
        }
        
        let medicoNome = 'Não informado';
        if (laudo.medicoResponsavelId?.nome) {
          medicoNome = laudo.medicoResponsavelId.nome;
        } else if (laudo.medicoResponsavel) {
          medicoNome = laudo.medicoResponsavel;
          if (typeof medicoNome === 'string' && medicoNome.includes(':')) {
            medicoNome = decrypt(medicoNome);
          }
        }
        
        doc.fontSize(10)
          .text(`${index + 1}. ${pacienteNome} - ${laudo.exame?.tipoExame?.nome || 'N/A'} - ${laudo.status}`, 50, yPosition)
          .text(`   Médico: ${medicoNome}`, 70, yPosition + 12)
          .text(`   Data: ${new Date(laudo.createdAt).toLocaleDateString('pt-BR')}`, 70, yPosition + 24);
        
        yPosition += 45;
      } catch (err) {
        console.error('Erro ao processar laudo no PDF:', err);
        doc.fontSize(10).text(`${index + 1}. Erro ao processar dados do laudo`, 50, yPosition);
        yPosition += 20;
      }
    });
    
    doc.end();
    
  } catch (err) {
    logger.error('Erro ao exportar relatório PDF:', err);
    res.status(500).json({ 
      success: false,
      error: 'Erro ao exportar relatório PDF',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Get report statistics
exports.obterEstatisticas = async (req, res) => {
  try {
    const { dataInicio, dataFim } = req.query;
    const query = { tenant_id: req.tenant_id };

    if (dataInicio || dataFim) {
      query.dataCriacao = {};
      if (dataInicio) query.dataCriacao.$gte = new Date(dataInicio);
      if (dataFim) query.dataCriacao.$lte = new Date(dataFim);
    }

    const [
      totalLaudos,
      laudosPorStatus,
      laudosPorMedico,
      tempoMedioElaboracao
    ] = await Promise.all([
      Laudo.countDocuments(query),
      Laudo.aggregate([
        { $match: query },
        { $group: { _id: "$status", total: { $sum: 1 } } }
      ]),
      Laudo.aggregate([
        { $match: query },
        { 
          $group: { 
            _id: "$medicoResponsavel",
            total: { $sum: 1 },
            finalizados: {
              $sum: { $cond: [{ $eq: ["$status", "Finalizado"] }, 1, 0] }
            },
            tempoMedio: {
              $avg: {
                $cond: [
                  { $and: [
                    { $eq: ["$status", "Finalizado"] },
                    { $exists: ["$dataFinalizacao", true] }
                  ]},
                  { $subtract: ["$dataFinalizacao", "$dataCriacao"] },
                  null
                ]
              }
            }
          }
        },
        {
          $lookup: {
            from: "usuarios",
            localField: "_id",
            foreignField: "_id",
            as: "medicoInfo"
          }
        },
        { $unwind: "$medicoInfo" },
        {
          $project: {
            nome: "$medicoInfo.nome",
            especialidade: "$medicoInfo.especialidade",
            total: 1,
            finalizados: 1,
            tempoMedioHoras: {
              $divide: ["$tempoMedio", 3600000]
            }
          }
        }
      ]),
      Laudo.aggregate([
        {
          $match: {
            ...query,
            status: "Finalizado",
            dataFinalizacao: { $exists: true }
          }
        },
        {
          $group: {
            _id: null,
            tempoMedio: {
              $avg: { $subtract: ["$dataFinalizacao", "$dataCriacao"] }
            }
          }
        }
      ])
    ]);

    res.json({
      totalLaudos,
      laudosPorStatus,
      laudosPorMedico,
      tempoMedioElaboracao: tempoMedioElaboracao[0]?.tempoMedio || 0
    });
  } catch (err) {
    console.error('Error retrieving report statistics');
    res.status(500).json({
      message: 'Error retrieving report statistics',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Função para assinar laudo com validação de senha do certificado
exports.assinarLaudoComCertificado = async (laudoId, medicoId, senhaCertificado) => {
  try {
    const certificadoService = require('../services/certificadoDigitalService');
    const CertificadoDigital = require('../models/CertificadoDigital');
    
    // Obter certificado ativo do médico
    const certificadoInfo = await certificadoService.obterCertificadoParaAssinatura(medicoId);
    
    // Buscar o certificado no banco para validar a senha fornecida (se fornecida)
    const certificado = await CertificadoDigital.findById(certificadoInfo.certificadoId);
    
    if (!certificado) {
      throw new Error('Certificado não encontrado');
    }
    
    // Validar senha fornecida se foi fornecida (para confirmação do usuário)
    if (senhaCertificado && !(await certificado.validarSenha(senhaCertificado))) {
      await certificado.registrarUso(false, null, 'Senha incorreta durante assinatura');
      throw new Error('Senha do certificado incorreta');
    }
    
    // Obter dados do laudo descriptografados
    const laudoCompleto = await obterLaudoPorId(laudoId);
    if (!laudoCompleto) {
      throw new Error('Laudo não encontrado');
    }

    // Buscar laudo no banco para atualização
    const laudo = await Laudo.findById(laudoId);
    if (!laudo) {
      throw new Error('Laudo não encontrado no banco de dados');
    }
    
    const usuarioMedico = await Usuario.findById(medicoId);
    const medicoNome = usuarioMedico.nome;
    
    // Gerar PDF
    const pdfBuffers = [];
    const doc = new PDFDocument({ size: 'A4', margin: 30, bufferPages: true });
    doc.on('data', chunk => pdfBuffers.push(chunk));

    // REMOVIDO: Carimbo antigo vermelho - será substituído por carimbo moderno estilo Gov.BR
    // que será adicionado pela função adicionarAreaAssinaturaMedica

    // Gerar link público para o laudo
    const publicLink = `${process.env.FRONTEND_URL || 'https://reports.codeytech.com.br'}/publico/${laudoId}`;

    // Gerar conteúdo do PDF usando dados descriptografados
    const currentY = await gerarConteudoPdfLaudo(doc, laudoCompleto, laudoCompleto.exame, usuarioMedico, medicoNome, laudoCompleto.conclusao, publicLink, defaultStyles);

    // Adicionar carimbo de assinatura digital moderno estilo Gov.BR
    await adicionarAreaAssinaturaMedica(
      doc,
      medicoNome,
      usuarioMedico,
      currentY,
      true, // É assinatura digital
      new Date(), // Data da assinatura
      certificadoInfo, // Informações do certificado
      false // Não usar assinatura física
    );

    await new Promise((resolve, reject) => {
      doc.on('end', resolve);
      doc.on('error', reject);
      doc.end();
    });

    const pdfBuffer = Buffer.concat(pdfBuffers);
    
    // Assinar com certificado do médico
    const { SignPdf } = await import('@signpdf/signpdf');
    const { P12Signer } = await import('@signpdf/signer-p12');
    
    const bufferCertificado = certificadoInfo.bufferCertificado;
    const senhaOriginal = certificadoInfo.senha; // Usa a senha original armazenada do certificado
    
    const pdfWithPlaceholder = plainAddPlaceholder({
      pdfBuffer,
      reason: 'Assinatura Digital Laudo Médico',
      name: certificadoInfo.informacoes.medico,
      location: 'Sistema LaudoFy',
    });

    // Criar o signer P12 e o SignPdf
    const signer = new P12Signer(bufferCertificado, { passphrase: senhaOriginal });
    const signPdf = new SignPdf();
    
    const signedPdf = await signPdf.sign(pdfWithPlaceholder, signer);

    // Registrar uso bem-sucedido do certificado
    await certificado.registrarUso(true);

    // Upload do PDF assinado
    const pdfFile = {
      buffer: signedPdf,
      originalname: `laudo_assinado_${laudoId}.pdf`,
      mimetype: 'application/pdf',
      size: signedPdf.length,
      stream: () => {
        const stream = new require('stream').Readable();
        stream.push(signedPdf);
        stream.push(null);
        return stream;
      }
    };

    const uploadcareUrl = await uploadPDFToUploadcare(pdfFile);
    
    // Atualizar laudo
    laudo.laudoAssinado = uploadcareUrl;
    laudo.dataAssinatura = new Date();
    laudo.status = 'Laudo assinado';
    laudo.tipoAssinatura = 'digital';
    laudo.assinadoCom = 'certificado_medico'; // Assinado com certificado digital
    laudo.laudoAssinadoKey = certificadoInfo.certificadoId; // Salvar como chave do certificado
    
    await laudo.save();
    
    // Atualizar exame relacionado - Status deve ser "Concluído" quando assinado
    const exame = await Exame.findById(laudo.exame);
    if (exame) {
      exame.status = 'Concluído'; // Alterado de "Laudo realizado" para "Concluído"
      await exame.save();
    } else {
      console.log(`AVISO: Exame não encontrado para laudo ${laudo._id}`);
    }

    return { 
      success: true, 
      fileUrl: uploadcareUrl, 
      assinadoCom: 'certificado_medico',
      certificadoId: certificadoInfo.certificadoId,
      storage: 'uploadcare'
    };
    
  } catch (error) {
    console.error('Erro ao assinar laudo com certificado');
    throw error;
  }
};

// Assinar laudo automaticamente (usando certificado digital)
exports.assinarLaudoAutomaticamente = async (req, res) => {
  try {
    const laudoId = req.params.id;
    const medicoId = req.usuario.id;

    // Para assinatura automática, não é necessário validar senha adicional
    // A função usa a senha já armazenada no certificado
    const resultado = await exports.assinarLaudoComCertificado(laudoId, medicoId, null);

    res.json({
      sucesso: true,
      mensagem: 'Laudo assinado automaticamente com sucesso',
      laudo: resultado
    });

  } catch (error) {
    console.error('Erro ao assinar laudo automaticamente:', error);
    
    let statusCode = 500;
    let mensagemErro = 'Erro interno do servidor';

    if (error.message.includes('Senha') || error.message.includes('incorreta')) {
      statusCode = 400;
      mensagemErro = 'Erro na validação do certificado';
    } else if (error.message.includes('não encontrado')) {
      statusCode = 404;
      mensagemErro = error.message;
    } else if (error.message.includes('vencido')) {
      statusCode = 400;
      mensagemErro = 'Certificado vencido. Cadastre um novo certificado';
    } else if (error.message.includes('Certificado não')) {
      statusCode = 400;
      mensagemErro = 'Certificado digital não encontrado. Cadastre um certificado antes de assinar automaticamente';
    }

    res.status(statusCode).json({ 
      erro: mensagemErro,
      detalhes: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Assinar laudo manualmente (sem certificado, linha para assinatura física)
exports.assinarLaudoManual = async (req, res) => {
  try {
    const laudoId = req.params.id;
    const medicoId = req.usuario.id;

    // Verificar se o laudo existe
    const laudo = await Laudo.findById(laudoId);
    if (!laudo) {
      return res.status(404).json({ erro: 'Laudo não encontrado' });
    }

    // Verificar se o médico é o responsável pelo laudo
    if (laudo.medicoResponsavelId.toString() !== medicoId) {
      return res.status(403).json({ erro: 'Apenas o médico responsável pode assinar o laudo' });
    }

    // Verificar se o laudo já foi assinado
    if (laudo.status === 'Laudo assinado') {
      return res.status(400).json({ erro: 'Laudo já foi assinado' });
    }

    // Buscar dados do médico
    const medico = await Usuario.findById(medicoId);
    if (!medico || !medico.temRole('medico')) {
      return res.status(403).json({ erro: 'Apenas médicos podem assinar laudos' });
    }

    // Gerar PDF para assinatura manual (com linha para assinatura física)
    const laudoCompleto = await obterLaudoPorId(laudoId);
    if (!laudoCompleto) {
      return res.status(404).json({ erro: 'Erro ao obter dados do laudo' });
    }

    const pdfBuffers = [];
    const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
    
    doc.on('data', chunk => pdfBuffers.push(chunk));

    // Gerar link público para o laudo
    const publicLink = `${process.env.FRONTEND_URL || 'https://reports.codeytech.com.br'}/publico/${laudoId}`;

    // Gerar conteúdo do PDF
    await gerarConteudoPdfLaudo(
      doc, 
      laudoCompleto, 
      laudoCompleto.exame, 
      medico, 
      medico.nome, 
      laudoCompleto.conclusao, 
      publicLink, 
      defaultStyles
    );

    // Adicionar linha para assinatura manual (sem assinatura)
    await adicionarAreaAssinaturaMedica(
      doc, 
      medico.nome, 
      medico, 
      doc.y || 600, 
      false, // Não é assinatura digital
      null, // Sem data de assinatura
      null, // Sem certificado digital
      false // Não usar assinatura física PNG
    );

    // Finalizar documento
    await new Promise((resolve, reject) => {
      doc.on('end', resolve);
      doc.on('error', reject);
      doc.end();
    });

    const pdfBuffer = Buffer.concat(pdfBuffers);

    // Retornar o PDF para download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="laudo_para_assinatura_${laudoId}.pdf"`);
    res.setHeader('Cache-Control', 'no-cache');
    
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Erro ao gerar laudo para assinatura manual:', error);
    res.status(500).json({ 
      erro: 'Erro interno do servidor',
      detalhes: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Upload de laudo assinado pelo médico
exports.uploadLaudoAssinado = async (req, res) => {
  try {
    const laudoId = req.params.id;
    const medicoId = req.usuario.id;

    // Verificar se o arquivo foi enviado
    if (!req.file) {
      return res.status(400).json({ erro: 'Nenhum arquivo foi enviado' });
    }

    // Verificar se é um arquivo PDF
    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({ erro: 'Apenas arquivos PDF são aceitos' });
    }

    // Verificar se o laudo existe
    const laudo = await Laudo.findById(laudoId);
    if (!laudo) {
      return res.status(404).json({ erro: 'Laudo não encontrado' });
    }

    // Verificar se o médico é o responsável pelo laudo
    if (laudo.medicoResponsavelId.toString() !== medicoId) {
      return res.status(403).json({ erro: 'Apenas o médico responsável pode fazer upload do laudo assinado' });
    }

    // Verificar se o laudo já foi assinado
    if (laudo.status === 'Laudo assinado') {
      return res.status(400).json({ erro: 'Laudo já foi assinado' });
    }

    // Upload do arquivo para S3
    try {
      const tenantId = laudo.tenant_id || 'default';
      const uploadResult = await uploadLaudoToS3(
        req.file.buffer, 
        laudoId, 
        tenantId, 
        'assinado', 
        `laudo_assinado_${laudoId}.pdf`
      );
      
      // Atualizar laudo no banco
      laudo.status = 'Laudo assinado';
      laudo.dataAssinatura = new Date();
      laudo.tipoAssinatura = 'manual';
      laudo.assinadoCom = 'upload_manual'; // Assinado por upload manual
      laudo.laudoAssinadoKey = uploadResult.key;
      laudo.laudoAssinado = uploadResult.url;
      laudo.arquivoPath = uploadResult.url;
      
      await laudo.save();

      // Atualizar status do exame para "Concluído" quando assinado
      const exame = await Exame.findById(laudo.exame);
      if (exame) {
        exame.status = 'Concluído'; // Alterado de "Laudo realizado" para "Concluído"
        await exame.save();
      } else {
        console.log(`AVISO: Exame não encontrado para laudo ${laudo._id} (upload manual)`);
      }

      // Log de auditoria
      await AuditLog.create({
        userId: medicoId,
        action: 'upload',
        description: `Upload de laudo assinado manualmente`,
        collectionName: 'Laudo',
        documentId: laudoId,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        tenant_id: tenantId
      });

      console.log(`Laudo assinado ${laudoId} recebido via upload do médico ${req.usuario.nome}`);
      
      res.json({
        sucesso: true,
        mensagem: 'Laudo assinado enviado com sucesso',
        laudo: {
          id: laudo._id,
          status: laudo.status,
          dataAssinatura: laudo.dataAssinatura,
          tipoAssinatura: laudo.tipoAssinatura,
          url: uploadResult.url
        }
      });
      
    } catch (s3Error) {
      console.error('Erro ao fazer upload do laudo assinado para S3:', s3Error);
      res.status(500).json({ 
        erro: 'Erro ao salvar laudo assinado',
        detalhes: process.env.NODE_ENV === 'development' ? s3Error.message : undefined
      });
    }

  } catch (error) {
    console.error('Erro ao fazer upload do laudo assinado:', error);
    res.status(500).json({ 
      erro: 'Erro interno do servidor',
      detalhes: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Download do laudo original (não assinado)
exports.downloadLaudoOriginal = async (req, res) => {
  try {
    const laudo = await Laudo.findById(req.params.id);
    if (!laudo) {
      return res.status(404).json({ erro: 'Laudo não encontrado' });
    }

    // Priorizar S3 se disponível
    if (laudo.laudoOriginalKey) {
      try {
        const signedUrlResult = await getSignedUrlForLaudo(laudo.laudoOriginalKey, 3600);
        
        // Verificar se a operação foi bem-sucedida
        if (!signedUrlResult.success) {
          throw new Error(signedUrlResult.error || 'Erro ao gerar URL assinada');
        }
        
        const signedUrl = signedUrlResult.url;
        
        // Fazer o download do arquivo do S3 e retornar como stream
        const https = require('https');
        const http = require('http');
        const url = require('url');
        
        const parsedUrl = url.parse(signedUrl);
        const protocol = parsedUrl.protocol === 'https:' ? https : http;
        
        protocol.get(signedUrl, (response) => {
          if (response.statusCode !== 200) {
            return res.status(500).json({ erro: 'Erro ao baixar arquivo do S3' });
          }
          
          // Configurar headers para download
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="laudo_original_${laudo._id}.pdf"`);
          res.setHeader('Cache-Control', 'no-cache');
          
          // Pipe do stream do S3 para a resposta
          response.pipe(res);
        }).on('error', (error) => {
          console.error('Erro ao baixar do S3:', error);
          res.status(500).json({ erro: 'Erro ao baixar arquivo' });
        });
        
        return; // Importante: retornar aqui para não continuar executando
        
      } catch (error) {
        console.error('Erro ao gerar URL pré-assinada para laudo original:', error);
        // Continuar para tentar gerar dinamicamente
      }
    }

    // Se não tem arquivo no S3, gerar PDF dinamicamente
    // Obter dados completos do laudo
    const laudoCompleto = await obterLaudoPorId(req.params.id);
    if (!laudoCompleto) {
      return res.status(404).json({ erro: 'Erro ao obter dados do laudo' });
    }

    // Buscar dados do médico
    const medico = await Usuario.findById(laudoCompleto.medicoResponsavelId);
    
    // Gerar PDF original
    const pdfBuffers = [];
    const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
    
    doc.on('data', chunk => pdfBuffers.push(chunk));

    // Gerar link público para o laudo
    const publicLink = `${process.env.FRONTEND_URL || 'https://reports.codeytech.com.br'}/publico/${req.params.id}`;

    // Gerar conteúdo do PDF
    await gerarConteudoPdfLaudo(
      doc, 
      laudoCompleto, 
      laudoCompleto.exame, 
      medico, 
      laudoCompleto.medicoResponsavel, 
      laudoCompleto.conclusao, 
      publicLink, 
      defaultStyles
    );

    // Para o laudo original, sempre adicionar área de assinatura 
    // (preparada para receber assinatura manual ou automática)
    const assinadoCom = laudoCompleto.assinadoCom || 'sem_assinatura';
    
    // No laudo original, sempre mostrar área para assinatura
    // Se já foi assinado, mostrar conforme o tipo
    // Se ainda não foi assinado, mostrar área preparada para assinatura manual
    const assinadoDigitalmente = assinadoCom === 'certificado_medico' || assinadoCom === 'certificado_sistema';
    const usarAssinaturaFisica = assinadoCom === 'upload_manual';
    const mostrarLinhaAssinatura = assinadoCom === 'sem_assinatura'; // Linha para assinatura quando ainda não assinado
    
    await adicionarAreaAssinaturaMedica(
      doc, 
      laudoCompleto.medicoResponsavel, 
      medico, 
      doc.y || 600, 
      assinadoDigitalmente, // Baseado no assinadoCom
      laudoCompleto.dataAssinatura,
      null, // certificadoInfo
      usarAssinaturaFisica, // Usar assinatura física se upload_manual
      mostrarLinhaAssinatura // Mostrar linha se ainda não foi assinado
    );

    // Finalizar documento
    await new Promise((resolve, reject) => {
      doc.on('end', resolve);
      doc.on('error', reject);
      doc.end();
    });

    const pdfBuffer = Buffer.concat(pdfBuffers);

    // Configurar headers para download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="laudo_original_${laudo._id}.pdf"`);
    res.setHeader('Cache-Control', 'no-cache');
    
    return res.send(pdfBuffer);

  } catch (err) {
    console.error('Erro ao fazer download do laudo original:', err);
    res.status(500).json({ erro: 'Erro ao fazer download do laudo original' });
  }
};

// Assinar laudo com imagem física PNG
exports.assinarLaudoComImagemFisica = async (req, res) => {
  try {
    const laudoId = req.params.id;
    const medicoId = req.usuario.id;

    // Verificar se o laudo existe
    const laudo = await Laudo.findById(laudoId);
    if (!laudo) {
      return res.status(404).json({ erro: 'Laudo não encontrado' });
    }

    // Verificar se o médico é o responsável pelo laudo
    if (laudo.medicoResponsavelId.toString() !== medicoId) {
      return res.status(403).json({ erro: 'Apenas o médico responsável pode assinar o laudo' });
    }

    // Verificar se o laudo já foi assinado
    if (laudo.status === 'Laudo assinado') {
      return res.status(400).json({ erro: 'Laudo já foi assinado' });
    }

    // Buscar dados do médico
    const medico = await Usuario.findById(medicoId);
    if (!medico || !medico.temRole('medico')) {
      return res.status(403).json({ erro: 'Apenas médicos podem assinar laudos' });
    }

    // Verificar se o médico tem assinatura física cadastrada
    if (!medico.assinaturaFisica || !medico.assinaturaFisica.s3Key) {
      return res.status(400).json({ 
        erro: 'Médico não possui assinatura física cadastrada. Cadastre sua assinatura antes de assinar laudos.' 
      });
    }

    // Obter dados completos do laudo
    const laudoCompleto = await obterLaudoPorId(laudoId);
    if (!laudoCompleto) {
      return res.status(404).json({ erro: 'Erro ao obter dados do laudo' });
    }

    // Gerar PDF com assinatura física
    const pdfBuffers = [];
    const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
    
    doc.on('data', chunk => pdfBuffers.push(chunk));

    // Gerar link público para o laudo
    const publicLink = `${process.env.FRONTEND_URL || 'https://reports.codeytech.com.br'}/publico/${laudoId}`;

    // Gerar conteúdo do PDF
    await gerarConteudoPdfLaudo(
      doc, 
      laudoCompleto, 
      laudoCompleto.exame, 
      medico, 
      medico.nome, 
      laudoCompleto.conclusao, 
      publicLink, 
      defaultStyles
    );

    // Definir método de assinatura baseado no assinadoCom do laudo
    laudo.assinadoCom = 'upload_manual'; // Para assinatura com imagem física
    
    // Adicionar assinatura física PNG
    await adicionarAreaAssinaturaMedica(
      doc, 
      medico.nome, 
      medico, 
      doc.y || 600, 
      false, // Não é assinatura digital
      new Date(), // Data da assinatura
      null, // Sem certificado digital
      true // Usar assinatura física PNG
    );

    // Finalizar documento
    await new Promise((resolve, reject) => {
      doc.on('end', resolve);
      doc.on('error', reject);
      doc.end();
    });

    const pdfBuffer = Buffer.concat(pdfBuffers);

    // Upload do PDF assinado para S3
    try {
      const tenantId = laudoCompleto.tenant_id || 'default';
      const uploadResult = await uploadLaudoToS3(
        pdfBuffer, 
        laudoId, 
        tenantId, 
        'assinado', 
        `laudo_assinado_${laudoId}.pdf`
      );
      
      // Atualizar laudo no banco
      laudo.status = 'Laudo assinado';
      laudo.dataAssinatura = new Date();
      laudo.tipoAssinatura = 'fisica';
      laudo.assinadoCom = 'upload_manual'; // Assinado com upload manual (imagem física)
      laudo.laudoAssinadoKey = uploadResult.key;
      laudo.laudoAssinado = uploadResult.url; // Manter compatibilidade
      laudo.arquivoPath = uploadResult.url;
      
      await laudo.save();

      // Atualizar status do exame para "Concluído" quando assinado
      const exame = await Exame.findById(laudo.exame);
      if (exame) {
        exame.status = 'Concluído'; // Alterado de "Laudo realizado" para "Concluído"
        await exame.save();
      } else {
        console.log(`AVISO: Exame não encontrado para laudo ${laudo._id} (assinatura física)`);
      }

      // Log de auditoria
      await AuditLog.create({
        userId: medicoId,
        action: 'create',
        description: `Laudo assinado com assinatura física PNG`,
        collectionName: 'Laudo',
        documentId: laudoId,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        tenant_id: tenantId
      });

      console.log(`Laudo ${laudoId} assinado com assinatura física pelo médico ${medico.nome}`);
      
      res.json({
        sucesso: true,
        mensagem: 'Laudo assinado com sucesso usando assinatura física',
        laudo: {
          id: laudo._id,
          status: laudo.status,
          dataAssinatura: laudo.dataAssinatura,
          tipoAssinatura: laudo.tipoAssinatura,
          url: uploadResult.url
        }
      });
      
    } catch (uploadError) {
      console.error('Erro ao fazer upload do laudo assinado:', uploadError);
      res.status(500).json({ 
        erro: 'Erro ao salvar laudo assinado',
        detalhes: process.env.NODE_ENV === 'development' ? uploadError.message : undefined
      });
    }

  } catch (error) {
    console.error('Erro ao assinar laudo com imagem física:', error);
    res.status(500).json({ 
      erro: 'Erro interno do servidor',
      detalhes: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};