const nodemailer = require("nodemailer");

class EmailService {
  constructor() {
    this.transporter = null;
    this.init();
  }

  init() {
    // Configuration pour Gmail (peut être changé pour d'autres services)
    this.transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Alternative avec configuration SMTP personnalisée
    // this.transporter = nodemailer.createTransporter({
    //   host: process.env.SMTP_HOST || 'smtp.gmail.com',
    //   port: process.env.SMTP_PORT || 587,
    //   secure: false, // true for 465, false for other ports
    //   auth: {
    //     user: process.env.SMTP_USER,
    //     pass: process.env.SMTP_PASS
    //   }
    // });
  }

  async sendPasswordResetEmail(to, resetUrl, userName) {
    try {
      const htmlTemplate = this.getPasswordResetTemplate(resetUrl, userName);

      const mailOptions = {
        from: {
          name: "Gestion de Budget",
          address: process.env.SMTP_USER,
        },
        to: to,
        subject:
          "🔐 Réinitialisation de votre mot de passe - Gestion de Budget",
        html: htmlTemplate,
        text: `
Bonjour ${userName},

Vous avez demandé une réinitialisation de mot de passe pour votre compte Gestion de Budget.

Cliquez sur le lien suivant pour réinitialiser votre mot de passe :
${resetUrl}

⚠️ Ce lien expirera dans 15 minutes pour des raisons de sécurité.

Si vous n'avez pas demandé cette réinitialisation, ignorez simplement cet email.

Cordialement,
L'équipe Gestion de Budget
        `,
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log("✅ Email sent successfully:", result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error("❌ Email sending failed:", error);
      return { success: false, error: error.message };
    }
  }

  getPasswordResetTemplate(resetUrl, userName) {
    return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Réinitialisation de mot de passe</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f6f9fc;
            padding: 20px;
        }
        
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 40px 30px;
            text-align: center;
            color: white;
        }
        
        .header h1 {
            font-size: 28px;
            font-weight: 600;
            margin-bottom: 10px;
        }
        
        .header p {
            font-size: 16px;
            opacity: 0.9;
        }
        
        .icon {
            width: 80px;
            height: 80px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 50%;
            margin: 0 auto 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 36px;
        }
        
        .content {
            padding: 40px 30px;
        }
        
        .greeting {
            font-size: 18px;
            color: #333;
            margin-bottom: 20px;
        }
        
        .message {
            font-size: 16px;
            line-height: 1.6;
            color: #555;
            margin-bottom: 30px;
        }
        
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            padding: 16px 32px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            text-align: center;
            margin: 20px 0;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
            transition: all 0.3s ease;
        }
        
        .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }
        
        .security-notice {
            background: #fef7e8;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 20px 0;
            border-radius: 0 8px 8px 0;
        }
        
        .security-notice h3 {
            color: #92400e;
            font-size: 16px;
            margin-bottom: 8px;
        }
        
        .security-notice p {
            color: #b45309;
            font-size: 14px;
            line-height: 1.4;
        }
        
        .alternative-link {
            background: #f8fafc;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            border: 1px solid #e2e8f0;
        }
        
        .alternative-link p {
            font-size: 14px;
            color: #64748b;
            margin-bottom: 8px;
        }
        
        .alternative-link code {
            background: #e2e8f0;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            word-break: break-all;
        }
        
        .footer {
            background: #f8fafc;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
        }
        
        .footer p {
            color: #64748b;
            font-size: 14px;
            line-height: 1.5;
            margin-bottom: 10px;
        }
        
        .footer .logo {
            font-weight: 600;
            color: #667eea;
            font-size: 18px;
        }
        
        @media (max-width: 600px) {
            .email-container {
                margin: 0;
                border-radius: 0;
            }
            
            .header, .content, .footer {
                padding: 20px;
            }
            
            .header h1 {
                font-size: 24px;
            }
            
            .cta-button {
                display: block;
                width: 100%;
                text-align: center;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <!-- Header -->
        <div class="header">
            <div class="icon">🔐</div>
            <h1>Réinitialisation de mot de passe</h1>
            <p>Sécurisez votre compte en quelques clics</p>
        </div>
        
        <!-- Content -->
        <div class="content">
            <div class="greeting">
                Bonjour ${userName || "Cher utilisateur"},
            </div>
            
            <div class="message">
                Vous avez demandé une réinitialisation de mot de passe pour votre compte <strong>Gestion de Budget</strong>.
                <br><br>
                Pour des raisons de sécurité, cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :
            </div>
            
            <div style="text-align: center;">
                <a href="${resetUrl}" class="cta-button">
                    🔒 Réinitialiser mon mot de passe
                </a>
            </div>
            
            <div class="security-notice">
                <h3>⚠️ Important - Sécurité</h3>
                <p>
                    Ce lien est valide pendant <strong>15 minutes seulement</strong> pour protéger votre compte.
                    <br>
                    Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
                </p>
            </div>
            
            <div class="alternative-link">
                <p><strong>Le bouton ne fonctionne pas ?</strong> Copiez et collez ce lien dans votre navigateur :</p>
                <code>${resetUrl}</code>
            </div>
        </div>
        
        <!-- Footer -->
        <div class="footer">
            <div class="logo">💰 Gestion de Budget</div>
            <p>
                Cet email a été envoyé automatiquement. Merci de ne pas répondre à ce message.
                <br>
                Si vous rencontrez des problèmes, contactez notre support.
            </p>
            <p>
                © ${new Date().getFullYear()} Gestion de Budget. Tous droits réservés.
            </p>
        </div>
    </div>
</body>
</html>
    `;
  }

  async testConnection() {
    try {
      await this.transporter.verify();
      console.log("✅ SMTP connection verified successfully");
      return true;
    } catch (error) {
      console.error("❌ SMTP connection failed:", error);
      return false;
    }
  }
}

module.exports = new EmailService();
