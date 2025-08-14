import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useSidebar } from "../contexts/SidebarContext";
import { useSidebarAdminMaster } from "../contexts/SidebarAdminMasterContext";
import { FiLogOut, FiMenu, FiInfo, FiX } from "react-icons/fi";
import Modal from "react-modal";

// Modal styles
const customStyles = {
  overlay: {
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    zIndex: 1000,
  },
  content: {
    top: "50%",
    left: "50%",
    right: "auto",
    bottom: "auto",
    marginRight: "-50%",
    transform: "translate(-50%, -50%)",
    border: "none",
    borderRadius: "8px",
    padding: "0",
    boxShadow:
      "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
    maxWidth: "90vw",
    width: "600px",
    maxHeight: "90vh",
  },
};

Modal.setAppElement("#root");

const Header = () => {
  const { usuario, logout } = useAuth();
  const { toggle: toggleSidebar } = useSidebar();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("about");

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  // Determine which sidebar to toggle
  const toggleSidebarBasedOnRole = () => {
    toggleSidebar();
  };

  return (
    <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-md shadow-sm z-40 border-b border-gray-100">
      <div className="mx-auto px-6 flex justify-between items-center h-16">
        {/* Left Side */}
        <div className="flex items-center space-x-4">
          <button
            onClick={toggleSidebarBasedOnRole}
            className="text-gray-600 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-all duration-200 lg:hidden"
            aria-label="Toggle sidebar"
          >
            <FiMenu className="h-5 w-5" />
          </button>

          <div className="flex items-center">
            <h1 className="text-2xl font-bold tracking-tight">
              <span className="font-black text-gray-900">Codey </span>
              <span className="text-blue-600">Reports</span>
            </h1>
          </div>
        </div>

        {/* Right Side */}
        <div className="flex items-center space-x-4">
          {/* Help/Documentation Button */}
          <button
            onClick={openModal}
            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
            aria-label="Documentação do Sistema"
          >
            <FiInfo className="h-5 w-5" />
          </button>

          {/* User Profile */}
          <div className="flex items-center space-x-3">
            <div className="relative group">
              <div className="flex items-center space-x-3 cursor-pointer">
                <div className="hidden md:block text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {usuario?.nome}
                  </p>
                  <p className="text-xs text-gray-500 font-medium capitalize">
                    {usuario?.role}
                  </p>
                </div>

                <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold shadow-sm">
                  {usuario?.nome?.charAt(0).toUpperCase()}
                </div>
              </div>

              {/* Dropdown Menu */}
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 z-50 invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200 border border-gray-100">
                <div className="px-4 py-2 text-sm text-gray-600 border-b border-gray-100">
                  Logado como{" "}
                  <span className="font-medium text-gray-900">
                    {usuario?.email}
                  </span>
                </div>
                <div>
                  <button
                    onClick={logout}
                    className="flex items-center px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-red-600 w-full text-left transition-colors duration-200"
                  >
                    <FiLogOut className="mr-2" />
                    Sair
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Documentation Modal */}
        <Modal
          isOpen={isModalOpen}
          onRequestClose={closeModal}
          style={customStyles}
          contentLabel="Documentação do Sistema"
          shouldCloseOnOverlayClick={true}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">
                Documentação do Sistema
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="border-b border-gray-100">
              <nav className="flex -mb-px">
                <button
                  onClick={() => setActiveTab("about")}
                  className={`px-4 py-3 text-sm font-medium ${activeTab === "about" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700"}`}
                >
                  Sobre
                </button>
                <button
                  onClick={() => setActiveTab("users")}
                  className={`px-4 py-3 text-sm font-medium ${activeTab === "users" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700"}`}
                >
                  Tipos de Usuário
                </button>
                <button
                  onClick={() => setActiveTab("steps")}
                  className={`px-4 py-3 text-sm font-medium ${activeTab === "steps" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700"}`}
                >
                  Passos de Uso
                </button>
                <button
                  onClick={() => setActiveTab("files")}
                  className={`px-4 py-3 text-sm font-medium ${activeTab === "files" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700"}`}
                >
                  Arquivos e Laudos
                </button>
                <button
                  onClick={() => setActiveTab("security")}
                  className={`px-4 py-3 text-sm font-medium ${activeTab === "security" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700"}`}
                >
                  Segurança
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === "about" && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    🧾 Sobre o Sistema
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    O Codey Reports é um sistema de gestão de laudos médicos com
                    recursos para criação, assinatura digital e liberação de
                    acesso público de documentos.
                  </p>
                </div>
              )}

              {activeTab === "users" && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    👥 Tipos de Usuário
                  </h3>
                  <ul className="space-y-3 text-gray-600">
                    <li>
                      <strong className="text-gray-900">Técnico:</strong> Cadastra pacientes e exames,
                      gerencia arquivos
                    </li>
                    <li>
                      <strong className="text-gray-900">Médico:</strong> Cria e assina laudos médicos
                    </li>
                    <li>
                      <strong className="text-gray-900">Admin:</strong> Gerencia usuários e configurações
                      do sistema
                    </li>
                    <li>
                      <strong className="text-gray-900">Recepcionista:</strong> Cadastra pacientes e
                      visualiza relatórios
                    </li>
                  </ul>
                </div>
              )}

              {activeTab === "steps" && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    📌 Passos de Uso
                  </h3>
                  <ol className="list-decimal pl-5 space-y-2 text-gray-600">
                    <li>Cadastrar paciente</li>
                    <li>Criar exame associado ao paciente</li>
                    <li>Médico cria laudo baseado no exame</li>
                    <li>
                      Assinar digitalmente e liberar acesso público (quando
                      aplicável)
                    </li>
                  </ol>
                </div>
              )}

              {activeTab === "files" && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    📁 Arquivos e Laudos
                  </h3>
                  <ul className="space-y-3 text-gray-600">
                    <li>
                      <strong className="text-gray-900">Formatos aceitos:</strong> PDF, JPG, PNG
                    </li>
                    <li>
                      <strong className="text-gray-900">Armazenamento:</strong> Arquivos são armazenados
                      no Amazon S3
                    </li>
                    <li>
                      <strong className="text-gray-900">Limite de tamanho:</strong> 20MB por arquivo
                    </li>
                    <li>
                      <strong className="text-gray-900">Assinatura digital:</strong> Laudos podem ser
                      assinados digitalmente
                    </li>
                  </ul>
                </div>
              )}

              {activeTab === "security" && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    🔒 Segurança
                  </h3>
                  <ul className="space-y-3 text-gray-600">
                    <li>
                      Acesso ao sistema requer autenticação com login e senha
                    </li>
                    <li>
                      Todas as comunicações são protegidas por criptografia
                    </li>
                    <li>
                      Dados sensíveis são criptografados no banco de dados
                    </li>
                    <li>
                      Logs de auditoria registram todas as ações do sistema
                    </li>
                  </ul>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
              <p className="text-sm text-gray-600">
                🆘 <strong>Dúvidas?</strong> Entre em contato com o suporte
                interno (suporte@codeytech.com.br) ou seu administrador do
                sistema.
              </p>
              <div className="mt-2 flex gap-4 text-sm">
                <a
                  href="/termos"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Termos de Uso
                </a>
                <a
                  href="/privacidade"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Política de Privacidade
                </a>
              </div>
            </div>
          </div>
        </Modal>
      </div>
    </header>
  );
};

export default Header;
