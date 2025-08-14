import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import templatePDFService from '../../services/templatePDFService';
import { FaPalette, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';

const TemplateStatusBadge = ({ className = '' }) => {
  const { user } = useAuth();
  const [templateStatus, setTemplateStatus] = useState({
    hasTemplate: false,
    isValid: false,
    usandoPadrao: true,
    loading: true
  });

  useEffect(() => {
    if (user?.tenant_id) {
      checkTemplateStatus();
    }
  }, [user?.tenant_id]); // eslint-disable-line react-hooks/exhaustive-deps

  const checkTemplateStatus = async () => {
    try {
      const response = await templatePDFService.buscarTemplate(user.tenant_id);
      
      if (response.template) {
        const usandoPadrao = response.template.usandoPadrao || false;
        
        setTemplateStatus({
          hasTemplate: !usandoPadrao,
          isValid: true,
          usandoPadrao,
          loading: false
        });

        // Se tem template personalizado, validar se está funcionando
        if (!usandoPadrao) {
          try {
            const validationResponse = await templatePDFService.validarTemplate(user.tenant_id);
            setTemplateStatus(prev => ({
              ...prev,
              isValid: validationResponse.valido
            }));
          } catch (validationError) {
            setTemplateStatus(prev => ({
              ...prev,
              isValid: false
            }));
          }
        }
      } else {
        setTemplateStatus({
          hasTemplate: false,
          isValid: true,
          usandoPadrao: true,
          loading: false
        });
      }
    } catch (fetchError) {
      console.error('Erro ao verificar status do template:', fetchError);
      setTemplateStatus({
        hasTemplate: false,
        isValid: false,
        usandoPadrao: true,
        loading: false
      });
    }
  };

  if (templateStatus.loading) {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1 text-xs rounded-full bg-gray-100 text-gray-600 ${className}`}>
        <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
        Verificando template...
      </div>
    );
  }

  if (templateStatus.usandoPadrao) {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1 text-xs rounded-full bg-blue-100 text-blue-800 ${className}`}>
        <FaPalette className="w-3 h-3" />
        Template padrão
      </div>
    );
  }

  if (templateStatus.hasTemplate && templateStatus.isValid) {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1 text-xs rounded-full bg-green-100 text-green-800 ${className}`}>
        <FaCheckCircle className="w-3 h-3" />
        Template personalizado
      </div>
    );
  }

  if (templateStatus.hasTemplate && !templateStatus.isValid) {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800 ${className}`}>
        <FaExclamationTriangle className="w-3 h-3" />
        Template com problemas
      </div>
    );
  }

  return null;
};

export default TemplateStatusBadge;
