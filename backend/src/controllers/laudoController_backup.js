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
  addCustomHeader,
  addCustomFooter,
  getTemplateStyles,
  shouldShowElement
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

// Função base para gerar o conteúdo do PDF do laudo - ATUALIZADA PARA TEMPLATES PERSONALIZADOS
async function gerarConteudoPdfLaudo(doc, laudo, exame, usuarioMedico, medicoNome, conclusao, publicLink, styles, tenantId = null) {
  try {
    // Obter configuração do template do laudo ou do tenant
    let templateConfig = null;
    
    // Priorizar configuração do template armazenada no laudo
    if (laudo.templateConfig) {
      templateConfig = laudo.templateConfig;
    } else {
      // Fallback para configuração do tenant
      const tenantIdFinal = tenantId || exame?.tenant_id || laudo?.tenant_id || 'default';
      const { config } = await getTemplateConfig(tenantIdFinal);
      templateConfig = config;
    }
    
    // Aplicar configurações do template ao documento
    await applyTemplateConfig(doc, templateConfig);
    
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

    // Verificar se é folha timbrada
    const isFolhaTimbrada = templateConfig.tipoTemplate === 'folha_timbrada' && templateConfig.folhaTimbradaUrl;
    
    if (isFolhaTimbrada) {
      // Para folha timbrada, adicionar imagem de fundo
      try {
        const https = require('https');
        const http = require('http');
        const { URL } = require('url');
        
        const imageUrl = templateConfig.folhaTimbradaUrl;
        const protocol = imageUrl.startsWith('https:') ? https : http;
        
        // Fazer download da imagem de fundo (simplificado - pode ser melhorado com cache)
        const downloadImage = () => {
          return new Promise((resolve, reject) => {
            protocol.get(imageUrl, (response) => {
              if (response.statusCode !== 200) {
                reject(new Error(`Failed to download image: ${response.statusCode}`));
                return;
              }
              
              const chunks = [];
              response.on('data', chunk => chunks.push(chunk));
              response.on('end', () => resolve(Buffer.concat(chunks)));
            }).on('error', reject);
          });
        };
        
        const imageBuffer = await downloadImage();
        
        // Adicionar imagem de fundo da folha timbrada
        doc.image(imageBuffer, 0, 0, {
          width: doc.page.width,
          height: doc.page.height,
          fit: [doc.page.width, doc.page.height]
        });
        
      } catch (error) {
        console.error('Erro ao carregar folha timbrada:', error);
        // Continuar sem a imagem de fundo se houver erro
      }
    }

    // Obter posições personalizadas ou usar padrão
    const getElementPosition = (elementId) => {
      const defaultPositions = {
        header: { x: 10, y: 10, width: 530, height: 60 },
        logo: { x: 20, y: 20, width: 80, height: 30 },
        title: { x: 110, y: 25, width: 300, height: 30 },
        patientInfo: { x: 20, y: 80, width: 245, height: 140 },
        examInfo: { x: 280, y: 80, width: 245, height: 140 },
        content: { x: 20, y: 230, width: 510, height: 140 },
        signature: { x: 300, y: 380, width: 230, height: 80 },
        qrcode: { x: 20, y: 380, width: 70, height: 70 },
        footer: { x: 20, y: 480, width: 510, height: 25 }
      };
      
      return templateConfig.customPositions?.[elementId] || defaultPositions[elementId];
    };

    // Função para verificar se elemento deve ser mostrado
    const isElementVisible = (elementId) => {
      const visibilityMap = {
        header: templateConfig.layout?.mostrarCabecalho ?? true,
        logo: templateConfig.layout?.mostrarLogo ?? true,
        title: templateConfig.layout?.mostrarTitulo ?? true,
        patientInfo: templateConfig.layout?.mostrarDadosPaciente ?? true,
        examInfo: templateConfig.layout?.mostrarDadosExame ?? true,
        content: true, // Conteúdo sempre visível
        signature: templateConfig.layout?.mostrarDataAssinatura ?? true,
        qrcode: templateConfig.layout?.mostrarQrCode ?? true,
        footer: templateConfig.layout?.mostrarRodape ?? true
      };
      return visibilityMap[elementId] ?? true;
    };

    // Função para obter estilo de elemento
    const getElementStyle = (elementId) => {
      const defaultStyles = {
        header: { background: '#f8fafc', border: '#e2e8f0', padding: 16 },
        patientInfo: { background: '#ffffff', border: '#d1d5db', padding: 12 },
        examInfo: { background: '#f9fafb', border: '#d1d5db', padding: 12 },
        content: { background: '#ffffff', border: '#e5e7eb', padding: 16 },
        signature: { background: 'transparent', border: 'none', padding: 12 },
        footer: { background: '#f1f5f9', border: '#cbd5e1', padding: 10 }
      };
      
      return templateConfig.estilosSecao?.[elementId] || defaultStyles[elementId] || {};
    };

    let currentY = 0;

    // HEADER (se visível)
    if (isElementVisible('header')) {
      const headerPos = getElementPosition('header');
      const headerStyle = getElementStyle('header');
      
      if (!isFolhaTimbrada || !headerStyle.fundoTransparente) {
        // Desenhar fundo do header
        doc.fillColor(headerStyle.background || '#f8fafc')
          .rect(headerPos.x, headerPos.y, headerPos.width, headerPos.height)
          .fill();
      }

      // LOGO (se visível)
      if (isElementVisible('logo')) {
        const logoPos = getElementPosition('logo');
        
        if (doc._templateConfig.logoBuffer) {
          try {
            doc.image(doc._templateConfig.logoBuffer, logoPos.x, logoPos.y, {
              width: logoPos.width,
              height: logoPos.height,
              fit: [logoPos.width, logoPos.height]
            });
          } catch (error) {
            console.error('Erro ao inserir logo personalizado:', error);
          }
        } else if (LOGO_PATH && fs.existsSync(LOGO_PATH)) {
          doc.image(LOGO_PATH, logoPos.x, logoPos.y, {
            width: logoPos.width,
            height: logoPos.height,
            fit: [logoPos.width, logoPos.height]
          });
        }
      }

      // TÍTULO (se visível)
      if (isElementVisible('title')) {
        const titlePos = getElementPosition('title');
        const cores = templateConfig.cores || {};
        
        doc.fillColor(cores.corTitulo || cores.primaria || '#2563eb')
          .font('Helvetica-Bold')
          .fontSize(templateConfig.tamanhoFonte?.titulo || 16)
          .text('ELETROCARDIOGRAMA', titlePos.x, titlePos.y, {
            width: titlePos.width,
            align: 'left'
          });
      }

      currentY = headerPos.y + headerPos.height + 10;
    }

    // DADOS DO PACIENTE (lado esquerdo)
    if (isElementVisible('patientInfo')) {
      const patientPos = getElementPosition('patientInfo');
      const patientStyle = getElementStyle('patientInfo');
      const cores = templateConfig.cores || {};
      
      // Fundo da seção (se não for transparente)
      if (!isFolhaTimbrada || !patientStyle.fundoTransparente) {
        doc.fillColor(patientStyle.background || '#ffffff')
          .rect(patientPos.x, patientPos.y, patientPos.width, patientPos.height)
          .fill();
          
        if (patientStyle.border && patientStyle.border !== 'none') {
          doc.strokeColor(patientStyle.border)
            .lineWidth(1)
            .rect(patientPos.x, patientPos.y, patientPos.width, patientPos.height)
            .stroke();
        }
      }

      // Título da seção
      doc.fillColor(cores.primaria || '#2563eb')
        .font('Helvetica-Bold')
        .fontSize(templateConfig.tamanhoFonte?.subtitulo || 14)
        .text('DADOS DO PACIENTE', patientPos.x + (patientStyle.padding || 12), patientPos.y + (patientStyle.padding || 12));

      // Linha divisória
      const lineY = patientPos.y + (patientStyle.padding || 12) + 18;
      doc.strokeColor(cores.primaria || '#2563eb')
        .lineWidth(2)
        .moveTo(patientPos.x + (patientStyle.padding || 12), lineY)
        .lineTo(patientPos.x + patientPos.width - (patientStyle.padding || 12), lineY)
        .stroke();

      // Dados do paciente em coluna
      let dataY = lineY + 15;
      const fontSize = templateConfig.tamanhoFonte?.base || 11;
      
      doc.fillColor(cores.texto || '#1f2937')
        .font('Helvetica')
        .fontSize(fontSize);

      // Nome
      doc.font('Helvetica-Bold').text('Nome:', patientPos.x + (patientStyle.padding || 12), dataY);
      doc.font('Helvetica').text(pacienteDescriptografado?.nome || 'Não informado', patientPos.x + (patientStyle.padding || 12) + 45, dataY);
      dataY += 20;

      // CPF
      doc.font('Helvetica-Bold').text('CPF:', patientPos.x + (patientStyle.padding || 12), dataY);
      doc.font('Helvetica').text(pacienteDescriptografado?.cpf || 'Não informado', patientPos.x + (patientStyle.padding || 12) + 45, dataY);

      currentY = Math.max(currentY, patientPos.y + patientPos.height + 10);
    }

    // INFORMAÇÕES DO EXAME (lado direito)
    if (isElementVisible('examInfo')) {
      const examPos = getElementPosition('examInfo');
      const examStyle = getElementStyle('examInfo');
      const cores = templateConfig.cores || {};
      
      // Fundo da seção (se não for transparente)
      if (!isFolhaTimbrada || !examStyle.fundoTransparente) {
        doc.fillColor(examStyle.background || '#f9fafb')
          .rect(examPos.x, examPos.y, examPos.width, examPos.height)
          .fill();
          
        if (examStyle.border && examStyle.border !== 'none') {
          doc.strokeColor(examStyle.border)
            .lineWidth(1)
            .rect(examPos.x, examPos.y, examPos.width, examPos.height)
            .stroke();
        }
      }

      // Título da seção
      doc.fillColor(cores.primaria || '#2563eb')
        .font('Helvetica-Bold')
        .fontSize(templateConfig.tamanhoFonte?.subtitulo || 14)
        .text('INFORMAÇÕES DO EXAME', examPos.x + (examStyle.padding || 12), examPos.y + (examStyle.padding || 12));

      // Linha divisória
      const lineY = examPos.y + (examStyle.padding || 12) + 18;
      doc.strokeColor(cores.primaria || '#2563eb')
        .lineWidth(2)
        .moveTo(examPos.x + (examStyle.padding || 12), lineY)
        .lineTo(examPos.x + examPos.width - (examStyle.padding || 12), lineY)
        .stroke();

      // Dados do exame em coluna
      let dataY = lineY + 15;
      const fontSize = templateConfig.tamanhoFonte?.base || 11;
      
      doc.fillColor(cores.texto || '#1f2937')
        .font('Helvetica')
        .fontSize(fontSize);

      // Data
      doc.font('Helvetica-Bold').text('Data:', examPos.x + (examStyle.padding || 12), dataY);
      doc.font('Helvetica').text(new Date().toLocaleDateString('pt-BR'), examPos.x + (examStyle.padding || 12) + 45, dataY);
      dataY += 20;

      // Tipo de Exame
      doc.font('Helvetica-Bold').text('Tipo de Exame:', examPos.x + (examStyle.padding || 12), dataY);
      doc.font('Helvetica').text('Eletrocardiograma', examPos.x + (examStyle.padding || 12) + 90, dataY);

      currentY = Math.max(currentY, examPos.y + examPos.height + 10);
    }

    // CONCLUSÃO
    const contentPos = getElementPosition('content');
    const contentStyle = getElementStyle('content');
    const cores = templateConfig.cores || {};
    
    // Fundo da seção (se não for transparente)
    if (!isFolhaTimbrada || !contentStyle.fundoTransparente) {
      doc.fillColor(contentStyle.background || '#ffffff')
        .rect(contentPos.x, contentPos.y, contentPos.width, contentPos.height)
        .fill();
        
      if (contentStyle.border && contentStyle.border !== 'none') {
        doc.strokeColor(contentStyle.border)
          .lineWidth(1)
          .rect(contentPos.x, contentPos.y, contentPos.width, contentPos.height)
          .stroke();
      }
    }

    // Título da conclusão
    doc.fillColor(cores.primaria || '#2563eb')
      .font('Helvetica-Bold')
      .fontSize(templateConfig.tamanhoFonte?.subtitulo || 14)
      .text('CONCLUSÃO', contentPos.x + (contentStyle.padding || 16), contentPos.y + (contentStyle.padding || 16));

    // Linha divisória
    const conclusionLineY = contentPos.y + (contentStyle.padding || 16) + 18;
    doc.strokeColor(cores.primaria || '#2563eb')
      .lineWidth(2)
      .moveTo(contentPos.x + (contentStyle.padding || 16), conclusionLineY)
      .lineTo(contentPos.x + contentPos.width - (contentStyle.padding || 16), conclusionLineY)
      .stroke();

    // Texto da conclusão
    let conclusaoFinal = conclusao || laudoDescriptografado.conclusao || 'Conclusão não informada';
    
    // Se a conclusão ainda está criptografada, descriptografar
    if (typeof conclusaoFinal === 'string' && conclusaoFinal.includes(':')) {
      try {
        conclusaoFinal = decrypt(conclusaoFinal);
      } catch (error) {
        console.error('Erro ao descriptografar conclusão:', error);
      }
    }
    
    doc.fillColor(cores.texto || '#1f2937')
      .font('Helvetica')
      .fontSize(templateConfig.tamanhoFonte?.base || 11)
      .text(conclusaoFinal, contentPos.x + (contentStyle.padding || 16), conclusionLineY + 15, {
        width: contentPos.width - 2 * (contentStyle.padding || 16),
        align: 'justify',
        lineGap: 6
      });

    currentY = Math.max(currentY, contentPos.y + contentPos.height + 10);

    // Adicionar link público e QR code se especificado
    if (publicLink && publicLink.trim() !== '') {
      // QR CODE (se visível)
      if (isElementVisible('qrcode')) {
        const qrPos = getElementPosition('qrcode');
        
        try {
          const QRCode = require('qrcode');
          const qrCodeDataURL = await QRCode.toDataURL(publicLink, { 
            width: qrPos.width,
            margin: 1,
            color: {
              dark: templateConfig.cores?.texto || '#1f2937',
              light: '#FFFFFF'
            }
          });
          
          // Converter data URL para buffer
          const qrBuffer = Buffer.from(qrCodeDataURL.split(',')[1], 'base64');
          
          doc.image(qrBuffer, qrPos.x, qrPos.y, {
            width: qrPos.width,
            height: qrPos.height
          });
          
          // Texto de verificação abaixo do QR
          doc.fillColor(templateConfig.cores?.texto || '#1f2937')
            .font('Helvetica')
            .fontSize(8)
            .text('Verificação', qrPos.x, qrPos.y + qrPos.height + 5, {
              width: qrPos.width,
              align: 'center'
            });
            
        } catch (qrError) {
          console.error('Erro ao gerar QR Code:', qrError);
        }
      }
    }

    return currentY;
    
  } catch (error) {
    console.error('Erro ao gerar conteúdo PDF do laudo:', error);
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
  const styles = defaultStyles;
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const centerX = pageWidth / 2;
  
  // Calcular espaço necessário para assinatura + link público + margem
  const espacoNecessario = 120; // Reduzido para otimizar espaço
  
  // Verificar se há espaço na página atual
  if (currentY > pageHeight - espacoNecessario) {
    doc.addPage();
    currentY = styles.margemarginsns.top;
  }
  
  // Posição da assinatura (mais alta para deixar espaço para link público)
  const assinaturaY = pageHeight - 90; // Reduzido para otimizar espaço
  
  // Se assinado digitalmente, adicionar selo compacto
  if (assinadoDigitalmente) {
    const seloWidth = 260; // Reduzido
    const seloHeight = 35; // Reduzido
    const seloX = centerX - (seloWidth / 2);
    const seloY = assinaturaY - 65; // Ajustado para ficar mais compacto
    
    // Fundo do selo
    doc.fillColor('#f8fafc')
      .rect(seloX, seloY, seloWidth, seloHeight)
      .fill();
    
    // Borda do selo
    doc.strokeColor('#334155')
      .lineWidth(1)
      .rect(seloX, seloY, seloWidth, seloHeight)
      .stroke();
    
    // Linha de destaque superior do selo
    doc.fillColor('#475569')
      .rect(seloX, seloY, seloWidth, 2)
      .fill();
    
    // Ícone de verificação (círculo com check)
    const iconX = seloX + 12;
    const iconY = seloY + 18;
    
    doc.fillColor('#334155')
      .circle(iconX, iconY, 6)
      .fill();
    
    doc.strokeColor('#ffffff')
      .lineWidth(1.5)
      .moveTo(iconX - 3, iconY)
      .lineTo(iconX - 1, iconY + 2)
      .lineTo(iconX + 3, iconY - 2)
      .stroke();
    
    // Texto principal do selo (compacto)
    doc.fillColor('#334155')
      .font('Helvetica-Bold')
      .fontSize(9)
      .text('ASSINADO DIGITALMENTE', iconX + 15, seloY + 6);
    
    // Data/hora da assinatura (compacta)
    const dataFormatada = dataAssinatura ? 
      new Date(dataAssinatura).toLocaleString('pt-BR') : 
      new Date().toLocaleString('pt-BR');
    
    doc.fillColor('#475569')
      .font('Helvetica')
      .fontSize(7)
      .text(`${medicoNome} - ${dataFormatada}`, iconX + 15, seloY + 18);
    
    // ICP-BRASIL integrado no lado direito do selo (compacto)
    const icpX = seloX + seloWidth - 55;
    const icpY = seloY + 8;
    
    doc.fillColor('#e2e8f0')
      .rect(icpX, icpY, 50, 20)
      .fill();
    
    doc.strokeColor('#cbd5e1')
      .lineWidth(0.5)
      .rect(icpX, icpY, 50, 20)
      .stroke();
    
    doc.fillColor('#475569')
      .font('Helvetica-Bold')
      .fontSize(6)
      .text('ICP-BRASIL', icpX + 3, icpY + 3, { align: 'left' });
    
    doc.fillColor('#64748b')
      .font('Helvetica')
      .fontSize(5)
      .text('CERT. DIGITAL', icpX + 3, icpY + 12, { align: 'left' });
    
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
        .fontSize(7)
        .text('Assinatura Física', 0, assinaturaY - 90, {
          width: pageWidth,
          align: 'center'
        });
      
      // DEPOIS: Inserir imagem da assinatura física POR CIMA (simulando assinatura real)
      const assinaturaWidth = 250; // Ainda maior para parecer mais realista
      const assinaturaHeight = 125; // Proporcionalmente maior
      const assinaturaX = centerX - (assinaturaWidth / 2);
      const assinaturaImgY = assinaturaY - 95; // Mais para cima para cobrir bem o espaço
      
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
      
      doc.strokeColor(styles.colors.dark)
        .lineWidth(1)
        .moveTo(linhaX, assinaturaY - 35)
        .lineTo(linhaX + linhaWidth, assinaturaY - 35)
        .stroke();
    }
  } else {
    // Linha para assinatura física tradicional - centralizada e compacta
    const linhaWidth = 200; // Reduzida
    const linhaX = centerX - (linhaWidth / 2);
    
    doc.strokeColor(styles.colors.dark)
      .lineWidth(1)
      .moveTo(linhaX, assinaturaY - 35)
      .lineTo(linhaX + linhaWidth, assinaturaY - 35)
      .stroke();
  }
  
  // Nome do médico - centralizado e compacto
  doc.fillColor(styles.colors.dark)
    .font('Helvetica-Bold')
    .fontSize(11) // Reduzido
    .text(medicoNome || 'Médico Responsável', 0, assinaturaY - 25, {
      width: pageWidth,
      align: 'center'
    });
  
  // CRM do médico - centralizado e compacto
  if (usuarioMedico?.crm) {
    doc.fillColor(styles.colors.text)
      .font('Helvetica')
      .fontSize(9) // Reduzido
      .text(`CRM: ${usuarioMedico.crm}`, 0, assinaturaY - 12, {
        width: pageWidth,
        align: 'center'
      });
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
        .text(linkPublico, styles.margins.left, bottomY - 13, {
          width: pageWidth - 70, // Deixar espaço para o QR code
          link: linkPublico
        });
        
    } catch (qrError) {
      console.error('Erro ao gerar QR Code:', qrError);
      // Se não conseguir gerar QR code, apenas adicionar o link
      doc.fillColor('#888888')
        .font('Helvetica')
        .fontSize(6)
        .text(`Verifique o Status do laudo: ${linkPublico}`, styles.margins.left, bottomY - 10, {
          width: pageWidth - styles.margins.left - styles.margins.right,
          link: linkPublico
        });
    }
  }
  
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

    // Adicionar área de assinatura no final do documento
    await adicionarAreaAssinaturaMedica(doc, medicoNome, usuarioMedico, currentY, true, new Date(), certificadoInfo);

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

    const { exameId, conclusao, templateConfig } = req.body;
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
      templateConfig: templateConfig || null // Incluir configuração do template
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

      // Adicionar área de assinatura FÍSICA (com imagem PNG se disponível, ou linha tradicional)
      await adicionarAreaAssinaturaMedica(
        doc, 
        usuarioNome, 
        usuarioMedico, 
        doc.y || 600, 
        false, // NÃO assinado digitalmente
        null,
        null,
        true // Usar assinatura física PNG se disponível
      );

      // Finalizar documento
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
          // Usar o getter que já descriptografa
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

      // Adicionar área de assinatura FÍSICA (com imagem PNG se disponível, ou linha tradicional)
      await adicionarAreaAssinaturaMedica(
        doc, 
        medicoNome, 
        usuarioMedico, 
        currentY, 
        false, // NÃO assinado digitalmente
        null,
        null,
        true // Usar assinatura física PNG se disponível
      );

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
    const { email, emailsAdicionais } = req.body;

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

    // Preparar lista de emails
    const emails = [];
    
    // Email principal (do paciente ou fornecido)
    const emailPrincipal = email || laudo.exame?.paciente?.email;
    if (emailPrincipal) {
      emails.push(emailPrincipal);
    }

    // Emails adicionais
    if (emailsAdicionais && Array.isArray(emailsAdicionais)) {
      emails.push(...emailsAdicionais.filter(e => e && e.trim()));
    }

    if (emails.length === 0) {
      return res.status(400).json({ 
        erro: 'Nenhum email válido foi fornecido para envio' 
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

    // Enviar emails
    const resultados = [];
    for (const emailDestino of emails) {
      try {
        const resultado = await emailService.enviarLaudo(emailDestino, dadosLaudo);
        resultados.push({
          email: emailDestino,
          sucesso: true,
          messageId: resultado.id
        });
      } catch (error) {
        logger.error(`Erro ao enviar email para ${emailDestino}:`, error);
        resultados.push({
          email: emailDestino,
          sucesso: false,
          erro: error.message
        });
      }
    }

    // Registrar histórico de envio no laudo
    try {
      const Laudo = require('../models/Laudo');
      await Laudo.findByIdAndUpdate(id, {
        $push: {
          enviosEmail: {
            data: new Date(),
            emails: emails,
            status: resultados.every(r => r.sucesso) ? 'sucesso' : 'parcial',
            detalhes: resultados
          }
        }
      });
    } catch (error) {
      logger.error('Erro ao registrar histórico de envio:', error);
    }

    // Verificar se pelo menos um email foi enviado com sucesso
    const sucessos = resultados.filter(r => r.sucesso);
    if (sucessos.length === 0) {
      return res.status(500).json({
        erro: 'Falha ao enviar email para todos os destinatários',
        detalhes: resultados
      });
    }

    // Preparar resposta compatível com o frontend
    const emailsEnviados = sucessos.map(s => s.email);
    const destinatarioPrincipal = emailsEnviados[0] || emails[0];
    
    res.json({
      message: `Email enviado com sucesso para ${sucessos.length} de ${resultados.length} destinatário(s)`,
      mensagem: `Email enviado com sucesso para ${sucessos.length} de ${resultados.length} destinatário(s)`,
      destinatario: destinatarioPrincipal,
      emails: emailsEnviados,
      resultados: resultados,
      laudo: laudo // Incluir dados atualizados do laudo
    });

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

    // Adicionar área de assinatura física (com imagem PNG se disponível, ou linha tradicional)
    const currentY = doc.y + 20; // Reduzido o espaçamento
    await adicionarAreaAssinaturaMedica(
      doc, 
      laudoCompleto.medicoResponsavel, 
      usuarioMedico, 
      currentY, 
      false, // Não assinado digitalmente
      null,
      null,
      true // Usar assinatura física PNG se disponível
    );

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
          ['nome', 'email', 'cpf'].forEach(field => {
            if (paciente[field] && typeof paciente[field] === 'string' && paciente[field].includes(':')) {
              paciente[field] = decrypt(paciente[field]);
            }
          });
        }
      } catch (err) {
        console.error('Erro ao descriptografar dados do laudo:', err);
      }
      
      return laudo;
    });
    
    // Calcular totais
    const totais = {
      quantidade: laudosProcessados.length,
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
        laudos: laudosProcessados,
        totais,
        estatisticasPorMedico,
        estatisticasPorTipo,
        filtros: {
          medicoId,
          tipoExame,
          status,
          dataInicio,
          dataFim
        }
      }
    });
    
  } catch (err) {
    logger.error('Erro ao gerar relatório:', err);
    res.status(500).json({ 
      success: false,
      error: 'Erro ao gerar relatório',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
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
    
    doc.pipe(res);
    afar dados se necessário
    // Cabeçalho do relatórioe = 'Não informado';
    doc.fontSize(18).text('Relatório de Laudos', 50, 50); if (laudo.exame?.paciente?.nome) {
    doc.fontSize(12).text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 50, 80);    pacienteNome = laudo.exame.paciente.nome;
    f (typeof pacienteNome === 'string' && pacienteNome.includes(':')) {
    // Filtros aplicadose);
    let filtrosTexto = 'Filtros aplicados: ';
    if (dataInicio) filtrosTexto += `Data início: ${new Date(dataInicio).toLocaleDateString('pt-BR')} `;
    if (dataFim) filtrosTexto += `Data fim: ${new Date(dataFim).toLocaleDateString('pt-BR')} `;
    if (status) filtrosTexto += `Status: ${status} `;
    if (tipoExame) filtrosTexto += `Tipo de exame: ${tipoExame}`;
    edicoNome = laudo.medicoResponsavelId.nome;
    doc.fontSize(10).text(filtrosTexto, 50, 110); else if (laudo.medicoResponsavel) {
      medicoNome = laudo.medicoResponsavel;
    // Estatísticasng' && medicoNome.includes(':')) {
    const totais = {
      quantidade: laudos.length,
      assinados: laudos.filter(l => l.status === 'Laudo assinado').length,
      pendentes: laudos.filter(l => l.status !== 'Laudo assinado').length
    };
    } - `${laudo.exame?.tipoExame?.nome || 'N/A'} - ${laudo.status}`, 50, yPosition)
    let yPosition = 140;text(`   Médico: ${medicoNome}`, 70, yPosition + 12)
    doc.fontSize(14).text('Resumo:', 50, yPosition); .text(`   Data: ${new Date(laudo.createdAt).toLocaleDateString('pt-BR')}`, 70, yPosition + 24);
    yPosition += 25;
    doc.fontSize(11)
      .text(`Total de laudos: ${totais.quantidade}`, 50, yPosition)
      .text(`Laudos assinados: ${totais.assinados}`, 50, yPosition + 15)
      .text(`Laudos pendentes: ${totais.pendentes}`, 50, yPosition + 30);
    yPosition += 20;
    yPosition += 60;
    
    // Lista de laudos
    doc.fontSize(14).text('Detalhes dos Laudos:', 50, yPosition);
    yPosition += 25;
    ch (err) {
    laudos.forEach((laudo, index) => {ger.error('Erro ao exportar relatório PDF:', err);
      // Verificar se precisa de nova páginares.status(500).json({ 
      if (yPosition > 700) { false,
        doc.addPage();  error: 'Erro ao exportar relatório PDF',
        yPosition = 50;ocess.env.NODE_ENV === 'development' ? err.message : undefined
      }
      
      try {
        // Descriptografar dados se necessário
        let pacienteNome = 'Não informado';
        if (laudo.exame?.paciente?.nome) {.obterEstatisticas = async (req, res) => {
          pacienteNome = laudo.exame.paciente.nome;ry {
          if (typeof pacienteNome === 'string' && pacienteNome.includes(':')) {  const { dataInicio, dataFim } = req.query;
            pacienteNome = decrypt(pacienteNome);    const query = { tenant_id: req.tenant_id };
          }
        }
        uery.dataCriacao = {};
        let medicoNome = 'Não informado'; new Date(dataInicio);
        if (laudo.medicoResponsavelId?.nome) { Date(dataFim);
          medicoNome = laudo.medicoResponsavelId.nome;    }
        } else if (laudo.medicoResponsavel) {
          medicoNome = laudo.medicoResponsavel;
          if (typeof medicoNome === 'string' && medicoNome.includes(':')) {
            medicoNome = decrypt(medicoNome);
          } laudosPorMedico,
        }      tempoMedioElaboracao
        it Promise.all([
        doc.fontSize(10)ocuments(query),
          .text(`${index + 1}. ${pacienteNome} - ${laudo.exame?.tipoExame?.nome || 'N/A'} - ${laudo.status}`, 50, yPosition)[
          .text(`   Médico: ${medicoNome}`, 70, yPosition + 12)y },
          .text(`   Data: ${new Date(laudo.createdAt).toLocaleDateString('pt-BR')}`, 70, yPosition + 24);$status", total: { $sum: 1 } } }
        
        yPosition += 45;
      } catch (err) { },
        console.error('Erro ao processar laudo no PDF:', err);
        doc.fontSize(10).text(`${index + 1}. Erro ao processar dados do laudo`, 50, yPosition);
        yPosition += 20;   _id: "$medicoResponsavel",
      }um: 1 },
    });
        $sum: { $cond: [{ $eq: ["$status", "Finalizado"] }, 1, 0] }
    doc.end();
    
  } catch (err) {
    logger.error('Erro ao exportar relatório PDF:', err);
    res.status(500).json({ 
      success: false,      { $eq: ["$status", "Finalizado"] },
      error: 'Erro ao exportar relatório PDF',ists: ["$dataFinalizacao", true] }
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });tract: ["$dataFinalizacao", "$dataCriacao"] },
  }
};

// Get report statistics
exports.obterEstatisticas = async (req, res) => {
  try {
    const { dataInicio, dataFim } = req.query;
    const query = { tenant_id: req.tenant_id };up: {
rom: "usuarios",
    if (dataInicio || dataFim) { localField: "_id",
      query.dataCriacao = {};  foreignField: "_id",
      if (dataInicio) query.dataCriacao.$gte = new Date(dataInicio);   as: "medicoInfo"
      if (dataFim) query.dataCriacao.$lte = new Date(dataFim);
    }
o" },
    const [
      totalLaudos,
      laudosPorStatus, nome: "$medicoInfo.nome",
      laudosPorMedico,  especialidade: "$medicoInfo.especialidade",
      tempoMedioElaboracao
    ] = await Promise.all([   finalizados: 1,
      Laudo.countDocuments(query),oHoras: {
      Laudo.aggregate([, 3600000]
        { $match: query },
        { $group: { _id: "$status", total: { $sum: 1 } } }
      ]),
      Laudo.aggregate([
        { $match: query },
        { 
          $group: { match: {
            _id: "$medicoResponsavel",   ...query,
            total: { $sum: 1 },   status: "Finalizado",
            finalizados: {acao: { $exists: true }
              $sum: { $cond: [{ $eq: ["$status", "Finalizado"] }, 1, 0] } }
            },
            tempoMedio: {
              $avg: {
                $cond: [
                  { $and: [ tempoMedio: {
                    { $eq: ["$status", "Finalizado"] },    $avg: { $subtract: ["$dataFinalizacao", "$dataCriacao"] }
                    { $exists: ["$dataFinalizacao", true] }   }
                  ]},
                  { $subtract: ["$dataFinalizacao", "$dataCriacao"] },
                  null
                ]
              }
            }n({
          }alLaudos,
        },udosPorStatus,
        {audosPorMedico,
          $lookup: {      tempoMedioElaboracao: tempoMedioElaboracao[0]?.tempoMedio || 0
            from: "usuarios",
            localField: "_id",
            foreignField: "_id",or retrieving report statistics');
            as: "medicoInfo"on({
          }
        },rror: process.env.NODE_ENV === 'development' ? err.message : undefined
        { $unwind: "$medicoInfo" },
        {
          $project: {
            nome: "$medicoInfo.nome",
            especialidade: "$medicoInfo.especialidade",
            total: 1,.assinarLaudoComCertificado = async (laudoId, medicoId, senhaCertificado) => {
            finalizados: 1,ry {
            tempoMedioHoras: {  const certificadoService = require('../services/certificadoDigitalService');
              $divide: ["$tempoMedio", 3600000]    const CertificadoDigital = require('../models/CertificadoDigital');
            }
          }
        }st certificadoInfo = await certificadoService.obterCertificadoParaAssinatura(medicoId);
      ]),
      Laudo.aggregate([ fornecida)
        {const certificado = await CertificadoDigital.findById(certificadoInfo.certificadoId);
          $match: {
            ...query,
            status: "Finalizado",  throw new Error('Certificado não encontrado');
            dataFinalizacao: { $exists: true }
          }
        },// Validar senha fornecida se foi fornecida (para confirmação do usuário)
        {o && !(await certificado.validarSenha(senhaCertificado))) {
          $group: {enha incorreta durante assinatura');
            _id: null, throw new Error('Senha do certificado incorreta');
            tempoMedio: {}
              $avg: { $subtract: ["$dataFinalizacao", "$dataCriacao"] }
            }
          }
        }
      ]) throw new Error('Laudo não encontrado');
    ]);}

    res.json({
      totalLaudos,audo.findById(laudoId);
      laudosPorStatus,
      laudosPorMedico, throw new Error('Laudo não encontrado no banco de dados');
      tempoMedioElaboracao: tempoMedioElaboracao[0]?.tempoMedio || 0    }
    });
  } catch (err) {(medicoId);
    console.error('Error retrieving report statistics');ome = usuarioMedico.nome;
    res.status(500).json({
      message: 'Error retrieving report statistics',/ Gerar PDF
      error: process.env.NODE_ENV === 'development' ? err.message : undefinedconst pdfBuffers = [];
    });ufferPages: true });
  }h(chunk));
};
selo visual no PDF
// Função para assinar laudo com validação de senha do certificado, 50)
exports.assinarLaudoComCertificado = async (laudoId, medicoId, senhaCertificado) => {
  try {
    const certificadoService = require('../services/certificadoDigitalService');       .fontSize(8)
    const CertificadoDigital = require('../models/CertificadoDigital');
    O DIGITALMENTE\nValidar autenticidade no Adobe Reader', 405, 755, {
    // Obter certificado ativo do médico140,
    const certificadoInfo = await certificadoService.obterCertificadoParaAssinatura(medicoId);
    
    // Buscar o certificado no banco para validar a senha fornecida (se fornecida)
    const certificado = await CertificadoDigital.findById(certificadoInfo.certificadoId);
     = `${process.env.FRONTEND_URL || 'https://reports.codeytech.com.br'}/publico/${laudoId}`;
    if (!certificado) {
      throw new Error('Certificado não encontrado');ar conteúdo do PDF usando dados descriptografados
    }    await gerarConteudoPdfLaudo(doc, laudoCompleto, laudoCompleto.exame, usuarioMedico, medicoNome, laudoCompleto.conclusao, publicLink, defaultStyles);
    
    // Validar senha fornecida se foi fornecida (para confirmação do usuário)
    if (senhaCertificado && !(await certificado.validarSenha(senhaCertificado))) {      doc.on('end', resolve);
      await certificado.registrarUso(false, null, 'Senha incorreta durante assinatura');
      throw new Error('Senha do certificado incorreta');
    }    });
    
    // Obter dados do laudo descriptografadosconcat(pdfBuffers);
    const laudoCompleto = await obterLaudoPorId(laudoId);
    if (!laudoCompleto) {om certificado do médico
      throw new Error('Laudo não encontrado');st { SignPdf } = await import('@signpdf/signpdf');
    }    const { P12Signer } = await import('@signpdf/signer-p12');

    // Buscar laudo no banco para atualizaçãoconst bufferCertificado = certificadoInfo.bufferCertificado;
    const laudo = await Laudo.findById(laudoId);o.senha; // Usa a senha original armazenada do certificado
    if (!laudo) {
      throw new Error('Laudo não encontrado no banco de dados');
    }  pdfBuffer,
    
    const usuarioMedico = await Usuario.findById(medicoId);
    const medicoNome = usuarioMedico.nome;  location: 'Sistema LaudoFy',
    
    // Gerar PDF
    const pdfBuffers = [];
    const doc = new PDFDocument({ size: 'A4', margin: 30, bufferPages: true });ado, { passphrase: senhaOriginal });
    doc.on('data', chunk => pdfBuffers.push(chunk));

    // Adiciona selo visual no PDF    const signedPdf = await signPdf.sign(pdfWithPlaceholder, signer);
    doc.rect(400, 750, 150, 50)
       .stroke()
       .font('Helvetica-Bold')(true);
       .fontSize(8)
       .fillColor('red')
       .text('DOCUMENTO ASSINADO DIGITALMENTE\nValidar autenticidade no Adobe Reader', 405, 755, {    const pdfFile = {
         width: 140,
         align: 'center'doId}.pdf`,
       });      mimetype: 'application/pdf',

    // Gerar link público para o laudo
    const publicLink = `${process.env.FRONTEND_URL || 'https://reports.codeytech.com.br'}/publico/${laudoId}`;ew require('stream').Readable();

    // Gerar conteúdo do PDF usando dados descriptografados e template personalizado
    await gerarConteudoPdfLaudo(doc, laudoCompleto, laudoCompleto.exame, usuarioMedico, medicoNome, laudoCompleto.conclusao, publicLink, defaultStyles, laudoCompleto.tenant_id);

    await new Promise((resolve, reject) => {
      doc.on('end', resolve);
      doc.on('error', reject);await uploadPDFToUploadcare(pdfFile);
      doc.end();
    });Atualizar laudo
udo.laudoAssinado = uploadcareUrl;
    const pdfBuffer = Buffer.concat(pdfBuffers);    laudo.dataAssinatura = new Date();
    
    // Assinar com certificado do médicolaudo.tipoAssinatura = 'digital';
    const { SignPdf } = await import('@signpdf/signpdf');oKey = certificadoInfo.certificadoId; // Salvar como chave do certificado
    const { P12Signer } = await import('@signpdf/signer-p12');
    
    const bufferCertificado = certificadoInfo.bufferCertificado;
    const senhaOriginal = certificadoInfo.senha; // Usa a senha original armazenada do certificado
    
    const pdfWithPlaceholder = plainAddPlaceholder({if (exame) {
      pdfBuffer,audo realizado';
      reason: 'Assinatura Digital Laudo Médico',  await exame.save();
      name: certificadoInfo.informacoes.medico,
      location: 'Sistema LaudoFy',laudo ${laudo._id}`);
    });

    // Criar o signer P12 e o SignPdf
    const signer = new P12Signer(bufferCertificado, { passphrase: senhaOriginal });s: true, 
    const signPdf = new SignPdf();
     assinadoCom: 'certificado_medico',
    const signedPdf = await signPdf.sign(pdfWithPlaceholder, signer);      certificadoId: certificadoInfo.certificadoId,
: 'uploadcare'
    // Registrar uso bem-sucedido do certificado
    await certificado.registrarUso(true);

    // Upload do PDF assinadoicado');
    const pdfFile = {
      buffer: signedPdf,
      originalname: `laudo_assinado_${laudoId}.pdf`,
      mimetype: 'application/pdf',
      size: signedPdf.length,l)
      stream: () => {audoAutomaticamente = async (req, res) => {
        const stream = new require('stream').Readable();ry {
        stream.push(signedPdf);  const laudoId = req.params.id;
        stream.push(null);    const medicoId = req.usuario.id;
        return stream;
      } senha adicional
    };A função usa a senha já armazenada no certificado
s.assinarLaudoComCertificado(laudoId, medicoId, null);
    const uploadcareUrl = await uploadPDFToUploadcare(pdfFile);
        res.json({
    // Atualizar laudo
    laudo.laudoAssinado = uploadcareUrl;sso',
    laudo.dataAssinatura = new Date();
    laudo.status = 'Laudo assinado';    });
    laudo.tipoAssinatura = 'digital';
    laudo.laudoAssinadoKey = certificadoInfo.certificadoId; // Salvar como chave do certificado
    rror);
    await laudo.save();
     statusCode = 500;
    // Atualizar exame relacionado    let mensagemErro = 'Erro interno do servidor';
    const exame = await Exame.findById(laudo.exame);
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

    // Adicionar linha para assinatura manual
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
      laudo.laudoAssinadoKey = uploadResult.key;
      laudo.laudoAssinado = uploadResult.url;
      laudo.arquivoPath = uploadResult.url;
      
      await laudo.save();

      // Atualizar status do exame para "Laudo realizado"
      const exame = await Exame.findById(laudo.exame);
      if (exame) {
        exame.status = 'Laudo realizado';
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

    // Adicionar área de assinatura física (com imagem PNG se disponível, ou linha tradicional)
    await adicionarAreaAssinaturaMedica(
      doc, 
      laudoCompleto.medicoResponsavel, 
      medico, 
      doc.y || 600, 
      false, // NÃO assinado digitalmente
      null,
      null,
      true // Usar assinatura física PNG se disponível
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
      laudo.laudoAssinadoKey = uploadResult.key;
      laudo.laudoAssinado = uploadResult.url; // Manter compatibilidade
      laudo.arquivoPath = uploadResult.url;
      
      await laudo.save();

      // Atualizar status do exame para "Laudo realizado"
      const exame = await Exame.findById(laudo.exame);
      if (exame) {
        exame.status = 'Laudo realizado';
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