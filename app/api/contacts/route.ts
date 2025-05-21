import { NextRequest, NextResponse } from 'next/server';
import { corsOptionsResponse, corsHeaders } from '@/lib/cors';

// Custom properties to ensure in HubSpot
const customProperties = [
  {
    name: 'lead_type',
    label: 'Lead Type',
    description: 'Type of lead (Prospect, Lead, Customer, Partner)',
  },
  {
    name: 'lead_source',
    label: 'Lead Source',
    description: 'Source of the lead (Website, Referral, etc.)',
  },
  {
    name: 'tags',
    label: 'Tags',
    description: 'Tags associated with the contact',
  },
  {
    name: 'additional_emails',
    label: 'Additional Emails',
    description: 'Additional email addresses for the contact',
  },
  {
    name: 'additional_phones',
    label: 'Additional Phone Numbers',
    description: 'Additional phone numbers for the contact',
  },
];

const HUBSPOT_BASE_URL = 'https://api.hubapi.com';

// 🧱 Ensure custom contact properties exist
async function ensureCustomPropertiesExist(accessToken: string) {
  for (const property of customProperties) {
    const res = await fetch(`${HUBSPOT_BASE_URL}/crm/v3/properties/contacts/${property.name}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (res.status === 404) {
      console.log(`Creating property: ${property.name}`);
      await fetch(`${HUBSPOT_BASE_URL}/crm/v3/properties/contacts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: property.name,
          label: property.label,
          description: property.description,
          groupName: 'contactinformation',
          type: 'string',
          fieldType: 'text',
        }),
      });
    }
  }
}

// Handle CORS preflight
export async function OPTIONS() {
  return corsOptionsResponse();
}

// POST: Create a new contact
export async function POST(request: NextRequest) {
  try {
    const clientData = await request.json();

    if (!clientData.firstName || !clientData.lastName) {
      return corsHeaders(NextResponse.json({ message: 'First name and last name are required' }, { status: 400 }));
    }

    const accessToken = process.env.HUBSPOT_ACCESS_TOKEN!;
    await ensureCustomPropertiesExist(accessToken);

    const properties: Record<string, string> = {
      firstname: clientData.firstName,
      lastname: clientData.lastName,
      company: clientData.company || '',
      email: clientData.emails?.[0] || '',
      phone: clientData.phoneNumbers?.[0] || '',
      lifecyclestage: 'lead',
      // hs_lead_status: (clientData.status || 'NEW').toUpperCase(),
      lead_type: clientData.leadType || 'Prospect',
      lead_source: clientData.leadSource || 'Website',
      tags: clientData.tags?.join(';') || '',
    };

    if (clientData.emails?.length > 1) {
      properties.additional_emails = clientData.emails.slice(1).join(';');
    }

    if (clientData.phoneNumbers?.length > 1) {
      properties.additional_phones = clientData.phoneNumbers.slice(1).join(';');
    }

    const res = await fetch(`${HUBSPOT_BASE_URL}/crm/v3/objects/contacts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ properties }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to create contact');

    return corsHeaders(
      NextResponse.json({
        id: data.id,
        hubspotId: data.id,
        ...clientData,
        message: 'Contact created successfully in HubSpot',
      })
    );
  } catch (error: any) {
    console.error('HubSpot Contact Creation Error:', error);
    return corsHeaders(
      NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 })
    );
  }
}

// GET: Fetch contacts
export async function GET(request: NextRequest) {
  try {
    const accessToken = process.env.HUBSPOT_ACCESS_TOKEN!;
    console.log("contact");
    await ensureCustomPropertiesExist(accessToken);

    // Check if we're looking for a specific contact by ID
    const url = new URL(request.url);
    const contactId = url.searchParams.get('id');

    if (contactId) {
      // Fetch a single contact by ID
      const fields = [
        'firstname',
        'lastname',
        'company',
        'email',
        'phone',
        'lastmodifieddate',
        'lead_type',
        'lead_source',
        'tags',
        'additional_emails',
        'additional_phones',
      ].join(',');

      const res = await fetch(`${HUBSPOT_BASE_URL}/crm/v3/objects/contacts/${contactId}?properties=${fields}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (res.status === 404) {
        return corsHeaders(NextResponse.json({ message: 'Contact not found' }, { status: 404 }));
      }

      const contact = await res.json();
      if (!res.ok) throw new Error(contact.message || 'Failed to fetch contact');

      const props = contact.properties;
      const emails = props.additional_emails
        ? [props.email, ...props.additional_emails.split(';')].filter(Boolean)
        : [props.email].filter(Boolean);
      const phones = props.additional_phones
        ? [props.phone, ...props.additional_phones.split(';')].filter(Boolean)
        : [props.phone].filter(Boolean);
      const tags = props.tags ? props.tags.split(';').map((t: string) => t.trim()) : [];

      const formattedContact = {
        id: contact.id,
        hubspotId: contact.id,
        firstName: props.firstname || '',
        lastName: props.lastname || '',
        company: props.company || '',
        emails,
        phoneNumbers: phones,
        leadType: props.lead_type || 'Prospect',
        leadSource: props.lead_source || 'Website',
        tags,
        users: 0,
        deals: 0,
        contacts: 0,
        lastActivity: props.lastmodifieddate || new Date().toISOString(),
        logo: '',
      };

      return corsHeaders(NextResponse.json(formattedContact));
    } else {
      // Fetch all contacts
      const fields = [
        'firstname',
        'lastname',
        'company',
        'email',
        'phone',
        // 'hs_lead_status',
        'lastmodifieddate',
        'lead_type',
        'lead_source',
        'tags',
        'additional_emails',
        'additional_phones',
      ].join(',');

      const res = await fetch(`${HUBSPOT_BASE_URL}/crm/v3/objects/contacts?limit=100&properties=${fields}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fetch contacts');

      const contacts = data.results.map((contact: any) => {
        const props = contact.properties;
        const emails = props.additional_emails
          ? [props.email, ...props.additional_emails.split(';')].filter(Boolean)
          : [props.email].filter(Boolean);
        const phones = props.additional_phones
          ? [props.phone, ...props.additional_phones.split(';')].filter(Boolean)
          : [props.phone].filter(Boolean);
        const tags = props.tags ? props.tags.split(';').map((t: string) => t.trim()) : [];

        return {
          id: contact.id,
          hubspotId: contact.id,
          firstName: props.firstname || '',
          lastName: props.lastname || '',
          company: props.company || '',
          emails,
          phoneNumbers: phones,
          leadType: props.lead_type || 'Prospect',
          leadSource: props.lead_source || 'Website',
          // status: props.hs_lead_status?.toLowerCase() || 'new',
          tags,
          users: 0,
          deals: 0,
          contacts: 0,
          lastActivity: props.lastmodifieddate || new Date().toISOString(),
          logo: '',
        };
      });

      return corsHeaders(NextResponse.json(contacts));
    }
  } catch (error: any) {
    console.error('HubSpot Contact Fetch Error:', error);
    return corsHeaders(
      NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 })
    );
  }
}

// DELETE: Delete a contact by ID
export async function DELETE(request: NextRequest) {
  // console.log("request");
  try {
    // Extract the contact ID from the URL
    // console.log("error");
    const url = new URL(request.url);
    const contactId = url.searchParams.get('id');
    
    if (!contactId) {
      return corsHeaders(NextResponse.json({ message: 'Contact ID is required' }, { status: 400 }));
    }

    const accessToken = process.env.HUBSPOT_ACCESS_TOKEN!;
    if (!accessToken) {
      console.error("No HubSpot access token found");
      return corsHeaders(NextResponse.json({ message: 'Server configuration error' }, { status: 500 }));
    }
    
    console.log(`Attempting to delete contact with ID: ${contactId}`);
     
    // Delete the contact in HubSpot
    const res = await fetch(`${HUBSPOT_BASE_URL}/crm/v3/objects/contacts/${contactId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (res.status === 404) {
      return corsHeaders(NextResponse.json({ message: 'Contact not found' }, { status: 404 }));
    }

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || 'Failed to delete contact');
    }

    return corsHeaders(
      NextResponse.json({
        message: 'Contact deleted successfully',
        id: contactId
      })
    );
  } catch (error: any) {
    console.error('HubSpot Contact Deletion Error:', error);
    return corsHeaders(
      NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 })
    );
  }
}
