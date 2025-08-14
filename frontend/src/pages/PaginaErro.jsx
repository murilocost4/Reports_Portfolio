// src/components/PaginaErro.js
import { useSearchParams } from "react-router-dom";

const PaginaErro = () => {
  const [searchParams] = useSearchParams();
  const codigo = searchParams.get("codigo");

  const mensagens = {
    csrf_falha:
      "Falha na verificação de segurança. Por favor, recarregue a página.",
    token_expirado: "Sua sessão expirou. Faça login novamente.",
    servidor_indisponivel: "Servidor indisponível. Tente novamente mais tarde.",
    default: "Ocorreu um erro inesperado.",
  };

  return (
    <div className="pagina-erro">
      <h1>Erro</h1>
      <p>{mensagens[codigo] || mensagens.default}</p>
      <button onClick={() => (window.location.href = "/")}>
        Voltar à página inicial
      </button>
    </div>
  );
};

export default PaginaErro;
