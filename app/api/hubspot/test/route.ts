import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Get environment variables
    const clientId = process.env.HUBSPOT_CLIENT_ID;
    const clientSecret = process.env.HUBSPOT_CLIENT_SECRET;
    const redirectUri = process.env.HUBSPOT_REDIRECT_URI;
    
    // Return environment variables for debugging
    return NextResponse.json({
      message: 'HubSpot OAuth configuration',
      clientId,
      clientSecret: clientSecret ? '****' : 'Not set',
      redirectUri,
      loginUrl: '/api/hubspot/oauth/login',
      note: 'Visit /api/hubspot/oauth/login to start the OAuth flow'
    });
  } catch (error) {
    console.error('Error in test route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}