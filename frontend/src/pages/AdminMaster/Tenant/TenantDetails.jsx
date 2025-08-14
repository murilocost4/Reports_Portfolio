import React from "react";
import { IoClose } from "react-icons/io5";
import {
  FiBriefcase,
  FiClock,
  FiCheckSquare,
  FiEdit3,
  FiHash,
} from "react-icons/fi";

const TenantDetails = ({ tenant, onClose }) => {
  if (!tenant) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-slate-800 text-white flex items-center justify-center">
              <FiBriefcase className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                {tenant.nomeFantasia}
              </h2>
              <p className="text-sm text-slate-500">Detalhes da empresa</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <IoClose className="text-2xl text-slate-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          {/* Basic Information - Centralizada */}
          <div className="max-w-md mx-auto space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4 text-slate-800 flex items-center">
                <FiHash className="mr-2 text-slate-600" />
                Informações Básicas
              </h3>
              <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center space-x-3 text-slate-700">
                  <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center">
                    <FiBriefcase className="w-4 h-4 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">CNPJ</p>
                    <p className="font-medium">
                      {tenant.cnpj || "Não informado"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 text-slate-700">
                  <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center">
                    <FiCheckSquare className="w-4 h-4 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Status</p>
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        tenant.status === "Ativo"
                          ? "bg-green-100 text-green-700"
                          : tenant.status === "Inativo"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {tenant.status}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-3 text-slate-700">
                  <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center">
                    <FiClock className="w-4 h-4 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Data de Cadastro</p>
                    <p className="font-medium">
                      {new Date(tenant.dataCadastro).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium"
          >
            Fechar
          </button>
          <button
            onClick={() =>
              (window.location.href = `/adminmaster/empresas/editar/${tenant._id}`)
            }
            className="inline-flex items-center px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors duration-200 font-medium shadow-sm"
          >
            <FiEdit3 className="w-4 h-4 mr-2" />
            Editar Empresa
          </button>
        </div>
      </div>
    </div>
  );
};

export default TenantDetails;
