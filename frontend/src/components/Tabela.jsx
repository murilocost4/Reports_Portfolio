import React, { memo } from "react";
import { FiEdit, FiTrash, FiEye, FiFileText, FiLock } from "react-icons/fi";

// Componente de linha da tabela memoizado
const TableRow = memo(
  ({
    item,
    index,
    colunas,
    acoes,
    customRowClass,
    getAcoesVisiveis,
    isAcaoDisabled,
    getAcaoStyle,
    getDisabledMessage,
    renderCellContent,
  }) => {
    const rowClass = customRowClass ? customRowClass(item) : "";
    const defaultRowClass =
      index % 2 === 0
        ? "bg-white hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100"
        : "bg-gray-50/50 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100";

    return (
      <tr
        className={`transition-all duration-300 ${rowClass || defaultRowClass} group`}
      >
        {colunas.map((coluna, colIndex) => (
          <td
            key={colIndex}
            className={`px-6 py-5 whitespace-nowrap ${coluna.className || ""}`}
          >
            <div
              className={`text-sm font-medium ${coluna.textColor || "text-gray-700"}`}
            >
              {renderCellContent(item, coluna)}
            </div>
          </td>
        ))}

        {acoes && acoes.length > 0 && (
          <td className="px-6 py-5 whitespace-nowrap text-right text-sm font-medium">
            <ActionButtons
              item={item}
              acoes={acoes}
              getAcoesVisiveis={getAcoesVisiveis}
              isAcaoDisabled={isAcaoDisabled}
              getAcaoStyle={getAcaoStyle}
              getDisabledMessage={getDisabledMessage}
            />
          </td>
        )}
      </tr>
    );
  },
);

// Componente de botões de ação memoizado
const ActionButtons = memo(
  ({
    item,
    acoes,
    getAcoesVisiveis,
    isAcaoDisabled,
    getAcaoStyle,
    getDisabledMessage,
  }) => {
    const acoesVisiveis = getAcoesVisiveis(item);

    if (acoesVisiveis.length === 0) return null;

    return (
      <div className="flex justify-end items-center space-x-2 px-1">
        {acoesVisiveis.map((acao, acaoIndex) => (
          <ActionButton
            key={acaoIndex}
            acao={acao}
            item={item}
            isDisabled={isAcaoDisabled(acao, item)}
            style={getAcaoStyle(acao, item)}
            disabledMessage={getDisabledMessage(acao, item)}
          />
        ))}
      </div>
    );
  },
);

// Componente de botão de ação individual memoizado
const ActionButton = memo(
  ({ acao, item, isDisabled, style, disabledMessage }) => {
    // Determinar cores e estilos baseados no tipo de ação
    const getActionStyles = () => {
      if (isDisabled) {
        return {
          buttonClass:
            "bg-gray-100/80 text-gray-400 cursor-not-allowed border border-gray-200/60",
          iconClass: "text-gray-400",
          hoverClass: "",
        };
      }

      if (style.includes("blue") || style.includes("slate")) {
        return {
          buttonClass:
            "bg-gradient-to-br from-blue-50 to-blue-100/70 text-blue-600 border border-blue-200/60 hover:from-blue-100 hover:to-blue-200/80 hover:border-blue-300/80 hover:shadow-lg hover:shadow-blue-500/25 active:scale-95",
          iconClass: "text-blue-600 group-hover:text-blue-700",
          hoverClass: "hover:-translate-y-0.5",
        };
      }
      if (style.includes("amber") || style.includes("yellow")) {
        return {
          buttonClass:
            "bg-gradient-to-br from-amber-50 to-amber-100/70 text-amber-600 border border-amber-200/60 hover:from-amber-100 hover:to-amber-200/80 hover:border-amber-300/80 hover:shadow-lg hover:shadow-amber-500/25 active:scale-95",
          iconClass: "text-amber-600 group-hover:text-amber-700",
          hoverClass: "hover:-translate-y-0.5",
        };
      }
      if (style.includes("red")) {
        return {
          buttonClass:
            "bg-gradient-to-br from-red-50 to-red-100/70 text-red-600 border border-red-200/60 hover:from-red-100 hover:to-red-200/80 hover:border-red-300/80 hover:shadow-lg hover:shadow-red-500/25 active:scale-95",
          iconClass: "text-red-600 group-hover:text-red-700",
          hoverClass: "hover:-translate-y-0.5",
        };
      }
      if (style.includes("green")) {
        return {
          buttonClass:
            "bg-gradient-to-br from-green-50 to-green-100/70 text-green-600 border border-green-200/60 hover:from-green-100 hover:to-green-200/80 hover:border-green-300/80 hover:shadow-lg hover:shadow-green-500/25 active:scale-95",
          iconClass: "text-green-600 group-hover:text-green-700",
          hoverClass: "hover:-translate-y-0.5",
        };
      }

      return {
        buttonClass:
          "bg-gradient-to-br from-blue-50 to-blue-100/70 text-blue-600 border border-blue-200/60 hover:from-blue-100 hover:to-blue-200/80 hover:border-blue-300/80 hover:shadow-lg hover:shadow-blue-500/25 active:scale-95",
        iconClass: "text-blue-600 group-hover:text-blue-700",
        hoverClass: "hover:-translate-y-0.5",
      };
    };

    const actionStyles = getActionStyles();

    return (
      <div className="relative group">
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!isDisabled) {
              acao.acao(item);
            }
          }}
          disabled={isDisabled}
          className={`
          relative p-3 rounded-2xl transition-all duration-300 ease-out overflow-hidden
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500/40
          transform ${actionStyles.hoverClass} ${actionStyles.buttonClass}
          backdrop-blur-sm shadow-sm
          ${!isDisabled ? "group-hover:shadow-xl hover:bounce-subtle" : ""}
        `}
          title={isDisabled && disabledMessage ? disabledMessage : acao.label}
          aria-label={acao.label}
        >
          {/* Efeito de brilho no hover */}
          {!isDisabled && (
            <div className="absolute inset-0 rounded-2xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          )}

          {/* Efeito de ondulação no clique */}
          {!isDisabled && (
            <div className="absolute inset-0 rounded-2xl bg-white/40 scale-0 group-active:scale-100 transition-transform duration-150 pointer-events-none" />
          )}

          {/* Ícone com animação */}
          <div className="relative z-10 transition-all duration-200 group-hover:scale-110 group-active:scale-95">
            {acao.icon &&
              React.cloneElement(acao.icon, {
                className: `h-4 w-4 transition-all duration-200 ${actionStyles.iconClass} group-hover:drop-shadow-sm`,
              })}
          </div>

          {/* Indicador de disabled melhorado */}
          {isDisabled && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center shadow-sm">
              <div className="w-1.5 h-1.5 bg-white rounded-full" />
            </div>
          )}
        </button>

        {/* Tooltip moderno com animação suave */}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 px-3 py-2 text-xs font-medium text-white bg-gradient-to-r from-gray-900 to-gray-800 backdrop-blur-sm rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible group-hover:-translate-y-1 transition-all duration-300 ease-out whitespace-nowrap z-50 pointer-events-none shadow-xl border border-gray-700/30">
          {isDisabled && disabledMessage ? disabledMessage : acao.label}

          {/* Seta do tooltip com gradiente */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2">
            <div className="border-4 border-transparent border-t-gray-800" />
          </div>

          {/* Efeito de brilho no tooltip */}
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-30" />

          {/* Indicador de status da ação */}
          {!isDisabled && (
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          )}
        </div>
      </div>
    );
  },
);

const Tabela = ({
  colunas,
  dados,
  acoes,
  mensagemSemDados,
  customRowClass,
  // Props de paginação
  paginacao,
  onPageChange,
}) => {
  // Paleta de cores Slate moderna e tecnológica
  const COLORS = {
    primary: "#475569", // Slate principal
    primaryLight: "#94A3B8", // Slate claro
    primaryDark: "#334155", // Slate escuro
    secondary: "#10B981", // Verde
    accent: "#8B5CF6", // Roxo
    warning: "#F59E0B", // Amarelo
    danger: "#EF4444", // Vermelho
    background: "#F8FAFC", // Fundo
    cardBg: "#FFFFFF", // Fundo dos cards
    text: "#1E293B", // Texto escuro
    muted: "#64748B", // Texto slate
    border: "#E2E8F0", // Bordas
  };

  const getNestedValue = (obj, path) => {
    if (!path || typeof path !== "string") return undefined;
    return path
      .split(".")
      .reduce(
        (acc, key) => (acc && acc[key] !== undefined ? acc[key] : null),
        obj,
      );
  };

  const renderCellContent = (item, coluna) => {
    if (coluna.render) {
      return coluna.render(
        coluna.key ? getNestedValue(item, coluna.key) : undefined,
        item,
      );
    }

    if (!coluna.key) return null;

    const value = getNestedValue(item, coluna.key);
    return value !== null && value !== undefined ? value : "—";
  };

  // Função para filtrar ações visíveis
  const getAcoesVisiveis = (item) => {
    if (!acoes || acoes.length === 0) return [];

    return acoes.filter((acao) => {
      if (typeof acao.mostrar === "function") {
        return acao.mostrar(item);
      }
      return acao.mostrar !== false;
    });
  };

  // Função para verificar se ação está desabilitada
  const isAcaoDisabled = (acao, item) => {
    if (typeof acao.disabled === "function") {
      return acao.disabled(item);
    }
    return acao.disabled || false;
  };

  // Função para obter estilo da ação
  const getAcaoStyle = (acao, item) => {
    if (typeof acao.style === "function") {
      return acao.style(item);
    }
    return acao.style || "";
  };

  // Função para obter mensagem de desabilitação
  const getDisabledMessage = (acao, item) => {
    if (typeof acao.disabledMessage === "function") {
      return acao.disabledMessage(item);
    }
    return acao.disabledMessage || null;
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white/95 backdrop-blur-sm shadow-lg">
      <table className="w-full divide-y divide-gray-200">
        {/* Cabeçalho moderno com efeito de vidro */}
        <thead className="bg-gradient-to-r from-gray-50 to-gray-100 backdrop-blur-sm">
          <tr>
            {colunas.map((coluna, index) => (
              <th
                key={index}
                className="px-6 py-6 text-left text-xs font-bold text-gray-700 uppercase tracking-wider"
              >
                <div className="flex items-center space-x-2">
                  <span className="text-gray-900">{coluna.header}</span>
                  {coluna.sortable && (
                    <button className="ml-2 text-gray-400 hover:text-gray-600 transition-colors duration-200 p-1 rounded-lg hover:bg-white/50">
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              </th>
            ))}
            {acoes && acoes.length > 0 && (
              <th className="px-6 py-6 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                <span className="text-gray-900">Ações</span>
              </th>
            )}
          </tr>
        </thead>

        {/* Corpo da tabela com linhas zebradas e hover suave */}
        <tbody className="divide-y divide-gray-200 bg-white">
          {dados.length > 0 ? (
            dados.map((item, index) => (
              <TableRow
                key={index}
                item={item}
                index={index}
                colunas={colunas}
                acoes={acoes}
                customRowClass={customRowClass}
                getAcoesVisiveis={getAcoesVisiveis}
                isAcaoDisabled={isAcaoDisabled}
                getAcaoStyle={getAcaoStyle}
                getDisabledMessage={getDisabledMessage}
                renderCellContent={renderCellContent}
              />
            ))
          ) : (
            <tr>
              <td
                colSpan={colunas.length + (acoes ? 1 : 0)}
                className="px-6 py-20 text-center"
              >
                {mensagemSemDados || (
                  <div className="text-center">
                    <div className="mx-auto h-24 w-24 flex items-center justify-center rounded-full bg-gradient-to-r from-slate-100 to-slate-200 text-slate-400 mb-4">
                      <FiFileText className="h-12 w-12" />
                    </div>
                    <h3 className="mt-4 text-xl font-semibold text-slate-600">
                      Nenhum registro encontrado
                    </h3>
                    <p className="mt-2 text-sm text-slate-500">
                      Tente ajustar seus critérios de busca ou adicione novos
                      dados
                    </p>
                    <div className="mt-6">
                      <button className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-xl shadow-sm text-white bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-all duration-200">
                        Recarregar dados
                      </button>
                    </div>
                  </div>
                )}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Rodapé moderno com paginação funcional */}
      {dados.length > 0 && (
        <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200">
          {paginacao ? (
            // Paginação funcional
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600 font-medium">
                Mostrando{" "}
                <span className="font-semibold text-gray-900">
                  {((paginacao.paginaAtual - 1) * paginacao.limite) + 1}-{Math.min(paginacao.paginaAtual * paginacao.limite, paginacao.total)}
                </span>{" "}
                de{" "}
                <span className="font-semibold text-gray-900">{paginacao.total}</span>{" "}
                resultados
              </div>
              
              <div className="flex items-center space-x-2">
                {/* Botão Anterior */}
                <button
                  onClick={() => onPageChange(paginacao.paginaAtual - 1)}
                  disabled={paginacao.paginaAtual <= 1}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-white/70 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 border border-gray-200"
                >
                  Anterior
                </button>
                
                {/* Números das páginas */}
                <div className="flex space-x-1">
                  {(() => {
                    const totalPages = paginacao.totalPaginas;
                    const currentPage = paginacao.paginaAtual;
                    const pages = [];
                    
                    // Lógica para mostrar páginas
                    const startPage = Math.max(1, currentPage - 2);
                    const endPage = Math.min(totalPages, currentPage + 2);
                    
                    // Primeira página
                    if (startPage > 1) {
                      pages.push(
                        <button
                          key={1}
                          onClick={() => onPageChange(1)}
                          className="px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-white/70 transition-all duration-200"
                        >
                          1
                        </button>
                      );
                      if (startPage > 2) {
                        pages.push(<span key="dots1" className="px-2 text-gray-400">...</span>);
                      }
                    }
                    
                    // Páginas do meio
                    for (let i = startPage; i <= endPage; i++) {
                      pages.push(
                        <button
                          key={i}
                          onClick={() => onPageChange(i)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                            i === currentPage
                              ? 'bg-slate-600 text-white'
                              : 'text-gray-600 hover:bg-white/70'
                          }`}
                        >
                          {i}
                        </button>
                      );
                    }
                    
                    // Última página
                    if (endPage < totalPages) {
                      if (endPage < totalPages - 1) {
                        pages.push(<span key="dots2" className="px-2 text-gray-400">...</span>);
                      }
                      pages.push(
                        <button
                          key={totalPages}
                          onClick={() => onPageChange(totalPages)}
                          className="px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-white/70 transition-all duration-200"
                        >
                          {totalPages}
                        </button>
                      );
                    }
                    
                    return pages;
                  })()}
                </div>
                
                {/* Botão Próximo */}
                <button
                  onClick={() => onPageChange(paginacao.paginaAtual + 1)}
                  disabled={paginacao.paginaAtual >= paginacao.totalPaginas}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-white/70 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 border border-gray-200"
                >
                  Próximo
                </button>
              </div>
            </div>
          ) : (
            // Paginação simples (fallback)
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600 font-medium">
                Mostrando{" "}
                <span className="font-semibold text-gray-900">
                  1-{dados.length}
                </span>{" "}
                de{" "}
                <span className="font-semibold text-gray-900">{dados.length}</span>{" "}
                resultados
              </div>
              <div className="flex space-x-2">
                <button className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-white/70 disabled:opacity-50 transition-all duration-200 border border-gray-200">
                  Anterior
                </button>
                <button className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-white/70 disabled:opacity-50 transition-all duration-200 border border-gray-200">
                  Próximo
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Tabela;
