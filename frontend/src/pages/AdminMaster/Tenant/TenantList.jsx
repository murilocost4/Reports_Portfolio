import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../../api";
import Tabela from "../../../components/Tabela";
import {
  FiEdit,
  FiTrash,
  FiEye,
  FiPlus,
  FiBriefcase,
  FiSearch,
} from "react-icons/fi";
import TenantDetails from "./TenantDetails";

const TenantList = () => {
  const [tenants, setTenants] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTenants = async () => {
      try {
        setIsLoading(true);
        const response = await api.get("/tenants");
        setTenants(response.data);
      } catch (error) {
        console.error("Erro ao buscar tenants:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTenants();
  }, []);

  const handleDelete = async (tenant) => {
    if (
      window.confirm(
        `Tem certeza que deseja excluir a empresa ${tenant.nomeFantasia}?`,
      )
    ) {
      try {
        await api.delete(`/tenants/${tenant._id}`);
        setTenants(tenants.filter((t) => t._id !== tenant._id));
      } catch (error) {
        console.error("Erro ao excluir tenant:", error);
      }
    }
  };

  const handleView = (tenant) => {
    setSelectedTenant(tenant);
    setShowModal(true);
  };

  const filteredTenants = tenants.filter(
    (tenant) =>
      tenant.nomeFantasia.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.cnpj.includes(searchTerm),
  );

  const colunas = [
    {
      header: "Nome Fantasia",
      key: "nomeFantasia",
      render: (value, tenant) => (
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center">
            <FiBriefcase className="w-4 h-4" />
          </div>
          <span className="font-medium">{value}</span>
        </div>
      ),
    },
    { header: "CNPJ", key: "cnpj" },
    {
      header: "Status",
      key: "status",
      render: (value) => (
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            value === "Ativo"
              ? "bg-green-100 text-green-700"
              : value === "Inativo"
                ? "bg-red-100 text-red-700"
                : "bg-yellow-100 text-yellow-700"
          }`}
        >
          {value}
        </span>
      ),
    },
    {
      header: "Data de Cadastro",
      key: "dataCadastro",
      render: (value) => (
        <span className="text-slate-600">
          {new Date(value).toLocaleDateString()}
        </span>
      ),
    },
  ];

  const acoes = [
    {
      label: "Ver",
      icon: <FiEye />,
      acao: handleView,
      style: "bg-slate-800 text-white hover:bg-slate-700",
    },
    {
      label: "Editar",
      icon: <FiEdit />,
      acao: (tenant) => navigate(`/adminmaster/empresas/editar/${tenant._id}`),
      style: "bg-slate-700 text-white hover:bg-slate-600",
    },
    {
      label: "Excluir",
      icon: <FiTrash />,
      acao: handleDelete,
      style: "bg-red-600 text-white hover:bg-red-700",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Title Section */}
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Gestão de Empresas
          </h1>
          <p className="text-slate-500 mt-1">
            Gerencie todas as empresas cadastradas no sistema
          </p>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiSearch className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar por nome ou CNPJ..."
              className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white text-slate-900 placeholder-slate-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Add New Company Button */}
          <Link
            to="/adminmaster/empresas/novo"
            className="inline-flex items-center justify-center px-4 py-2.5 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors duration-200 font-medium shadow-sm"
          >
            <FiPlus className="w-5 h-5 mr-2" />
            Adicionar Nova Empresa
          </Link>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
          <Tabela
            colunas={colunas}
            dados={filteredTenants}
            acoes={acoes}
            mensagemSemDados={
              isLoading
                ? "Carregando empresas..."
                : searchTerm
                  ? "Nenhuma empresa encontrada para sua busca."
                  : "Nenhuma empresa cadastrada."
            }
          />
        </div>
      </div>

      {/* Modal */}
      {showModal && selectedTenant && (
        <TenantDetails
          tenant={selectedTenant}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
};

export default TenantList;
