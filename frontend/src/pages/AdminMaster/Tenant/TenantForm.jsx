import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../../api";
import { IoArrowBack } from "react-icons/io5";
import { FiBriefcase, FiAlertCircle, FiCheckCircle } from "react-icons/fi";
import { useAuth } from "../../../contexts/AuthContext";

const TenantForm = () => {
  const [tenant, setTenant] = useState({
    nomeFantasia: "",
    cnpj: "",
    status: "ativo",
  });
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { id } = useParams();
  const { logout } = useAuth();

  useEffect(() => {
    if (id) {
      const fetchTenant = async () => {
        try {
          setIsLoading(true);
          const response = await api.get(`/tenants/${id}`);
          setTenant(response.data);
        } catch (error) {
          if (error.response?.status === 401) {
            setErro("Sessão expirada. Redirecionando para login...");
            setTimeout(() => logout(), 2000);
          } else {
            setErro("Erro ao carregar dados da empresa. Tente novamente.");
          }
        } finally {
          setIsLoading(false);
        }
      };
      fetchTenant();
    }
  }, [id, logout]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setTenant((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErro("");
    setMensagem("");

    try {
      if (id) {
        await api.put(`/tenants/${id}`, tenant);
        setMensagem("Empresa atualizada com sucesso!");
      } else {
        await api.post("/tenants", tenant);
        setMensagem("Empresa cadastrada com sucesso!");
      }
      setTimeout(() => navigate("/adminmaster/empresas"), 1500);
    } catch (error) {
      console.error("Erro ao salvar empresa:", error);
      if (error.response?.status === 401) {
        setErro("Sessão expirada. Redirecionando para login...");
        setTimeout(() => logout(), 2000);
      } else {
        setErro(
          error.response?.data?.erro ||
            "Erro ao salvar empresa. Tente novamente.",
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && id) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800 mx-auto"></div>
          <p className="mt-4 text-slate-600 font-medium">
            Carregando dados da empresa...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate("/adminmaster/empresas")}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-white/50 rounded-lg transition-all duration-200"
            >
              <IoArrowBack className="text-xl" />
            </button>

            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                {id ? "Editar Empresa" : "Nova Empresa"}
              </h1>
              <p className="text-slate-500 mt-1">
                {id
                  ? "Atualize as informações da empresa"
                  : "Cadastre uma nova empresa no sistema"}
              </p>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {erro && (
          <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border-l-4 border-red-500 rounded-lg">
            <FiAlertCircle className="text-red-500 flex-shrink-0" />
            <p className="text-red-700 font-medium">{erro}</p>
          </div>
        )}

        {mensagem && (
          <div className="flex items-center gap-3 px-4 py-3 bg-green-50 border-l-4 border-green-500 rounded-lg">
            <FiCheckCircle className="text-green-500 flex-shrink-0" />
            <p className="text-green-700 font-medium">{mensagem}</p>
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-slate-800 text-white flex items-center justify-center">
                <FiBriefcase className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-800">
                  Informações da Empresa
                </h2>
                <p className="text-sm text-slate-500">
                  Preencha os dados básicos da empresa
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Nome Fantasia <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="nomeFantasia"
                  value={tenant.nomeFantasia}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all placeholder:text-slate-400"
                  placeholder="Digite o nome fantasia"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  CNPJ
                </label>
                <input
                  type="text"
                  name="cnpj"
                  value={tenant.cnpj}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all placeholder:text-slate-400"
                  placeholder="00.000.000/0000-00"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Status
                </label>
                <select
                  name="status"
                  value={tenant.status}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                >
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
            <button
              type="button"
              onClick={() => navigate("/adminmaster/empresas")}
              className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className={`inline-flex items-center px-4 py-2 bg-slate-800 text-white rounded-lg font-medium shadow-sm transition-all duration-200 ${
                isLoading
                  ? "opacity-75 cursor-not-allowed"
                  : "hover:bg-slate-700"
              }`}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Processando...
                </>
              ) : id ? (
                "Atualizar Empresa"
              ) : (
                "Criar Empresa"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TenantForm;
