const { Resend } = require('resend');

class EmailService {
  constructor() {
    this.apiKey = process.env.RESEND_API_KEY;
    this.from = process.env.EMAIL_FROM || 'NeoFood <onboarding@resend.dev>';
    this.client = this.apiKey ? new Resend(this.apiKey) : null;
  }

  /**
   * Envía un código OTP de 6 dígitos para verificar el correo de registro
   * @param {string} toEmail 
   * @param {string} code 
   */
  async sendVerificationCode(toEmail, code) {
    console.log(`\n======================================================`);
    console.log(`📨 [NeoFood Mailer] Código de verificación generado:`);
    console.log(`   Destinatario: ${toEmail}`);
    console.log(`   Código OTP:   ${code}`);
    console.log(`======================================================\n`);

    if (!this.client) {
      console.warn('⚠️ [NeoFood Mailer] RESEND_API_KEY no configurado en .env. El código solo se imprimió en consola.');
      return { success: true, simulated: true };
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Código de Verificación - NeoFood</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 15px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" style="max-width: 520px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                
                <!-- Cabecera -->
                <tr>
                  <td style="background: linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%); padding: 32px 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">
                      Neo<span style="color: #fed7aa;">Food</span>
                    </h1>
                    <p style="margin: 6px 0 0 0; color: #e0f2fe; font-size: 13px; font-weight: 500;">
                      Plataforma de Gestión para Restaurantes
                    </p>
                  </td>
                </tr>

                <!-- Contenido -->
                <tr>
                  <td style="padding: 36px 32px;">
                    <h2 style="margin: 0 0 12px 0; color: #0f172a; font-size: 20px; font-weight: 700;">
                      Verifica tu correo electrónico
                    </h2>
                    <p style="margin: 0 0 24px 0; color: #475569; font-size: 15px; line-height: 1.6;">
                      Estás a un paso de comenzar con tu restaurante en <strong>NeoFood</strong>. Utiliza el siguiente código para validar tu dirección de correo:
                    </p>

                    <!-- Caja del Código OTP -->
                    <div style="background-color: #f0f9ff; border: 2px dashed #0284c7; border-radius: 12px; padding: 20px; text-align: center; margin: 28px 0;">
                      <span style="display: block; font-size: 12px; font-weight: 700; color: #0369a1; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
                        Tu código de seguridad
                      </span>
                      <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; color: #0284c7; letter-spacing: 8px; user-select: all;">
                        ${code}
                      </span>
                    </div>

                    <p style="margin: 0 0 12px 0; color: #64748b; font-size: 13px; line-height: 1.5;">
                      ⏱️ <strong>Este código es válido por 10 minutos.</strong> Por tu seguridad, nunca compartas este código con nadie.
                    </p>
                    <p style="margin: 0; color: #94a3b8; font-size: 12px; line-height: 1.5;">
                      Si tú no solicitaste este registro en NeoFood, puedes ignorar este correo de forma segura.
                    </p>
                  </td>
                </tr>

                <!-- Pie de página -->
                <tr>
                  <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 30px; text-align: center;">
                    <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                      © ${new Date().getFullYear()} NeoFood CRM. Todos los derechos reservados.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    try {
      const response = await this.client.emails.send({
        from: this.from,
        to: toEmail,
        subject: `Tu código de verificación NeoFood: ${code}`,
        html: htmlContent
      });

      if (response.error) {
        console.error('❌ [Resend Error]:', response.error);
        throw new Error(response.error.message || 'Error al enviar correo por Resend');
      }

      console.log('✅ [NeoFood Mailer] Correo enviado exitosamente vía Resend. ID:', response.data?.id);
      return { success: true, id: response.data?.id };
    } catch (err) {
      console.error('❌ [NeoFood Mailer Error]:', err.message);
      throw err;
    }
  }
}

module.exports = new EmailService();
