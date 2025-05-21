import axios from 'axios';

export const triggerWorkflowWebhook = async (
	eventType: string,
	data: Record<string, any>
) => {
	try {
		await axios.post(`${process.env.N8N_WEBHOOK_URL}/workflow`, {
			eventType,
			data,
		});
	} catch (error) {
		console.error('Error triggering webhook:', error);
	}
};
