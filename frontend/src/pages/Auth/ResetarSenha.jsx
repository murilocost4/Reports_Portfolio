import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  FiLock,
  FiArrowLeft,
  FiCheckCircle,
  FiAlertCircle,
} from "react-icons/fi";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../api";

const ResetarSenha = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { usuario } = useAuth();

  useEffect(() => {
    if (usuario) {
      navigate("/dashboard");
    }
  }, [usuario]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro("");

    if (senha !== confirmarSenha) {
      return setErro("As senhas não coincidem");
    }

    setLoading(true);

    try {
      await api.post("/auth/resetar-senha", {
        token,
        senha,
      });
      setMensagem("Senha alterada com sucesso! Redirecionando para login...");
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      setErro(
        err.response?.data?.erro ||
          "Erro ao redefinir senha. O token pode ter expirado.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        {/* Card de Token Inválido */}
        <div className="w-full max-w-md px-6 py-8">
          <div className="bg-white p-8 rounded-xl shadow-sm border border-blue-200">
            <div className="text-center">
              <div className="flex justify-center mb-3">
                <div className="p-3 bg-red-100 rounded-lg shadow">
                  <FiAlertCircle className="w-7 h-7 text-red-500" />
                </div>
              </div>
              <h1 className="text-2xl font-bold text-blue-800 mb-1">
                Token Inválido
              </h1>
              <p className="text-blue-500 text-sm mb-5">
                O link de recuperação está incompleto ou expirado.
              </p>
              <button
                onClick={() => navigate("/esqueci-senha")}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
              >
                Solicitar novo link de recuperação
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-50">
      {/* Card Principal */}
      <div className="w-full max-w-md px-6 py-8">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-blue-200">
          {/* Cabeçalho */}
          <div className="text-center mb-8">
            <div className="mb-4 flex justify-center">
              <div className="p-3 bg-blue-600 rounded-lg shadow">
                <svg
                  className="w-7 h-7 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-blue-800 mb-1">
              Redefinir Senha
            </h1>
            <p className="text-blue-500 text-sm">
              Digite e confirme sua nova senha
            </p>
          </div>

          {/* Mensagens de Feedback */}
          {erro && (
            <div className="mb-5 p-3 bg-red-50 border border-red-100 rounded-lg flex items-center">
              <FiAlertCircle
                className="text-red-500 mr-2 flex-shrink-0"
                size={16}
              />
              <span className="text-red-600 text-sm">{erro}</span>
            </div>
          )}

          {mensagem && (
            <div className="mb-5 p-3 bg-green-50 border border-green-100 rounded-lg flex items-center">
              <FiCheckCircle
                className="text-green-500 mr-2 flex-shrink-0"
                size={16}
              />
              <span className="text-green-600 text-sm">{mensagem}</span>
            </div>
          )}

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-blue-400">
                <FiLock size={16} />
              </div>
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-blue-700 placeholder-blue-400 text-sm transition-all"
                placeholder="Nova senha"
                required
                minLength="6"
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-blue-400">
                <FiLock size={16} />
              </div>
              <input
                type="password"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-blue-700 placeholder-blue-400 text-sm transition-all"
                placeholder="Confirmar nova senha"
                required
                minLength="6"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className={`w-full flex justify-center items-center py-2.5 px-4 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 shadow-sm hover:shadow-md transition-all duration-200 ${
                  loading ? "opacity-80 cursor-not-allowed" : ""
                }`}
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                    Processando...
                  </>
                ) : (
                  "Redefinir senha"
                )}
              </button>
            </div>
          </form>

          {/* Rodapé */}
          <div className="mt-6 pt-5 border-t border-blue-100 text-center">
            <button
              onClick={() => navigate("/login")}
              className="flex items-center justify-center text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors mx-auto"
            >
              <FiArrowLeft className="mr-1" size={14} />
              Voltar para o login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetarSenha;
