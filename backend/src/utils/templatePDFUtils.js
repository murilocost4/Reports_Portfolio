const TemplatePDF = require('../models/TemplatePDF');
const { 
  downloadLogoFromS3,
  downloadFolhaTimbradaFromS3 
} = require('../services/templateStorageService');
const QRCode = require('qrcode');

/**
 * Buscar configuração do template para um tenant
 * @param {string} tenantId - ID do tenant
 * @returns {Object} Configuração do template ou padrão
 */
const getTemplateConfig = async (tenantId) => {
  try {
    const template = await TemplatePDF.findOne({ 
      tenant_id: tenantId,
      ativo: true 
    });

    if (template) {
      return {
        usandoPadrao: false,
        config: template.toObject()
      };
    }

    // Retornar configuração padrão se não houver template personalizado
    return {
      usandoPadrao: true,
      config: {
        tenant_id: tenantId,
        ...TemplatePDF.getConfigPadrao()
      }
    };
  } catch (error) {
    // Em caso de erro, retornar configuração padrão
    return {
      usandoPadrao: true,
      config: {
        tenant_id: tenantId,
        ...TemplatePDF.getConfigPadrao()
      }
    };
  }
};

/**
 * Aplicar configurações do template no documento PDF
 * @param {PDFDocument} doc - Documento PDF (PDFKit)
 * @param {Object} config - Configuração do template
 * @param {Object} options - Opções adicionais
 */
const applyTemplateConfig = async (doc, config, options = {}) => {
  try {
    const {
      cores = {},
      layout = {},
      fonte = 'Helvetica',
      tamanhoFonte = {},
      margens = {},
      logoS3Key,
      logoUrl,
      rodapeTexto = '',
      customPositions = {},
      estilosSecao = {},
      tipoTemplate = 'personalizado',
      folhaTimbradaUrl,
      folhaTimbradaS3Key,
      folhaTimbradaConfig = {},
      textStyles = null  // ← Nova propriedade para estilos simplificados
    } = config;

    // Aplicar margens do documento
    const margensFinais = {
      top: margens.top || 40,
      bottom: margens.bottom || 40,
      left: margens.left || 40,
      right: margens.right || 40
    };

    // Armazenar configurações no documento para uso posterior
    doc._templateConfig = {
      tipoTemplate,
      cores: {
        primaria: cores.primaria || '#2563eb',
        secundaria: cores.secundaria || '#64748b',
        texto: cores.texto || '#1f2937',
        fundo: cores.fundo || '#ffffff'
      },
      layout: {
        mostrarLogo: layout.mostrarLogo !== false,
        mostrarRodape: layout.mostrarRodape !== false,
        alinhamentoTitulo: layout.alinhamentoTitulo || 'center',
        mostrarQrCode: layout.mostrarQrCode !== false,
        mostrarDadosPaciente: layout.mostrarDadosPaciente !== false,
        mostrarDataAssinatura: layout.mostrarDataAssinatura !== false,
        mostrarCabecalhoCompleto: layout.mostrarCabecalhoCompleto !== false
      },
      fonte,
      tamanhoFonte: {
        base: tamanhoFonte.base || 11,
        titulo: tamanhoFonte.titulo || 16,
        subtitulo: tamanhoFonte.subtitulo || 14
      },
      margens: margensFinais,
      rodapeTexto,
      logoS3Key,
      logoUrl,
      folhaTimbradaUrl,
      folhaTimbradaS3Key,
      folhaTimbradaConfig,
      customPositions,
      estilosSecao: {
        header: estilosSecao.header || {},
        patientInfo: estilosSecao.patientInfo || {},
        content: estilosSecao.content || {},
        signature: estilosSecao.signature || {},
        footer: estilosSecao.footer || {},
        qrcode: estilosSecao.qrcode || {}
      },
      textStyles  // ← Adicionar textStyles à configuração do documento
    };

    // Log específico para folha timbrada simplificada
    if (tipoTemplate === 'folha_timbrada' && textStyles) {
      console.log('🎨 [DEBUG] FOLHA TIMBRADA SIMPLIFICADA detectada:');
      console.log('  - Ignorando customPositions (usando layout automático)');
      console.log('  - Aplicando textStyles:', textStyles);
      console.log('  - Configurando para usar folha como fundo');
    }

    // Baixar logo se disponível
    if (logoS3Key && doc._templateConfig.layout.mostrarLogo) {
      try {
        const logoData = await downloadLogoFromS3(logoS3Key);
        doc._templateConfig.logoBuffer = logoData.buffer;
        doc._templateConfig.logoContentType = logoData.contentType;
      } catch (logoError) {
        console.error('Erro ao baixar logo do template:', logoError);
      }
    }

    // Baixar folha timbrada se disponível
    if (folhaTimbradaS3Key && tipoTemplate === 'folha_timbrada') {
      try {
        const folhaData = await downloadFolhaTimbradaFromS3(folhaTimbradaS3Key);
        doc._templateConfig.folhaTimbradaBuffer = folhaData.buffer;
        doc._templateConfig.folhaTimbradaContentType = folhaData.contentType;
      } catch (folhaError) {
        console.error('❌ [DEBUG] Erro ao baixar folha timbrada do template:', folhaError);
      }
    } else if (tipoTemplate === 'folha_timbrada' && !folhaTimbradaS3Key) {
      console.log('⚠️ [DEBUG] Tipo é folha_timbrada mas S3Key não disponível');
    }

    return doc._templateConfig;
  } catch (error) {
    console.error('Erro ao aplicar configuração do template:', error);
    throw error;
  }
};

/**
 * Adicionar cabeçalho personalizado ao PDF
 * @param {PDFDocument} doc - Documento PDF
 * @param {Object} templateConfig - Configuração do template
 * @param {Object} dadosLaudo - Dados do laudo
 */
const addCustomHeader = (doc, templateConfig, dadosLaudo = {}) => {
  const { cores, layout, fonte, tamanhoFonte, margens } = templateConfig;
  const pageWidth = doc.page.width;
  const startY = margens.top;

  let currentY = startY;

  // Adicionar logo se disponível
  if (layout.mostrarLogo && templateConfig.logoBuffer) {
    try {
      const logoWidth = 120;
      const logoHeight = 60;
      const logoX = layout.alinhamentoTitulo === 'right' ? pageWidth - margens.right - logoWidth :
                   layout.alinhamentoTitulo === 'center' ? (pageWidth - logoWidth) / 2 :
                   margens.left;

      doc.image(templateConfig.logoBuffer, logoX, currentY, {
        width: logoWidth,
        height: logoHeight,
        fit: [logoWidth, logoHeight]
      });

      currentY += logoHeight + 20;
    } catch (error) {
      console.error('Erro ao inserir logo:', error);
    }
  }

  // Adicionar título principal
  if (layout.mostrarCabecalhoCompleto) {
    const coresValidadas = validarCores(cores);
    doc.fillColor(coresValidadas.primaria)
       .font(`${fonte}-Bold`)
       .fontSize(tamanhoFonte.titulo)
       .text('LAUDO MÉDICO', margens.left, currentY, {
         width: pageWidth - margens.left - margens.right,
         align: layout.alinhamentoTitulo
       });

    currentY += 30;

    // Linha decorativa
    if (layout.alinhamentoTitulo === 'center') {
      const coresValidadas = validarCores(cores);
      const lineWidth = 200;
      const lineX = (pageWidth - lineWidth) / 2;
      doc.strokeColor(coresValidadas.primaria)
         .lineWidth(2)
         .moveTo(lineX, currentY)
         .lineTo(lineX + lineWidth, currentY)
         .stroke();
    }

    currentY += 20;
  }

  return currentY;
};

/**
 * Adicionar rodapé personalizado ao PDF
 * @param {PDFDocument} doc - Documento PDF
 * @param {Object} templateConfig - Configuração do template
 * @param {string} publicLink - Link público do laudo
 */
const addCustomFooter = (doc, templateConfig, publicLink = '') => {
  const { cores, layout, fonte, tamanhoFonte, margens, rodapeTexto } = templateConfig;
  const pageHeight = doc.page.height;
  const pageWidth = doc.page.width;
  const footerY = pageHeight - margens.bottom;

  if (!layout.mostrarRodape) return;

  // Linha superior do rodapé
  doc.strokeColor(cores.secundaria)
     .lineWidth(1)
     .moveTo(margens.left, footerY - 20)
     .lineTo(pageWidth - margens.right, footerY - 20)
     .stroke();

  let currentY = footerY - 15;

  // Texto personalizado do rodapé
  if (rodapeTexto) {
    doc.fillColor(cores.secundaria)
       .font(fonte)
       .fontSize(tamanhoFonte.base - 1)
       .text(rodapeTexto, margens.left, currentY, {
         width: pageWidth - margens.left - margens.right,
         align: 'center'
       });
    currentY += 15;
  }

  // QR Code e link público
  if (layout.mostrarQrCode && publicLink) {
    doc.fillColor(cores.secundaria)
       .font(fonte)
       .fontSize(tamanhoFonte.base - 2)
       .text(`Verificar autenticidade: ${publicLink}`, margens.left, currentY, {
         width: pageWidth - margens.left - margens.right,
         align: 'center'
       });
  }
};

/**
 * Utilitário: aplicar estilos de texto
 * @param {PDFDocument} doc - Documento PDF
 * @param {Object} templateConfig - Configuração do template
 * @param {string} tipo - Tipo de texto (titulo, subtitulo, normal)
 */
const applyTextStyles = (doc, templateConfig, tipo = 'normal') => {
  const { cores, fonte, tamanhoFonte } = templateConfig;

  switch (tipo) {
    case 'titulo':
      doc.fillColor(cores.primaria)
         .font(`${fonte}-Bold`)
         .fontSize(tamanhoFonte.titulo);
      break;
    case 'subtitulo':
      doc.fillColor(cores.secundaria)
         .font(`${fonte}-Bold`)
         .fontSize(tamanhoFonte.subtitulo);
      break;
    case 'destaque':
      doc.fillColor(cores.primaria)
         .font(`${fonte}-Bold`)
         .fontSize(tamanhoFonte.base);
      break;
    default:
      doc.fillColor(cores.texto)
         .font(fonte)
         .fontSize(tamanhoFonte.base);
  }

  return doc;
};

/**
 * Utilitário: obter estilos padrão
 * @param {Object} templateConfig - Configuração do template
 * @returns {Object} Objeto com estilos formatados
 */
const getTemplateStyles = (templateConfig) => {
  const { cores, fonte, tamanhoFonte, margens } = templateConfig;

  return {
    colors: {
      primary: cores.primaria || '#1e3a8a', // Azul mais escuro e profissional
      secondary: cores.secundaria || '#3b82f6', // Azul vibrante
      text: cores.texto || '#1f2937', // Cinza escuro para texto
      background: '#ffffff', // Branco puro
      border: '#e5e7eb', // Cinza claro para bordas
      lightText: '#6b7280', // Cinza médio para texto secundário
      light: '#ffffff',
      dark: cores.primaria || '#1e3a8a',
      success: '#059669', // Verde profissional
      warning: '#d97706', // Laranja elegante
      error: '#dc2626', // Vermelho profissional
      accent: '#f59e0b', // Dourado para destaques
    },
    fonts: {
      regular: fonte || 'Helvetica',
      bold: `${fonte || 'Helvetica'}-Bold`,
      italic: `${fonte || 'Helvetica'}-Oblique`,
      title: 24, // Tamanho maior para títulos
      section: 18, // Seções importantes
      label: 12, // Labels e textos menores
      normal: 14 // Texto normal maior para melhor legibilidade
    },
    fontSize: {
      title: tamanhoFonte?.titulo || 24,
      subtitle: tamanhoFonte?.subtitulo || 18,
      base: tamanhoFonte?.base || 14,
      small: (tamanhoFonte?.base || 14) - 2,
      large: (tamanhoFonte?.base || 14) + 4,
      tiny: (tamanhoFonte?.base || 14) - 4
    },
    spacing: {
      header: 45, // Espaçamento maior após cabeçalhos
      section: 35, // Entre seções
      element: 20, // Entre elementos
      paragraph: 16, // Entre parágrafos
      line: 6 // Entre linhas
    },
    margins: {
      left: margens?.left || 50, // Margens maiores para aparência premium
      right: margens?.right || 50,
      top: margens?.top || 50,
      bottom: margens?.bottom || 50,
      headerRight: 200 // Espaço para card lateral
    },
    borders: {
      radius: 12, // Bordas mais arredondadas
      width: 2, // Bordas mais pronunciadas
      style: 'solid'
    },
    shadows: {
      card: 'rgba(0, 0, 0, 0.12)', // Sombras mais visíveis
      light: 'rgba(0, 0, 0, 0.06)',
      medium: 'rgba(0, 0, 0, 0.20)',
      heavy: 'rgba(0, 0, 0, 0.30)' // Para elementos importantes
    },
    layout: {
      cardPadding: 30, // Padding maior para cards
      sectionSpacing: 35,
      lineHeight: 1.6, // Maior espaçamento entre linhas para legibilidade
      headerHeight: 140, // Cabeçalho mais alto
      footerHeight: 100 // Rodapé mais generoso
    },
    effects: {
      opacity: {
        subtle: 0.05,
        light: 0.1,
        medium: 0.2,
        strong: 0.4
      },
      gradientStops: {
        primary: [0, 0.5, 1],
        highlight: [0, 0.3, 0.7, 1]
      }
    }
  };
};

/**
 * Verificar se deve mostrar elemento baseado na configuração do template
 * @param {Object} templateConfig - Configuração do template
 * @param {string} elemento - Nome do elemento
 * @returns {boolean}
 */
const shouldShowElement = (templateConfig, elemento) => {
  const { layout } = templateConfig;
  
  const elementMap = {
    'logo': layout?.mostrarLogo,
    'rodape': layout?.mostrarRodape,
    'qrcode': layout?.mostrarQrCode,
    'dados_paciente': layout?.mostrarDadosPaciente,
    'data_assinatura': layout?.mostrarDataAssinatura,
    'cabecalho_completo': layout?.mostrarCabecalhoCompleto
  };

  const resultado = elementMap[elemento] !== false;
  
  return resultado;
};

/**
 * Aplicar estilo de seção com configurações avançadas
 * @param {PDFDocument} doc - Documento PDF
 * @param {Object} templateConfig - Configuração do template
 * @param {string} secaoTipo - Tipo da seção (header, patientInfo, content, signature, footer, qrcode)
 * @param {number} x - Posição X
 * @param {number} y - Posição Y
 * @param {number} width - Largura
 * @param {number} height - Altura
 * @returns {Object} Coordenadas ajustadas para o conteúdo
 */
const applyAdvancedSectionStyle = (doc, templateConfig, secaoTipo, x, y, width, height) => {
  // CORREÇÃO: Usar textStyles.sections se disponível (folha timbrada), senão estilosSecao (outros templates)
  let estiloSecao = {};
  
  if (templateConfig.textStyles?.sections) {
    // Para folha timbrada simplificada - usar textStyles.sections
    const sections = templateConfig.textStyles.sections;
    
    estiloSecao = {
      corFundo: sections.backgroundColor || '#ffffff',
      opacity: sections.backgroundOpacity !== undefined ? sections.backgroundOpacity : 0.8,
      corBorda: sections.borderColor || '#e5e7eb',
      larguraBorda: sections.showBorder ? (sections.borderWidth || 1) : 0,
      raioCantos: sections.borderRadius || 6,
      padding: sections.padding || 12,
      mostrarSombra: sections.showShadow || false
    };
  } else {
    // Para outros templates - usar estilosSecao tradicional
    estiloSecao = templateConfig.estilosSecao[secaoTipo] || {};
  }
  
  // Verificar se há posição customizada
  const customPos = templateConfig.customPositions[secaoTipo];
  if (customPos) {
    x = customPos.x || x;
    y = customPos.y || y;
    width = customPos.width || width;
    height = customPos.height || height;
  }
  
  // Aplicar cor de fundo com transparência
  if (estiloSecao.corFundo) {
    // Aplicar transparência se definida
    if (estiloSecao.opacity !== undefined && estiloSecao.opacity < 1) {
      doc.fillOpacity(estiloSecao.opacity);
    }
    
    doc.fillColor(estiloSecao.corFundo).rect(x, y, width, height).fill();
    
    // Resetar opacidade para não afetar outros elementos
    if (estiloSecao.opacity !== undefined && estiloSecao.opacity < 1) {
      doc.fillOpacity(1);
    }
  }
  
  // Não aplicar gradiente nem sombra (flat)
  if (estiloSecao.larguraBorda > 0 && estiloSecao.corBorda) {
    doc.strokeColor(estiloSecao.corBorda);
    doc.lineWidth(estiloSecao.larguraBorda);
    if (estiloSecao.raioCantos > 0) {
      doc.roundedRect(x, y, width, height, estiloSecao.raioCantos).stroke();
    } else {
      doc.rect(x, y, width, height).stroke();
    }
  }
  
  // Retornar coordenadas de conteúdo ajustadas para padding
  const padding = estiloSecao.padding || 0;
  return {
    contentX: x + padding,
    contentY: y + padding,
    contentWidth: width - (padding * 2),
    contentHeight: height - (padding * 2),
    originalX: x,
    originalY: y,
    originalWidth: width,
    originalHeight: height
  };
};

/**
 * Calcular posição baseada em configurações customizadas
 * @param {Object} templateConfig - Configuração do template
 * @param {string} elemento - Nome do elemento
 * @param {Object} defaultPos - Posição padrão
 * @returns {Object} Posição calculada
 */
const calculateElementPosition = (templateConfig, elemento, defaultPos) => {
  const customPos = templateConfig.customPositions[elemento];
  
  if (!customPos) {
    return defaultPos;
  }
  
  return {
    x: customPos.x !== undefined ? customPos.x : defaultPos.x,
    y: customPos.y !== undefined ? customPos.y : defaultPos.y,
    width: customPos.width !== undefined ? customPos.width : defaultPos.width,
    height: customPos.height !== undefined ? customPos.height : defaultPos.height
  };
};

/**
 * Cabeçalho flat, sem gradiente, com cor sólida do template
 */
const addAdvancedHeader = (doc, templateConfig, dadosLaudo = {}) => {
  const { cores, layout, fonte, margens, estilosSecao, tipoTemplate, textStyles } = templateConfig;
  const pageWidth = doc.page.width;
  const headerStyle = estilosSecao?.header || {};
  
  // Para folha timbrada, usar textStyles.margins se disponível
  const margensCustomizadas = tipoTemplate === 'folha_timbrada' && textStyles?.margins 
    ? textStyles.margins 
    : margens;
  
  if (!shouldShowElement(templateConfig, 'cabecalho_completo')) return (margensCustomizadas?.top || 150) + 40;
  
  const headerHeight = headerStyle.altura || 90;
  
  // Para folha timbrada, NÃO desenhar fundo colorido - apenas texto sobre a folha
  const isFolhaTimbrada = tipoTemplate === 'folha_timbrada';
  
  if (!isFolhaTimbrada) {
    // Apenas desenhar fundo para templates que não são folha timbrada
    doc.fillColor(cores.primaria || '#1e3a8a').rect(0, 0, pageWidth, headerHeight).fill();
  }
  
  let logoWidth = 0;
  if (layout?.mostrarLogo && templateConfig.logoBuffer && !isFolhaTimbrada) {
    // Para folha timbrada, não mostrar logo adicional pois a folha já tem o logo
    try {
      const logoSize = headerStyle.tamanhoLogo || 60;
      logoWidth = logoSize + 20;
      const logoX = margens?.left || 40;
      doc.image(templateConfig.logoBuffer, logoX, 15, { height: logoSize, width: logoSize, fit: [logoSize, logoSize] });
    } catch {}
  }
  
  // Ajustar cor do texto baseado no tipo de template
  const corTexto = isFolhaTimbrada ? (cores.primaria || '#1e3a8a') : '#fff';
  const tamanhoFonte = headerStyle.tamanhoFonte || (isFolhaTimbrada ? 20 : 26);
  
  // Calcular posição Y do cabeçalho baseado nas margens customizadas
  const headerY = isFolhaTimbrada ? ((margens?.top || 150) + (margens?.sectionTop || 0)) : 30;
  
  doc.fillColor(corTexto)
     .font(`${fonte || 'Helvetica'}-Bold`)
     .fontSize(tamanhoFonte)
     .text('LAUDO MÉDICO', 
           logoWidth + (margens?.left || 50) + (margens?.sectionSides || 0), 
           headerY, { 
             width: pageWidth - logoWidth - (margens?.left || 50) - (margens?.right || 50) - (margens?.sectionSides || 0) * 2, 
             align: isFolhaTimbrada ? 'center' : 'left' 
           });
  
  if (dadosLaudo.laudoId || dadosLaudo.dataEmissao) {
    const corTextoSecundario = isFolhaTimbrada ? (cores.secundaria || '#64748b') : '#fff';
    
    doc.font(fonte || 'Helvetica')
       .fontSize(10)
       .fillColor(corTextoSecundario)
       .text(`${dadosLaudo.laudoId ? 'Protocolo: ' + dadosLaudo.laudoId : ''}  ${dadosLaudo.dataEmissao ? 'Data: ' + dadosLaudo.dataEmissao : ''}`, 
             logoWidth + (margens?.left || 50) + (margens?.sectionSides || 0), 
             headerY + 25, { 
               width: pageWidth - logoWidth - (margens?.left || 50) - (margens?.right || 50) - (margens?.sectionSides || 0) * 2, 
               align: isFolhaTimbrada ? 'center' : 'left' 
             });
  }
  
  // Para folha timbrada, retornar posição baseada nas margens customizadas + espaçamento extra
  const finalY = isFolhaTimbrada ? 
    headerY + 45 + (margens?.sectionTop || 0) : 
    (headerHeight + 10);
    
  return finalY;
};

/**
 * Rodapé flat
 */
const addAdvancedFooter = async (doc, templateConfig, publicLink = '') => {
  const { cores, fonte, tamanhoFonte, margens, rodapeTexto, tipoTemplate, textStyles } = templateConfig;
  
  // Para folha timbrada, usar textStyles.margins se disponível
  const margensCustomizadas = tipoTemplate === 'folha_timbrada' && textStyles?.margins 
    ? textStyles.margins 
    : margens;
  
  const pageHeight = doc.page.height;
  const pageWidth = doc.page.width;
  
  // Aplicar margens customizadas para o rodapé
  const marginsLeft = (margensCustomizadas?.left || 50) + (margensCustomizadas?.sectionSides || 0);
  const marginsRight = (margensCustomizadas?.right || 50) + (margensCustomizadas?.sectionSides || 0);
  const marginsBottom = (margensCustomizadas?.bottom || 80) + (margensCustomizadas?.sectionBottom || 0);
  
  // Para folha timbrada, adicionar espaço extra para subir o rodapé (assinatura, QR Code e link)
  const extraSpaceForFolhaTimbrada = tipoTemplate === 'folha_timbrada' ? 100 : 0; // 100px mais para cima
  const footerY = pageHeight - marginsBottom - extraSpaceForFolhaTimbrada;
  
  // Para folha timbrada, SEMPRE mostrar rodapé
  const shouldShowFooter = templateConfig.tipoTemplate === 'folha_timbrada' || templateConfig.layout?.mostrarRodape;
  
  if (!shouldShowFooter) {
    return;
  }
  
  // Linha separadora
  doc.strokeColor(cores.secundaria || '#3b82f6')
     .lineWidth(1)
     .moveTo(marginsLeft, footerY - 60)
     .lineTo(pageWidth - marginsRight, footerY - 60)
     .stroke();
  
  let currentY = footerY - 50;
  
  // Texto personalizado do rodapé
  if (rodapeTexto) {
    doc.fillColor(cores.secundaria || '#3b82f6')
       .font(fonte || 'Helvetica')
       .fontSize((tamanhoFonte?.base || 12) - 1)
       .text(rodapeTexto, marginsLeft, currentY, { 
         width: pageWidth - marginsLeft - marginsRight - 80, // Deixar espaço para QR code
         align: 'left' 
       });
  }
  
  // Adicionar QR Code e link de verificação
  // Para folha timbrada, SEMPRE mostrar QR Code se há publicLink
  const shouldShowQrCode = (templateConfig.tipoTemplate === 'folha_timbrada' && publicLink) || 
                          (templateConfig.layout?.mostrarQrCode && publicLink);
  
  if (shouldShowQrCode) {
    try {
      // Gerar QR Code
      const qrCodeDataUrl = await QRCode.toDataURL(publicLink, { 
        margin: 1, 
        width: 60,
        color: {
          dark: cores.secundaria || '#3b82f6',
          light: '#ffffff'
        }
      });
      
      // Calcular posição do QR Code e texto na mesma linha
      const qrSize = 40;
      const qrX = pageWidth - marginsRight - qrSize - 10; // QR Code no canto direito
      const qrY = currentY + 15; // Posição Y do QR Code
      
      // QR Code primeiro (no canto direito)
      if (qrCodeDataUrl) {
        const base64Data = qrCodeDataUrl.replace(/^data:image\/png;base64,/, '');
        const imgBuffer = Buffer.from(base64Data, 'base64');
        
        doc.image(imgBuffer, qrX, qrY, { width: qrSize, height: qrSize });
      }
      
      // Texto de verificação e link na mesma linha (à esquerda do QR Code)
      const textAreaWidth = qrX - marginsLeft - 20; // Largura disponível para o texto
      
      doc.fillColor(cores.secundaria || '#3b82f6')
         .font(fonte || 'Helvetica')
         .fontSize((tamanhoFonte?.base || 12) - 2)
         .text('Verificar autenticidade:', marginsLeft, qrY, { 
           width: textAreaWidth,
           align: 'left' 
         });
         
      doc.fillColor(cores.secundaria || '#3b82f6')
         .font(fonte || 'Helvetica')
         .fontSize((tamanhoFonte?.base || 12) - 3)
         .text(publicLink, marginsLeft, qrY + 13, { 
           width: textAreaWidth,
           align: 'left',
           link: publicLink
         });
      
    } catch (error) {
      console.error('❌ [DEBUG addAdvancedFooter] Erro ao gerar QR code:', error);
    }
  } else {
    console.log('❌ [DEBUG addAdvancedFooter] QR Code não será adicionado:', {
      mostrarQrCode: templateConfig.layout?.mostrarQrCode,
      temPublicLink: !!publicLink
    });
  }
  
  console.log('✅ [DEBUG addAdvancedFooter] Função finalizada');
};

/**
 * Dados do paciente em card flat
 */
const addAdvancedPatientInfo = (doc, templateConfig, dadosPaciente, startY) => {
  const { cores, fonte = 'Helvetica', margens, tipoTemplate, textStyles } = templateConfig;
  const pageWidth = doc.page.width;
  let currentY = startY + 20;
  
  // Para folha timbrada, usar textStyles.margins se disponível
  const margensCustomizadas = tipoTemplate === 'folha_timbrada' && textStyles?.margins 
    ? textStyles.margins 
    : margens;
  
  // Aplicar margens laterais customizadas
  const marginsLeft = (margensCustomizadas?.left || 50) + (margensCustomizadas?.sectionSides || 0);
  const marginsRight = (margensCustomizadas?.right || 50) + (margensCustomizadas?.sectionSides || 0);
  
  // Título padronizado
  doc.fillColor(cores.primaria || '#1e3a8a')
     .font(`${fonte}-Bold`).fontSize(14)
     .text('DADOS DO PACIENTE', marginsLeft, currentY);
  currentY += 18;
  
  // Card padronizado - para folha timbrada, usar fundo mais transparente
  const cardHeight = Math.max(Object.keys(dadosPaciente).length * 16 + 24, 80); // Altura dinâmica
  const cardWidth = pageWidth - marginsLeft - marginsRight;
  const isFolhaTimbrada = tipoTemplate === 'folha_timbrada';
  
  // ✨ APLICAR ESTILO PERSONALIZADO DA SEÇÃO
  applyAdvancedSectionStyle(doc, templateConfig, 'patientInfo', marginsLeft, currentY, cardWidth, cardHeight);
  
  // Dados em 2 colunas
  doc.font(fonte).fontSize(11).fillColor(cores.texto || '#222');
  const labels = Object.entries(dadosPaciente);
  const col1 = labels.slice(0, Math.ceil(labels.length/2));
  const col2 = labels.slice(Math.ceil(labels.length/2));
  
  let infoY = currentY + 12;
  let colWidth = (cardWidth - 24) / 2;
  
  // Primeira coluna
  col1.forEach(([label, value], idx) => {
    if (value) { // Só exibir se tiver valor
      doc.font(`${fonte}-Bold`).text(label + ':', marginsLeft + 12, infoY, { continued: true });
      doc.font(fonte).text(' ' + value, { continued: false });
      infoY += 16;
    }
  });
  
  // Segunda coluna
  infoY = currentY + 12;
  col2.forEach(([label, value], idx) => {
    if (value) { // Só exibir se tiver valor
      doc.font(`${fonte}-Bold`).text(label + ':', marginsLeft + 12 + colWidth, infoY, { continued: true });
      doc.font(fonte).text(' ' + value, { continued: false });
      infoY += 16;
    }
  });
  
  const finalY = currentY + cardHeight + 20;
  return finalY;
};

/**
 * Dados do exame em card flat
 */
const addAdvancedExamInfo = (doc, templateConfig, dadosExame, startY) => {
  const { cores, fonte = 'Helvetica', margens, tipoTemplate, textStyles } = templateConfig;
  const pageWidth = doc.page.width;
  let currentY = startY + 10;
  
  // Para folha timbrada, usar textStyles.margins se disponível
  const margensCustomizadas = tipoTemplate === 'folha_timbrada' && textStyles?.margins 
    ? textStyles.margins 
    : margens;
  
  // Aplicar margens laterais customizadas
  const marginsLeft = (margensCustomizadas?.left || 50) + (margensCustomizadas?.sectionSides || 0);
  const marginsRight = (margensCustomizadas?.right || 50) + (margensCustomizadas?.sectionSides || 0);
  
  // Título padronizado
  doc.fillColor(cores.primaria || '#1e3a8a')
     .font(`${fonte}-Bold`).fontSize(14)
     .text('DADOS DO EXAME', marginsLeft, currentY);
  currentY += 18;
  
  // Card padronizado - altura dinâmica baseada no número de itens
  const cardHeight = Math.max(dadosExame.length * 16 + 24, 80);
  const cardWidth = pageWidth - marginsLeft - marginsRight;
  const isFolhaTimbrada = tipoTemplate === 'folha_timbrada';
  
  // ✨ APLICAR ESTILO PERSONALIZADO DA SEÇÃO
  applyAdvancedSectionStyle(doc, templateConfig, 'examInfo', marginsLeft, currentY, cardWidth, cardHeight);
  
  doc.font(fonte).fontSize(11).fillColor(cores.texto || '#222');
  
  // Exibir dados em layout organizado
  let infoX = marginsLeft + 12;
  let infoY = currentY + 12;
  
  dadosExame.forEach((item, idx) => {
    doc.font(`${fonte}-Bold`).text(item.label, infoX, infoY, { continued: true });
    doc.font(fonte).text(' ' + item.value, { continued: false });
    infoY += 16;
  });
  
  const finalY = currentY + cardHeight + 20;
  return finalY;
};

/**
 * Conclusão flat
 */
const addAdvancedConclusion = (doc, templateConfig, conclusao, startY) => {
  const { cores, fonte = 'Helvetica', margens, tipoTemplate, textStyles } = templateConfig;
  const pageWidth = doc.page.width;
  let currentY = startY + 10;
  
  // Para folha timbrada, usar textStyles.margins se disponível
  const margensCustomizadas = tipoTemplate === 'folha_timbrada' && textStyles?.margins 
    ? textStyles.margins 
    : margens;
  
  // Aplicar margens laterais customizadas
  const marginsLeft = (margensCustomizadas?.left || 50) + (margensCustomizadas?.sectionSides || 0);
  const marginsRight = (margensCustomizadas?.right || 50) + (margensCustomizadas?.sectionSides || 0);
  
  // Título padronizado
  doc.fillColor(cores.primaria || '#1e3a8a')
     .font(`${fonte}-Bold`).fontSize(14)
     .text('ANÁLISE E CONCLUSÃO', marginsLeft, currentY);
  currentY += 18;
  
  // Altura dinâmica baseada no tamanho da conclusão
  const textHeight = Math.max(conclusao.length / 6, 80); // Estimativa de altura baseada no texto
  const cardHeight = Math.min(textHeight + 40, 160); // Máximo de 160pt
  const cardWidth = pageWidth - marginsLeft - marginsRight;
  const isFolhaTimbrada = tipoTemplate === 'folha_timbrada';
  
  // ✨ APLICAR ESTILO PERSONALIZADO DA SEÇÃO
  applyAdvancedSectionStyle(doc, templateConfig, 'conclusion', marginsLeft, currentY, cardWidth, cardHeight);
  
  doc.font(fonte).fontSize(12).fillColor(cores.texto || '#222')
     .text(conclusao, marginsLeft + 12, currentY + 12, {
       width: cardWidth - 24,
       height: cardHeight - 24,
       align: 'justify',
       lineGap: 2
     });
  
  const finalY = currentY + cardHeight + 20;
  return finalY;
};

/**
 * Aplicar folha timbrada como fundo do PDF
 * @param {PDFDocument} doc - Documento PDF
 * @param {Object} templateConfig - Configuração do template
 */
const applyFolhaTimbradaBackground = (doc, templateConfig) => {
  if (templateConfig.tipoTemplate === 'folha_timbrada' && templateConfig.folhaTimbradaBuffer) {
    try {
      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      
      // Aplicar a folha timbrada como fundo da página inteira
      doc.image(templateConfig.folhaTimbradaBuffer, 0, 0, {
        width: pageWidth,
        height: pageHeight,
        fit: [pageWidth, pageHeight]
      });
      
    } catch (error) {
      console.error('❌ [DEBUG] Erro ao aplicar folha timbrada:', error);
    }
  } else if (templateConfig.tipoTemplate === 'folha_timbrada' && !templateConfig.folhaTimbradaBuffer) {
    console.log('⚠️ [DEBUG] PROBLEMA: Tipo é folha_timbrada mas buffer não disponível');
    console.log('🔧 [DEBUG] Possíveis causas:');
    console.log('  1. S3Key não configurado:', !templateConfig.folhaTimbradaS3Key);
    console.log('  2. Erro ao baixar do S3');
    console.log('  3. Template sem folha timbrada configurada');
  } else if (templateConfig.tipoTemplate === 'folha_timbrada') {
    console.log('⚠️ [DEBUG] Tipo é folha_timbrada mas buffer não disponível (condição geral)');
  } else {
    console.log(`ℹ️ [DEBUG] Não é folha timbrada. Tipo: ${templateConfig.tipoTemplate}`);
  }
};

/**
 * Seção de verificação de autenticidade flat
 */
const addAdvancedAuthSection = (doc, templateConfig, publicLink, startY) => {
  const { cores, fonte, margens, tipoTemplate, textStyles } = templateConfig;
  
  // Para folha timbrada, usar textStyles.margins se disponível
  const margensCustomizadas = tipoTemplate === 'folha_timbrada' && textStyles?.margins 
    ? textStyles.margins 
    : margens;
  
  // Para folha timbrada, subir a seção de autenticação
  const extraSpaceForFolhaTimbrada = tipoTemplate === 'folha_timbrada' ? 80 : 0; // 80px mais para cima
  const adjustedStartY = startY - extraSpaceForFolhaTimbrada;
  
  const pageWidth = doc.page.width;
  let currentY = adjustedStartY + 10;
  // Título padronizado e encoding correto
  doc.fillColor(cores.secundaria || '#3b82f6')
     .font(`${fonte}-Bold`).fontSize(12)
     .text('VERIFICAÇÃO DE AUTENTICIDADE', margensCustomizadas?.left || 50, currentY);
  currentY += 16;
  // QR Code
  if (publicLink) {
    // Gera QR code em base64 e desenha no PDF
    QRCode.toDataURL(publicLink, { margin: 0, width: 80 }, (err, url) => {
      if (!err && url) {
        const base64Data = url.replace(/^data:image\/png;base64,/, '');
        const imgBuffer = Buffer.from(base64Data, 'base64');
        doc.image(imgBuffer, margensCustomizadas?.left || 50, currentY, { width: 60, height: 60 });
      }
    });
    doc.font(fonte).fontSize(10).fillColor(cores.texto || '#222')
      .text(publicLink, (margensCustomizadas?.left || 50) + 70, currentY + 20, {
        width: pageWidth - (margensCustomizadas?.left || 50) - (margensCustomizadas?.right || 50) - 80,
        align: 'left'
      });
    currentY += 70;
  }
  return currentY + 10;
};

/**
 * Aplicar estilos de texto para folha timbrada simplificada
 * @param {PDFDocument} doc - Documento PDF
 * @param {Object} textStyles - Estilos de texto simplificados
 * @param {string} textType - Tipo de texto (title, subtitle, body, small)
 * @param {string} colorType - Tipo de cor (primary, secondary, text, accent)
 */
const applySimplifiedTextStyles = (doc, textStyles, textType = 'body', colorType = 'text') => {
  if (!textStyles) return;
  
  try {
    // Aplicar tamanho da fonte
    if (textStyles.fonts && textStyles.fonts[textType]) {
      const fontSize = textStyles.fonts[textType];
      doc.fontSize(fontSize);
    }
    
    // Aplicar cor do texto
    if (textStyles.colors && textStyles.colors[colorType]) {
      const color = textStyles.colors[colorType];
      doc.fillColor(color);
    }
    
    // Aplicar peso da fonte se disponível
    if (textStyles.layout && textStyles.layout.fontWeight) {
      const fontWeight = textStyles.layout.fontWeight;
      const currentFont = doc._font ? doc._font.name : 'Helvetica';
      
      let fontName = currentFont;
      if (fontWeight === 'bold') {
        fontName = currentFont.includes('Bold') ? currentFont : `${currentFont}-Bold`;
      } else if (fontWeight === 'lighter') {
        fontName = currentFont.replace('-Bold', '');
      }
      
      try {
        doc.font(fontName);
      } catch (fontError) {
        console.warn(`⚠️ [DEBUG] Fonte ${fontName} não encontrada, mantendo atual`);
      }
    }
    
  } catch (error) {
    console.error('❌ [DEBUG] Erro ao aplicar estilos simplificados:', error);
  }
};

/**
 * Obter configurações de espaçamento para folha timbrada simplificada
 * @param {Object} textStyles - Estilos de texto simplificados
 * @returns {Object} Configurações de espaçamento
 */
const getSimplifiedSpacing = (textStyles) => {
  if (!textStyles || !textStyles.spacing) {
    return {
      lineHeight: 1.4,
      paragraphSpacing: 12,
      sectionSpacing: 20
    };
  }
  
  return {
    lineHeight: textStyles.spacing.lineHeight || 1.4,
    paragraphSpacing: textStyles.spacing.paragraphSpacing || 12,
    sectionSpacing: textStyles.spacing.sectionSpacing || 20
  };
};

/**
 * Verificar se deve usar folha timbrada simplificada
 * @param {Object} templateConfig - Configuração do template
 * @returns {boolean} True se deve usar folha simplificada
 */
const shouldUseSimplifiedLayout = (templateConfig) => {
  // CORREÇÃO: Usar layout simplificado se é folha timbrada, independente de textStyles
  // Se não tem textStyles, usar configuração padrão para folha timbrada
  const deveUsar = (templateConfig.tipoTemplate === 'folha_timbrada');
  
  return deveUsar;
};

/**
 * Renderizar texto com estilos simplificados para folha timbrada
 * @param {PDFDocument} doc - Documento PDF
 * @param {string} text - Texto a ser renderizado
 * @param {number} x - Posição X
 * @param {number} y - Posição Y
 * @param {Object} options - Opções de renderização
 * @param {Object} textStyles - Estilos de texto simplificados
 * @param {string} textType - Tipo de texto (title, subtitle, body, small)
 * @param {string} colorType - Tipo de cor (primary, secondary, text, accent)
 * @returns {number} Nova posição Y após o texto
 */
const renderSimplifiedText = (doc, text, x, y, options = {}, textStyles, textType = 'body', colorType = 'text') => {
  // Aplicar estilos simplificados
  applySimplifiedTextStyles(doc, textStyles, textType, colorType);
  
  // Obter configurações de espaçamento
  const spacing = getSimplifiedSpacing(textStyles);
  
  // Configurações de texto com espaçamento
  const textOptions = {
    lineGap: spacing.paragraphSpacing / 2,
    align: textStyles?.layout?.alignment || 'left',
    ...options
  };
  
  // Aplicar opacidade se definida
  if (textStyles?.layout?.opacity && textStyles.layout.opacity < 1.0) {
    doc.opacity(textStyles.layout.opacity);
  }
  
  // Renderizar o texto
  doc.text(text, x, y, textOptions);
  
  // Restaurar opacidade
  if (textStyles?.layout?.opacity && textStyles.layout.opacity < 1.0) {
    doc.opacity(1.0);
  }
  
  // Calcular nova posição Y baseada no tipo de texto e espaçamento
  let newY = y;
  if (textType === 'title') {
    newY += spacing.sectionSpacing;
  } else if (textType === 'subtitle') {
    newY += spacing.sectionSpacing * 0.7;
  } else {
    newY += spacing.paragraphSpacing;
  }
  
  return newY;
};

module.exports = {
  getTemplateConfig,
  applyTemplateConfig,
  applyFolhaTimbradaBackground,
  addAdvancedHeader,
  addAdvancedFooter,
  addAdvancedPatientInfo,
  addAdvancedExamInfo,
  addAdvancedConclusion,
  addAdvancedAuthSection,
  applyTextStyles,
  getTemplateStyles,
  shouldShowElement,
  applyAdvancedSectionStyle,
  calculateElementPosition,
  // Novas funções para folha timbrada simplificada
  applySimplifiedTextStyles,
  getSimplifiedSpacing,
  shouldUseSimplifiedLayout,
  renderSimplifiedText
};