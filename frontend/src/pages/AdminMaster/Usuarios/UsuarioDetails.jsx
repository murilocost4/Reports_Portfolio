import React from "react";
import { IoClose } from "react-icons/io5";
import {
  FiUser,
  FiMail,
  FiBriefcase,
  FiStar,
  FiEdit3,
  FiHash,
  FiHeart,
  FiShield,
} from "react-icons/fi";

export default function UsuarioDetails({ usuario, onClose }) {
  if (!usuario) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-slate-800 text-white flex items-center justify-center">
              <FiUser className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                {usuario.nome}
              </h2>
              <p className="text-sm text-slate-500">Detalhes do usuário</p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Basic Information */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4 text-slate-800 flex items-center">
                  <FiHash className="mr-2 text-slate-600" />
                  Informações Básicas
                </h3>
                <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center space-x-3 text-slate-700">
                    <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center">
                      <FiMail className="w-4 h-4 text-slate-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Email</p>
                      <p className="font-medium">{usuario.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 text-slate-700">
                    <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center">
                      <FiBriefcase className="w-4 h-4 text-slate-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Função</p>
                      <span className="font-medium capitalize">
                        {usuario.role}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 text-slate-700">
                    <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center">
                      <FiShield className="w-4 h-4 text-slate-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Status</p>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          usuario.ativo !== false
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {usuario.ativo !== false ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                  </div>

                  {usuario.crm && (
                    <div className="flex items-center space-x-3 text-slate-700">
                      <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center">
                        <FiStar className="w-4 h-4 text-slate-600" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">CRM</p>
                        <p className="font-medium">{usuario.crm}</p>
                      </div>
                    </div>
                  )}

                  {/* Especialidades - apenas para médicos */}
                  {usuario.role === "medico" &&
                    usuario.especialidades &&
                    usuario.especialidades.length > 0 && (
                      <div className="flex items-start space-x-3 text-slate-700">
                        <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center">
                          <FiHeart className="w-4 h-4 text-slate-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-slate-500">
                            Especialidades
                          </p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {usuario.especialidades.map(
                              (especialidade, index) => (
                                <span
                                  key={especialidade._id || index}
                                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700"
                                >
                                  {especialidade.nome || especialidade}
                                </span>
                              ),
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                  {/* Caso seja médico mas não tenha especialidades */}
                  {usuario.role === "medico" &&
                    (!usuario.especialidades ||
                      usuario.especialidades.length === 0) && (
                      <div className="flex items-center space-x-3 text-slate-700">
                        <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center">
                          <FiHeart className="w-4 h-4 text-slate-600" />
                        </div>
                        <div>
                          <p className="text-sm text-slate-500">
                            Especialidades
                          </p>
                          <p className="font-medium text-slate-400">
                            Nenhuma especialidade cadastrada
                          </p>
                        </div>
                      </div>
                    )}
                </div>
              </div>
            </div>

            {/* Empresas */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4 text-slate-800 flex items-center">
                  <FiBriefcase className="mr-2 text-slate-600" />
                  Empresas Vinculadas
                </h3>
                <div className="bg-slate-50 rounded-xl p-4">
                  {usuario.tenant_id && usuario.tenant_id.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3">
                      {usuario.tenant_id.map((tenant) => (
                        <div
                          key={tenant._id}
                          className="p-3 bg-white rounded-lg border border-slate-200"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center">
                              <FiBriefcase className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">
                                {tenant.nomeFantasia}
                              </p>
                              <p className="text-sm text-slate-500">
                                {tenant.cnpj}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-slate-500">
                      <FiBriefcase className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                      <p>Nenhuma empresa vinculada</p>
                    </div>
                  )}
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
              (window.location.href = `/adminmaster/usuarios/editar/${usuario._id}`)
            }
            className="inline-flex items-center px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors duration-200 font-medium shadow-sm"
          >
            <FiEdit3 className="w-4 h-4 mr-2" />
            Editar Usuário
          </button>
        </div>
      </div>
    </div>
  );
}
