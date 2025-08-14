// Utilitários para formatação de datas no formato brasileiro
export const formatarData = (data) => {
  if (!data) return '';
  
  try {
    const dateObj = new Date(data);
    // Verificar se a data é válida
    if (isNaN(dateObj.getTime())) return '';
    
    return dateObj.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return '';
  }
};

export const formatarDataHora = (data) => {
  if (!data) return '';
  
  try {
    const dateObj = new Date(data);
    // Verificar se a data é válida
    if (isNaN(dateObj.getTime())) return '';
    
    return dateObj.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '';
  }
};

export const formatarDataCompleta = (data) => {
  if (!data) return '';
  
  try {
    const dateObj = new Date(data);
    // Verificar se a data é válida
    if (isNaN(dateObj.getTime())) return '';
    
    return dateObj.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  } catch {
    return '';
  }
};

export const calcularIdade = (dataNascimento) => {
  if (!dataNascimento) return null;
  
  try {
    const hoje = new Date();
    const nascimento = new Date(dataNascimento);
    
    // Verificar se a data é válida
    if (isNaN(nascimento.getTime())) return null;
    
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const mes = hoje.getMonth() - nascimento.getMonth();
    
    if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
      idade--;
    }
    
    return idade;
  } catch {
    return null;
  }
};

export const formatarDataISO = (data) => {
  if (!data) return '';
  
  try {
    // Se já estiver no formato ISO (yyyy-mm-dd), retornar como está
    if (typeof data === 'string' && data.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return data;
    }
    
    const dateObj = new Date(data);
    // Verificar se a data é válida
    if (isNaN(dateObj.getTime())) return '';
    
    // Retorna no formato yyyy-mm-dd para inputs do tipo date
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch {
    return '';
  }
};

// Converter data do formato brasileiro (dd/mm/yyyy) para ISO (yyyy-mm-dd)
export const converterDataBrasileiraParaISO = (dataBrasileira) => {
  if (!dataBrasileira || typeof dataBrasileira !== 'string') return '';
  
  // Se já estiver no formato ISO, retornar como está
  if (dataBrasileira.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dataBrasileira;
  }
  
  // Tentar converter do formato brasileiro (dd/mm/yyyy)
  const partes = dataBrasileira.split('/');
  if (partes.length === 3) {
    const [dia, mes, ano] = partes;
    return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
  }
  
  return '';
};

// Converter data ISO para formato brasileiro
export const converterDataISOParaBrasileira = (dataISO) => {
  if (!dataISO) return '';
  
  try {
    // Se já estiver no formato brasileiro, retornar como está
    if (dataISO.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
      return dataISO;
    }
    
    const date = new Date(dataISO + 'T00:00:00');
    if (isNaN(date.getTime())) return '';
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error('Erro ao converter data ISO para brasileira:', error);
    return '';
  }
};

// Validar se uma data está no formato dd/mm/yyyy válido
export const validarDataBrasileira = (dataBrasileira) => {
  if (!dataBrasileira) return false;
  
  try {
    const dateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
    const match = dataBrasileira.match(dateRegex);
    
    if (!match) return false;
    
    const [, day, month, year] = match;
    const dayNum = parseInt(day, 10);
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);
    
    // Validações básicas
    if (dayNum < 1 || dayNum > 31 || monthNum < 1 || monthNum > 12) {
      return false;
    }
    
    // Cria a data e verifica se é válida
    const date = new Date(yearNum, monthNum - 1, dayNum);
    return date.getFullYear() === yearNum && 
           date.getMonth() === monthNum - 1 && 
           date.getDate() === dayNum;
  } catch (error) {
    return false;
  }
};

// Máscara para input de data no formato dd/mm/yyyy
export const mascaraDataBrasileira = (value) => {
  if (!value) return '';
  
  // Remove tudo que não é número
  const numbers = value.replace(/\D/g, '');
  
  // Aplica a máscara dd/mm/yyyy
  if (numbers.length <= 2) {
    return numbers;
  } else if (numbers.length <= 4) {
    return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
  } else {
    return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
  }
};
