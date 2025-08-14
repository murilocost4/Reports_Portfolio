import React, { useState } from "react";
import { FiX, FiLoader, FiAlertTriangle } from "react-icons/fi";

export default function BulkValoresModal({
  isOpen,
  onClose,
  tenants,
  medicos,
  especialidades,
  tiposExame,
  onSubmit,
}) {
  const [formData, setFormData] = useState({
    selectedTenants: [],
    selectedMedicos: [],
    selectedEspecialidades: [],
    selectedTiposExame: [],
    valor: "",
    observacoes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await onSubmit(formData);
      onClose();
    } catch (err) {
      setError(err.message || "Erro ao configurar valores");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-sm backdrop-brightness-90 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800">
            Configuração em Lote de Valores
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-lg">
              <FiAlertTriangle className="w-5 h-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* Selects múltiplos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                Empresas
              </label>
              <select
                multiple
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 min-h-[120px]"
                value={formData.selectedTenants}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    selectedTenants: Array.from(
                      e.target.selectedOptions,
                      (option) => option.value,
                    ),
                  }))
                }
              >
                {tenants.map((tenant) => (
                  <option key={tenant._id} value={tenant._id}>
                    {tenant.nomeFantasia}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500">
                Ctrl/Cmd + Clique para selecionar múltiplos
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                Médicos
              </label>
              <select
                multiple
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 min-h-[120px]"
                value={formData.selectedMedicos}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    selectedMedicos: Array.from(
                      e.target.selectedOptions,
                      (option) => option.value,
                    ),
                  }))
                }
              >
                {medicos.map((medico) => (
                  <option key={medico._id} value={medico._id}>
                    {medico.nome} - {medico.crm}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                Especialidades
              </label>
              <select
                multiple
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 min-h-[120px]"
                value={formData.selectedEspecialidades}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    selectedEspecialidades: Array.from(
                      e.target.selectedOptions,
                      (option) => option.value,
                    ),
                  }))
                }
              >
                {especialidades.map((esp) => (
                  <option key={esp._id} value={esp._id}>
                    {esp.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                Tipos de Exame
              </label>
              <select
                multiple
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 min-h-[120px]"
                value={formData.selectedTiposExame}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    selectedTiposExame: Array.from(
                      e.target.selectedOptions,
                      (option) => option.value,
                    ),
                  }))
                }
              >
                {tiposExame.map((tipo) => (
                  <option key={tipo._id} value={tipo._id}>
                    {tipo.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                Valor (R$) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.valor}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, valor: e.target.value }))
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                placeholder="0,00"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                Observações
              </label>
              <textarea
                value={formData.observacoes}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    observacoes: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                rows="3"
                placeholder="Observações sobre este valor..."
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex items-center gap-2 px-6 py-2 bg-slate-800 text-white rounded-lg font-medium transition-colors ${
                loading ? "opacity-75 cursor-not-allowed" : "hover:bg-slate-700"
              }`}
            >
              {loading && <FiLoader className="w-4 h-4 animate-spin" />}
              {loading ? "Processando..." : "Configurar Valores"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
