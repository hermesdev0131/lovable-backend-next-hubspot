import { triggerWorkflowWebhook } from './webhooks';
import { hubspotClient, handleHubspotAuthError } from './hubspotAuth';
import { Client } from '@hubspot/api-client';


// Contact operations
export const createContact = async (contactData: any) => {
	const contact = await hubspotClient.crm.contacts.basicApi.create({ 
		properties: contactData,
		associations: [] // Adding the required associations property
	});

	//Trigger the welcome workflow
	await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/hubspot/workflows/welcome`, {
		method: 'POST',
		headers: {
			'Content_Type': 'application/json',
		},
		body: JSON.stringify({
			contactId: contact.id,
			contactData: contact.properties
		})
	});

	await triggerWorkflowWebhook('contact.created', contact);
	return contact;
};

export const updateContact = async (contactId: string, contactData: any) => {
	const contact = await hubspotClient.crm.contacts.basicApi.update(contactId, { properties: contactData });
	await triggerWorkflowWebhook('contact.updated', contact);
	return contact;
};

export const deleteContact = async (contactId: string) => {
	await hubspotClient.crm.contacts.basicApi.archive(contactId);
	await triggerWorkflowWebhook('contact.deleted', { contactId });
};

// Deal operations
export const createDeal = async (dealData: any) => {
	const deal = await hubspotClient.crm.deals.basicApi.create({ 
		properties: dealData,
		associations: [] // Adding the required associations property
	});
	await triggerWorkflowWebhook('deal.created', deal);
	return deal;
};

export const updateDeal = async (dealId: string, dealData: any) => {
	// Get Current deal to check for stage change
	const currnetDeal = await hubspotClient.crm.deals.basicApi.getById(dealId, ['dealstage']);
	const previousStage = currnetDeal.properties.dealstage;

	const deal = await hubspotClient.crm.deals.basicApi.update(dealId, { properties: dealData});

	//If stage has changed, trigger the workflow
	if (dealData.dealstage && dealData.dealstage !== previousStage) {
		await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/hubspot/workflows/deal-stage`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json', 
			},
			body: JSON.stringify({
				dealId,
				dealData: deal.properties,
				previousStage,
				newStage: dealData.dealstage
			})
		});
	}

	await triggerWorkflowWebhook('deal.updated', deal);
	return deal;
};

export const deleteDeal = async (dealId: string) => {
	await hubspotClient.crm.deals.basicApi.archive(dealId);
	await triggerWorkflowWebhook('deal.deleted', { dealId });
};

//Company operations
export const createCompany = async (companyData: any) => {
	const company = await hubspotClient.crm.companies.basicApi.create({ 
		properties: companyData,
		associations: [] // Adding the required associations property
	});
	await triggerWorkflowWebhook('company.created', company);
	return company;
};

export const updateCompany = async (companyId: string, companyData: any) => {
	//Get current company to check for changes
	const currentCompany = await hubspotClient.crm.companies.basicApi.getById(companyId);
	const changes: Record<string, { from: any; to: any }> = {};

	// Compare properties to find changes
	Object.entries(companyData).forEach(([key, value]) => {
		if (currentCompany.properties[key] !== value) {
			changes[key] = {
				from: currentCompany.properties[key],
				to: value
			};
		}
	});

	const company = await hubspotClient.crm.companies.basicApi.update(companyId, { properties: companyData});

	// If there are changes, trigger the workflow
	if (Object.keys(changes).length > 0) {
		await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/hubspot/workflows/company-update`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				companyId,
				companyData: company.properties,
				changes
			})
		});
	}

	await triggerWorkflowWebhook('company.updated', company);
	return company;
};

export const deleteCompany = async (CompanyId: string) => {
	await hubspotClient.crm.companies.basicApi.archive(CompanyId);
	await triggerWorkflowWebhook('company.deleted', { CompanyId });
};