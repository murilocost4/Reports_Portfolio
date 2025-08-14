import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../../api";
import { IoArrowBack } from "react-icons/io5";
import { FiUser, FiAlertCircle, FiCheckCircle } from "react-icons/fi";
import { FaUserShield, FaUsers, FaBuilding, FaStethoscope } from "react-icons/fa";
import { useAuth } from "../../../contexts/AuthContext";
import Select from "react-select";

export default function UsuarioForm() {
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    senha: "",
    confirmarSenha: "",
    role: "tecnico",
    crm: "",
    isAdminMaster: false,
    tenant_id: [],
    especialidade: "",
    especialidades: [],
    papeis: [],
    ativo: true,
    permissaoFinanceiro: false,
    // Novos campos para multi-role system
    rolesAdicionais: [],
    adminTenants: [],
  });

  const [tenants, setTenants] = useState([]);
  const [especialidades, setEspecialidades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingEspecialidades, setLoadingEspecialidades] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();
  const { id } = useParams();
  const { logout } = useAuth();

  // Definições de roles disponíveis
  const rolesDisponiveis = [
    { value: 'medico', label: 'Médico', color: 'bg-green-100 text-green-800' },
    { value: 'tecnico', label: 'Técnico', color: 'bg-blue-100 text-blue-800' },
    { value: 'admin', label: 'Administrador', color: 'bg-purple-100 text-purple-800' },
    { value: 'recepcionista', label: 'Recepcionista', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'adminMaster', label: 'Admin Master', color: 'bg-red-100 text-red-800' }
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [tenantsResponse, especialidadesResponse] = await Promise.all([
          api.get("/tenants"),
          api.get("/especialidades"),
        ]);

        setTenants(tenantsResponse.data);
        setEspecialidades(especialidadesResponse.data);

        if (id) {
          const usuarioResponse = await api.get(`/usuarios/${id}`);
          const usuario = usuarioResponse.data;

          // Format the specialties array correctly
          const especialidadesArray = Array.isArray(usuario.especialidades)
            ? usuario.especialidades
            : [usuario.especialidades].filter(Boolean);

          setFormData({
            ...usuario,
            senha: "",
            confirmarSenha: "",
            // Ensure we're using the correct format for especialidades
            especialidades: especialidadesArray.map((esp) =>
              typeof esp === "string" ? esp : esp._id || esp,
            ),
            // Mapear dados do multi-role system
            // rolesAdicionais deve conter apenas as roles extras, não a role principal
            rolesAdicionais: (usuario.roles || []).filter(role => role !== usuario.role),
            adminTenants: usuario.admin_tenants || [],
          });
        }
      } catch (err) {
        if (err.response?.status === 401) {
          setError("Sessão expirada. Redirecionando para login...");
          setTimeout(() => logout(), 2000);
        } else {
          console.error("Erro ao carregar dados:", err);
          setError("Erro ao carregar dados");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, logout]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Handler para mudanças nas roles adicionais
  const handleRolesAdicionaisChange = (selectedOptions) => {
    const rolesIds = selectedOptions
      ? selectedOptions.map((option) => option.value)
      : [];
    setFormData((prev) => ({
      ...prev,
      rolesAdicionais: rolesIds,
    }));
  };

  // Handler para mudanças nos admin tenants
  const handleAdminTenantsChange = (selectedOptions) => {
    const tenantsIds = selectedOptions
      ? selectedOptions.map((option) => option.value)
      : [];
    setFormData((prev) => ({
      ...prev,
      adminTenants: tenantsIds,
    }));
  };

  // Função para obter cor da role
  const getRoleColor = (roleValue) => {
    const role = rolesDisponiveis.find(r => r.value === roleValue);
    return role ? role.color : 'bg-gray-100 text-gray-800';
  };

  // Função para obter label da role
  const getRoleLabel = (roleValue) => {
    const role = rolesDisponiveis.find(r => r.value === roleValue);
    return role ? role.label : roleValue;
  };

  // Verificar se usuário tem role de médico (principal ou adicional)
  const temRoleMedico = () => {
    return formData.role === 'medico' || formData.rolesAdicionais.includes('medico');
  };

  // Effect para limpar campos médicos quando não há role médica
  useEffect(() => {
    if (!temRoleMedico()) {
      setFormData(prev => ({
        ...prev,
        crm: "",
        especialidades: []
      }));
    }
  }, [formData.role, formData.rolesAdicionais]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    // Validação específica para médicos
    if (temRoleMedico()) {
      if (!formData.crm.trim()) {
        setError("CRM é obrigatório para médicos");
        setLoading(false);
        return;
      }
      if (!formData.especialidades || formData.especialidades.length === 0) {
        setError("Pelo menos uma especialidade é obrigatória para médicos");
        setLoading(false);
        return;
      }
    }

    // Validação de senhas
    if (!id && formData.senha !== formData.confirmarSenha) {
      setError("Senhas não coincidem");
      setLoading(false);
      return;
    }

    try {
      const payload = {
        ...formData,
        tenant_id:
          formData.role === "adminMaster"
            ? []
            : temRoleMedico() // Usar a função que verifica role médica (principal ou adicional)
              ? formData.tenant_id
              : formData.tenant_id[0],
        confirmarSenha: undefined,
        especialidades: formData.especialidades.map((id) => ({ _id: id })),
        // Incluir novos campos do multi-role system
        // roles deve conter a role principal + roles adicionais
        roles: [formData.role, ...(formData.rolesAdicionais || [])].filter((role, index, arr) => arr.indexOf(role) === index),
        admin_tenants: formData.adminTenants || []
      };

      // Limpar campos que não devem ser enviados
      delete payload.rolesAdicionais;
      delete payload.adminTenants;

      if (id) {
        await api.put(`/usuarios/${id}`, payload);
        setSuccess("Usuário atualizado com sucesso!");
      } else {
        await api.post("/usuarios", payload);
        setSuccess("Usuário criado com sucesso!");
      }

      setTimeout(() => navigate("/adminmaster/usuarios"), 1500);
    } catch (err) {
      setError(
        err.response?.data?.erro || err.message || "Erro ao salvar usuário",
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading && id) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800 mx-auto"></div>
          <p className="mt-4 text-slate-600 font-medium">
            Carregando dados do usuário...
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
              onClick={() => navigate("/adminmaster/usuarios")}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-white/50 rounded-lg transition-all duration-200"
            >
              <IoArrowBack className="text-xl" />
            </button>

            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                {id ? "Editar Usuário" : "Novo Usuário"}
              </h1>
              <p className="text-slate-500 mt-1">
                {id
                  ? "Atualize as informações do usuário"
                  : "Cadastre um novo usuário no sistema"}
              </p>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border-l-4 border-red-500 rounded-lg">
            <FiAlertCircle className="text-red-500 flex-shrink-0" />
            <p className="text-red-700 font-medium">{error}</p>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-3 px-4 py-3 bg-green-50 border-l-4 border-green-500 rounded-lg">
            <FiCheckCircle className="text-green-500 flex-shrink-0" />
            <p className="text-green-700 font-medium">{success}</p>
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
                <FiUser className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-800">
                  Informações do Usuário
                </h2>
                <p className="text-sm text-slate-500">
                  Preencha os dados do usuário
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Nome <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="nome"
                  value={formData.nome}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  {id ? "Nova Senha" : "Senha"}{" "}
                  {!id && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="password"
                  name="senha"
                  value={formData.senha}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                  required={!id}
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  {id ? "Confirmar Nova Senha" : "Confirmar Senha"}{" "}
                  {!id && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="password"
                  name="confirmarSenha"
                  value={formData.confirmarSenha}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                  required={!id}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Função <span className="text-red-500">*</span>
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                  required
                >
                  <option value="">Selecione uma função</option>
                  <option value="medico">Médico</option>
                  <option value="tecnico">Técnico</option>
                  <option value="admin">Admin</option>
                  <option value="adminMaster">Admin Master</option>
                  <option value="recepcionista">Recepcionista</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Empresa{" "}
                  {formData.role !== "adminMaster" && (
                    <span className="text-red-500">*</span>
                  )}
                </label>
                {formData.role !== "adminMaster" ? (
                  <Select
                    isMulti={temRoleMedico()} // Usar função que verifica role médica
                    name="tenant_id"
                    options={tenants.map((tenant) => ({
                      value: tenant._id,
                      label: tenant.nomeFantasia,
                    }))}
                    className="basic-multi-select text-slate-800"
                    classNamePrefix="select"
                    onChange={(selectedOptions) => {
                      const newTenantIds = Array.isArray(selectedOptions)
                        ? selectedOptions.map((option) => option.value)
                        : selectedOptions
                          ? [selectedOptions.value]
                          : [];
                      setFormData((prev) => ({
                        ...prev,
                        tenant_id: newTenantIds,
                      }));
                    }}
                    value={tenants
                      .filter(
                        (tenant) =>
                          Array.isArray(formData.tenant_id) &&
                          formData.tenant_id.includes(tenant._id),
                      )
                      .map((tenant) => ({
                        value: tenant._id,
                        label: tenant.nomeFantasia,
                      }))}
                  />
                ) : (
                  <p className="text-sm text-slate-500 italic py-2">
                    Não aplicável para Admin Master
                  </p>
                )}
                <p className="text-xs text-slate-500">
                  {temRoleMedico() 
                    ? "Médicos podem ser vinculados a múltiplas empresas"
                    : "Selecione a empresa do usuário"
                  }
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Status do Usuário
                </label>
                <div className="flex items-center space-x-6">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="ativo"
                      value="true"
                      checked={formData.ativo === true}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, ativo: true }))
                      }
                      className="sr-only"
                    />
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        formData.ativo === true
                          ? "border-green-500 bg-green-500"
                          : "border-slate-300"
                      }`}
                    >
                      {formData.ativo === true && (
                        <div className="w-2 h-2 rounded-full bg-white"></div>
                      )}
                    </div>
                    <span
                      className={`ml-2 text-sm font-medium ${
                        formData.ativo === true
                          ? "text-green-700"
                          : "text-slate-600"
                      }`}
                    >
                      Ativo
                    </span>
                  </label>

                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="ativo"
                      value="false"
                      checked={formData.ativo === false}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, ativo: false }))
                      }
                      className="sr-only"
                    />
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        formData.ativo === false
                          ? "border-red-500 bg-red-500"
                          : "border-slate-300"
                      }`}
                    >
                      {formData.ativo === false && (
                        <div className="w-2 h-2 rounded-full bg-white"></div>
                      )}
                    </div>
                    <span
                      className={`ml-2 text-sm font-medium ${
                        formData.ativo === false
                          ? "text-red-700"
                          : "text-slate-600"
                      }`}
                    >
                      Inativo
                    </span>
                  </label>
                </div>
                <p className="text-xs text-slate-500">
                  Usuários inativos não conseguem fazer login no sistema
                </p>
              </div>

              {/* Permissão Financeira */}
              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Permissão Financeira
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="permissaoFinanceiro"
                      value="true"
                      checked={formData.permissaoFinanceiro === true}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          permissaoFinanceiro: true,
                        }))
                      }
                      className="sr-only"
                    />
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        formData.permissaoFinanceiro === true
                          ? "border-green-500 bg-green-500"
                          : "border-slate-300"
                      }`}
                    >
                      {formData.permissaoFinanceiro === true && (
                        <div className="w-2 h-2 rounded-full bg-white"></div>
                      )}
                    </div>
                    <span
                      className={`ml-2 text-sm font-medium ${
                        formData.permissaoFinanceiro === true
                          ? "text-green-700"
                          : "text-slate-600"
                      }`}
                    >
                      Permitir
                    </span>
                  </label>

                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="permissaoFinanceiro"
                      value="false"
                      checked={formData.permissaoFinanceiro === false}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          permissaoFinanceiro: false,
                        }))
                      }
                      className="sr-only"
                    />
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        formData.permissaoFinanceiro === false
                          ? "border-red-500 bg-red-500"
                          : "border-slate-300"
                      }`}
                    >
                      {formData.permissaoFinanceiro === false && (
                        <div className="w-2 h-2 rounded-full bg-white"></div>
                      )}
                    </div>
                    <span
                      className={`ml-2 text-sm font-medium ${
                        formData.permissaoFinanceiro === false
                          ? "text-red-700"
                          : "text-slate-600"
                      }`}
                    >
                      Negar
                    </span>
                  </label>
                </div>
                <p className="text-xs text-slate-500">
                  Permite que o usuário acesse módulos financeiros, incluindo
                  relatórios de pagamentos e configuração de valores
                </p>
              </div>
            </div>
          </div>

          {/* Seção Multi-Role System */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-purple-50 to-indigo-50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-purple-600 text-white flex items-center justify-center">
                  <FaUserShield className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-800">
                    Gerenciamento de Permissões
                  </h2>
                  <p className="text-sm text-slate-500">
                    Configure roles adicionais e permissões administrativas específicas
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Roles Adicionais */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  <div className="flex items-center gap-2 mb-1">
                    <FaUsers className="text-purple-600" />
                    Roles Adicionais
                  </div>
                </label>
                <Select
                  isMulti
                  name="rolesAdicionais"
                  options={rolesDisponiveis
                    .filter(role => role.value !== formData.role) // Não mostrar a role principal
                    .map(role => ({ value: role.value, label: role.label }))}
                  value={rolesDisponiveis
                    .filter(role => formData.rolesAdicionais.includes(role.value))
                    .map(role => ({ value: role.value, label: role.label }))}
                  onChange={handleRolesAdicionaisChange}
                  className="basic-multi-select text-slate-800"
                  classNamePrefix="select"
                  placeholder="Selecione roles adicionais"
                  noOptionsMessage={() => "Nenhuma role disponível"}
                  styles={{
                    control: (provided, state) => ({
                      ...provided,
                      minHeight: "42px",
                      borderColor: state.isFocused ? "#7c3aed" : "#cbd5e1",
                      boxShadow: state.isFocused
                        ? "0 0 0 2px rgba(124, 58, 237, 0.2)"
                        : "none",
                      "&:hover": {
                        borderColor: "#7c3aed",
                      },
                    }),
                    multiValue: (provided) => ({
                      ...provided,
                      backgroundColor: "#ede9fe",
                      border: "1px solid #c4b5fd",
                    }),
                    multiValueLabel: (provided) => ({
                      ...provided,
                      color: "#5b21b6",
                      fontWeight: "500",
                    }),
                    multiValueRemove: (provided) => ({
                      ...provided,
                      color: "#7c3aed",
                      "&:hover": {
                        backgroundColor: "#ddd6fe",
                        color: "#6d28d9",
                      },
                    }),
                  }}
                />
                <p className="text-xs text-slate-500">
                  O usuário terá todas as permissões das roles selecionadas além da role principal
                </p>
                
                {/* Preview das roles selecionadas */}
                {formData.rolesAdicionais.length > 0 && (
                  <div className="mt-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <p className="text-sm font-medium text-purple-800 mb-2">Roles Ativas:</p>
                    <div className="flex flex-wrap gap-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(formData.role)}`}>
                        {getRoleLabel(formData.role)} (Principal)
                      </span>
                      {formData.rolesAdicionais.map(role => (
                        <span key={role} className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(role)}`}>
                          {getRoleLabel(role)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Admin Tenants - apenas para usuários com role admin */}
              {(formData.role === 'admin' || formData.rolesAdicionais.includes('admin')) && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">
                    <div className="flex items-center gap-2 mb-1">
                      <FaBuilding className="text-indigo-600" />
                      Permissões de Admin por Tenant
                    </div>
                  </label>
                  <Select
                    isMulti
                    name="adminTenants"
                    options={tenants.map(tenant => ({ 
                      value: tenant._id, 
                      label: tenant.nomeFantasia || tenant.nome 
                    }))}
                    value={tenants
                      .filter(tenant => formData.adminTenants.includes(tenant._id))
                      .map(tenant => ({ 
                        value: tenant._id, 
                        label: tenant.nomeFantasia || tenant.nome 
                      }))}
                    onChange={handleAdminTenantsChange}
                    className="basic-multi-select text-slate-800"
                    classNamePrefix="select"
                    placeholder="Selecione os tenants para administração"
                    noOptionsMessage={() => "Nenhum tenant disponível"}
                    styles={{
                      control: (provided, state) => ({
                        ...provided,
                        minHeight: "42px",
                        borderColor: state.isFocused ? "#6366f1" : "#cbd5e1",
                        boxShadow: state.isFocused
                          ? "0 0 0 2px rgba(99, 102, 241, 0.2)"
                          : "none",
                        "&:hover": {
                          borderColor: "#6366f1",
                        },
                      }),
                      multiValue: (provided) => ({
                        ...provided,
                        backgroundColor: "#e0e7ff",
                        border: "1px solid #c7d2fe",
                      }),
                      multiValueLabel: (provided) => ({
                        ...provided,
                        color: "#3730a3",
                        fontWeight: "500",
                      }),
                      multiValueRemove: (provided) => ({
                        ...provided,
                        color: "#6366f1",
                        "&:hover": {
                          backgroundColor: "#c7d2fe",
                          color: "#4338ca",
                        },
                      }),
                    }}
                  />
                  <p className="text-xs text-slate-500">
                    Configure permissões específicas por tenant. 
                    Deixe vazio para acesso padrão baseado no tenant do usuário.
                  </p>
                  
                  {/* Preview dos tenants admin */}
                  {formData.adminTenants.length > 0 && (
                    <div className="mt-3 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                      <p className="text-sm font-medium text-indigo-800 mb-2">Tenants com Permissão Admin:</p>
                      <div className="space-y-1">
                        {formData.adminTenants.map(tenantId => {
                          const tenant = tenants.find(t => t._id === tenantId);
                          return tenant ? (
                            <div key={tenantId} className="flex items-center text-sm text-indigo-700">
                              <FaBuilding className="h-3 w-3 mr-2" />
                              {tenant.nomeFantasia || tenant.nome}
                            </div>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Seção Informações Médicas */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-green-50 to-emerald-50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-green-600 text-white flex items-center justify-center">
                  <FaStethoscope className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-800">
                    Informações Médicas
                  </h2>
                  <p className="text-sm text-slate-500">
                    Configurações específicas para médicos
                  </p>
                </div>
              </div>
            </div>

            {temRoleMedico() && (
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Campo CRM */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">
                    CRM <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="crm"
                    value={formData.crm}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                    required={temRoleMedico()}
                    placeholder="Digite o CRM do médico (ex: CRM/SP 123456)"
                  />
                </div>

                {/* Campo Especialidades */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Especialidades <span className="text-red-500">*</span>
                  </label>
                  <Select
                    isMulti
                    name="especialidades"
                    options={especialidades.map((especialidade) => ({
                      value: especialidade._id,
                      label: especialidade.nome,
                    }))}
                    value={formData.especialidades
                      .map((espId) => {
                        const esp = especialidades.find(
                          (e) => e._id === espId,
                        );
                        return esp
                          ? { value: esp._id, label: esp.nome }
                          : null;
                      })
                      .filter(Boolean)}
                    onChange={(selectedOptions) =>
                      setFormData((prev) => ({
                        ...prev,
                        especialidades: selectedOptions
                          ? selectedOptions.map((option) => option.value)
                          : [],
                      }))
                    }
                    className="basic-multi-select text-slate-800"
                    classNamePrefix="select"
                    isLoading={loading}
                    placeholder="Selecione as especialidades"
                    noOptionsMessage={() =>
                      "Nenhuma especialidade encontrada"
                    }
                    styles={{
                      control: (provided, state) => ({
                        ...provided,
                        minHeight: "42px",
                        borderColor: state.isFocused ? "#10b981" : "#cbd5e1",
                        boxShadow: state.isFocused
                          ? "0 0 0 2px rgba(16, 185, 129, 0.2)"
                          : "none",
                        "&:hover": {
                          borderColor: "#10b981",
                        },
                      }),
                      multiValue: (provided) => ({
                        ...provided,
                        backgroundColor: "#d1fae5",
                        border: "1px solid #a7f3d0",
                      }),
                      multiValueLabel: (provided) => ({
                        ...provided,
                        color: "#065f46",
                        fontWeight: "500",
                      }),
                      multiValueRemove: (provided) => ({
                        ...provided,
                        color: "#10b981",
                        "&:hover": {
                          backgroundColor: "#a7f3d0",
                          color: "#047857",
                        },
                      }),
                    }}
                  />
                  <p className="text-xs text-slate-500">
                    Selecione uma ou mais especialidades do médico
                  </p>
                </div>
              </div>
            )}

            {/* Informação adicional para médicos */}
            {temRoleMedico() && (
              <div className="px-6 pb-6">
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <FaStethoscope className="text-emerald-500 mr-3 h-5 w-5 mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="text-emerald-800 font-semibold mb-2">
                        Informações Importantes
                      </h3>
                      <ul className="text-emerald-700 text-sm space-y-1">
                        <li>• O médico será vinculado às empresas selecionadas</li>
                        <li>• CRM e especialidades são obrigatórios para médicos</li>
                        <li>• O CRM deve seguir o padrão: CRM/UF NÚMERO</li>
                        {formData.rolesAdicionais.includes('medico') && formData.role !== 'medico' && (
                          <li className="text-emerald-800 font-medium">
                            • Campos médicos são obrigatórios devido à role adicional "Médico"
                          </li>
                        )}
                        {formData.role === 'medico' && (
                          <li className="text-emerald-800 font-medium">
                            • Campos médicos são obrigatórios devido à role principal "Médico"
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
            <button
              type="button"
              onClick={() => navigate("/adminmaster/usuarios")}
              className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`inline-flex items-center px-4 py-2 bg-slate-800 text-white rounded-lg font-medium shadow-sm transition-all duration-200 ${
                loading ? "opacity-75 cursor-not-allowed" : "hover:bg-slate-700"
              }`}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Processando...
                </>
              ) : id ? (
                "Atualizar Usuário"
              ) : (
                "Criar Usuário"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
