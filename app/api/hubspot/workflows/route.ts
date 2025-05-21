import axios from 'axios';

const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;

export const n8nService = {
  async triggerWorkflow(eventType: string, data: any) {
    try {
      await axios.post(`${n8nWebhookUrl}/workflow`, { eventType, data });
      console.log('Workflow triggered successfully');
    } catch (error) {
      console.error('Error triggering workflow:', error);
    }
  }
};
