import React, { useState, useEffect } from 'react';
import { FiCalendar } from 'react-icons/fi';
import { 
  mascaraDataBrasileira, 
  validarDataBrasileira, 
  converterDataBrasileiraParaISO,
  converterDataISOParaBrasileira 
} from '../utils/dateUtils';

const InputDataBrasileira = ({ 
  value, 
  onChange, 
  name, 
  placeholder = "dd/mm/aaaa", 
  className = "",
  label = "",
  required = false,
  disabled = false,
  error = "",
  ...props 
}) => {
  const [displayValue, setDisplayValue] = useState('');
  const [showError, setShowError] = useState(false);

  // Atualizar display quando value mudar
  useEffect(() => {
    if (value) {
      // Se value estiver no formato ISO, converter para brasileiro
      const brDate = converterDataISOParaBrasileira(value);
      setDisplayValue(brDate);
    } else {
      setDisplayValue('');
    }
  }, [value]);

  const handleInputChange = (e) => {
    const inputValue = e.target.value;
    
    // Aplicar máscara
    const maskedValue = mascaraDataBrasileira(inputValue);
    setDisplayValue(maskedValue);
    
    // Validar e converter para ISO se completa
    if (maskedValue.length === 10) {
      const isValid = validarDataBrasileira(maskedValue);
      setShowError(!isValid);
      
      if (isValid) {
        const isoDate = converterDataBrasileiraParaISO(maskedValue);
        onChange({
          target: {
            name: name,
            value: isoDate
          }
        });
      }
    } else {
      setShowError(false);
      // Se não está completa, enviar valor vazio
      onChange({
        target: {
          name: name,
          value: ''
        }
      });
    }
  };

  const handleBlur = () => {
    if (displayValue && displayValue.length > 0 && displayValue.length < 10) {
      setShowError(true);
    }
  };

  const baseClassName = `
    block w-full pl-10 pr-3 py-3 border rounded-xl 
    focus:ring-2 focus:ring-slate-500 focus:border-slate-500 
    transition-all duration-200 bg-white text-slate-700 
    font-medium text-sm
    ${error || showError ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-slate-300'}
    ${disabled ? 'bg-gray-50 cursor-not-allowed' : ''}
    ${className}
  `.trim();

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <FiCalendar className={`${error || showError ? 'text-red-400' : 'text-slate-400'}`} />
        </div>
        
        <input
          type="text"
          name={name}
          value={displayValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={baseClassName}
          disabled={disabled}
          maxLength={10}
          {...props}
        />
      </div>
      
      {(error || showError) && (
        <p className="mt-1 text-sm text-red-600">
          {error || 'Data inválida. Use o formato dd/mm/aaaa'}
        </p>
      )}
    </div>
  );
};

export default InputDataBrasileira;
