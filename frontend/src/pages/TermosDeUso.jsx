import React from "react";

const TermosDeUso = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10 text-slate-700">
      <h1 className="text-2xl font-bold text-blue-700 mb-6">
        Termos e Condições de Uso
      </h1>

      <p className="mb-4">
        Este sistema, denominado <strong>LaudoFy</strong>, foi desenvolvido por
        Murilo e está sendo disponibilizado gratuitamente para uso exclusivo da
        clínica autorizada. Ao utilizar este sistema, o usuário concorda com os
        seguintes termos:
      </p>

      <ul className="list-disc list-inside space-y-2">
        <li>
          O acesso ao sistema é restrito a profissionais autorizados, como
          técnicos, médicos e administradores da clínica.
        </li>
        <li>
          Os dados inseridos são de responsabilidade da clínica, incluindo
          informações de pacientes e documentos médicos.
        </li>
        <li>
          O sistema não realiza armazenamento permanente de dados sensíveis sem
          criptografia ou segurança adequada.
        </li>
        <li>
          O desenvolvedor não se responsabiliza por mau uso, perda de dados ou
          acessos indevidos fora do seu controle técnico.
        </li>
        <li>
          A clínica concorda em treinar os usuários e seguir boas práticas para
          uso seguro da aplicação.
        </li>
      </ul>

      <p className="mt-6 text-sm text-slate-500 italic">
        Última atualização: Abril de 2025.
      </p>
    </div>
  );
};

export default TermosDeUso;
