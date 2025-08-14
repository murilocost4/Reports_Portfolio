import React, { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import api from "../../../api";
import Tabela from "../../../components/Tabela";
import {
  FiEdit,
  FiTrash,
  FiEye,
  FiPlus,
  FiUser,
  FiSearch,
  FiAlertCircle,
} from "react-icons/fi";
import UsuarioDetails from "./UsuarioDetails";
import { useAuth } from "../../../contexts/AuthContext";

const UsuarioList = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [selectedUsuario, setSelectedUsuario] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Estados para paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalUsuarios, setTotalUsuarios] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  
  const { usuario } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsuarios();
  }, [currentPage, searchTerm]);

  const fetchUsuarios = async () => {
    try {
      setLoading(true);
      
      // Construir parâmetros da consulta
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
      });
      
      // Adicionar filtro de busca se houver
      if (searchTerm.trim()) {
        params.append('nome', searchTerm.trim());
      }
      
      const response = await api.get(`/usuarios?${params.toString()}`);
      
      setUsuarios(response.data.usuarios);
      setTotalUsuarios(response.data.total);
      setTotalPages(response.data.totalPaginas);
    } catch (err) {
      console.error("Erro:", err);
      if (err.response?.status === 401) {
        setError("Token inválido ou expirado. Faça login novamente.");
      } else if (err.response?.status === 403) {
        setError(
          "Acesso negado. Você não tem permissão para acessar esta página.",
        );
      } else {
        setError("Erro ao carregar usuários");
      }
    } finally {
      setLoading(false);
    }
  };

  // Função para lidar com mudança de página
  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Função para lidar com mudança no termo de busca
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setCurrentPage(1); // Resetar para primeira página ao buscar
  };

  const handleToggleStatus = async (usuario) => {
    const novoStatus = !usuario.ativo;
    const acao = novoStatus ? 'ativar' : 'desativar';
    
    if (window.confirm(`Tem certeza que deseja ${acao} o usuário ${usuario.nome}?`)) {
      try {
        setLoading(true);
        setError('');
        
        await api.put(`/usuarios/${usuario._id}`, {
          ...usuario,
          ativo: novoStatus
        });
        
        // Atualizar usuário na lista local
        setUsuarios(usuarios.map(u => 
          u._id === usuario._id 
            ? { ...u, ativo: novoStatus }
            : u
        ));
        
        alert(`Usuário ${usuario.nome} foi ${acao === 'ativar' ? 'ativado' : 'desativado'} com sucesso.`);
        
        // Recarregar a lista para manter consistência
        await fetchUsuarios();
        
      } catch (error) {
        console.error(`Erro ao ${acao} usuário:`, error);
        const mensagemErro = error.response?.data?.erro || `Erro ao ${acao} usuário`;
        alert(mensagemErro);
        setError(mensagemErro);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDelete = async (usuario) => {
    // Criar mensagem de confirmação personalizada
    let mensagemConfirmacao = `Tem certeza que deseja excluir o usuário ${usuario.nome}?`;
    
    if (usuario.role === 'medico') {
      mensagemConfirmacao += '\n\nAVISO: Este é um médico. A exclusão pode afetar exames e laudos associados.';
    }
    
    if (usuario.isAdminMaster) {
      mensagemConfirmacao += '\n\nAVISO: Este é um AdminMaster. Esta ação é irreversível.';
    }
    
    mensagemConfirmacao += '\n\nEsta ação não pode ser desfeita.';

    if (window.confirm(mensagemConfirmacao)) {
      try {
        setLoading(true);
        setError(''); // Limpar erro anterior
        
        await api.delete(`/usuarios/${usuario._id}`);
        
        // Mostrar mensagem de sucesso
        alert(`Usuário ${usuario.nome} foi excluído com sucesso.`);
        
        // Recarregar a lista
        await fetchUsuarios();
        
      } catch (error) {
        console.error("Erro ao excluir usuário:", error);
        
        const mensagemErro = error.response?.data?.erro || "Erro ao excluir usuário";
        const sugestao = error.response?.data?.sugestao;
        
        let mensagemCompleta = mensagemErro;
        if (sugestao) {
          mensagemCompleta += `\n\n${sugestao}`;
        }
        
        // Mostrar erro específico para o usuário
        alert(mensagemCompleta);
        setError(mensagemErro);
        
      } finally {
        setLoading(false);
      }
    }
  };

  const handleView = (usuario) => {
    setSelectedUsuario(usuario);
    setShowModal(true);
  };

  // Remover filtro local já que a busca é feita no backend
  // const filteredUsuarios = usuarios;

  const colunas = [
    {
      header: "Nome",
      key: "nome",
      render: (value, usuario) => (
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center">
            <FiUser className="w-4 h-4" />
          </div>
          <div>
            <span className="font-medium text-slate-900">{value}</span>
            <p className="text-sm text-slate-500">{usuario.email}</p>
          </div>
        </div>
      ),
    },
    {
      header: "Função",
      key: "role",
      render: (value) => <span className="capitalize">{value}</span>,
    },
    {
      header: "Admin Master",
      key: "isAdminMaster",
      render: (value) => (
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            value
              ? "bg-purple-100 text-purple-700"
              : "bg-slate-100 text-slate-700"
          }`}
        >
          {value ? "Sim" : "Não"}
        </span>
      ),
    },
    {
      header: "Status",
      key: "ativo",
      render: (value) => (
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            value !== false
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {value !== false ? "Ativo" : "Inativo"}
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
      acao: (usuario) =>
        navigate(`/adminmaster/usuarios/editar/${usuario._id}`),
      style: "bg-slate-700 text-white hover:bg-slate-600",
    },
    {
      label: "Excluir",
      icon: <FiTrash />,
      acao: handleDelete,
      style: "bg-red-600 text-white hover:bg-red-700",
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800 mx-auto"></div>
          <p className="mt-4 text-slate-600 font-medium">
            Carregando usuários...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-100 p-6 flex items-center justify-center">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg max-w-lg w-full">
          <div className="flex items-center">
            <FiAlertCircle className="text-red-500 mr-3" />
            <p className="text-red-700 font-medium">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Title Section */}
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Gestão de Usuários
          </h1>
          <p className="text-slate-500 mt-1">
            Gerencie todos os usuários cadastrados no sistema
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
              placeholder="Buscar por nome ou email..."
              className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white text-slate-900 placeholder-slate-400"
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>

          {/* Add New User Button */}
          <Link
            to="/adminmaster/usuarios/novo"
            className="inline-flex items-center justify-center px-4 py-2.5 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors duration-200 font-medium shadow-sm"
          >
            <FiPlus className="w-5 h-5 mr-2" />
            Adicionar Novo Usuário
          </Link>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
          <Tabela
            colunas={colunas}
            dados={usuarios}
            acoes={acoes}
            paginacao={{
              total: totalUsuarios,
              totalPaginas: totalPages,
              paginaAtual: currentPage,
              limite: itemsPerPage
            }}
            onPageChange={handlePageChange}
            mensagemSemDados={
              loading
                ? "Carregando usuários..."
                : searchTerm
                  ? "Nenhum usuário encontrado para sua busca."
                  : "Nenhum usuário cadastrado."
            }
          />
        </div>
      </div>

      {showModal && selectedUsuario && (
        <UsuarioDetails
          usuario={selectedUsuario}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
};

export default UsuarioList;
