const nodemailer = require('nodemailer');

class GmailProvider {
    constructor(credentials) {
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: credentials.email,
                pass: credentials.appPassword // Use App Password for Gmail
            }
        });
        this.fromEmail = credentials.email;
        this.fromName = credentials.fromName || credentials.email;
    }

    async send(to, subject, html, text) {
        try {
            const info = await this.transporter.sendMail({
                from: `"${this.fromName}" <${this.fromEmail}>`,
                to,
                subject,
                text: text || html.replace(/<[^>]*>/g, ''),
                html
            });

            return {
                success: true,
                externalId: info.messageId,
                status: 'SENT'
            };
        } catch (error) {
            console.error('Gmail error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

class SMTPProvider {
    constructor(credentials) {
        this.transporter = nodemailer.createTransport({
            host: credentials.host,
            port: credentials.port || 587,
            secure: credentials.secure || false,
            auth: {
                user: credentials.username,
                pass: credentials.password
            }
        });
        this.fromEmail = credentials.fromEmail || credentials.username;
        this.fromName = credentials.fromName || 'CRM System';
    }

    async send(to, subject, html, text) {
        try {
            const info = await this.transporter.sendMail({
                from: `"${this.fromName}" <${this.fromEmail}>`,
                to,
                subject,
                text: text || html.replace(/<[^>]*>/g, ''),
                html
            });

            return {
                success: true,
                externalId: info.messageId,
                status: 'SENT'
            };
        } catch (error) {
            console.error('SMTP error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

function createEmailProvider(provider, credentials) {
    switch (provider) {
        case 'GMAIL':
            return new GmailProvider(credentials);
        case 'SMTP':
            return new SMTPProvider(credentials);
        default:
            throw new Error(`Unknown email provider: ${provider}`);
    }
}

module.exports = { GmailProvider, SMTPProvider, createEmailProvider };
