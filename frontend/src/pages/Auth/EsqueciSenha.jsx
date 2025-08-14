import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiMail,
  FiArrowLeft,
  FiCheckCircle,
  FiAlertCircle,
  FiShield,
  FiSend,
} from "react-icons/fi";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../api";
import { motion } from "framer-motion";

const EsqueciSenha = () => {
  const [email, setEmail] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { usuario } = useAuth();

  // Sistema de cores moderno - Slate (consistente com o resto do sistema)
  const COLORS = {
    primary: "#475569",
    primaryLight: "#94A3B8",
    primaryDark: "#334155",
    secondary: "#10B981",
    accent: "#6366F1",
    warning: "#F59E0B",
    danger: "#EF4444",
    background: "#F1F5F9",
    cardBg: "#FFFFFF",
    text: "#1E293B",
    muted: "#64748B",
    border: "#E2E8F0",
  };

  useEffect(() => {
    if (usuario) {
      if (usuario.isAdminMaster) {
        navigate("/adminmaster/dashboard");
      } else {
        navigate("/dashboard");
      }
    }
  }, [usuario, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro("");
    setMensagem("");
    setLoading(true);

    try {
      await api.post("/auth/esqueci-senha", { email });
      setMensagem(
        "Se o email existir em nosso sistema, você receberá um link para redefinir sua senha."
      );
      setEmail(""); // Limpar o campo
    } catch (err) {
      setErro("Erro ao processar solicitação. Por favor, tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-blue-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-blue-200">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg mb-6">
              <FiMail className="text-white text-2xl" />
            </div>
            <h1 className="text-2xl font-bold text-blue-900 mb-2">
              Recuperar Senha
            </h1>
            <p className="text-blue-600 text-sm">
              Digite seu email para receber o link de recuperação
            </p>
          </motion.div>

          {/* Success Message */}
          {mensagem && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start"
            >
              <FiCheckCircle
                className="text-green-500 mr-3 flex-shrink-0 mt-0.5"
                size={18}
              />
              <div>
                <p className="text-green-800 text-sm font-medium">Email Enviado</p>
                <p className="text-green-600 text-sm mt-1">{mensagem}</p>
              </div>
            </motion.div>
          )}

          {/* Error Message */}
          {erro && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start"
            >
              <FiAlertCircle
                className="text-red-500 mr-3 flex-shrink-0 mt-0.5"
                size={18}
              />
              <div>
                <p className="text-red-800 text-sm font-medium">Erro</p>
                <p className="text-red-600 text-sm mt-1">{erro}</p>
              </div>
            </motion.div>
          )}

          {/* Form */}
          <motion.form
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            <div className="space-y-2">
              <label className="block text-sm font-medium text-blue-700">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FiMail className="text-blue-400" size={18} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-white border border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-blue-900 placeholder-blue-400 text-sm transition-all shadow-sm"
                  placeholder="seu@email.com"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <motion.button
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
              type="submit"
              disabled={loading}
              className={`w-full flex justify-center items-center py-3.5 px-4 rounded-xl font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 shadow-lg hover:shadow-xl transition-all duration-200 ${
                loading ? "opacity-80 cursor-not-allowed" : ""
              }`}
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
                  Enviando...
                </>
              ) : (
                <>
                  <FiSend className="mr-2" size={18} />
                  Enviar Link de Recuperação
                </>
              )}
            </motion.button>
          </motion.form>

          {/* Back to Login */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8 text-center"
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate("/")}
              className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors underline-offset-2 hover:underline"
            >
              <FiArrowLeft className="mr-2" size={16} />
              Voltar ao Login
            </motion.button>
          </motion.div>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-8 text-center"
          >
            <div className="flex items-center justify-center space-x-2 text-xs text-blue-500">
              <FiShield size={14} />
              <span>Seguro e Confiável</span>
            </div>
            <p className="text-xs text-blue-400 mt-2">
              © {new Date().getFullYear()} Codey • Todos os direitos reservados
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default EsqueciSenha;
