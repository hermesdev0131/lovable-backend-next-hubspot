import axios from "axios";
import { timeStamp } from "console";
import { triggerWorkflowWebhook } from "./webhooks";
interface TaskResponse {
	id: string;
	subject: string;
	dueDate: string;
	priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface EmailResponse {
	id: string;
	subject: string;
	body: string;
	templateId?: string;
}

const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;

export const n8nService = {
	async triggerContactWorkflow(contactId: string, eventType: string) {
		try {
			await axios.post(`${n8nWebhookUrl}/contact`, {
				contactId,
				eventType,
				timestamp: new Date().toISOString()
			});
		} catch (error) {
			console.error('Error triggering contact workflow:', error);
			throw error;
		}
	},

	async triggerDealWorkflow(dealId: string, eventType: string) {
		try {
			await axios.post(`${n8nWebhookUrl}/deal`, {
				dealId,
				eventType,
				timestapm: new Date().toISOString()
			});
		} catch (error) {
			console.error('Error triggering deal workflow:', error);
			throw error;
		}
	},

	async triggerCompanyWorkflow(companyId: string, eventType: string) {
		try {
			await axios.post(`${n8nWebhookUrl}/company`, {
				companyId,
				eventType,
				timestamp: new Date().toISOString()
			});
		} catch (error) {
			console.error('Error triggering company workflow:', error);
			throw error;
		}
	},

	async triggerCustomWorkflow(data: unknown, eventType: string) {
		try {
			await axios.post(`${n8nWebhookUrl}/custom`, {
				data,
				eventType,
				timestamp: new Date().toISOString()
			});
		} catch (error) {
			console.error('Error triggering custom workflow:', error);
			throw error;
		}
	},

	async createTask(contactId: string, taskData: {
		subject: string;
		dueDate: string;
		priority: 'HIGH' | 'MEDIUM' | 'LOW';
	}): Promise<TaskResponse> {
		try {
			const response = await axios.post<TaskResponse>(`${n8nWebhookUrl}/task`, {
				contactId,
				...taskData,
				timestamp: new Date().toISOString()
			});
			return response.data;
		} catch (error) {
			console.error('Error creating task:', error);
			throw error;
		}
	},

	async sendEmail(contactId: string, emailData: {
		subject: string;
		body: string;
		templateId?: string;
	}): Promise<EmailResponse> {
		try {
			const response = await axios.post<EmailResponse>(`${n8nWebhookUrl}/email`, {
				contactId,
				...emailData,
				timestamp: new Date().toISOString()
			});
			return response.data;
		} catch (error) {
			console.error('Error sending email:', error);
			throw error;
		}
	},

	async sendNotification(contactId: string, notificationData: {
		type: 'SMS' | 'EMAIL' | 'PUSH';
		message: string;
	}) {
		try {
			await axios.post(`${n8nWebhookUrl}/notification`, {
				contactId,
				...notificationData,
				timestamp: new Date().toISOString()
			});
		} catch (error) {
			console.error('Error sending notification:', error);
			throw error;
		}
	},

	async createTaskWithWorkflow(contactId: string, taskData: {
		subject: string;
		dueDate: string;
		priority: 'HIGH' | 'MEDIUM' | 'LOW';
	}) {
		try {
			// First create the task
			const task = await this.createTask(contactId, taskData);

			// Then trigger the task workflow
			await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/hubspot/workflows/task`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					taskId: task.id,
					taskData,
					contactId
				})
			});

			return task;
		} catch (error) {
			console.error('Error creating task with workflow:', error);
			throw error;
		}
	},

	async triggerWorkflowWebhook(dealId: string, oldStage: string, newStage: string, dealData: Record<string, unknown>) {
		try {
			await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/hubspot/workflows/deal-stage`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					dealId,
					oldStage,
					newStage,
					dealData
				})
			});
		} catch (error) {
			console.error('Error triggering deal stage workflow:', error);
			throw error;
		}
	},






}