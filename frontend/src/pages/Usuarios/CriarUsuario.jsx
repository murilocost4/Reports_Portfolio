import React, { useState, useEffect } from "react";
import api from "../../api";
import { useParams, useNavigate } from "react-router-dom";
import {
  IoArrowBack,
  IoPersonOutline,
  IoDocumentTextOutline,
  IoLockClosedOutline,
  IoMailOutline,
  IoMedicalOutline,
  IoWarningOutline,
  IoSchoolOutline,
  IoShieldCheckmarkOutline,
} from "react-icons/io5";
import {
  FaUserAlt,
  FaUserShield,
  FaUserMd,
  FaUsers,
  FaStethoscope,
  FaBuilding,
} from "react-icons/fa";
import { useAuth } from "../../contexts/AuthContext";
import Select from "react-select";

const CriarUsuario = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { logout, tenant_id, temRole, usuario } = useAuth();
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    senha: "",
    role: "tecnico",
    crm: "",
    especialidades: [],
    ativo: true,
    permissaoFinanceiro: false,
    // Novos campos para multi-role system
    rolesAdicionais: [],
    adminTenants: [],
  });
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [avisoMedico, setAvisoMedico] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [verificandoMedico, setVerificandoMedico] = useState(false);
  const [especialidadesDisponiveis, setEspecialidadesDisponiveis] = useState(
    [],
  );
  const [loadingEspecialidades, setLoadingEspecialidades] = useState(false);

  // Estados para gerenciamento de roles e tenants
  const [tenantsDisponiveis, setTenantsDisponiveis] = useState([]);
  const [loadingTenants, setLoadingTenants] = useState(false);

  // Definições de roles disponíveis
  const rolesDisponiveis = [
    { value: 'medico', label: 'Médico', color: 'bg-green-100 text-green-800' },
    { value: 'tecnico', label: 'Técnico', color: 'bg-blue-100 text-blue-800' },
    { value: 'admin', label: 'Administrador', color: 'bg-purple-100 text-purple-800' },
    { value: 'recepcionista', label: 'Recepcionista', color: 'bg-yellow-100 text-yellow-800' },
    ...(temRole('adminMaster') ? [{ value: 'adminMaster', label: 'Admin Master', color: 'bg-red-100 text-red-800' }] : [])
  ];

  // Sistema de cores moderno - Blue/Gray
  const COLORS = {
    primary: "#2563eb", // blue-600
    primaryLight: "#60a5fa", // blue-400
    primaryDark: "#1d4ed8", // blue-700
    secondary: "#10B981", // emerald-500
    accent: "#6366f1", // indigo-500
    warning: "#F59E0B",
    danger: "#EF4444",
    background: "#f9fafb", // gray-50
    cardBg: "#FFFFFF",
    text: "#0f172a", // slate-900
    muted: "#64748b", // slate-500
    border: "#e2e8f0", // slate-200
  };

  // Verificar se o usuário está editando seu próprio perfil
  const isEditandoProprioUsuario = () => {
    return modoEdicao && id && usuario && (usuario.id === id || usuario._id === id);
  };

  // Verificar se pode editar roles (apenas admins ou quando não está editando a si mesmo)
  const podeEditarRoles = () => {
    return (temRole('admin') || temRole('adminMaster')) && !isEditandoProprioUsuario();
  };

  // Verificar se pode editar permissão financeira (apenas quando não está editando a si mesmo)
  const podeEditarPermissaoFinanceira = () => {
    return !isEditandoProprioUsuario();
  };

  // Verificar se pode alterar status ativo (apenas quando não está editando a si mesmo)
  const podeEditarStatusAtivo = () => {
    return !isEditandoProprioUsuario();
  };

  useEffect(() => {
    // Carregar especialidades quando o componente monta
    const fetchEspecialidades = async () => {
      try {
        setLoadingEspecialidades(true);
        const response = await api.get("/especialidades");
        if (response.data) {
          setEspecialidadesDisponiveis(response.data);
        }
      } catch (err) {
        console.error("Erro ao carregar especialidades");
      } finally {
        setLoadingEspecialidades(false);
      }
    };

    // Carregar lista de tenants disponíveis se for admin ou adminMaster
    const fetchTenants = async () => {
      if (temRole('admin') || temRole('adminMaster')) {
        try {
          setLoadingTenants(true);
          const response = await api.get("/tenants");
          if (response.data && Array.isArray(response.data)) {
            setTenantsDisponiveis(response.data);
          }
        } catch (err) {
          console.error("Erro ao carregar tenants");
        } finally {
          setLoadingTenants(false);
        }
      }
    };

    fetchEspecialidades();
    fetchTenants();
  }, [temRole]);

  useEffect(() => {
    if (id) {
      const fetchUsuario = async () => {
        try {
          setIsLoading(true);
          setErro("");

          const response = await api.get(`/usuarios/${id}`);
          const userData = response.data;

          setFormData({
            ...userData,
            especialidades: userData.especialidades
              ? userData.especialidades.map((esp) => esp._id || esp)
              : [],
            // Mapear dados do multi-role system
            // rolesAdicionais deve conter apenas as roles extras, não a role principal
            rolesAdicionais: (userData.roles || []).filter(role => role !== userData.role),
            adminTenants: userData.admin_tenants || [],
          });
          setModoEdicao(true);
        } catch (err) {
          if (err.response?.status === 401) {
            setErro("Sessão expirada. Redirecionando para login...");
            setTimeout(() => logout(), 2000);
          } else {
            setErro("Erro ao carregar dados do usuário. Tente novamente.");
          }
        } finally {
          setIsLoading(false);
        }
      };
      fetchUsuario();
    }
  }, [id, logout]);

  // Verificar se médico já existe quando email ou CRM são alterados
  useEffect(() => {
    const verificarMedicoExistente = async () => {
      if (
        temRoleMedico() &&
        !modoEdicao &&
        (formData.email || formData.crm)
      ) {
        if (
          formData.email &&
          formData.email.includes("@") &&
          formData.email.includes(".")
        ) {
          setVerificandoMedico(true);
          try {
            // Preparar parâmetros apenas com valores válidos
            const params = {};
            if (formData.email && formData.email.trim()) {
              params.email = formData.email.trim();
            }
            if (formData.crm && formData.crm.trim()) {
              params.crm = formData.crm.trim();
            }

            const response = await api.get(`/usuarios/verificar-medico`, {
              params
            });

            if (response.data.exists) {
              setAvisoMedico(
                "Este médico já está cadastrado no sistema. Para liberar o acesso deste profissional para sua empresa, entre em contato com o suporte do sistema através do email: suporte@laudofy.com",
              );
            } else {
              setAvisoMedico("");
            }
          } catch (err) {
            console.error("Erro ao verificar médico");
            setAvisoMedico("");
          } finally {
            setVerificandoMedico(false);
          }
        }
      } else {
        setAvisoMedico("");
      }
    };

    const timeoutId = setTimeout(verificarMedicoExistente, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.email, formData.crm, formData.role, formData.rolesAdicionais, modoEdicao]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEspecialidadesChange = (selectedOptions) => {
    const especialidadesIds = selectedOptions
      ? selectedOptions.map((option) => option.value)
      : [];
    setFormData((prev) => ({
      ...prev,
      especialidades: especialidadesIds,
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
      setAvisoMedico("");
    }
  }, [formData.role, formData.rolesAdicionais]);

  const validarFormulario = () => {
    if (!formData.email.includes("@") || !formData.email.includes(".")) {
      setErro("Por favor, insira um email válido.");
      return false;
    }

    if (!modoEdicao && !formData.senha) {
      setErro("A senha é obrigatória para novo usuário.");
      return false;
    }

    if (temRoleMedico()) {
      if (!formData.crm || formData.crm.trim() === "") {
        setErro("O CRM é obrigatório para médicos.");
        return false;
      }

      if (!formData.especialidades || formData.especialidades.length === 0) {
        setErro("Pelo menos uma especialidade é obrigatória para médicos.");
        return false;
      }

      if (avisoMedico) {
        setErro(
          "Não é possível cadastrar este médico. Verifique as informações acima.",
        );
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validarFormulario()) {
      return;
    }

    setIsLoading(true);
    setErro("");
    setMensagem("");

    try {
      const usuarioData = { 
        ...formData, 
        tenant_id,
        // Incluir novos campos do multi-role system
        // roles deve conter a role principal + roles adicionais
        roles: [formData.role, ...(formData.rolesAdicionais || [])].filter((role, index, arr) => arr.indexOf(role) === index),
        admin_tenants: formData.adminTenants || []
      };

      if (modoEdicao && !usuarioData.senha) {
        delete usuarioData.senha;
      }

      // VALIDAÇÕES DE SEGURANÇA: Remover campos que o usuário não pode modificar em si mesmo
      if (isEditandoProprioUsuario()) {
        // Usuário não pode alterar sua própria role, permissões financeiras, status ativo ou roles adicionais
        delete usuarioData.role;
        delete usuarioData.permissaoFinanceiro;
        delete usuarioData.ativo;
        delete usuarioData.roles;
        delete usuarioData.admin_tenants;
        
      }

      // Só manter campos médicos se usuário tem role médica (principal ou adicional)
      if (!temRoleMedico()) {
        delete usuarioData.crm;
        delete usuarioData.especialidades;
      }

      // Limpar campos que não devem ser enviados
      delete usuarioData.rolesAdicionais;
      delete usuarioData.adminTenants;

      if (modoEdicao) {
        await api.put(`/usuarios/${id}`, usuarioData);
        setMensagem("Usuário atualizado com sucesso!");
      } else {
        await api.post("/usuarios", usuarioData);
        setMensagem("Usuário cadastrado com sucesso!");
      }

      setTimeout(() => navigate("/usuarios"), 1500);
    } catch (err) {
      if (err.response?.status === 401) {
        setErro("Sessão expirada. Redirecionando para login...");
        setTimeout(() => logout(), 2000);
      } else if (err.response?.data?.errors) {
        const errorMessages = err.response.data.errors
          .map((e) => e.msg)
          .join(", ");
        setErro(`Erro de validação: ${errorMessages}`);
      } else if (
        err.response?.data?.erro?.includes("médico já está cadastrado")
      ) {
        setErro(
          "Este médico já está cadastrado no sistema. Entre em contato com o suporte para liberação.",
        );
      } else {
        setErro(
          err.response?.data?.message ||
            err.response?.data?.erro ||
            "Erro ao salvar usuário. Tente novamente.",
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Preparar opções para o Select de especialidades
  const especialidadesOptions = especialidadesDisponiveis.map((esp) => ({
    value: esp._id,
    label: esp.nome,
  }));

  const especialidadesSelected = especialidadesDisponiveis
    .filter((esp) => formData.especialidades.includes(esp._id))
    .map((esp) => ({
      value: esp._id,
      label: esp.nome,
    }));

  if (isLoading && id) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-700 font-medium">
            Carregando dados do usuário...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/usuarios")}
              className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors"
            >
              <IoArrowBack className="text-lg" />
              <span className="font-medium">Voltar</span>
            </button>

            <div className="hidden md:block h-6 w-px bg-gray-300"></div>

            <h1 className="text-2xl font-bold text-gray-800">
              {modoEdicao ? "Editar Usuário" : "Cadastrar Novo Usuário"}
            </h1>
          </div>

          {/* Badge indicativo do tipo de operação */}
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 text-gray-700 rounded-lg border border-gray-200">
            <FaUsers className="text-sm text-blue-600" />
            <span className="text-sm font-medium">
              {modoEdicao ? "Modo Edição" : "Novo Cadastro"}
            </span>
          </div>
        </div>

        {/* Mensagens de feedback */}
        {erro && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
            <div className="flex items-center">
              <svg
                className="text-red-500 mr-2 h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-red-700">{erro}</p>
            </div>
          </div>
        )}

        {mensagem && (
          <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4 rounded-lg">
            <div className="flex items-center">
              <svg
                className="text-green-500 mr-2 h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-green-700">{mensagem}</p>
            </div>
          </div>
        )}

        {/* Aviso de segurança para auto-edição */}
        {isEditandoProprioUsuario() && (
          <div className="mb-6 bg-orange-50 border-l-4 border-orange-400 p-4 rounded-lg">
            <div className="flex items-start">
              <IoWarningOutline className="text-orange-400 mr-2 h-5 w-5 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-orange-800 font-medium mb-1">
                  Editando seu próprio perfil
                </h3>
                <p className="text-orange-700 text-sm">
                  Por razões de segurança, alguns campos como função, permissões financeiras, 
                  roles adicionais e status estão bloqueados para auto-edição. 
                  Entre em contato com um administrador se precisar modificar essas informações.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Aviso para médico existente */}
        {avisoMedico && (
          <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
            <div className="flex items-start">
              <IoWarningOutline className="text-yellow-400 mr-2 h-5 w-5 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-yellow-800 font-medium mb-1">
                  Médico já cadastrado
                </h3>
                <p className="text-yellow-700 text-sm">{avisoMedico}</p>
              </div>
            </div>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
        >
          {/* Seção Informações Básicas */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-gray-50">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <FaUserAlt className="text-blue-600" />
              Informações Básicas
            </h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Campo Nome */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <IoPersonOutline className="text-blue-600" />
                Nome Completo *
              </label>
              <input
                type="text"
                name="nome"
                value={formData.nome}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                placeholder="Digite o nome completo"
                required
              />
            </div>

            {/* Campo Email */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <IoMailOutline className="text-blue-600" />
                Email *
                {verificandoMedico && temRoleMedico() && (
                  <div className="ml-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500"></div>
                  </div>
                )}
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                placeholder="Digite o email"
                required
              />
            </div>

            {/* Campo Função */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <FaUserShield className="text-blue-600" />
                Função *
                {!podeEditarRoles() && (
                  <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded-full">
                    Não editável
                  </span>
                )}
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                disabled={!podeEditarRoles()}
                className={`w-full px-4 py-3 border text-gray-700 rounded-lg focus:outline-none transition-all ${
                  !podeEditarRoles()
                    ? "border-gray-200 bg-gray-100 cursor-not-allowed text-gray-500"
                    : "border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                }`}
                required
              >
                <option value="tecnico">Técnico</option>
                <option value="admin">Administrador</option>
                <option value="recepcionista">Recepcionista</option>
                <option value="medico">Médico</option>
              </select>
              {!podeEditarRoles() && (
                <p className="text-xs text-orange-600">
                  Você não pode alterar sua própria função
                </p>
              )}
            </div>

            {/* Campo Senha */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <IoLockClosedOutline className="text-blue-600" />
                Senha {!modoEdicao && <span className="text-red-500">*</span>}
              </label>
              <input
                type="password"
                name="senha"
                value={formData.senha}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                placeholder={
                  modoEdicao
                    ? "Deixe em branco para manter"
                    : "Digite uma senha segura"
                }
                required={!modoEdicao}
              />
              {modoEdicao && (
                <p className="mt-1 text-xs text-gray-500">
                  Deixe em branco para manter a senha atual
                </p>
              )}
            </div>

            {/* Campo Status Ativo */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <IoShieldCheckmarkOutline className="text-blue-600" />
                Status do Usuário
                {!podeEditarStatusAtivo() && (
                  <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded-full">
                    Não editável
                  </span>
                )}
              </label>
              <div className="flex items-center space-x-3">
                <label className={`flex items-center ${!podeEditarStatusAtivo() ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                  <input
                    type="radio"
                    name="ativo"
                    value="true"
                    checked={formData.ativo === true}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, ativo: true }))
                    }
                    disabled={!podeEditarStatusAtivo()}
                    className="sr-only"
                  />
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      formData.ativo === true
                        ? "border-green-500 bg-green-500"
                        : "border-gray-300"
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
                        : "text-gray-600"
                    }`}
                  >
                    Ativo
                  </span>
                </label>

                <label className={`flex items-center ${!podeEditarStatusAtivo() ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                  <input
                    type="radio"
                    name="ativo"
                    value="false"
                    checked={formData.ativo === false}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, ativo: false }))
                    }
                    disabled={!podeEditarStatusAtivo()}
                    className="sr-only"
                  />
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      formData.ativo === false
                        ? "border-red-500 bg-red-500"
                        : "border-gray-300"
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
                        : "text-gray-600"
                    }`}
                  >
                    Inativo
                  </span>
                </label>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Usuários inativos não conseguem fazer login no sistema
                {!podeEditarStatusAtivo() && (
                  <span className="block text-orange-600 mt-1">
                    Você não pode alterar seu próprio status
                  </span>
                )}
              </p>
            </div>

            {/* Campo Permissão Financeira */}
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <IoShieldCheckmarkOutline className="text-blue-600" />
                Permissão Financeira
                {!podeEditarPermissaoFinanceira() && (
                  <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded-full">
                    Não editável
                  </span>
                )}
              </label>
              <div className="flex space-x-6">
                <label className={`flex items-center ${!podeEditarPermissaoFinanceira() ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
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
                    disabled={!podeEditarPermissaoFinanceira()}
                    className="sr-only"
                  />
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      formData.permissaoFinanceiro === true
                        ? "border-green-500 bg-green-500"
                        : "border-gray-300"
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
                        : "text-gray-600"
                    }`}
                  >
                    Conceder permissão
                  </span>
                </label>

                <label className={`flex items-center ${!podeEditarPermissaoFinanceira() ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
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
                    disabled={!podeEditarPermissaoFinanceira()}
                    className="sr-only"
                  />
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      formData.permissaoFinanceiro === false
                        ? "border-red-500 bg-red-500"
                        : "border-gray-300"
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
                        : "text-gray-600"
                    }`}
                  >
                    Sem permissão
                  </span>
                </label>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Usuários com permissão financeira podem acessar módulos de
                pagamentos, relatórios financeiros e configurações de valores
                {!podeEditarPermissaoFinanceira() && (
                  <span className="block text-orange-600 mt-1">
                    Você não pode alterar suas próprias permissões financeiras
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Seção Multi-Role System - apenas para admins */}
          {(temRole('admin') || temRole('adminMaster')) && (
            <>
              <div className="px-6 py-4 border-t border-b border-gray-200 bg-gradient-to-r from-purple-50 to-indigo-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                      <FaUserShield className="text-purple-600" />
                      Gerenciamento de Permissões
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Configure roles adicionais e permissões administrativas específicas
                    </p>
                  </div>
                  {isEditandoProprioUsuario() && (
                    <div className="bg-orange-100 border border-orange-300 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <IoWarningOutline className="text-orange-600 h-5 w-5" />
                        <span className="text-sm font-medium text-orange-800">
                          Editando seu próprio perfil
                        </span>
                      </div>
                      <p className="text-xs text-orange-700 mt-1">
                        Algumas opções estão desabilitadas por segurança
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-6 space-y-6">
                {/* Roles Adicionais */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <FaUsers className="text-purple-600" />
                    Roles Adicionais
                    {!podeEditarRoles() && (
                      <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded-full">
                        Não editável
                      </span>
                    )}
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
                    isDisabled={!podeEditarRoles()}
                    className="basic-multi-select"
                    classNamePrefix="select"
                    placeholder={!podeEditarRoles() ? "Você não pode editar suas próprias roles" : "Selecione roles adicionais"}
                    noOptionsMessage={() => "Nenhuma role disponível"}
                    styles={{
                      control: (provided, state) => ({
                        ...provided,
                        minHeight: "48px",
                        borderColor: !podeEditarRoles() ? "#d1d5db" : (state.isFocused ? "#7c3aed" : "#d1d5db"),
                        backgroundColor: !podeEditarRoles() ? "#f3f4f6" : "white",
                        cursor: !podeEditarRoles() ? "not-allowed" : "default",
                        boxShadow: !podeEditarRoles() ? "none" : (state.isFocused
                          ? "0 0 0 2px rgba(124, 58, 237, 0.2)"
                          : "none"),
                        "&:hover": {
                          borderColor: !podeEditarRoles() ? "#d1d5db" : "#7c3aed",
                        },
                      }),
                      multiValue: (provided) => ({
                        ...provided,
                        backgroundColor: !podeEditarRoles() ? "#e5e7eb" : "#ede9fe",
                        border: !podeEditarRoles() ? "1px solid #d1d5db" : "1px solid #c4b5fd",
                      }),
                      multiValueLabel: (provided) => ({
                        ...provided,
                        color: !podeEditarRoles() ? "#6b7280" : "#5b21b6",
                        fontWeight: "500",
                      }),
                      multiValueRemove: (provided) => ({
                        ...provided,
                        color: !podeEditarRoles() ? "#9ca3af" : "#7c3aed",
                        cursor: !podeEditarRoles() ? "not-allowed" : "pointer",
                        "&:hover": !podeEditarRoles() ? {} : {
                          backgroundColor: "#ddd6fe",
                          color: "#6d28d9",
                        },
                      }),
                    }}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    O usuário terá todas as permissões das roles selecionadas além da role principal
                    {!podeEditarRoles() && (
                      <span className="block text-orange-600 mt-1">
                        Você não pode modificar suas próprias roles adicionais
                      </span>
                    )}
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
                {(formData.role === 'admin' || formData.rolesAdicionais.includes('admin')) && temRole('adminMaster') && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                      <FaBuilding className="text-indigo-600" />
                      Permissões de Admin por Tenant
                      {loadingTenants && (
                        <div className="ml-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-indigo-500"></div>
                        </div>
                      )}
                    </label>
                    {loadingTenants ? (
                      <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 text-sm">
                        Carregando tenants...
                      </div>
                    ) : (
                      <Select
                        isMulti
                        name="adminTenants"
                        options={tenantsDisponiveis.map(tenant => ({ 
                          value: tenant._id, 
                          label: tenant.nomeFantasia || tenant.nome 
                        }))}
                        value={tenantsDisponiveis
                          .filter(tenant => formData.adminTenants.includes(tenant._id))
                          .map(tenant => ({ 
                            value: tenant._id, 
                            label: tenant.nomeFantasia || tenant.nome 
                          }))}
                        onChange={handleAdminTenantsChange}
                        className="basic-multi-select"
                        classNamePrefix="select"
                        placeholder="Selecione os tenants para administração"
                        noOptionsMessage={() => "Nenhum tenant disponível"}
                        styles={{
                          control: (provided, state) => ({
                            ...provided,
                            minHeight: "48px",
                            borderColor: state.isFocused ? "#6366f1" : "#d1d5db",
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
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      Apenas AdminMaster pode configurar permissões específicas por tenant. 
                      Deixe vazio para acesso padrão baseado no tenant do usuário.
                    </p>
                    
                    {/* Preview dos tenants admin */}
                    {formData.adminTenants.length > 0 && (
                      <div className="mt-3 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                        <p className="text-sm font-medium text-indigo-800 mb-2">Tenants com Permissão Admin:</p>
                        <div className="space-y-1">
                          {formData.adminTenants.map(tenantId => {
                            const tenant = tenantsDisponiveis.find(t => t._id === tenantId);
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

                {/* Informações importantes */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <IoShieldCheckmarkOutline className="text-blue-500 mr-3 h-5 w-5 mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="text-blue-800 font-semibold mb-2">
                        Sistema Multi-Role
                      </h3>
                      <ul className="text-blue-700 text-sm space-y-1">
                        <li>• O usuário mantém sua role principal e ganha permissões adicionais</li>
                        <li>• Roles adicionais expandem as capacidades sem substituir a role principal</li>
                        <li>• AdminMaster pode configurar permissões específicas por tenant</li>
                        <li>• Mudanças nas permissões entram em vigor no próximo login</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Seção específica para médicos */}
          {temRoleMedico() && (
            <>
              <div className="px-6 py-4 border-t border-b border-gray-200 bg-gradient-to-r from-blue-50 to-gray-50">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <FaStethoscope className="text-blue-600" />
                  Informações Médicas
                </h2>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Campo CRM */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <IoMedicalOutline className="text-blue-600" />
                    CRM *
                    {verificandoMedico && (
                      <div className="ml-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500"></div>
                      </div>
                    )}
                  </label>
                  <input
                    type="text"
                    name="crm"
                    value={formData.crm}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="Digite o CRM do médico (ex: CRM/SP 123456)"
                    required
                  />
                </div>

                {/* Campo Especialidades */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <IoSchoolOutline className="text-blue-600" />
                    Especialidades *
                    {loadingEspecialidades && (
                      <div className="ml-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500"></div>
                      </div>
                    )}
                  </label>
                  {loadingEspecialidades ? (
                    <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 text-sm">
                      Carregando especialidades...
                    </div>
                  ) : (
                    <Select
                      isMulti
                      name="especialidades"
                      options={especialidadesOptions}
                      value={especialidadesSelected}
                      onChange={handleEspecialidadesChange}
                      className="basic-multi-select"
                      classNamePrefix="select"
                      placeholder="Selecione as especialidades"
                      noOptionsMessage={() =>
                        "Nenhuma especialidade encontrada"
                      }
                      styles={{
                        control: (provided, state) => ({
                          ...provided,
                          minHeight: "48px",
                          borderColor: state.isFocused ? "#2563eb" : "#d1d5db",
                          boxShadow: state.isFocused
                            ? "0 0 0 2px rgba(37, 99, 235, 0.2)"
                            : "none",
                          "&:hover": {
                            borderColor: "#2563eb",
                          },
                        }),
                        multiValue: (provided) => ({
                          ...provided,
                          backgroundColor: "#dbeafe",
                          border: "1px solid #93c5fd",
                        }),
                        multiValueLabel: (provided) => ({
                          ...provided,
                          color: "#1e40af",
                          fontWeight: "500",
                        }),
                        multiValueRemove: (provided) => ({
                          ...provided,
                          color: "#2563eb",
                          "&:hover": {
                            backgroundColor: "#bfdbfe",
                            color: "#1d4ed8",
                          },
                        }),
                        option: (provided, state) => ({
                          ...provided,
                          backgroundColor: state.isSelected
                            ? "#2563eb"
                            : state.isFocused
                              ? "#dbeafe"
                              : "white",
                          color: state.isSelected ? "white" : "#374151",
                          "&:hover": {
                            backgroundColor: state.isSelected
                              ? "#2563eb"
                              : "#dbeafe",
                          },
                        }),
                      }}
                    />
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Selecione uma ou mais especialidades do médico
                  </p>
                </div>
              </div>

              {/* Informação adicional */}
              <div className="px-6 pb-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <IoShieldCheckmarkOutline className="text-blue-500 mr-3 h-5 w-5 mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="text-blue-800 font-semibold mb-2">
                        Informações Importantes
                      </h3>
                      <ul className="text-blue-700 text-sm space-y-1">
                        <li>
                          • O médico será vinculado exclusivamente à sua empresa
                        </li>
                        <li>
                          • Caso já esteja cadastrado em outra empresa, entre em
                          contato com o suporte
                        </li>
                        <li>
                          • As especialidades são obrigatórias para médicos
                        </li>
                        <li>• O CRM deve seguir o padrão: CRM/UF NÚMERO</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Botão de Envio */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button
              type="submit"
              disabled={
                isLoading || (temRoleMedico() && avisoMedico)
              }
              className={`w-full py-3 rounded-lg font-semibold text-white transition-all flex items-center justify-center gap-2 ${
                isLoading || (temRoleMedico() && avisoMedico)
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-sm"
              }`}
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span>Processando...</span>
                </>
              ) : (
                <>
                  <IoDocumentTextOutline className="text-lg" />
                  <span>
                    {modoEdicao ? "Atualizar Usuário" : "Cadastrar Usuário"}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CriarUsuario;
