import { NextRequest, NextResponse } from 'next/server';
import { corsOptionsResponse, corsHeaders } from '@/lib/cors';

const HUBSPOT_BASE_URL = 'https://api.hubapi.com';



// Map our deal stages to HubSpot deal stages
const stageMapping: Record<string, string> = {
  'discovery': 'appointmentscheduled',
  'proposal': 'qualifiedtobuy',
  'negotiation': 'presentationscheduled',
  'decision': 'decisionmakerboughtin',
  'contract_sent': 'contractsent',
  'closed_won': 'closedwon',
  'closed_lost': 'closedlost',
};

// Reverse mapping for getting our stage from HubSpot stage
const reverseStageMapping: Record<string, string> = Object.entries(stageMapping).reduce(
  (acc, [key, value]) => ({ ...acc, [value]: key }), {}
);

// Convert our deal object to HubSpot properties
function dealToHubspotProperties(dealData: any) {
  // Only use standard HubSpot properties to avoid issues with custom properties
  const properties: Record<string, any> = {
    dealname: dealData.name,
    amount: dealData.value?.toString() || '0',
    dealstage: stageMapping[dealData.stage] || 'appointmentscheduled',
    pipeline: 'default',
    closedate: dealData.closingDate ? new Date(dealData.closingDate).getTime().toString() : new Date().getTime().toString(),
    description: dealData.description || '',
  };

  // Store additional data in the description field as JSON
  const additionalData = {
    probability: dealData.probability || 0,
    currency: dealData.currency || 'USD',
    company: dealData.company || '',
    assignedTo: dealData.assignedTo || '',
    contactId: dealData.contactId || '',
    appointments: dealData.appointments || [],
    attachments: dealData.attachments || [],
    customFields: dealData.customFields || {},
  };

  // Append the additional data to the description
  properties.description += `\n\nAdditional Data: ${JSON.stringify(additionalData, null, 2)}`;

  return properties;
}

// Convert HubSpot deal to our deal object
function hubspotToDeal(hubspotDeal: any) {
  const props = hubspotDeal.properties;
  
  // Initialize deal with standard properties
  const deal = {
    id: hubspotDeal.id,
    hubspotId: hubspotDeal.id,
    name: props.dealname || '',
    value: parseFloat(props.amount) || 0,
    stage: reverseStageMapping[props.dealstage] || 'discovery',
    closingDate: props.closedate ? new Date(parseInt(props.closedate)).toISOString() : new Date().toISOString(),
    description: props.description || '',
    createdAt: props.createdate ? new Date(parseInt(props.createdate)).toISOString() : new Date().toISOString(),
    updatedAt: props.hs_lastmodifieddate ? new Date(parseInt(props.hs_lastmodifieddate)).toISOString() : new Date().toISOString(),
    company: '',
    currency: 'USD',
    probability: 0,
    customFields: {},
    assignedTo: 'account-owner',
    contactId: '',
    appointments: [] as any[],
    attachments: [] as any[],
  };

  // Try to extract additional data from the description field
  if (props.description && props.description.includes('Additional Data:')) {
    try {
      const additionalDataStr = props.description.split('Additional Data:')[1].trim();
      const additionalData = JSON.parse(additionalDataStr);
      
      // Update deal with additional data
      deal.company = additionalData.company || '';
      deal.currency = additionalData.currency || 'USD';
      deal.probability = additionalData.probability || 0;
      deal.customFields = additionalData.customFields || {};
      deal.assignedTo = additionalData.assignedTo || 'account-owner';
      deal.contactId = additionalData.contactId || '';
      deal.appointments = additionalData.appointments || [];
      deal.attachments = additionalData.attachments || [];
      
      // Clean up the description by removing the additional data
      deal.description = props.description.split('Additional Data:')[0].trim();
    } catch (e) {
      console.error('Error parsing additional data from description:', e);
    }
  }

  return deal;
}

// Handle CORS preflight
export async function OPTIONS() {
  return corsOptionsResponse();
}

// POST: Create a new deal
export async function POST(request: NextRequest) {
  try {
    const dealData = await request.json();

    if (!dealData.name) {
      return corsHeaders(NextResponse.json({ message: 'Deal name is required' }, { status: 400 }));
    }

    const accessToken = process.env.HUBSPOT_ACCESS_TOKEN!;
    // No longer need to create custom properties since we're using standard properties
    
    const properties = dealToHubspotProperties(dealData);

    // Use fetch to create the deal in HubSpot
    const res = await fetch(`${HUBSPOT_BASE_URL}/crm/v3/objects/deals`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ properties }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('HubSpot API Error Response:', JSON.stringify(data, null, 2));
      if (data.validationResults) {
        throw new Error(JSON.stringify(data.validationResults));
      } else {
        throw new Error(data.message || 'Failed to create deal');
      }
    }

    // Convert the HubSpot response to our deal format
    const deal = {
      id: data.id,
      hubspotId: data.id,
      ...dealData,
    };

    return corsHeaders(
      NextResponse.json({
        ...deal,
        message: 'Deal created successfully in HubSpot',
      })
    );
  } catch (error: any) {
    console.error('HubSpot Deal Creation Error:', error);
    let details = null;
    if (typeof error.message === 'string') {
      try {
        if (error.message.includes('[{')) {
          details = JSON.parse(error.message);
        }
      } catch (parseError) {
        console.error('Error parsing error message:', parseError);
      }
    }
    
    return corsHeaders(
      NextResponse.json({ 
        message: 'Internal Server Error', 
        error: error.message,
        details: details
      }, { status: 500 })
    );
  }
}

// GET: Fetch deals
export async function GET(request: NextRequest) {
  try {
    const accessToken = process.env.HUBSPOT_ACCESS_TOKEN!;
    console.log("Fetching deals...");

    // Check if we're looking for a specific deal by ID
    const url = new URL(request.url);
    const dealId = url.searchParams.get('id');

    if (dealId) {
      // Fetch a single deal by ID
      const fields = [
        'dealname',
        'amount',
        'dealstage',
        'pipeline',
        'closedate',
        'createdate',
        'hs_lastmodifieddate',
        'description',
      ].join(',');

      const res = await fetch(`${HUBSPOT_BASE_URL}/crm/v3/objects/deals/${dealId}?properties=${fields}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (res.status === 404) {
        return corsHeaders(NextResponse.json({ message: 'Deal not found' }, { status: 404 }));
      }

      const deal = await res.json();
      if (!res.ok) throw new Error(deal.message || 'Failed to fetch deal');

      // Convert the HubSpot deal to our deal format
      const formattedDeal = hubspotToDeal(deal);

      return corsHeaders(NextResponse.json(formattedDeal));
    } else {
      // Fetch all deals
      const fields = [
        'dealname',
        'amount',
        'dealstage',
        'pipeline',
        'closedate',
        'createdate',
        'hs_lastmodifieddate',
        'description',
      ].join(',');

      const res = await fetch(`${HUBSPOT_BASE_URL}/crm/v3/objects/deals?limit=100&properties=${fields}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fetch deals');

      // Convert all HubSpot deals to our deal format
      const deals = data.results.map((deal: any) => hubspotToDeal(deal));

      return corsHeaders(NextResponse.json(deals));
    }
  } catch (error: any) {
    console.error('HubSpot Deal Fetch Error:', error);
    return corsHeaders(
      NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 })
    );
  }
}

// PUT: Update a deal by ID
export async function PUT(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const dealId = url.searchParams.get('id');
    const dealStage = url.searchParams.get('stage');
    // console.log(dealStage, dealId);
    
    if (!dealId) {
      return corsHeaders(NextResponse.json({ message: 'Deal ID is required' }, { status: 400 }));
    }

    const dealData = await request.json();
    const accessToken = process.env.HUBSPOT_ACCESS_TOKEN!;
    
    // Check if this is a stage update
    // const isStageUpdate = dealData.stage !== undefined;
    
    // console.log(dealStage);
    if (dealStage) {
      const { stage, stageName } = dealData;
      const properties = {
        dealstage: stageMapping[stage] || 'appointmentscheduled',
      };
      // console.log("Stage Update");
      const res = await fetch(`${HUBSPOT_BASE_URL}/crm/v3/objects/deals/${dealId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ properties }),
      });

      if (res.status === 404) {
        return corsHeaders(NextResponse.json({ message: 'Deal not found' }, { status: 404 }));
      }

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to update deal stage');
      }

      return corsHeaders(
        NextResponse.json({
          id: dealId,
          stage,
          stageName,
          message: 'Deal stage updated successfully in HubSpot',
        })
      );
    } else {
      if (!dealData.name) {
        return corsHeaders(NextResponse.json({ message: 'Deal name is required' }, { status: 400 }));
      }
      
      const properties = dealToHubspotProperties(dealData);
      // console.log(properties);
      const res = await fetch(`${HUBSPOT_BASE_URL}/crm/v3/objects/deals/${dealId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ properties }),
      });

      if (res.status === 404) {
        return corsHeaders(NextResponse.json({ message: 'Deal not found' }, { status: 404 }));
      }

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to update deal');
      }

      const deal = {
        id: dealId,
        hubspotId: dealId,
        ...dealData,
        updatedAt: new Date().toISOString(),
      };

      return corsHeaders(
        NextResponse.json({
          ...deal,
          message: 'Deal updated successfully in HubSpot',
        })
      );
    }
  } catch (error: any) {
    console.error('HubSpot Deal Update Error:', error);
    return corsHeaders(
      NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 })
    );
  }
}

// DELETE: Delete a deal by ID
export async function DELETE(request: NextRequest) {
  try {
    // Extract the deal ID from the URL query parameters
    const url = new URL(request.url);
    const dealId = url.searchParams.get('id');
    
    if (!dealId) {
      return corsHeaders(NextResponse.json({ message: 'Deal ID is required' }, { status: 400 }));
    }

    const accessToken = process.env.HUBSPOT_ACCESS_TOKEN!;
    if (!accessToken) {
      console.error("No HubSpot access token found");
      return corsHeaders(NextResponse.json({ message: 'Server configuration error' }, { status: 500 }));
    }
    
    console.log(`Attempting to delete deal with ID: ${dealId}`);
    
    // Use fetch to delete the deal in HubSpot
    const res = await fetch(`${HUBSPOT_BASE_URL}/crm/v3/objects/deals/${dealId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (res.status === 404) {
      return corsHeaders(NextResponse.json({ message: 'Deal not found' }, { status: 404 }));
    }

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || 'Failed to delete deal');
    }

    return corsHeaders(
      NextResponse.json({
        message: 'Deal deleted successfully from HubSpot',
        id: dealId
      })
    );
  } catch (error: any) {
    console.error('HubSpot Deal Deletion Error:', error);
    return corsHeaders(
      NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 })
    );
  }
}
