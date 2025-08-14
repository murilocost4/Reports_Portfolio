import React, { useState } from 'react';
import Modal from 'react-modal';
import { FaSignature, FaUpload, FaSpinner, FaImage } from 'react-icons/fa';
import { IoCloseOutline } from 'react-icons/io5';

const ModalAssinatura = ({ 
  isOpen, 
  onClose, 
  onRequestClose, // Mantemos ambos para compatibilidade
  onAssinarAutomaticamente, 
  onAssinarComImagemFisica, // Nova prop para assinatura física
  onEscolherUpload, 
  isLoading = false,
  temCertificado = false,
  temAssinaturaFisica = false, // Nova prop para verificar se tem assinatura física
  certificados = []
}) => {
  // Determinar se tem certificado baseado nas props
  const hasCertificate = temCertificado || (certificados && certificados.length > 0);
  const hasPhysicalSignature = temAssinaturaFisica;
  // Usar onClose ou onRequestClose baseado no que foi fornecido
  const handleClose = onClose || onRequestClose;

  const handleAssinarClick = async () => {
    // Chama diretamente a função sem solicitar senha
    await onAssinarAutomaticamente();
  };

  const handleAssinarComImagemClick = async () => {
    // Chama a função de assinatura com imagem física
    await onAssinarComImagemFisica();
  };
  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={!isLoading ? handleClose : undefined}
      contentLabel="Escolher método de assinatura"
      style={{
        overlay: {
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
        },
        content: {
          position: 'relative',
          top: 'auto',
          left: 'auto',
          right: 'auto',
          bottom: 'auto',
          border: 'none',
          borderRadius: '1rem',
          padding: '0',
          background: 'white',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          maxWidth: '500px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'hidden',
        },
      }}
    >
      <div className="bg-white rounded-xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
              <FaSignature className="text-slate-600" />
              Assinatura do Laudo
            </h2>
            {!isLoading && (
              <button
                onClick={handleClose}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <IoCloseOutline className="text-2xl" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6">
            <p className="text-slate-700 leading-relaxed">
              {(hasCertificate || hasPhysicalSignature)
                ? "Como deseja assinar este laudo?"
                : "Você não possui um certificado digital ativo nem assinatura física cadastrada. Para finalizar o laudo, faça upload do arquivo assinado."
              }
            </p>
          </div>

          <div className="space-y-4">
            {hasCertificate && (
              <button
                onClick={handleAssinarClick}
                disabled={isLoading}
                className={`w-full p-4 rounded-lg border-2 transition-all ${
                  isLoading 
                    ? 'border-slate-200 bg-slate-50 cursor-not-allowed' 
                    : 'border-green-200 bg-green-50 hover:bg-green-100 hover:border-green-300'
                } flex items-center gap-3`}
              >
                {isLoading ? (
                  <FaSpinner className="text-slate-400 animate-spin" />
                ) : (
                  <FaSignature className="text-green-600 text-xl" />
                )}
                <div className="text-left flex-1">
                  <div className={`font-semibold ${isLoading ? 'text-slate-400' : 'text-green-800'}`}>
                    Assinar Automaticamente
                  </div>
                  <div className={`text-sm ${isLoading ? 'text-slate-400' : 'text-green-600'}`}>
                    Usar certificado digital para assinatura automática
                  </div>
                </div>
              </button>
            )}

            {hasPhysicalSignature && (
              <button
                onClick={handleAssinarComImagemClick}
                disabled={isLoading}
                className={`w-full p-4 rounded-lg border-2 transition-all ${
                  isLoading 
                    ? 'border-slate-200 bg-slate-50 cursor-not-allowed' 
                    : 'border-purple-200 bg-purple-50 hover:bg-purple-100 hover:border-purple-300'
                } flex items-center gap-3`}
              >
                {isLoading ? (
                  <FaSpinner className="text-slate-400 animate-spin" />
                ) : (
                  <FaImage className="text-purple-600 text-xl" />
                )}
                <div className="text-left flex-1">
                  <div className={`font-semibold ${isLoading ? 'text-slate-400' : 'text-purple-800'}`}>
                    Assinar com Imagem Física
                  </div>
                  <div className={`text-sm ${isLoading ? 'text-slate-400' : 'text-purple-600'}`}>
                    Usar sua assinatura física cadastrada
                  </div>
                </div>
              </button>
            )}

            <button
              onClick={onEscolherUpload}
              disabled={isLoading}
              className={`w-full p-4 rounded-lg border-2 transition-all ${
                isLoading 
                  ? 'border-slate-200 bg-slate-50 cursor-not-allowed' 
                  : 'border-blue-200 bg-blue-50 hover:bg-blue-100 hover:border-blue-300'
              } flex items-center gap-3`}
            >
              <FaUpload className={`text-xl ${isLoading ? 'text-slate-400' : 'text-blue-600'}`} />
              <div className="text-left flex-1">
                <div className={`font-semibold ${isLoading ? 'text-slate-400' : 'text-blue-800'}`}>
                  Fazer Upload Manual
                </div>
                <div className={`text-sm ${isLoading ? 'text-slate-400' : 'text-blue-600'}`}>
                  Enviar arquivo PDF já assinado
                </div>
              </div>
            </button>
          </div>

          {isLoading && (
            <div className="mt-6 p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <FaSpinner className="text-slate-500 animate-spin" />
                <span className="text-slate-700">Processando assinatura...</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!isLoading && (
          <div className="px-6 py-4 border-t border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100">
            <div className="flex justify-end">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ModalAssinatura;
