import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useSidebarAdminMaster } from "../contexts/SidebarAdminMasterContext";
import { FiLogOut, FiMenu, FiInfo } from "react-icons/fi";
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

const HeaderAdminMaster = () => {
  const { usuario, logout } = useAuth();
  const { toggle: toggleSidebarAdminMaster } = useSidebarAdminMaster();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <header className="fixed top-0 left-0 right-0 bg-gray-900/95 backdrop-blur-md shadow-sm z-50">
      <div className="mx-auto px-6 flex justify-between items-center h-16">
        {/* Left Side */}
        <div className="flex items-center space-x-4">
          <button
            onClick={toggleSidebarAdminMaster}
            className="text-gray-400 hover:text-white transition-colors md:hidden"
            aria-label="Toggle sidebar"
          >
            <FiMenu className="h-5 w-5" />
          </button>

          <div className="flex items-center">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              <span className="font-black">Codey</span>
              <span className="text-blue-400">Reports</span>
              <span className="text-sm font-medium ml-3 text-gray-400 border-l border-gray-600 pl-3">
                Admin
              </span>
            </h1>
          </div>
        </div>

        {/* Right Side */}
        <div className="flex items-center space-x-4">
          {/* Help/Documentation Button */}
          <button
            onClick={openModal}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
            aria-label="System Documentation"
          >
            <FiInfo className="h-5 w-5" />
          </button>

          {/* User Profile */}
          <div className="flex items-center space-x-3">
            <div className="relative group">
              <div className="flex items-center space-x-3 cursor-pointer">
                <div className="hidden md:block text-right">
                  <p className="text-sm font-medium text-white">
                    {usuario?.nome}
                  </p>
                  <p className="text-xs text-gray-400 font-medium">
                    Admin Master
                  </p>
                </div>

                <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                  {usuario?.nome?.charAt(0).toUpperCase()}
                </div>
              </div>

              {/* Dropdown Menu */}
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 z-50 invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200 border border-gray-100">
                <div className="px-4 py-2 text-sm text-gray-600 border-b border-gray-100">
                  Logged in as{" "}
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
                    Sign Out
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
          contentLabel="System Documentation"
          shouldCloseOnOverlayClick={true}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">
                Admin Documentation
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                &times;
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    🛠️ Admin Master Features
                  </h3>
                  <ul className="space-y-2 text-gray-600">
                    <li>• Manage multiple clinics and organizations</li>
                    <li>• Create and configure new tenants</li>
                    <li>• Monitor system usage and performance</li>
                    <li>• Access advanced security settings</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    ⚡ Quick Actions
                  </h3>
                  <ul className="space-y-2 text-gray-600">
                    <li>• Add new clinic</li>
                    <li>• Manage user permissions</li>
                    <li>• View system logs</li>
                    <li>• Configure global settings</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
              <p className="text-sm text-gray-600">
                🔐 <strong>Suporte administrativo:</strong> Para falar com o suporte,
                envie um email para suporte@codeytech.com.br
              </p>
            </div>
          </div>
        </Modal>
      </div>
    </header>
  );
};

export default HeaderAdminMaster;
