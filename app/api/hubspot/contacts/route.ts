import { NextResponse } from 'next/server';
import { hubspotClient, handleHubspotAuthError } from '@/lib/hubspotAuth';
import { initializeHubspotClient } from '@/lib/hubspotAuth';

export async function GET() {
  try {
    // Make sure we have a valid token
    if (!initializeHubspotClient()) {
      return NextResponse.json(
        { 
          error: 'Not connected to HubSpot. Please authorize the application.' 
        },
        { status: 401 }
      );
    }
    
    // Get contacts from HubSpot
    const contactsResponse = await hubspotClient.crm.contacts.basicApi.getPage(
      10, // limit
      undefined, // after
      ['firstname', 'lastname', 'email'], // properties
      undefined, // propertiesWithHistory
      undefined, // associations
      false // archived
    );
    
    return NextResponse.json({
      contacts: contactsResponse.results
    });
  } catch (error: any) {
    // Try to handle auth errors (token expired)
    const canRetry = await handleHubspotAuthError(error);
    
    if (canRetry) {
      // Retry the request with the new token
      const contactsResponse = await hubspotClient.crm.contacts.basicApi.getPage(
        10, // limit
        undefined, // after
        ['firstname', 'lastname', 'email'], // properties
        undefined, // propertiesWithHistory
        undefined, // associations
        false // archived
      );
      
      return NextResponse.json({
        contacts: contactsResponse.results
      });
    }
    
    // Handle other errors
    console.error('Error fetching HubSpot contacts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contacts from HubSpot' },
      { status: 500 }
    );
  }
}