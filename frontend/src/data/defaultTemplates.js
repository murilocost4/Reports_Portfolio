// Templates padrão para a galeria
export const defaultTemplates = [
  {
    id: 'template-1',
    nome: 'Clássico Azul',
    descricao: 'Template profissional com tons de azul, ideal para clínicas médicas tradicionais',
    cores: {
      primaria: '#2563eb',
      secundaria: '#64748b',
      terciaria: '#f8fafc',
      acento: '#3b82f6',
      texto: '#1e293b'
    },
    estilosSecao: {
      header: {
        gradiente: true,
        corGradiente2: '#1d4ed8',
        fonte: 'Inter',
        tamanhoFonte: '18px'
      },
      patientInfo: {
        corFundo: '#f1f5f9',
        corBorda: '#cbd5e1',
        corTexto: '#334155'
      },
      content: {
        corFundo: '#ffffff',
        corTexto: '#374151',
        espacamento: 'normal'
      },
      footer: {
        corFundo: '#f8fafc',
        corBorda: '#e2e8f0',
        corTexto: '#64748b'
      }
    },
    categoria: 'profissional'
  },
  {
    id: 'template-2',
    nome: 'Elegante Verde',
    descricao: 'Design moderno com tons verdes, transmite confiança e bem-estar',
    cores: {
      primaria: '#059669',
      secundaria: '#6b7280',
      terciaria: '#f0fdf4',
      acento: '#10b981',
      texto: '#1f2937'
    },
    estilosSecao: {
      header: {
        gradiente: true,
        corGradiente2: '#047857',
        fonte: 'Inter',
        tamanhoFonte: '18px'
      },
      patientInfo: {
        corFundo: '#ecfdf5',
        corBorda: '#a7f3d0',
        corTexto: '#14532d'
      },
      content: {
        corFundo: '#ffffff',
        corTexto: '#374151',
        espacamento: 'confortavel'
      },
      footer: {
        corFundo: '#f0fdf4',
        corBorda: '#bbf7d0',
        corTexto: '#22c55e'
      }
    },
    categoria: 'moderno'
  },
  {
    id: 'template-3',
    nome: 'Corporativo Cinza',
    descricao: 'Template sóbrio e corporativo, perfeito para grandes instituições médicas',
    cores: {
      primaria: '#374151',
      secundaria: '#9ca3af',
      terciaria: '#f9fafb',
      acento: '#4b5563',
      texto: '#111827'
    },
    estilosSecao: {
      header: {
        gradiente: false,
        fonte: 'Inter',
        tamanhoFonte: '16px'
      },
      patientInfo: {
        corFundo: '#f3f4f6',
        corBorda: '#d1d5db',
        corTexto: '#374151'
      },
      content: {
        corFundo: '#ffffff',
        corTexto: '#374151',
        espacamento: 'compacto'
      },
      footer: {
        corFundo: '#f9fafb',
        corBorda: '#e5e7eb',
        corTexto: '#6b7280'
      }
    },
    categoria: 'corporativo'
  },
  {
    id: 'template-4',
    nome: 'Médico Roxo',
    descricao: 'Design sofisticado com tons roxos, ideal para especialidades médicas',
    cores: {
      primaria: '#7c3aed',
      secundaria: '#a78bfa',
      terciaria: '#faf5ff',
      acento: '#8b5cf6',
      texto: '#581c87'
    },
    estilosSecao: {
      header: {
        gradiente: true,
        corGradiente2: '#6d28d9',
        fonte: 'Inter',
        tamanhoFonte: '18px'
      },
      patientInfo: {
        corFundo: '#f3e8ff',
        corBorda: '#c4b5fd',
        corTexto: '#6b21a8'
      },
      content: {
        corFundo: '#ffffff',
        corTexto: '#374151',
        espacamento: 'normal'
      },
      footer: {
        corFundo: '#faf5ff',
        corBorda: '#d8b4fe',
        corTexto: '#8b5cf6'
      }
    },
    categoria: 'especialidade'
  },
  {
    id: 'template-5',
    nome: 'Laranja Vibrante',
    descricao: 'Template energético com tons de laranja, para clínicas jovens e dinâmicas',
    cores: {
      primaria: '#ea580c',
      secundaria: '#fdba74',
      terciaria: '#fff7ed',
      acento: '#f97316',
      texto: '#9a3412'
    },
    estilosSecao: {
      header: {
        gradiente: true,
        corGradiente2: '#dc2626',
        fonte: 'Inter',
        tamanhoFonte: '18px'
      },
      patientInfo: {
        corFundo: '#fed7aa',
        corBorda: '#fb923c',
        corTexto: '#c2410c'
      },
      content: {
        corFundo: '#ffffff',
        corTexto: '#374151',
        espacamento: 'confortavel'
      },
      footer: {
        corFundo: '#fff7ed',
        corBorda: '#fdba74',
        corTexto: '#ea580c'
      }
    },
    categoria: 'moderno'
  },
  {
    id: 'template-6',
    nome: 'Minimalista',
    descricao: 'Design clean e minimalista, focado na legibilidade e simplicidade',
    cores: {
      primaria: '#000000',
      secundaria: '#71717a',
      terciaria: '#fafafa',
      acento: '#18181b',
      texto: '#09090b'
    },
    estilosSecao: {
      header: {
        gradiente: false,
        fonte: 'Inter',
        tamanhoFonte: '16px'
      },
      patientInfo: {
        corFundo: '#f4f4f5',
        corBorda: '#e4e4e7',
        corTexto: '#27272a'
      },
      content: {
        corFundo: '#ffffff',
        corTexto: '#18181b',
        espacamento: 'amplo'
      },
      footer: {
        corFundo: '#fafafa',
        corBorda: '#e4e4e7',
        corTexto: '#71717a'
      }
    },
    categoria: 'minimalista'
  }
];

export const getTemplateById = (id) => {
  return defaultTemplates.find(template => template.id === id);
};

export const getTemplatesByCategory = (categoria) => {
  return defaultTemplates.filter(template => template.categoria === categoria);
};

export const getAllCategories = () => {
  return [...new Set(defaultTemplates.map(template => template.categoria))];
};
