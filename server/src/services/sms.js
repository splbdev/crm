const axios = require('axios');

class TwilioSMSProvider {
    constructor(credentials) {
        this.accountSid = credentials.accountSid;
        this.authToken = credentials.authToken;
        this.fromNumber = credentials.fromNumber;
        this.baseUrl = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}`;
    }

    async send(to, message) {
        try {
            const response = await axios.post(
                `${this.baseUrl}/Messages.json`,
                new URLSearchParams({
                    To: to,
                    From: this.fromNumber,
                    Body: message
                }),
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
            console.error('Twilio SMS error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.message || error.message
            };
        }
    }
}

// eSMS Provider based on documentation
class ESMSProvider {
    constructor(credentials) {
        this.apiKey = credentials.apiKey;
        this.secretKey = credentials.secretKey;
        this.brandName = credentials.brandName;
        this.baseUrl = 'http://rest.esms.vn/MainService.svc/json';
    }

    async send(to, message) {
        try {
            const response = await axios.post(`${this.baseUrl}/SendMultipleMessage_V4_post_json/`, {
                ApiKey: this.apiKey,
                Content: message,
                Phone: to,
                SecretKey: this.secretKey,
                Brandname: this.brandName,
                SmsType: '2'
            });

            return {
                success: response.data.CodeResult === '100',
                externalId: response.data.SMSID,
                status: response.data.CodeResult === '100' ? 'SENT' : 'FAILED',
                error: response.data.ErrorMessage
            };
        } catch (error) {
            console.error('eSMS error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

function createSMSProvider(provider, credentials) {
    switch (provider) {
        case 'TWILIO':
            return new TwilioSMSProvider(credentials);
        case 'ESMS':
            return new ESMSProvider(credentials);
        default:
            throw new Error(`Unknown SMS provider: ${provider}`);
    }
}

module.exports = { TwilioSMSProvider, ESMSProvider, createSMSProvider };
