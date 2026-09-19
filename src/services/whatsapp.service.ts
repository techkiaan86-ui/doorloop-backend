import prisma from '../config/database';
import { decrypt } from '../utils/crypto';

export class WhatsAppService {
  /**
   * Send a live WhatsApp message using company's Meta Cloud API credentials
   */
  async sendWhatsAppMessage(data: {
    companyId?: string;
    to: string;
    message: string;
  }): Promise<{ success: boolean; message: string }> {
    if (!data.companyId || !data.to || !data.message) {
      return { success: false, message: 'Missing required WhatsApp parameters.' };
    }

    try {
      const integration = await prisma.companyIntegration.findFirst({
        where: {
          companyId: data.companyId,
          provider: 'WHATSAPP',
          status: 'Active',
        },
      });

      if (!integration || !integration.accountSid || !integration.encryptedAuthToken || !integration.encryptionIv) {
        console.log(`WhatsApp Integration inactive or missing for companyId: ${data.companyId}`);
        return { success: false, message: 'WhatsApp integration not configured or inactive.' };
      }

      const rawToken = decrypt(integration.encryptedAuthToken, integration.encryptionIv);
      const phoneId = integration.accountSid; // Meta Phone Number ID

      // Clean phone number format
      const cleanedPhone = data.to.replace(/\D/g, '');
      const recipient = cleanedPhone.length === 10 ? `1${cleanedPhone}` : cleanedPhone;

      const url = `https://graph.facebook.com/v20.0/${phoneId}/messages`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${rawToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: recipient,
          type: 'text',
          text: { body: data.message },
        }),
      });

      if (response.ok) {
        return { success: true, message: 'WhatsApp message sent successfully via Meta Cloud API!' };
      } else {
        const errorBody: any = await response.json().catch(() => ({}));
        console.error('Meta WhatsApp API error:', errorBody);
        return {
          success: false,
          message: errorBody.error?.message || `Meta API request failed with status ${response.status}`,
        };
      }
    } catch (error: any) {
      console.error('Failed to dispatch WhatsApp message:', error);
      return { success: false, message: `WhatsApp dispatch error: ${error.message}` };
    }
  }
}

export const whatsappService = new WhatsAppService();
