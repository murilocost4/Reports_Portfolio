import React, { useState, useEffect } from 'react';
import { FaDownload, FaEye, FaTimes, FaImage, FaFileAlt, FaQrcode } from 'react-icons/fa';

const TemplatePDFPreview = ({ templateConfig, logoPreview, onClose }) => {
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  useEffect(() => {
    // Gerar QR Code de exemplo
    const sampleQRData = encodeURIComponent('https://reports.exemplo.com/verificar/12345');
    setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${sampleQRData}`);
  }, []);

    // Função para obter posições dos elementos (usar customPositions ou padrão)
  // IMPORTANTE: Estas posições devem ser EXATAMENTE as mesmas do VisualLayoutEditor
  const getElementPosition = (elementId) => {
    const defaultPositions = {
      header: { x: 10, y: 10, width: 530, height: 60, zIndex: 5 },
      logo: { x: 20, y: 20, width: 80, height: 30, zIndex: 10 },
      title: { x: 110, y: 25, width: 300, height: 30, zIndex: 10 },
      patientInfo: { x: 20, y: 80, width: 510, height: 85, zIndex: 5 },
      examInfo: { x: 20, y: 175, width: 510, height: 75, zIndex: 5 },
      content: { x: 20, y: 260, width: 510, height: 120, zIndex: 1 },
      signature: { x: 300, y: 390, width: 230, height: 80, zIndex: 5 },
      qrcode: { x: 20, y: 390, width: 70, height: 70, zIndex: 5 },
      footer: { x: 20, y: 480, width: 510, height: 25, zIndex: 1 }
    };

    const position = templateConfig.customPositions?.[elementId] || defaultPositions[elementId];
    
    // Verificação de segurança para evitar erros
    if (!position) {
      console.warn(`Posição não encontrada para elemento: ${elementId}`);
      return { x: 0, y: 0, width: 100, height: 50, zIndex: 1 };
    }
    
    return position;
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

  const generatePreviewHtml = () => {
    const {
      cores = {},
      layout = {},
      fonte = 'Helvetica',
      tamanhoFonte = {},
      margens = {},
      rodapeTexto = '',
      logoUrl = null,
      nomeModelo = 'Template Personalizado',
      estilosSecao = {},
      tipoTemplate = 'personalizado',
      folhaTimbradaUrl = null,
      folhaTimbradaConfig = {}
    } = templateConfig;

    // Função para obter estilo de um elemento
    const getElementStyle = (elementId) => {
      const defaultStyles = {
        header: { corFundo: '#f8fafc', corBorda: '#e2e8f0', larguraBorda: 1, tipoLinha: 'solid', raioCantos: 8, padding: 16 },
        patientInfo: { corFundo: '#ffffff', corBorda: '#d1d5db', larguraBorda: 1, tipoLinha: 'solid', raioCantos: 6, padding: 12, sombra: true },
        examInfo: { corFundo: '#f9fafb', corBorda: '#d1d5db', larguraBorda: 1, tipoLinha: 'solid', raioCantos: 6, padding: 12, sombra: false },
        content: { corFundo: '#ffffff', corBorda: '#e5e7eb', larguraBorda: 0, tipoLinha: 'solid', raioCantos: 0, padding: 16, sombra: false },
        signature: { corFundo: '#f9fafb', corBorda: '#9ca3af', larguraBorda: 1, tipoLinha: 'solid', raioCantos: 4, padding: 12, sombra: false },
        footer: { corFundo: '#f1f5f9', corBorda: '#cbd5e1', larguraBorda: 1, tipoLinha: 'solid', raioCantos: 6, padding: 10, sombra: false }
      };
      
      return estilosSecao[elementId] || defaultStyles[elementId] || {};
    };

    // Função para gerar CSS de estilo a partir da configuração
    const generateElementStyleCSS = (elementId) => {
      const style = getElementStyle(elementId);
      const {
        corFundo = '#ffffff',
        corBorda = '#e5e7eb',
        larguraBorda = 0,
        tipoLinha = 'solid',
        raioCantos = 0,
        padding = 10,
        sombra = false,
        gradiente = false,
        corGradiente1 = '#3b82f6',
        corGradiente2 = '#8b5cf6'
      } = style;

      let css = `
        background-color: ${corFundo};
        border: ${larguraBorda}px ${tipoLinha} ${corBorda};
        border-radius: ${raioCantos}px;
        padding: ${padding}px;
      `;

      if (gradiente && elementId === 'header') {
        css += `background: linear-gradient(135deg, ${corGradiente1}, ${corGradiente2});`;
      }

      if (sombra) {
        css += `box-shadow: 0 2px 8px rgba(0,0,0,0.1);`;
      }

      return css;
    };

    // Usar logo preview se disponível, senão usar logoUrl
    const currentLogo = logoPreview || logoUrl;

    // Definir proporções menores para o preview caber melhor
    const pageWidth = 550; 
    const pageHeight = 700;

    // Cor do título configurável
    const corTitulo = cores.corTitulo || '#1e293b';

    // Configuração da folha timbrada
    const isFolhaTimbrada = tipoTemplate === 'folha_timbrada' && folhaTimbradaUrl;
    const folhaConfig = folhaTimbradaConfig || {};
    const margemEsquerda = folhaConfig.margemEsquerda || 20;
    const margemTopo = folhaConfig.margemTopo || 20;
    const margemDireita = folhaConfig.margemDireita || 20;
    const margemInferior = folhaConfig.margemInferior || 20;
    
    // Ajustar área útil quando folha timbrada está ativa
    const areaUtil = isFolhaTimbrada ? {
      x: margemEsquerda,
      y: margemTopo,
      width: pageWidth - margemEsquerda - margemDireita,
      height: pageHeight - margemTopo - margemInferior
    } : {
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight
    };

    const html = `
      <div style="
        position: relative;
        width: ${pageWidth}px;
        height: ${pageHeight}px;
        background-color: ${isFolhaTimbrada ? 'transparent' : (cores.fundo || '#ffffff')};
        margin: 0 auto;
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        border-radius: 8px;
        overflow: hidden;
        font-family: ${fonte === 'Helvetica' ? 'Arial, sans-serif' : fonte === 'Times-Roman' ? 'Times New Roman, serif' : 'Courier New, monospace'};
        color: ${cores.texto || '#1f2937'};
      ">
        ${isFolhaTimbrada && folhaTimbradaUrl ? `
          <!-- Imagem de fundo da folha timbrada -->
          <img 
            src="${folhaTimbradaUrl}" 
            alt="Folha Timbrada"
            style="
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              object-fit: cover;
              z-index: 0;
            "
          />
        ` : ''}
        
        <!-- Conteúdo sobre a folha timbrada -->
        <div style="
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          height: 100%;
          z-index: 1;
          background: none;
        ">
        ${isElementVisible('header') && (!isFolhaTimbrada || !folhaConfig.ocultarCabecalho) ? `
          <div style="
            position: absolute;
            left: ${isFolhaTimbrada ? areaUtil.x + getElementPosition('header').x : getElementPosition('header').x}px;
            top: ${isFolhaTimbrada ? areaUtil.y + getElementPosition('header').y : getElementPosition('header').y}px;
            width: ${getElementPosition('header').width}px;
            height: ${getElementPosition('header').height}px;
            z-index: ${getElementPosition('header').zIndex || 5};
            ${isFolhaTimbrada ? '' : generateElementStyleCSS('header')}
            ${isFolhaTimbrada ? 'background: none; border-radius: 6px; padding: 12px;' : ''}
            display: flex;
            align-items: center;
            justify-content: ${getElementStyle('header').alinhamentoTexto || 'center'};
          ">
            ${getElementStyle('header').mostrarTextoPersonalizado && getElementStyle('header').textoPersonalizado ? 
              `<div style="font-weight: bold; color: ${cores.primaria || '#2563eb'};">${getElementStyle('header').textoPersonalizado}</div>` :
              `<div style="font-weight: bold; color: ${cores.primaria || '#2563eb'};">CABEÇALHO PERSONALIZADO</div>`
            }
          </div>
        ` : ''}

        ${isElementVisible('logo') && currentLogo && (!isFolhaTimbrada || !folhaConfig.ocultarLogo) ? `
          <div style="
            position: absolute;
            left: ${isFolhaTimbrada ? areaUtil.x + getElementPosition('logo').x : getElementPosition('logo').x}px;
            top: ${isFolhaTimbrada ? areaUtil.y + getElementPosition('logo').y : getElementPosition('logo').y}px;
            width: ${getElementPosition('logo').width}px;
            height: ${getElementPosition('logo').height}px;
            z-index: ${getElementPosition('logo').zIndex || 10};
            ${isFolhaTimbrada ? 'background: none; border-radius: 4px; padding: 4px;' : ''}
          ">
            <img src="${currentLogo}" alt="Logo" style="
              width: 100%;
              height: 100%;
              object-fit: contain;
              border-radius: 4px;
            " />
          </div>
        ` : isElementVisible('logo') && !currentLogo && (!isFolhaTimbrada || !folhaConfig.ocultarLogo) ? `
          <div style="
            position: absolute;
            left: ${isFolhaTimbrada ? areaUtil.x + getElementPosition('logo').x : getElementPosition('logo').x}px;
            top: ${isFolhaTimbrada ? areaUtil.y + getElementPosition('logo').y : getElementPosition('logo').y}px;
            width: ${getElementPosition('logo').width}px;
            height: ${getElementPosition('logo').height}px;
            z-index: ${getElementPosition('logo').zIndex || 10};
            border: 2px dashed ${cores.secundaria || '#64748b'};
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: none;
            font-size: 12px;
            color: ${cores.secundaria || '#64748b'};
          ">
            LOGO
          </div>
        ` : ''}

        ${isElementVisible('title') ? `
          <div style="
            position: absolute;
            left: ${isFolhaTimbrada ? areaUtil.x + getElementPosition('title').x : getElementPosition('title').x}px;
            top: ${isFolhaTimbrada ? areaUtil.y + getElementPosition('title').y : getElementPosition('title').y}px;
            width: ${getElementPosition('title').width}px;
            height: ${getElementPosition('title').height}px;
            z-index: ${getElementPosition('title').zIndex || 5};
            display: flex;
            align-items: center;
            justify-content: ${layout.alinhamentoTitulo || 'center'};
            ${isFolhaTimbrada ? 'background: none; border-radius: 6px; padding: 8px;' : ''}
          ">
            <h1 style="
              margin: 0;
              font-size: ${tamanhoFonte.titulo || 16}px;
              font-weight: bold;
              color: ${corTitulo};
              ${isFolhaTimbrada ? 'text-shadow: 1px 1px 2px rgba(0,0,0,0.1);' : ''}
            ">
              ELETROCARDIOGRAMA
            </h1>
          </div>
        ` : ''}

        ${isElementVisible('patientInfo') ? `
          <div style="
            position: absolute;
            left: ${isFolhaTimbrada ? areaUtil.x + getElementPosition('patientInfo').x : getElementPosition('patientInfo').x}px;
            top: ${isFolhaTimbrada ? areaUtil.y + getElementPosition('patientInfo').y : getElementPosition('patientInfo').y}px;
            width: ${getElementPosition('patientInfo').width}px;
            height: ${getElementPosition('patientInfo').height}px;
            z-index: ${getElementPosition('patientInfo').zIndex || 5};
            ${isFolhaTimbrada ? 'background: none; border-radius: 8px; padding: 16px;' : generateElementStyleCSS('patientInfo')}
          ">
            <h3 style="
              margin: 0 0 12px 0;
              font-size: ${tamanhoFonte.subtitulo || 14}px;
              color: ${cores.primaria || '#2563eb'};
              font-weight: bold;
              border-bottom: 2px solid ${cores.primaria || '#2563eb'};
              padding-bottom: 4px;
            ">
              DADOS DO PACIENTE
            </h3>
            <div style="
              font-size: ${tamanhoFonte.base || 11}px;
              color: ${cores.texto || '#1f2937'};
              line-height: 1.6;
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 8px 16px;
            ">
              <div><strong>Nome:</strong> Maria Silva Santos</div>
              <div><strong>CPF:</strong> 123.456.789-00</div>
              <div><strong>Data de Nascimento:</strong> 15/03/1985</div>
              <div><strong>Idade:</strong> 38 anos</div>
              <div><strong>Telefone:</strong> (11) 99999-8888</div>
              <div><strong>Email:</strong> maria.santos@email.com</div>
              <div style="grid-column: 1 / -1;"><strong>Endereço:</strong> Rua das Flores, 123 - Centro - São Paulo/SP - CEP: 01234-567</div>
            </div>
          </div>
        ` : ''}

        ${isElementVisible('examInfo') ? `
          <div style="
            position: absolute;
            left: ${isFolhaTimbrada ? areaUtil.x + getElementPosition('examInfo').x : getElementPosition('examInfo').x}px;
            top: ${isFolhaTimbrada ? areaUtil.y + getElementPosition('examInfo').y : getElementPosition('examInfo').y}px;
            width: ${getElementPosition('examInfo').width}px;
            height: ${getElementPosition('examInfo').height}px;
            z-index: ${getElementPosition('examInfo').zIndex || 5};
            ${isFolhaTimbrada ? 'background: none; border-radius: 8px; padding: 16px;' : generateElementStyleCSS('examInfo')}
          ">
            <h3 style="
              margin: 0 0 12px 0;
              font-size: ${tamanhoFonte.subtitulo || 14}px;
              color: ${cores.primaria || '#2563eb'};
              font-weight: bold;
              border-bottom: 2px solid ${cores.primaria || '#2563eb'};
              padding-bottom: 4px;
            ">
              INFORMAÇÕES DO EXAME
            </h3>
            <div style="
              font-size: ${tamanhoFonte.base || 11}px;
              color: ${cores.texto || '#1f2937'};
              line-height: 1.6;
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 8px 16px;
            ">
              <div><strong>Data do Exame:</strong> ${new Date().toLocaleDateString('pt-BR')}</div>
              <div><strong>Status:</strong> Laudo realizado</div>
              <div style="grid-column: 1 / -1;"><strong>Observações:</strong> Exame realizado com o paciente em repouso, sem intercorrências durante o procedimento.</div>
            </div>
            </div>
          </div>
        ` : ''}

        ${isElementVisible('content') ? `
          <div style="
            position: absolute;
            left: ${isFolhaTimbrada ? areaUtil.x + getElementPosition('content').x : getElementPosition('content').x}px;
            top: ${isFolhaTimbrada ? areaUtil.y + getElementPosition('content').y : getElementPosition('content').y}px;
            width: ${getElementPosition('content').width}px;
            height: ${getElementPosition('content').height}px;
            z-index: ${getElementPosition('content').zIndex || 1};
            ${isFolhaTimbrada ? 'background: none; border-radius: 8px; padding: 20px;' : generateElementStyleCSS('content')}
            color: ${cores.texto || '#1f2937'};
          ">
            <div style="
              background: none;
              border-left: 4px solid ${cores.primaria || '#2563eb'};
              border-radius: 6px;
              padding: 15px;
              margin-top: 0;
              font-size: ${tamanhoFonte.base || 11}px;
              line-height: 1.6;
            ">
              <h4 style="
                margin: 0 0 10px 0;
                color: ${cores.primaria || '#2563eb'};
                font-size: ${tamanhoFonte.base + 1 || 12}px;
                font-weight: bold;
              ">CONCLUSÃO:</h4>
              <p style="margin: 0; font-weight: 500;">
                Eletrocardiograma dentro dos limites da normalidade para a faixa etária. Ritmo sinusal com frequência cardíaca normal.
              </p>
            </div>
          </div>
        ` : ''}

        ${isElementVisible('signature') ? `
          <div style="
            position: absolute;
            left: ${isFolhaTimbrada ? areaUtil.x + getElementPosition('signature').x : getElementPosition('signature').x}px;
            top: ${isFolhaTimbrada ? areaUtil.y + getElementPosition('signature').y : getElementPosition('signature').y}px;
            width: ${getElementPosition('signature').width}px;
            height: ${getElementPosition('signature').height}px;
            z-index: ${getElementPosition('signature').zIndex || 5};
            text-align: center;
            ${isFolhaTimbrada ? 'background: none; border-radius: 8px; padding: 16px;' : generateElementStyleCSS('signature')}
          ">
            <div style="
              border-top: 2px solid ${cores.primaria || '#2563eb'};
              padding-top: 12px;
              font-size: ${tamanhoFonte.base || 11}px;
              color: ${cores.texto || '#1f2937'};
              line-height: 1.5;
            ">
              <div style="margin-bottom: 8px; font-weight: bold; font-size: ${tamanhoFonte.base + 1 || 12}px;">
                <strong>Dr. Maria Santos</strong>
              </div>
              <div style="margin-bottom: 6px; font-size: ${tamanhoFonte.base || 11}px;">
                CRM: 12345-SP | Cardiologia
              </div>
              <div style="margin: 12px 0 0 0; min-height: 32px;">
                <span style="color: #64748b; font-size: 10px;">[Carimbo/Assinatura Digital]</span>
              </div>
            </div>
          </div>
        ` : ''}

        ${isElementVisible('qrcode') ? `
          <div style="
            position: absolute;
            left: ${isFolhaTimbrada ? areaUtil.x + getElementPosition('qrcode').x : getElementPosition('qrcode').x}px;
            top: ${isFolhaTimbrada ? areaUtil.y + getElementPosition('qrcode').y : getElementPosition('qrcode').y}px;
            width: ${getElementPosition('qrcode').width}px;
            height: ${getElementPosition('qrcode').height}px;
            z-index: ${getElementPosition('qrcode').zIndex || 5};
            text-align: center;
            ${isFolhaTimbrada ? 'background: none; border-radius: 6px; padding: 8px;' : ''}
            ${getElementStyle('qrcode').bordaPersonalizada ? 
              `border: ${getElementStyle('qrcode').larguraBorda || 1}px solid ${getElementStyle('qrcode').corBorda || '#e2e8f0'}; border-radius: 4px;` : 
              ''
            }
          ">
            ${qrCodeUrl ? `
              <img src="${qrCodeUrl}" alt="QR Code" style="
                width: ${Math.max(getElementPosition('qrcode').width, getElementStyle('qrcode').tamanhoMinimo || 50)}px;
                height: ${Math.max(getElementPosition('qrcode').height, getElementStyle('qrcode').tamanhoMinimo || 50)}px;
                max-width: ${getElementStyle('qrcode').tamanhoMaximo || 200}px;
                max-height: ${getElementStyle('qrcode').tamanhoMaximo || 200}px;
                object-fit: contain;
              " />
            ` : `
              <div style="
                width: 100%;
                height: 100%;
                border: 2px dashed ${cores.secundaria || '#64748b'};
                border-radius: 4px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: none;
                font-size: 12px;
                color: ${cores.secundaria || '#64748b'};
              ">
                QR CODE
              </div>
            `}
            <div style="
              font-size: 8px;
              color: ${cores.texto || '#1f2937'};
              margin-top: 2px;
            ">
              Verificação
            </div>
          </div>
        ` : ''}

        ${isElementVisible('footer') && rodapeTexto && (!isFolhaTimbrada || !folhaConfig.ocultarRodape) ? `
          <div style="
            position: absolute;
            left: ${isFolhaTimbrada ? areaUtil.x + getElementPosition('footer').x : getElementPosition('footer').x}px;
            top: ${isFolhaTimbrada ? areaUtil.y + getElementPosition('footer').y : getElementPosition('footer').y}px;
            width: ${getElementPosition('footer').width}px;
            height: ${getElementPosition('footer').height}px;
            z-index: ${getElementPosition('footer').zIndex || 1};
            ${isFolhaTimbrada ? 'background: none; border-radius: 6px; padding: 12px;' : generateElementStyleCSS('footer')}
            display: flex;
            align-items: center;
            justify-content: ${getElementStyle('footer').alinhamentoTexto || 'center'};
          ">
            <div style="
              font-size: ${tamanhoFonte.base || 11}px;
              color: ${cores.texto || '#1f2937'};
              text-align: ${getElementStyle('footer').alinhamentoTexto || 'center'};
              line-height: 1.4;
              width: 100%;
            ">
              ${rodapeTexto}
            </div>
          </div>
        ` : ''}
        </div>
      </div>
    `;

    return html;
  };

  const downloadPreview = () => {
    const previewHtml = generatePreviewHtml();
    const element = document.createElement('a');
    const file = new Blob([`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Preview Template - ${templateConfig.nomeModelo || 'Sem Nome'}</title>
          <style>
            body { 
              margin: 20px; 
              font-family: Arial, sans-serif; 
              background-color: #f5f5f5;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
            }
            .container { 
              background: white;
              padding: 20px;
              border-radius: 8px;
              box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            }
          </style>
        </head>
        <body>
          <div class="container">
            ${previewHtml}
          </div>
        </body>
      </html>
    `], { type: 'text/html' });
    
    element.href = URL.createObjectURL(file);
    element.download = `preview-template-${templateConfig.nomeModelo || 'template'}.html`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm backdrop-brightness-50 bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-7xl w-full max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-2xl font-bold flex items-center gap-3">
                <FaEye className="text-xl" />
                Preview do Template - Formato A4
              </h3>
              <p className="text-blue-100 mt-1">
                {templateConfig.nomeModelo || 'Template Sem Nome'} - Posições Personalizadas
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={downloadPreview}
                className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 flex items-center gap-2 transition-all"
              >
                <FaDownload />
                Baixar Preview
              </button>
              
              <button
                onClick={onClose}
                className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 flex items-center gap-2 transition-all"
              >
                <FaTimes />
                Fechar
              </button>
            </div>
          </div>
        </div>

        {/* Template Info */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <FaFileAlt className="text-blue-600" />
              <span className="font-medium">Tipo:</span>
              <span className="text-gray-600">
                {templateConfig.tipoTemplate === 'folha_timbrada' ? 'Folha Timbrada' : 'Personalizado'}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <FaFileAlt className="text-blue-600" />
              <span className="font-medium">Fonte:</span>
              <span className="text-gray-600">
                {templateConfig.fonte === 'Helvetica' ? 'Helvetica (Moderna)' : 
                 templateConfig.fonte === 'Times-Roman' ? 'Times Roman (Clássica)' : 
                 'Courier (Monoespaçada)'}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded-full border border-gray-300"
                style={{ backgroundColor: templateConfig.cores?.primaria || '#2563eb' }}
              />
              <span className="font-medium">Cor Principal:</span>
              <span className="text-gray-600 font-mono">{templateConfig.cores?.primaria || '#2563eb'}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <FaQrcode className="text-green-600" />
              <span className="font-medium">QR Code:</span>
              <span className="text-gray-600">
                {templateConfig.layout?.mostrarQrCode ? 'Ativado' : 'Desativado'}
              </span>
            </div>
          </div>
          
          {templateConfig.tipoTemplate === 'folha_timbrada' && templateConfig.folhaTimbradaUrl && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex items-center gap-2 text-sm">
                <FaImage className="text-purple-600" />
                <span className="font-medium">Folha Timbrada:</span>
                <span className="text-gray-600">Ativa</span>
                {templateConfig.folhaTimbradaConfig && (
                  <span className="text-gray-500 ml-2">
                    (Margens: {templateConfig.folhaTimbradaConfig.margemTopo || 20}px / {templateConfig.folhaTimbradaConfig.margemEsquerda || 20}px)
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Preview Content */}
        <div className="p-6 overflow-auto max-h-[calc(95vh-200px)] bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="flex justify-center">
            <div
              style={{
                position: 'relative',
                width: 550,
                height: 700,
                background: '#fff',
                borderRadius: 12,
                boxShadow: '0 8px 25px rgba(0,0,0,0.10)',
                border: '1.5px solid #e5e7eb',
                overflow: 'hidden',
                margin: '0 auto',
                display: 'block',
              }}
            >
              <div
                dangerouslySetInnerHTML={{ __html: generatePreviewHtml() }}
                style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' }}
              />
            </div>
          </div>
          
          {/* Dicas */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-4xl mx-auto">
            <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
              <FaEye />
              Preview com {templateConfig.tipoTemplate === 'folha_timbrada' ? 'Folha Timbrada' : 'Posições Personalizadas'}
            </h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Este preview mostra exatamente como os elementos aparecerão no PDF final</li>
              {templateConfig.tipoTemplate === 'folha_timbrada' ? (
                <>
                  <li>• A folha timbrada é exibida como plano de fundo do documento</li>
                  <li>• Os elementos de conteúdo são posicionados sobre a folha timbrada respeitando as margens configuradas</li>
                  <li>• Elementos com fundo semi-transparente garantem legibilidade sobre a imagem de fundo</li>
                </>
              ) : (
                <>
                  <li>• As posições e tamanhos dos elementos refletem suas configurações no editor visual</li>
                  <li>• Use o editor visual para ajustar a posição e tamanho de cada elemento</li>
                </>
              )}
              <li>• O formato A4 (210x297mm) é simulado proporcionalmente</li>
              <li>• O QR Code de verificação será gerado automaticamente nos laudos reais</li>
              <li>• Salve o template para aplicar essas configurações em todos os laudos</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplatePDFPreview;
