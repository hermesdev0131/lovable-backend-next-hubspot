import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const clientId = process.env.HUBSPOT_CLIENT_ID!;
    const redirectUri = process.env.HUBSPOT_REDIRECT_URI!;
    
    // Use a more focused set of scopes
    const scopes = [
      'crm.objects.contacts.read',
      'crm.objects.contacts.write',
      'crm.objects.deals.read',
      'crm.objects.deals.write'
    ].join('%20');
    
    console.log('HUBSPOT_CLIENT_ID:', clientId);
    console.log('HUBSPOT_REDIRECT_URI:', redirectUri);
    
    // Use the EU region endpoint
    const url = `https://app-eu1.hubspot.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}`;
    
    console.log('Redirecting to:', url);
    return NextResponse.redirect(url);
  } catch (error) {
    console.error('Error in HubSpot OAuth login:', error);
    return NextResponse.json({ error: 'Failed to initiate OAuth flow' }, { status: 500 });
  }
}
