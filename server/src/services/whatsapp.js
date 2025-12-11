const axios = require('axios');

// Twilio WhatsApp Provider
class TwilioWhatsAppProvider {
    constructor(credentials) {
        this.accountSid = credentials.accountSid;
        this.authToken = credentials.authToken;
        this.fromNumber = credentials.fromNumber; // whatsapp:+14155238886
        this.baseUrl = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}`;
    }

    async send(to, message, mediaUrl = null) {
        try {
            const data = {
                To: `whatsapp:${to}`,
                From: this.fromNumber.startsWith('whatsapp:') ? this.fromNumber : `whatsapp:${this.fromNumber}`,
                Body: message
            };

            if (mediaUrl) {
                data.MediaUrl = mediaUrl;
            }

            const response = await axios.post(
                `${this.baseUrl}/Messages.json`,
                new URLSearchParams(data),
                {
                    auth: {
                        username: this.accountSid,
                        password: this.authToken
                    }
                }
            );

            return {
                success: true,
                externalId: response.data.sid,
                status: response.data.status
            };
        } catch (error) {
            console.error('Twilio WhatsApp error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.message || error.message
            };
        }
    }
}

// WAACS Provider - Based on waacs.md documentation
class WAACSProvider {
    constructor(credentials) {
        this.apiKey = credentials.apiKey;
        this.sessionName = credentials.sessionName;
        this.baseUrl = 'https://waacs.online/api';
    }

    async send(to, message, mediaUrl = null, mediaType = null, scheduleAt = null) {
        try {
            const contact = {
                number: to.replace(/[^0-9]/g, ''),
                message,
                session_name: this.sessionName
            };

            if (scheduleAt) {
                contact.schedule_at = scheduleAt;
            }

            if (mediaUrl && mediaType) {
                contact.media = mediaType; // image, video, audio, document
                contact.url = mediaUrl;
            }

            const response = await axios.post(
                `${this.baseUrl}/whatsapp/send`,
                { contact: [contact] },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Api-key': this.apiKey
                    }
                }
            );

            return {
                success: response.data.success,
                externalId: response.data.data?.[0]?.uid,
                status: response.data.data?.[0]?.status || 'Pending',
                message: response.data.message
            };
        } catch (error) {
            console.error('WAACS error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.message || error.message
            };
        }
    }

    async getStatus(uid) {
        try {
            const response = await axios.get(`${this.baseUrl}/get/whatsapp/${uid}`, {
                headers: { 'Api-key': this.apiKey }
            });

            return {
                success: response.data.success,
                status: response.data.data?.status,
                data: response.data.data
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

// WhatsCloud Provider - Based on whatscloud.md documentation
class WhatsCloudProvider {
    constructor(credentials) {
        this.token = credentials.token;
        this.instanceId = credentials.instanceId;
        this.baseUrl = 'https://wasuite.saasapp.site/api/v1';
    }

    formatJid(phone) {
        // Format: 919999999999@s.whatsapp.net
        const cleaned = phone.replace(/[^0-9]/g, '');
        return `${cleaned}@s.whatsapp.net`;
    }

    async send(to, message) {
        try {
            const jid = this.formatJid(to);
            const response = await axios.get(`${this.baseUrl}/send-text`, {
                params: {
                    token: this.token,
                    instance_id: this.instanceId,
                    jid,
                    msg: message
                }
            });

            return {
                success: response.data.success,
                message: response.data.message,
                response: response.data.response
            };
        } catch (error) {
            console.error('WhatsCloud error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.message || error.message
            };
        }
    }

    async sendImage(to, imageUrl, caption = '') {
        try {
            const jid = this.formatJid(to);
            const response = await axios.get(`${this.baseUrl}/send-image`, {
                params: {
                    token: this.token,
                    instance_id: this.instanceId,
                    jid,
                    imageurl: imageUrl,
                    caption
                }
            });

            return {
                success: response.data.success,
                message: response.data.message
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async sendVideo(to, videoUrl, caption = '') {
        try {
            const jid = this.formatJid(to);
            const response = await axios.get(`${this.baseUrl}/send-video`, {
                params: {
                    token: this.token,
                    instance_id: this.instanceId,
                    jid,
                    videourl: videoUrl,
                    caption
                }
            });

            return {
                success: response.data.success,
                message: response.data.message
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async sendAudio(to, audioUrl) {
        try {
            const jid = this.formatJid(to);
            const response = await axios.get(`${this.baseUrl}/send-audio`, {
                params: {
                    token: this.token,
                    instance_id: this.instanceId,
                    jid,
                    audiourl: audioUrl
                }
            });

            return {
                success: response.data.success,
                message: response.data.message
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async sendDocument(to, docUrl, caption = '') {
        try {
            const jid = this.formatJid(to);
            const response = await axios.get(`${this.baseUrl}/send-doc`, {
                params: {
                    token: this.token,
                    instance_id: this.instanceId,
                    jid,
                    docurl: docUrl,
                    caption
                }
            });

            return {
                success: response.data.success,
                message: response.data.message
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

// Official WhatsApp Business API Provider
class OfficialWhatsAppProvider {
    constructor(credentials) {
        this.accessToken = credentials.accessToken;
        this.phoneNumberId = credentials.phoneNumberId;
        this.baseUrl = `https://graph.facebook.com/v17.0/${credentials.phoneNumberId}`;
    }

    async send(to, message) {
        try {
            const response = await axios.post(
                `${this.baseUrl}/messages`,
                {
                    messaging_product: 'whatsapp',
                    to: to.replace(/[^0-9]/g, ''),
                    type: 'text',
                    text: { body: message }
                },
                {
                    headers: {
                        Authorization: `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return {
                success: true,
                externalId: response.data.messages?.[0]?.id,
                status: 'SENT'
            };
        } catch (error) {
            console.error('Official WhatsApp error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.error?.message || error.message
            };
        }
    }

    async sendTemplate(to, templateName, languageCode = 'en', components = []) {
        try {
            const response = await axios.post(
                `${this.baseUrl}/messages`,
                {
                    messaging_product: 'whatsapp',
                    to: to.replace(/[^0-9]/g, ''),
                    type: 'template',
                    template: {
                        name: templateName,
                        language: { code: languageCode },
                        components
                    }
                },
                {
                    headers: {
                        Authorization: `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return {
                success: true,
                externalId: response.data.messages?.[0]?.id,
                status: 'SENT'
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

function createWhatsAppProvider(provider, credentials) {
    switch (provider) {
        case 'TWILIO_WA':
            return new TwilioWhatsAppProvider(credentials);
        case 'WAACS':
            return new WAACSProvider(credentials);
        case 'WHATSCLOUD':
            return new WhatsCloudProvider(credentials);
        case 'OFFICIAL_WA':
            return new OfficialWhatsAppProvider(credentials);
        default:
            throw new Error(`Unknown WhatsApp provider: ${provider}`);
    }
}

module.exports = {
    TwilioWhatsAppProvider,
    WAACSProvider,
    WhatsCloudProvider,
    OfficialWhatsAppProvider,
    createWhatsAppProvider
};
