import React from "react";

const PoliticaDePrivacidade = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10 text-slate-700">
      <h1 className="text-2xl font-bold text-blue-700 mb-6">
        Política de Privacidade
      </h1>

      <p className="mb-4">
        Esta Política de Privacidade descreve como as informações dos usuários e
        dos pacientes são tratadas dentro do sistema <strong>LaudoFy</strong>,
        disponibilizado gratuitamente por Murilo para uso exclusivo da clínica
        autorizada.
      </p>

      <ul className="list-disc list-inside space-y-2">
        <li>
          O sistema coleta apenas dados essenciais para o funcionamento das
          funcionalidades médicas e administrativas.
        </li>
        <li>
          Dados de pacientes são armazenados com criptografia e acesso
          controlado por autenticação.
        </li>
        <li>
          Os laudos médicos podem ser visualizados publicamente somente mediante
          links únicos e protegidos.
        </li>
        <li>
          Nenhum dado é compartilhado com terceiros ou utilizado para fins
          comerciais.
        </li>
        <li>
          Cookies são utilizados exclusivamente para controle de sessão e
          segurança (CSRF, autenticação JWT).
        </li>
        <li>
          O sistema possui registro de auditoria para rastrear atividades
          realizadas por usuários autenticados.
        </li>
        <li>
          A responsabilidade pelo uso adequado, treinamento dos usuários e
          proteção das credenciais é da clínica.
        </li>
      </ul>

      <p className="mt-6 text-sm text-slate-500 italic">
        Última atualização: Abril de 2025.
      </p>
    </div>
  );
};

export default PoliticaDePrivacidade;
