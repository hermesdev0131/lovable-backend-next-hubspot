import { NextResponse, NextRequest } from 'next/server';
import { hubspotClient } from '@/lib/hubspotAuth';
import { storeTokens } from '@/lib/tokenStorage';

export async function GET(request: NextRequest) {
  // Get URL parameters
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  // Handle OAuth errors
  if (error) {
    console.error('HubSpot OAuth error:', error);
    return NextResponse.json(
      { error: 'OAuth authorization failed' },
      { status: 400 }
    );
  }

  // Validate code parameter
  if (!code) {
    return NextResponse.json(
      { error: 'Invalid authorization code' },
      { status: 400 }
    );
  }

  try {
    // Exchange the authorization code for tokens
    const tokenResponse = await hubspotClient.oauth.tokensApi.create(
      'authorization_code',
      code,
      process.env.HUBSPOT_REDIRECT_URI,
      process.env.HUBSPOT_CLIENT_ID,
      process.env.HUBSPOT_CLIENT_SECRET
    );

    // Extract token data
    const { accessToken, refreshToken, expiresIn } = tokenResponse;
    
    // Store tokens securely
    storeTokens(accessToken, refreshToken, expiresIn);
    
    // Set the access token for the current client instance
    hubspotClient.setAccessToken(accessToken);
    
    // Redirect back to the application with success message
    return NextResponse.redirect(`${process.env.FRONTEND_URL}/hubspot-connected?success=true`);
  } catch (error) {
    console.error('Error exchanging HubSpot authorization code:', error);
    return NextResponse.json(
      { error: 'Failed to complete OAuth flow' },
      { status: 500 }
    );
  }
}