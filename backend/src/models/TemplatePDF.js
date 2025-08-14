const mongoose = require('mongoose');

const TemplatePDFSchema = new mongoose.Schema({
  tenant_id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  nomeModelo: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  // Configurações de cores
  cores: {
    primaria: {
      type: String,
      required: true,
      default: '#2563eb', // Azul padrão
      validate: {
        validator: function(v) {
          return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v);
        },
        message: 'Cor primária deve estar no formato hexadecimal (#RRGGBB ou #RGB)'
      }
    },
    corTitulo: {
      type: String,
      required: true,
      default: '#1e293b', // Cor específica para o título
      validate: {
        validator: function(v) {
          return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v);
        },
        message: 'Cor do título deve estar no formato hexadecimal (#RRGGBB ou #RGB)'
      }
    },
    secundaria: {
      type: String,
      required: true,
      default: '#64748b', // Cinza padrão
      validate: {
        validator: function(v) {
          return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v);
        },
        message: 'Cor secundária deve estar no formato hexadecimal (#RRGGBB ou #RGB)'
      }
    },
    texto: {
      type: String,
      required: true,
      default: '#1f2937', // Preto suave padrão
      validate: {
        validator: function(v) {
          return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v);
        },
        message: 'Cor do texto deve estar no formato hexadecimal (#RRGGBB ou #RGB)'
      }
    },
    fundo: {
      type: String,
      default: '#ffffff', // Branco padrão
      validate: {
        validator: function(v) {
          return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v);
        },
        message: 'Cor de fundo deve estar no formato hexadecimal (#RRGGBB ou #RGB)'
      }
    }
  },
  // Configurações de layout
  layout: {
    mostrarLogo: {
      type: Boolean,
      default: true
    },
    mostrarRodape: {
      type: Boolean,
      default: true
    },
    mostrarCabecalho: {
      type: Boolean,
      default: true
    },
    mostrarTitulo: {
      type: Boolean,
      default: true
    },
    mostrarDadosExame: {
      type: Boolean,
      default: true
    },
    alinhamentoTitulo: {
      type: String,
      enum: ['left', 'center', 'right'],
      default: 'center'
    },
    mostrarQrCode: {
      type: Boolean,
      default: true
    },
    mostrarDadosPaciente: {
      type: Boolean,
      default: true
    },
    mostrarDataAssinatura: {
      type: Boolean,
      default: true
    },
    mostrarCabecalhoCompleto: {
      type: Boolean,
      default: true
    }
  },
  // Logo da empresa
  logoUrl: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        if (!v) return true; // Logo é opcional
        return /^https?:\/\/.+/.test(v) || /^s3:\/\/.+/.test(v);
      },
      message: 'Logo URL deve ser uma URL válida (http/https) ou caminho S3'
    }
  },
  logoS3Key: {
    type: String,
    trim: true
  },
  logoS3Bucket: {
    type: String,
    trim: true
  },
  
  // Configurações de Folha Timbrada
  tipoTemplate: {
    type: String,
    enum: ['galeria', 'folha_timbrada', 'personalizado'],
    default: 'galeria'
  },
  templateGaleriaId: {
    type: String,
    enum: [
      'moderno_azul',
      'classico_cinza', 
      'elegante_verde',
      'profissional_roxo',
      'minimalista_preto',
      'executivo_preto'
    ],
    required: function() {
      return this.tipoTemplate === 'galeria';
    }
  },
  folhaTimbradaUrl: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        if (!v) return true; // Folha timbrada é opcional
        return /^https?:\/\/.+/.test(v) || /^s3:\/\/.+/.test(v);
      },
      message: 'Folha timbrada URL deve ser uma URL válida (http/https) ou caminho S3'
    }
  },
  folhaTimbradaS3Key: {
    type: String,
    trim: true
  },
  folhaTimbradaS3Bucket: {
    type: String,
    trim: true
  },
  folhaTimbradaConfig: {
    largura: {
      type: Number,
      default: 210, // A4 em mm
      min: 100,
      max: 300
    },
    altura: {
      type: Number,
      default: 297, // A4 em mm
      min: 100,
      max: 420
    },
    margemSuperior: {
      type: Number,
      default: 20,
      min: 0,
      max: 100
    },
    margemInferior: {
      type: Number,
      default: 20,
      min: 0,
      max: 100
    },
    margemEsquerda: {
      type: Number,
      default: 20,
      min: 0,
      max: 50
    },
    margemDireita: {
      type: Number,
      default: 20,
      min: 0,
      max: 50
    }
  },
  // Configurações de texto
  rodapeTexto: {
    type: String,
    trim: true,
    maxlength: 500,
    default: ''
  },
  fonte: {
    type: String,
    enum: ['Helvetica', 'Times-Roman', 'Courier'],
    default: 'Helvetica'
  },
  tamanhoFonte: {
    base: {
      type: Number,
      default: 11,
      min: 8,
      max: 16
    },
    titulo: {
      type: Number,
      default: 16,
      min: 12,
      max: 24
    },
    subtitulo: {
      type: Number,
      default: 14,
      min: 10,
      max: 20
    }
  },
  // Configurações avançadas
  margens: {
    top: {
      type: Number,
      default: 40,
      min: 10,
      max: 400, // Aumentado para permitir margens maiores em folha timbrada
      validate: {
        validator: function(value) {
          // Para folha timbrada, permitir margens maiores
          if (this.tipoTemplate === 'folha_timbrada') {
            return value >= 10 && value <= 400;
          }
          // Para outros templates, manter limite menor
          return value >= 10 && value <= 120;
        },
        message: 'Margem superior deve estar entre 10 e 400px para folha timbrada, ou 10-120px para outros templates'
      }
    },
    bottom: {
      type: Number,
      default: 40,
      min: 10,
      max: 400, // Aumentado para permitir margens maiores em folha timbrada
      validate: {
        validator: function(value) {
          // Para folha timbrada, permitir margens maiores
          if (this.tipoTemplate === 'folha_timbrada') {
            return value >= 10 && value <= 400;
          }
          // Para outros templates, manter limite menor
          return value >= 10 && value <= 120;
        },
        message: 'Margem inferior deve estar entre 10 e 400px para folha timbrada, ou 10-120px para outros templates'
      }
    },
    left: {
      type: Number,
      default: 40,
      min: 10,
      max: 400, // Aumentado para permitir margens maiores em folha timbrada
      validate: {
        validator: function(value) {
          // Para folha timbrada, permitir margens maiores
          if (this.tipoTemplate === 'folha_timbrada') {
            return value >= 10 && value <= 400;
          }
          // Para outros templates, manter limite menor
          return value >= 10 && value <= 120;
        },
        message: 'Margem esquerda deve estar entre 10 e 400px para folha timbrada, ou 10-120px para outros templates'
      }
    },
    right: {
      type: Number,
      default: 40,
      min: 10,
      max: 400, // Aumentado para permitir margens maiores em folha timbrada
      validate: {
        validator: function(value) {
          // Para folha timbrada, permitir margens maiores
          if (this.tipoTemplate === 'folha_timbrada') {
            return value >= 10 && value <= 400;
          }
          // Para outros templates, manter limite menor
          return value >= 10 && value <= 120;
        },
        message: 'Margem direita deve estar entre 10 e 400px para folha timbrada, ou 10-120px para outros templates'
      }
    }
  },
  // Posições customizadas para drag-and-drop
  customPositions: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // Estilos de texto simplificados para folha timbrada (nova versão sem drag & drop)
  textStyles: {
    colors: {
      primary: { type: String, default: '#1f2937' },     // Título principal
      secondary: { type: String, default: '#374151' },   // Subtítulos  
      text: { type: String, default: '#111827' },        // Texto comum
      accent: { type: String, default: '#3b82f6' }       // Destaques
    },
    fonts: {
      title: { type: Number, default: 16, min: 12, max: 24 },      // Tamanho título
      subtitle: { type: Number, default: 14, min: 10, max: 18 },   // Tamanho subtítulo
      body: { type: Number, default: 11, min: 8, max: 16 },        // Tamanho texto
      small: { type: Number, default: 9, min: 6, max: 12 }         // Tamanho pequeno
    },
    spacing: {
      lineHeight: { type: Number, default: 1.4, min: 1.0, max: 2.0 },           // Altura da linha
      paragraphSpacing: { type: Number, default: 12, min: 6, max: 24 },         // Espaçamento entre parágrafos
      sectionSpacing: { type: Number, default: 20, min: 10, max: 40 }           // Espaçamento entre seções
    },
    layout: {
      alignment: { type: String, enum: ['left', 'center', 'right', 'justify'], default: 'left' },  // Alinhamento do texto
      opacity: { type: Number, default: 1.0, min: 0.3, max: 1.0 },                                // Opacidade do texto
      fontWeight: { type: String, enum: ['normal', 'bold', 'lighter'], default: 'normal' }         // Peso da fonte
    }
  },
  // Estilos avançados de seção
  estilosSecao: {
    header: {
      corFundo: { type: String, default: '#f8fafc' },
      corBorda: { type: String, default: '#e2e8f0' },
      larguraBorda: { type: Number, default: 1 },
      tipoLinha: { type: String, enum: ['solid', 'dashed', 'dotted', 'double'], default: 'solid' },
      raioCantos: { type: Number, default: 8 },
      padding: { type: Number, default: 16 },
      incluirLogo: { type: Boolean, default: true },
      incluirTitulo: { type: Boolean, default: true },
      gradiente: { type: Boolean, default: false },
      corGradiente1: { type: String, default: '#3b82f6' },
      corGradiente2: { type: String, default: '#8b5cf6' },
      larguraCompleta: { type: Boolean, default: true },
      altura: { type: Number, default: 80 },
      alinhamentoTexto: { type: String, enum: ['left', 'center', 'right'], default: 'center' },
      textoPersonalizado: { type: String, default: '' },
      mostrarTextoPersonalizado: { type: Boolean, default: false }
    },
    patientInfo: {
      corFundo: { type: String, default: '#ffffff' },
      corBorda: { type: String, default: '#d1d5db' },
      larguraBorda: { type: Number, default: 1 },
      tipoLinha: { type: String, enum: ['solid', 'dashed', 'dotted', 'double'], default: 'solid' },
      raioCantos: { type: Number, default: 6 },
      padding: { type: Number, default: 12 },
      sombra: { type: Boolean, default: true }
    },
    content: {
      corFundo: { type: String, default: '#ffffff' },
      corBorda: { type: String, default: '#e5e7eb' },
      larguraBorda: { type: Number, default: 0 },
      tipoLinha: { type: String, enum: ['solid', 'dashed', 'dotted', 'double'], default: 'solid' },
      raioCantos: { type: Number, default: 0 },
      padding: { type: Number, default: 16 },
      sombra: { type: Boolean, default: false }
    },
    signature: {
      corFundo: { type: String, default: '#f9fafb' },
      corBorda: { type: String, default: '#9ca3af' },
      larguraBorda: { type: Number, default: 1 },
      tipoLinha: { type: String, enum: ['solid', 'dashed', 'dotted', 'double'], default: 'solid' },
      raioCantos: { type: Number, default: 4 },
      padding: { type: Number, default: 12 },
      sombra: { type: Boolean, default: false }
    },
    footer: {
      corFundo: { type: String, default: '#f1f5f9' },
      corBorda: { type: String, default: '#cbd5e1' },
      larguraBorda: { type: Number, default: 1 },
      tipoLinha: { type: String, enum: ['solid', 'dashed', 'dotted', 'double'], default: 'solid' },
      raioCantos: { type: Number, default: 6 },
      padding: { type: Number, default: 10 },
      sombra: { type: Boolean, default: false },
      larguraCompleta: { type: Boolean, default: true },
      altura: { type: Number, default: 60 },
      alinhamentoTexto: { type: String, enum: ['left', 'center', 'right'], default: 'center' }
    },
    qrcode: {
      tamanhoMinimo: { type: Number, default: 50 },
      tamanhoMaximo: { type: Number, default: 200 },
      bordaPersonalizada: { type: Boolean, default: false },
      corBorda: { type: String, default: '#e2e8f0' },
      larguraBorda: { type: Number, default: 1 }
    }
  },
  // Metadados
  ativo: {
    type: Boolean,
    default: true
  },
  criadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  atualizadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario'
  }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Índices
TemplatePDFSchema.index({ tenant_id: 1 });
TemplatePDFSchema.index({ ativo: 1 });
TemplatePDFSchema.index({ createdAt: -1 });

// Virtual para verificar se tem logo
TemplatePDFSchema.virtual('temLogo').get(function() {
  return !!(this.logoUrl || this.logoS3Key);
});

// Método para obter configurações padrão
TemplatePDFSchema.statics.getConfigPadrao = function() {
  const templatesGaleria = this.getTemplatesGaleria();
  const templatePadrao = templatesGaleria.moderno_azul; // Template padrão da galeria
  
  return {
    nomeModelo: 'Template Padrão',
    tipoTemplate: 'galeria',
    templateGaleriaId: 'moderno_azul',
    ...templatePadrao,
    logoUrl: null,
    rodapeTexto: '',
    customPositions: {}, // Vazio para templates da galeria
    folhaTimbradaUrl: null,
    folhaTimbradaS3Key: null,
    folhaTimbradaConfig: {
      usarFolhaTimbrada: false,
      opacidade: 0.1,
      posicao: 'fundo',
      largura: 210,
      altura: 297,
      margemSuperior: 20,
      margemInferior: 20,
      margemEsquerda: 20,
      margemDireita: 20
    }
  };
};

// Método de instância para aplicar configurações padrão
TemplatePDFSchema.methods.aplicarPadroes = function() {
  const padroes = this.constructor.getConfigPadrao();
  
  // Aplicar apenas campos não definidos
  if (!this.cores) this.cores = padroes.cores;
  if (!this.layout) this.layout = padroes.layout;
  if (!this.fonte) this.fonte = padroes.fonte;
  if (!this.tamanhoFonte) this.tamanhoFonte = padroes.tamanhoFonte;
  if (!this.margens) this.margens = padroes.margens;
  
  return this;
};

// Middleware pre-save para aplicar padrões
TemplatePDFSchema.pre('save', function(next) {
  if (this.isNew) {
    this.aplicarPadroes();
  }
  next();
});

// Método para validar se logo existe e está acessível
TemplatePDFSchema.methods.validarLogo = async function() {
  if (!this.temLogo) return true;
  
  try {
    if (this.logoS3Key) {
      // Validar arquivo no S3
      const { s3Client } = require('../services/assinaturaStorageService');
      const { HeadObjectCommand } = require('@aws-sdk/client-s3');
      
      const command = new HeadObjectCommand({
        Bucket: this.logoS3Bucket || process.env.AWS_S3_BUCKET,
        Key: this.logoS3Key
      });
      
      await s3Client.send(command);
      return true;
    } else if (this.logoUrl) {
      // Validar URL externa
      const axios = require('axios');
      const response = await axios.head(this.logoUrl, { timeout: 5000 });
      return response.status === 200;
    }
  } catch (error) {
    console.error('Erro ao validar logo:', error);
    return false;
  }
  
  return false;
};

// Método para obter templates da galeria
TemplatePDFSchema.statics.getTemplatesGaleria = function() {
  return {
    moderno_azul: {
      id: 'moderno_azul',
      nome: 'Moderno Azul Profissional',
      descricao: 'Design moderno e elegante com tons de azul, gradientes sutis e tipografia limpa',
      preview: '/templates/previews/moderno_azul.png',
      cores: {
        primaria: '#1e40af',
        corTitulo: '#1e3a8a',
        secundaria: '#3b82f6',
        texto: '#1f2937',
        fundo: '#ffffff'
      },
      layout: {
        mostrarLogo: true,
        mostrarRodape: true,
        mostrarCabecalho: true,
        mostrarTitulo: true,
        mostrarDadosExame: true,
        alinhamentoTitulo: 'center',
        mostrarQrCode: true,
        mostrarDadosPaciente: true,
        mostrarDataAssinatura: true,
        mostrarCabecalhoCompleto: true
      },
      fonte: 'Helvetica',
      tamanhoFonte: {
        base: 11,
        titulo: 18,
        subtitulo: 14
      },
      margens: {
        top: 40,
        bottom: 40,
        left: 40,
        right: 40
      },
      estilosSecao: {
        header: {
          corFundo: '#1e40af',
          corBorda: '#1e3a8a',
          larguraBorda: 0,
          tipoLinha: 'solid',
          raioCantos: 0,
          padding: 20,
          incluirLogo: true,
          incluirTitulo: true,
          gradiente: true,
          corGradiente1: '#1e40af',
          corGradiente2: '#3b82f6',
          larguraCompleta: true,
          altura: 100,
          alinhamentoTexto: 'center',
          corTexto: '#ffffff',
          mostrarDetalhes: true,
          tamanhoFonte: 20
        },
        patientInfo: {
          corFundo: '#f8fafc',
          corBorda: '#cbd5e1',
          larguraBorda: 1,
          tipoLinha: 'solid',
          raioCantos: 8,
          padding: 15,
          sombra: true,
          corSombra: 'rgba(0, 0, 0, 0.08)'
        },
        content: {
          corFundo: '#ffffff',
          corBorda: '#e2e8f0',
          larguraBorda: 1,
          tipoLinha: 'solid',
          raioCantos: 6,
          padding: 20,
          sombra: true,
          corSombra: 'rgba(0, 0, 0, 0.05)'
        },
        footer: {
          corFundo: '#f1f5f9',
          corBorda: '#cbd5e1',
          larguraBorda: 1,
          tipoLinha: 'solid',
          raioCantos: 8,
          padding: 15,
          larguraCompleta: true,
          altura: 80,
          alinhamentoTexto: 'center',
          mostrarLinha: true,
          corLinha: '#3b82f6',
          espessuraLinha: 2,
          mostrarPaginacao: true
        }
      }
    },
    
    elegante_verde: {
      id: 'elegante_verde',
      nome: 'Elegante Verde Médico',
      descricao: 'Design sofisticado em tons de verde, ideal para área médica e hospitalar',
      preview: '/templates/previews/elegante_verde.png',
      cores: {
        primaria: '#059669',
        corTitulo: '#047857',
        secundaria: '#10b981',
        texto: '#1f2937',
        fundo: '#ffffff'
      },
      layout: {
        mostrarLogo: true,
        mostrarRodape: true,
        mostrarCabecalho: true,
        mostrarTitulo: true,
        mostrarDadosExame: true,
        alinhamentoTitulo: 'center',
        mostrarQrCode: true,
        mostrarDadosPaciente: true,
        mostrarDataAssinatura: true,
        mostrarCabecalhoCompleto: true
      },
      fonte: 'Helvetica',
      tamanhoFonte: {
        base: 11,
        titulo: 18,
        subtitulo: 14
      },
      margens: {
        top: 45,
        bottom: 45,
        left: 45,
        right: 45
      },
      estilosSecao: {
        header: {
          corFundo: '#059669',
          larguraBorda: 0,
          raioCantos: 0,
          padding: 25,
          incluirLogo: true,
          incluirTitulo: true,
          gradiente: true,
          corGradiente1: '#059669',
          corGradiente2: '#10b981',
          larguraCompleta: true,
          altura: 110,
          alinhamentoTexto: 'center',
          corTexto: '#ffffff',
          tamanhoFonte: 22
        },
        patientInfo: {
          corFundo: '#f0fdf4',
          corBorda: '#bbf7d0',
          larguraBorda: 2,
          raioCantos: 10,
          padding: 18,
          sombra: true
        },
        content: {
          corFundo: '#ffffff',
          corBorda: '#d1fae5',
          larguraBorda: 1,
          raioCantos: 8,
          padding: 22,
          sombra: true
        },
        footer: {
          corFundo: '#ecfdf5',
          corBorda: '#10b981',
          larguraBorda: 2,
          raioCantos: 10,
          padding: 18,
          altura: 85,
          alinhamentoTexto: 'center',
          corLinha: '#10b981',
          espessuraLinha: 3
        }
      }
    },
    
    executivo_preto: {
      id: 'executivo_preto',
      nome: 'Executivo Preto Elegante',
      descricao: 'Design executivo sofisticado em preto e branco, transmite seriedade e profissionalismo',
      preview: '/templates/previews/executivo_preto.png',
      cores: {
        primaria: '#111827',
        corTitulo: '#000000',
        secundaria: '#374151',
        texto: '#1f2937',
        fundo: '#ffffff'
      },
      layout: {
        mostrarLogo: true,
        mostrarRodape: true,
        mostrarCabecalho: true,
        mostrarTitulo: true,
        mostrarDadosExame: true,
        alinhamentoTitulo: 'center',
        mostrarQrCode: true,
        mostrarDadosPaciente: true,
        mostrarDataAssinatura: true,
        mostrarCabecalhoCompleto: true
      },
      fonte: 'Helvetica',
      tamanhoFonte: {
        base: 11,
        titulo: 20,
        subtitulo: 15
      },
      margens: {
        top: 50,
        bottom: 50,
        left: 50,
        right: 50
      },
      estilosSecao: {
        header: {
          corFundo: '#111827',
          larguraBorda: 0,
          raioCantos: 0,
          padding: 30,
          incluirLogo: true,
          incluirTitulo: true,
          gradiente: false,
          larguraCompleta: true,
          altura: 120,
          alinhamentoTexto: 'center',
          corTexto: '#ffffff',
          tamanhoFonte: 24
        },
        patientInfo: {
          corFundo: '#f9fafb',
          corBorda: '#111827',
          larguraBorda: 2,
          raioCantos: 0,
          padding: 20,
          sombra: false
        },
        content: {
          corFundo: '#ffffff',
          corBorda: '#d1d5db',
          larguraBorda: 1,
          raioCantos: 0,
          padding: 25,
          sombra: false
        },
        footer: {
          corFundo: '#f3f4f6',
          corBorda: '#111827',
          larguraBorda: 2,
          raioCantos: 0,
          padding: 20,
          altura: 90,
          alinhamentoTexto: 'center',
          corLinha: '#111827',
          espessuraLinha: 2
        }
      }
    },

    minimalista_clean: {
      id: 'minimalista_clean',
      nome: 'Minimalista Clean',
      descricao: 'Design minimalista e limpo, com espaçamento generoso e tipografia clara',
      preview: '/templates/previews/minimalista_clean.png',
      cores: {
        primaria: '#4f46e5',
        corTitulo: '#3730a3',
        secundaria: '#6366f1',
        texto: '#374151',
        fundo: '#ffffff'
      },
      layout: {
        mostrarLogo: true,
        mostrarRodape: true,
        mostrarCabecalho: true,
        mostrarTitulo: true,
        mostrarDadosExame: true,
        alinhamentoTitulo: 'left',
        mostrarQrCode: true,
        mostrarDadosPaciente: true,
        mostrarDataAssinatura: true,
        mostrarCabecalhoCompleto: true
      },
      fonte: 'Helvetica',
      tamanhoFonte: {
        base: 12,
        titulo: 22,
        subtitulo: 16
      },
      margens: {
        top: 60,
        bottom: 60,
        left: 60,
        right: 60
      },
      estilosSecao: {
        header: {
          corFundo: '#ffffff',
          corBorda: '#4f46e5',
          larguraBorda: 3,
          tipoLinha: 'solid',
          raioCantos: 0,
          padding: 25,
          incluirLogo: true,
          incluirTitulo: true,
          gradiente: false,
          larguraCompleta: true,
          altura: 100,
          alinhamentoTexto: 'left',
          corTexto: '#4f46e5',
          tamanhoFonte: 22
        },
        patientInfo: {
          corFundo: '#fafbff',
          corBorda: '#e0e7ff',
          larguraBorda: 1,
          raioCantos: 12,
          padding: 25,
          sombra: false
        },
        content: {
          corFundo: '#ffffff',
          corBorda: '#ffffff',
          larguraBorda: 0,
          raioCantos: 0,
          padding: 30,
          sombra: false
        },
        footer: {
          corFundo: '#ffffff',
          corBorda: '#e0e7ff',
          larguraBorda: 1,
          raioCantos: 12,
          padding: 20,
          altura: 70,
          alinhamentoTexto: 'center',
          corLinha: '#4f46e5',
          espessuraLinha: 1
        }
      }
    }
  };
};

module.exports = mongoose.model('TemplatePDF', TemplatePDFSchema);
