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
  const getElementPosition = (elementId) => {
    const defaultPositions = {
      logo: { x: 50, y: 20, width: 120, height: 60 },
      title: { x: 200, y: 30, width: 400, height: 50 },
      patientInfo: { x: 50, y: 120, width: 350, height: 100 },
      content: { x: 50, y: 250, width: 500, height: 200 },
      signature: { x: 400, y: 480, width: 200, height: 80 },
      qrcode: { x: 50, y: 500, width: 100, height: 100 },
      footer: { x: 50, y: 620, width: 500, height: 60 }
    };

    return templateConfig.customPositions?.[elementId] || defaultPositions[elementId];
  };

  // Função para verificar se elemento deve ser mostrado
  const isElementVisible = (elementId) => {
    const visibilityMap = {
      logo: templateConfig.layout?.mostrarLogo ?? true,
      title: true,
      patientInfo: templateConfig.layout?.mostrarDadosPaciente ?? true,
      content: true,
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
      nomeModelo = 'Template Personalizado'
    } = templateConfig;

    // Usar logo preview se disponível, senão usar logoUrl
    const currentLogo = logoPreview || logoUrl;

    // Definir proporções A4 (210mm x 297mm = ratio ~1:1.414)
    const pageWidth = 650; // largura fixa em pixels
    const pageHeight = 920; // altura proporcional A4

    const html = `
      <div style="
        position: relative;
        width: ${pageWidth}px;
        height: ${pageHeight}px;
        background-color: ${cores.fundo || '#ffffff'};
        margin: 0 auto;
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        border-radius: 8px;
        overflow: hidden;
        font-family: ${fonte === 'Helvetica' ? 'Arial, sans-serif' : fonte === 'Times-Roman' ? 'Times New Roman, serif' : 'Courier New, monospace'};
        color: ${cores.texto || '#1f2937'};
      ">
        ${isElementVisible('logo') && currentLogo ? `
          <div style="
            position: absolute;
            left: ${getElementPosition('logo').x}px;
            top: ${getElementPosition('logo').y}px;
            width: ${getElementPosition('logo').width}px;
            height: ${getElementPosition('logo').height}px;
            z-index: ${getElementPosition('logo').zIndex || 10};
          ">
            <img src="${currentLogo}" alt="Logo" style="
              width: 100%;
              height: 100%;
              object-fit: contain;
              border-radius: 4px;
            " />
          </div>
        ` : isElementVisible('logo') && !currentLogo ? `
          <div style="
            position: absolute;
            left: ${getElementPosition('logo').x}px;
            top: ${getElementPosition('logo').y}px;
            width: ${getElementPosition('logo').width}px;
            height: ${getElementPosition('logo').height}px;
            z-index: ${getElementPosition('logo').zIndex || 10};
            border: 2px dashed ${cores.secundaria || '#64748b'};
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: rgba(0,0,0,0.05);
            font-size: 12px;
            color: ${cores.secundaria || '#64748b'};
          ">
            LOGO
          </div>
        ` : ''}

        ${isElementVisible('title') ? `
          <div style="
            position: absolute;
            left: ${getElementPosition('title').x}px;
            top: ${getElementPosition('title').y}px;
            width: ${getElementPosition('title').width}px;
            height: ${getElementPosition('title').height}px;
            z-index: ${getElementPosition('title').zIndex || 5};
            display: flex;
            align-items: center;
            justify-content: ${layout.alinhamentoTitulo || 'center'};
          ">
            <h1 style="
              margin: 0;
              font-size: ${tamanhoFonte.titulo || 16}px;
              font-weight: bold;
              color: ${cores.primaria || '#2563eb'};
            ">
              ELETROCARDIOGRAMA
            </h1>
          </div>
        ` : ''}

        ${isElementVisible('patientInfo') ? `
          <div style="
            position: absolute;
            left: ${getElementPosition('patientInfo').x}px;
            top: ${getElementPosition('patientInfo').y}px;
            width: ${getElementPosition('patientInfo').width}px;
            height: ${getElementPosition('patientInfo').height}px;
            z-index: ${getElementPosition('patientInfo').zIndex || 5};
            padding: 10px;
            border: 1px solid ${cores.secundaria || '#64748b'};
            border-radius: 4px;
            background-color: rgba(0,0,0,0.02);
          ">
            <h3 style="
              margin: 0 0 10px 0;
              font-size: ${tamanhoFonte.subtitulo || 14}px;
              color: ${cores.secundaria || '#64748b'};
              font-weight: bold;
            ">
              DADOS DO PACIENTE
            </h3>
            <div style="
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 5px;
              font-size: ${tamanhoFonte.base || 11}px;
              line-height: 1.4;
            ">
              <div><strong>Nome:</strong> João da Silva</div>
              <div><strong>Data Nasc.:</strong> 15/03/1980</div>
              <div><strong>CPF:</strong> 123.456.789-00</div>
              <div><strong>Convênio:</strong> Particular</div>
            </div>
          </div>
        ` : ''}

        ${isElementVisible('content') ? `
          <div style="
            position: absolute;
            left: ${getElementPosition('content').x}px;
            top: ${getElementPosition('content').y}px;
            width: ${getElementPosition('content').width}px;
            height: ${getElementPosition('content').height}px;
            z-index: ${getElementPosition('content').zIndex || 1};
            padding: 15px;
            border-radius: 4px;
            background-color: ${cores.primaria || '#2563eb'};
            color: white;
          ">
            <h2 style="
              margin: 0 0 10px 0;
              font-size: ${tamanhoFonte.subtitulo || 14}px;
              font-weight: bold;
            ">
              ANÁLISE E CONCLUSÃO
            </h2>
            <p style="
              margin: 0 0 10px 0;
              font-size: ${tamanhoFonte.base || 11}px;
              line-height: 1.5;
            ">
              Traçado eletrocardiográfico normal para a idade. Ritmo sinusal regular.
              Frequência cardíaca: 72 bpm. Eixo elétrico normal.
            </p>
            <p style="
              margin: 0;
              font-size: ${tamanhoFonte.base || 11}px;
              line-height: 1.5;
              font-weight: bold;
            ">
              CONCLUSÃO: Eletrocardiograma dentro dos limites da normalidade.
            </p>
          </div>
        ` : ''}

        ${isElementVisible('signature') ? `
          <div style="
            position: absolute;
            left: ${getElementPosition('signature').x}px;
            top: ${getElementPosition('signature').y}px;
            width: ${getElementPosition('signature').width}px;
            height: ${getElementPosition('signature').height}px;
            z-index: ${getElementPosition('signature').zIndex || 5};
            text-align: center;
            padding: 10px;
            border-top: 1px solid ${cores.secundaria || '#64748b'};
          ">
            <div style="
              font-size: ${tamanhoFonte.base || 11}px;
              color: ${cores.texto || '#1f2937'};
              line-height: 1.4;
            ">
              <div style="margin-bottom: 5px;">
                <strong>Dr. Maria Santos</strong>
              </div>
              <div style="margin-bottom: 5px;">
                CRM: 12345-SP
              </div>
              <div style="font-size: 10px; color: ${cores.secundaria || '#64748b'};">
                Assinado digitalmente em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}
              </div>
            </div>
          </div>
        ` : ''}

        ${isElementVisible('qrcode') ? `
          <div style="
            position: absolute;
            left: ${getElementPosition('qrcode').x}px;
            top: ${getElementPosition('qrcode').y}px;
            width: ${getElementPosition('qrcode').width}px;
            height: ${getElementPosition('qrcode').height}px;
            z-index: ${getElementPosition('qrcode').zIndex || 5};
            text-align: center;
          ">
            ${qrCodeUrl ? `
              <img src="${qrCodeUrl}" alt="QR Code" style="
                width: ${getElementPosition('qrcode').width}px;
                height: ${getElementPosition('qrcode').height}px;
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
                background-color: rgba(0,0,0,0.05);
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

        ${isElementVisible('footer') && rodapeTexto ? `
          <div style="
            position: absolute;
            left: ${getElementPosition('footer').x}px;
            top: ${getElementPosition('footer').y}px;
            width: ${getElementPosition('footer').width}px;
            height: ${getElementPosition('footer').height}px;
            z-index: ${getElementPosition('footer').zIndex || 1};
            padding: 10px;
            border-top: 1px solid ${cores.secundaria || '#64748b'};
            background-color: rgba(0,0,0,0.02);
            border-radius: 0 0 4px 4px;
          ">
            <div style="
              font-size: ${tamanhoFonte.base || 11}px;
              color: ${cores.texto || '#1f2937'};
              text-align: center;
              line-height: 1.4;
            ">
              ${rodapeTexto}
            </div>
          </div>
        ` : ''}
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
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
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
        </div>

        {/* Preview Content */}
        <div className="p-6 overflow-auto max-h-[calc(95vh-200px)] bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="flex justify-center">
            <div 
              dangerouslySetInnerHTML={{ __html: generatePreviewHtml() }}
              className="transition-all duration-300"
            />
          </div>
          
          {/* Dicas */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-4xl mx-auto">
            <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
              <FaEye />
              Preview com Posições Personalizadas
            </h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Este preview mostra exatamente como os elementos aparecerão no PDF final</li>
              <li>• As posições e tamanhos dos elementos refletem suas configurações no editor visual</li>
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
