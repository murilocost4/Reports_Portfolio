// src/pages/Auth/Login.js
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../api";
import csrfService from "../../services/scrfService";
import {
  FiAlertCircle,
  FiEye,
  FiEyeOff,
  FiLock,
  FiLogIn,
  FiMail,
  FiShield,
} from "react-icons/fi";
import ReCAPTCHA from "react-google-recaptcha";
import { motion } from "framer-motion";
import loginArt from "/login-art.png";

const Login = () => {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, usuario } = useAuth();
  const navigate = useNavigate();
  const RECAPTCHA_SITE_KEY = "6LcUBBMrAAAAABM98FN5ArSihn2AIcO5xMF7u_Os";
  const [captchaReady, setCaptchaReady] = useState(false);
  const [captchaValido, setCaptchaValido] = useState(false);
  const [csrfCarregado, setCsrfCarregado] = useState(false);

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
    // Inicializar CSRF token
    const initializeCSRF = async () => {
      try {
        await csrfService.initializeCsrfToken();
        setCsrfCarregado(true);
      } catch (error) {
        setErro("Problema de conexão com o servidor");
      }
    };

    initializeCSRF();
  }, []);

  useEffect(() => {
    if (usuario) {
      if (usuario.isAdminMaster) {
        navigate("/adminmaster/dashboard");
      } else {
        navigate("/dashboard");
      }
    }
  }, [usuario]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErro("");
    setLoading(true);

    try {
      const csrfToken = document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1];

      const response = await api.post("/auth/login", {
        email,
        senha,
      });

      // Processar resposta de sucesso
      login(response.data.accessToken, response.data.refreshToken);
    } catch (error) {
      let mensagemErro = "Erro ao fazer login";
      if (error.response) {
        if (error.response.status === 400) {
          // Changed from 401 to 400
          mensagemErro =
            error.response.data.erro || "Email ou senha incorretos";
        } else if (error.response.status === 403) {
          mensagemErro =
            "Problema de segurança. Por favor, recarregue a página.";
          await csrfService.refreshCsrfToken();
        } else if (error.response.status === 401) {
          mensagemErro = "Erro ao fazer login. Verifique suas credenciais.";
        }
      }
      setErro(mensagemErro);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Left Side - Illustration */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8 }}
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 items-center justify-center"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-200"></div>
        <div className="relative z-10 text-center p-12">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className=""
          >
            <img
              src={loginArt}
              alt="Medical illustration"
              className="w-4/5 h-auto object-contain mx-auto"
            />
          </motion.div>
        </div>
      </motion.div>

      {/* Right Side - Login Form */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12"
      >
        <div className="w-full max-w-md">
          {/* Header */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-10"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg mb-6">
              <FiShield className="text-white text-2xl" />
            </div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2 tracking-tight">
              <span className="text-slate-700">Codey </span>
              <span className="text-blue-600">Reports</span>
            </h1>
            <p className="text-slate-600 text-sm font-medium">
              Acesse sua conta para continuar
            </p>
          </motion.div>

          {/* Error Message */}
          {erro && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start"
            >
              <FiAlertCircle
                className="text-red-500 mr-3 flex-shrink-0 mt-0.5"
                size={18}
              />
              <div>
                <p className="text-red-800 text-sm font-medium">Erro de Login</p>
                <p className="text-red-600 text-sm mt-1">{erro}</p>
              </div>
            </motion.div>
          )}

          {/* Form */}
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            onSubmit={handleLogin}
            className="space-y-6"
          >
            {/* Email Field */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FiMail className="text-slate-400" size={18} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 placeholder-slate-400 text-sm transition-all shadow-sm"
                  placeholder="seu@email.com"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                Senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FiLock className="text-slate-400" size={18} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full pl-12 pr-12 py-3.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 placeholder-slate-400 text-sm transition-all shadow-sm"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-blue-600 transition-colors"
                >
                  {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
            </div>

            {/* Forgot Password Link */}
            <div className="flex justify-end">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => navigate("/esqueci-senha")}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors underline-offset-2 hover:underline"
              >
                Esqueceu sua senha?
              </motion.button>
            </div>

            {/* Login Button */}
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
                  Entrando...
                </>
              ) : (
                <>
                  <FiLogIn className="mr-2" size={18} />
                  Entrar
                </>
              )}
            </motion.button>
          </motion.form>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-10 text-center"
          >
            <div className="flex items-center justify-center space-x-2 text-xs text-slate-500">
              <FiShield size={14} />
              <span>Seguro e Confiável</span>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              © {new Date().getFullYear()} Codey • Todos os direitos
              reservados
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
