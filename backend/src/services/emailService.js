require('dotenv').config();
const { Resend } = require('resend');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const Usuario = require('../models/Usuario');
const crypto = require('crypto');
const axios = require('axios');

// Configuração robusta do Resend
const initResend = () => {
  if (!process.env.RESEND_API_KEY) {
    logger.error('Variável RESEND_API_KEY não encontrada');
    throw new Error('Configuração de e-mail incompleta');
  }

  if (!process.env.FRONTEND_URL) {
    logger.error('Variável FRONTEND_URL não encontrada');
    throw new Error('URL do frontend não configurada');
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    logger.info('Resend configurado com sucesso', {
      apiKeyPrefix: process.env.RESEND_API_KEY.substring(0, 8),
      frontendUrl: process.env.FRONTEND_URL
    });
    return resend;
  } catch (error) {
    logger.error('Falha na configuração do Resend', error);
    throw new Error('Falha na inicialização do serviço de e-mail');
  }
};

// Inicialização do serviço
const resend = initResend();

const sendMedicalReport = async (recipientEmail, patientName, reportId, fileUrl, publicAccessCode) => {
  const startTime = Date.now();

  try {
    // Validações rigorosas
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
      throw new Error('Formato de e-mail do destinatário inválido');
    }

    if (!fileUrl || !fileUrl.includes('ucarecdn.com')) {
      throw new Error('URL do arquivo no UploadCare inválida');
    }

    // Baixar o arquivo do UploadCare
    const response = await axios.get(fileUrl, {
      responseType: 'arraybuffer',
      timeout: 10000
    });

    const fileContent = response.data;

    // Verificar se é um PDF válido
    if (!fileContent.slice(0, 4).equals(Buffer.from('%PDF'))) {
      throw new Error('O arquivo não é um PDF válido');
    }

    // Construir link público
    const publicLink = `${process.env.FRONTEND_URL}/publico/${reportId}`;

    // Enviar email via Resend para o email real
    const result = await resend.emails.send({
      from: `${process.env.RESEND_FROM_NAME} <${process.env.RESEND_FROM_EMAIL}>`, // Usar domínio verificado
      to: [recipientEmail],
      subject: `Laudo Médico #${reportId.substring(0, 8)}`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 30px 20px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">🏥 Codey Reports</h1>
            <p style="color: #f8fafc; margin: 8px 0 0 0; font-size: 16px;">Sistema de Laudos Médicos</p>
          </div>
          
          <!-- Content -->
          <div style="background: white; padding: 40px 30px; border-radius: 0 0 12px 12px; box-shadow: 0 8px 25px rgba(0,0,0,0.1);">
            <h2 style="color: #2c3e50; margin-top: 0; font-size: 24px;">✅ Seu Laudo Médico está Pronto!</h2>
            <p style="font-size: 16px; line-height: 1.6; color: #34495e;">Prezado(a) <strong>${patientName}</strong>,</p>
            <p style="font-size: 16px; line-height: 1.6; color: #34495e;">Seu laudo médico foi concluído e está disponível para acesso seguro.</p>
            
            <!-- Online Access Card -->
            <div style="background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); border-left: 6px solid #2563eb; padding: 25px; margin: 30px 0; border-radius: 0 8px 8px 0; box-shadow: 0 4px 15px rgba(37, 99, 235, 0.1);">
              <h3 style="margin-top: 0; color: #0f172a; display: flex; align-items: center; font-size: 20px;">
                🌐 Acesso Online Seguro
              </h3>
              <p style="margin: 15px 0; color: #64748b; font-size: 15px;">Visualize seu laudo diretamente no navegador:</p>
              
              <div style="text-align: center; margin: 25px 0;">
                <a href="${publicLink}" 
                   style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); 
                          color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; 
                          font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(37, 99, 235, 0.3);">
                  📄 Visualizar Laudo Online
                </a>
              </div>
              
              <div style="background: white; padding: 20px; border-radius: 8px; border: 2px solid #2563eb; margin-top: 20px;">
                <p style="margin: 0 0 10px 0; font-weight: bold; color: #0f172a;">🔐 Código de Acesso Seguro:</p>
                <div style="background: #0f172a; color: white; padding: 15px; border-radius: 6px; text-align: center;">
                  <span style="font-family: 'Courier New', monospace; font-size: 22px; font-weight: bold; letter-spacing: 2px;">
                    ${publicAccessCode}
                  </span>
                </div>
                <p style="margin: 10px 0 0 0; font-size: 13px; color: #64748b; font-style: italic;">
                  💡 Mantenha este código em segurança
                </p>
              </div>
            </div>
            
            <!-- Laudo Info -->
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 16px;"><strong>📋 Número do Laudo:</strong> 
                <span style="font-family: monospace; color: #0f172a; font-weight: bold;">${reportId}</span>
              </p>
            </div>
            
            <!-- Security Notice -->
            <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 20px; margin: 25px 0;">
              <h4 style="margin-top: 0; color: #1e40af; display: flex; align-items: center;">
                🔒 Informações de Segurança
              </h4>
              <ul style="color: #1e40af; font-size: 14px; line-height: 1.6; margin: 0; padding-left: 20px;">
                <li>Este laudo contém informações médicas confidenciais</li>
                <li>O código de acesso é pessoal e intransferível</li>
                <li>Não compartilhe o código com terceiros</li>
                <li>Em caso de dúvidas, entre em contato conosco</li>
              </ul>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="text-align: center; padding: 25px; background: #0f172a; border-radius: 0 0 12px 12px; margin-top: 0;">
            <p style="font-size: 14px; color: #cbd5e1; margin: 0;">
              Este é um email automático do sistema Codey Reports.<br>
              Em caso de dúvidas, entre em contato com nossa equipe.
            </p>
            <p style="font-size: 12px; color: #94a3b8; margin: 10px 0 0 0;">
              © ${new Date().getFullYear()} Codey - Todos os direitos reservados
            </p>
          </div>
        </div>
      `,
      attachments: [{
        filename: `laudo_${reportId.substring(0, 8)}.pdf`,
        content: Buffer.from(fileContent)
      }]
    });    logger.info(`E-mail enviado via Resend em ${Date.now() - startTime}ms`, {
      messageId: result.data?.id,
      recipient: recipientEmail,
      success: !result.error
    });

      if (result.error) {
        throw new Error(`Resend API Error: ${result.error.message}`);
      }

      return { 
        success: true,
        messageId: result.data?.id
      };

  } catch (error) {
    logger.error(`Falha no envio via Resend após ${Date.now() - startTime}ms`, {
      error: error.message,
      stack: error.stack,
      recipient: recipientEmail,
      reportId
    });

    throw new Error(`Falha no envio: ${error.message}`);
  }
};

const sendPasswordResetEmail = async (email) => {
  const startTime = Date.now();

  try {
    logger.info(`Iniciando processo de recuperação de senha para: ${email}`);
    
    // Validação do email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      logger.error(`Email inválido: ${email}`);
      throw new Error('Formato de e-mail inválido');
    }

    logger.info(`Email válido, buscando usuário: ${email}`);
    
    // Verifica se o usuário existe
    const usuario = await Usuario.findOne({ email });
    if (!usuario) {
      // Por segurança, não revelamos se o email existe
      logger.info(`Solicitação de recuperação para email não cadastrado: ${email}`);
      return { success: true }; // Retorna sucesso mesmo se o email não existir
    }

    logger.info(`Usuário encontrado, gerando token para: ${email}`);
    
    // Gera token seguro
    const resetToken = crypto.randomBytes(20).toString('hex');
    const resetTokenExpira = Date.now() + 3600000; // 1 hora

    // Atualiza usuário
    usuario.resetSenhaToken = resetToken;
    usuario.resetSenhaExpira = resetTokenExpira;
    
    logger.info(`Salvando token no banco para: ${email}`);
    await usuario.save();

    // Prepara a URL de reset
    const resetUrl = `${process.env.FRONTEND_URL}/resetar-senha?token=${resetToken}`;
    
    logger.info(`Enviando email via Resend para: ${email}`);

    // Enviar email via Resend para o email real
    const result = await resend.emails.send({
      from: `${process.env.RESEND_FROM_NAME} <${process.env.RESEND_FROM_EMAIL}>`, // Usar domínio verificado
      to: [email],
      subject: '🔐 Redefinição de Senha - Codey Reports',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px 20px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">🔐 Codey Reports</h1>
            <p style="color: #fef2f2; margin: 8px 0 0 0; font-size: 16px;">Redefinição de Senha</p>
          </div>
          
          <!-- Content -->
          <div style="background: white; padding: 40px 30px; border-radius: 0 0 12px 12px; box-shadow: 0 8px 25px rgba(0,0,0,0.1);">
            <h2 style="color: #0f172a; margin-top: 0; font-size: 24px;">🔑 Solicitação de Nova Senha</h2>
            <p style="font-size: 16px; line-height: 1.6; color: #475569;">Olá!</p>
            <p style="font-size: 16px; line-height: 1.6; color: #475569;">
              Recebemos uma solicitação para redefinir a senha da sua conta no Codey Reports.
            </p>
            
            <!-- Action Button -->
            <div style="text-align: center; margin: 35px 0;">
              <a href="${resetUrl}" 
                 style="display: inline-block; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); 
                        color: white; padding: 18px 35px; text-decoration: none; border-radius: 8px; 
                        font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3);">
                🔐 Redefinir Minha Senha
              </a>
            </div>
            
            <!-- Security Info -->
            <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 20px; margin: 25px 0;">
              <h4 style="margin-top: 0; color: #d97706; display: flex; align-items: center;">
                ⚠️ Informações Importantes
              </h4>
              <ul style="color: #d97706; font-size: 14px; line-height: 1.6; margin: 0; padding-left: 20px;">
                <li><strong>Este link expira em 1 hora</strong></li>
                <li>Se você não solicitou esta redefinição, ignore este email</li>
                <li>Sua senha atual permanece inalterada até você criar uma nova</li>
                <li>Use uma senha forte com pelo menos 8 caracteres</li>
              </ul>
            </div>
            
            <!-- Manual Link -->
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px solid #e2e8f0;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #64748b; font-weight: bold;">
                🔗 Link alternativo (caso o botão não funcione):
              </p>
              <p style="margin: 0; word-break: break-all; font-family: monospace; font-size: 12px; color: #334155; background: white; padding: 10px; border-radius: 4px; border: 1px solid #cbd5e1;">
                ${resetUrl}
              </p>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="text-align: center; padding: 25px; background: #0f172a; border-radius: 0 0 12px 12px; margin-top: 0;">
            <p style="font-size: 14px; color: #cbd5e1; margin: 0;">
              Este é um email automático do sistema Codey Reports.<br>
              Em caso de dúvidas, entre em contato com nossa equipe.
            </p>
            <p style="font-size: 12px; color: #94a3b8; margin: 10px 0 0 0;">
              © ${new Date().getFullYear()} Codey - Todos os direitos reservados
            </p>
          </div>
        </div>
      `
    });

    // Debug: Log da resposta completa
    logger.info('Resposta completa do Resend:', { 
      result: JSON.stringify(result, null, 2),
      hasError: !!result.error,
      hasData: !!result.data,
      resultType: typeof result,
      resultKeys: Object.keys(result || {})
    });

    // Verificar se houve erro na API
    if (result.error) {
      logger.error('Erro detectado na resposta do Resend:', result.error);
      throw new Error(`Resend API Error: ${JSON.stringify(result.error)}`);
    }

    // Verificar se temos dados de sucesso
    if (!result.data && !result.id) {
      logger.error('Resposta do Resend sem dados de sucesso:', result);
      throw new Error('Resposta inválida do Resend - sem ID de email');
    }

    logger.info(`E-mail de recuperação enviado via Resend em ${Date.now() - startTime}ms`, {
      messageId: result.data?.id || result.id,
      recipient: email,
      userId: usuario._id,
      success: true
    });

    return { 
      success: true,
      messageId: result.data?.id || result.id
    };

  } catch (error) {
    logger.error(`Falha no envio de recuperação via Resend após ${Date.now() - startTime}ms`, {
      error: error.message,
      stack: error.stack,
      recipient: email,
      errorType: error.constructor.name,
      errorCode: error.code
    });

    // Se for um erro de rede ou timeout, informar de forma mais clara
    if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      throw new Error('Falha de conectividade com o serviço de email');
    }

    throw new Error(`Falha no envio do e-mail de recuperação: ${error.message}`);
  }
};

const enviarLaudo = async (emailDestino, dadosLaudo) => {
  const startTime = Date.now();

  try {
    // Validações
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailDestino)) {
      throw new Error('Formato de e-mail do destinatário inválido');
    }

    if (!dadosLaudo || !dadosLaudo.id) {
      throw new Error('Dados do laudo são obrigatórios');
    }

    // Preparar dados para o template
    const {
      id,
      codigoValidacao,
      paciente,
      exame,
      medico,
      dataEmissao,
      linkVisualizacao
    } = dadosLaudo;

    const nomeExame = exame?.tipo || 'Exame médico';
    const nomePaciente = paciente?.nome || 'Paciente';
    const nomeMedico = medico || 'Médico responsável';
    const dataFormatada = dataEmissao ? new Date(dataEmissao).toLocaleDateString('pt-BR') : 'Não informada';

    // Enviar email via Resend
    const result = await resend.emails.send({
      from: `${process.env.RESEND_FROM_NAME} <${process.env.RESEND_FROM_EMAIL}>`,
      to: [emailDestino],
      subject: `Laudo Médico Disponível - ${nomeExame} - ${nomePaciente}`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px 20px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">🏥 Codey Reports</h1>
            <p style="color: #f0fdf4; margin: 8px 0 0 0; font-size: 16px;">Sistema de Laudos Médicos</p>
          </div>
          
          <!-- Content -->
          <div style="background: white; padding: 40px 30px; border-radius: 0 0 12px 12px; box-shadow: 0 8px 25px rgba(0,0,0,0.1);">
            <h2 style="color: #0f172a; margin-top: 0; font-size: 24px;">✅ Seu Laudo Médico está Disponível!</h2>
            <p style="font-size: 16px; line-height: 1.6; color: #475569;">Prezado(a) <strong>${nomePaciente}</strong>,</p>
            <p style="font-size: 16px; line-height: 1.6; color: #475569;">Seu laudo médico foi finalizado e está disponível para acesso seguro.</p>
            
            <!-- Laudo Info -->
            <div style="background: #f8fafc; border-left: 6px solid #10b981; padding: 25px; margin: 30px 0; border-radius: 0 8px 8px 0; border: 1px solid #e2e8f0;">
              <h3 style="margin-top: 0; color: #0f172a; font-size: 18px;">📋 Informações do Laudo</h3>
              <div style="display: grid; gap: 15px;">
                <div style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #cbd5e1;">
                  <strong style="color: #0f172a;">Exame:</strong> ${nomeExame}
                </div>
                <div style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #cbd5e1;">
                  <strong style="color: #0f172a;">Médico Responsável:</strong> ${nomeMedico}
                </div>
                <div style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #cbd5e1;">
                  <strong style="color: #0f172a;">Data de Emissão:</strong> ${dataFormatada}
                </div>
                <div style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #cbd5e1;">
                  <strong style="color: #0f172a;">Código de Validação:</strong> 
                  <span style="font-family: monospace; color: #10b981; font-weight: bold;">${codigoValidacao}</span>
                </div>
              </div>
            </div>
            
            <!-- Access Button -->
            <div style="text-align: center; margin: 35px 0;">
              <a href="${linkVisualizacao}" 
                 style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); 
                        color: white; padding: 18px 35px; text-decoration: none; border-radius: 8px; 
                        font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);">
                📄 Acessar Laudo Online
              </a>
            </div>
            
            <!-- Security Notice -->
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 25px 0;">
              <h4 style="margin-top: 0; color: #166534; display: flex; align-items: center;">
                🔒 Acesso Seguro
              </h4>
              <ul style="color: #166534; font-size: 14px; line-height: 1.6; margin: 0; padding-left: 20px;">
                <li>Este laudo contém informações médicas confidenciais</li>
                <li>O acesso é protegido e auditado</li>
                <li>Mantenha o código de validação em segurança</li>
                <li>Em caso de dúvidas, entre em contato conosco</li>
              </ul>
            </div>
            
            <!-- Manual Link -->
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px solid #e2e8f0;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #64748b; font-weight: bold;">
                🔗 Link direto (caso o botão não funcione):
              </p>
              <p style="margin: 0; word-break: break-all; font-family: monospace; font-size: 12px; color: #334155; background: white; padding: 10px; border-radius: 4px; border: 1px solid #cbd5e1;">
                ${linkVisualizacao}
              </p>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="text-align: center; padding: 25px; background: #0f172a; border-radius: 0 0 12px 12px; margin-top: 0;">
            <p style="font-size: 14px; color: #cbd5e1; margin: 0;">
              Este é um email automático do sistema Code yReports.<br>
              Em caso de dúvidas, entre em contato com nossa equipe.
            </p>
            <p style="font-size: 12px; color: #94a3b8; margin: 10px 0 0 0;">
              © ${new Date().getFullYear()} Codey - Todos os direitos reservados
            </p>
          </div>
        </div>
      `
    });

    logger.info(`E-mail de laudo enviado via Resend em ${Date.now() - startTime}ms`, {
      messageId: result.data?.id || result.id,
      recipient: emailDestino,
      laudoId: id,
      success: !result.error
    });

    if (result.error) {
      throw new Error(`Resend API Error: ${result.error.message}`);
    }

    return { 
      success: true,
      id: result.data?.id || result.id,
      messageId: result.data?.id || result.id
    };

  } catch (error) {
    logger.error(`Falha no envio de laudo via Resend após ${Date.now() - startTime}ms`, {
      error: error.message,
      stack: error.stack,
      recipient: emailDestino,
      laudoId: dadosLaudo?.id
    });

    throw new Error(`Falha no envio: ${error.message}`);
  }
};

module.exports = { sendMedicalReport, sendPasswordResetEmail, enviarLaudo };