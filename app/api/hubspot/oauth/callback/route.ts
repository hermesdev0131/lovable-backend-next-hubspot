import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    // Extract the authorization code from the URL
    const code = req.nextUrl.searchParams.get('code');
    console.log('Code:', code);
    
    if (!code) {
      console.error('No code provided in the callback');
      return NextResponse.redirect(`${process.env.FRONTEND_URL}/auth/error?message=No authorization code received`);
    }

    // Log environment variables for debugging
    console.log('HUBSPOT_CLIENT_ID:', process.env.HUBSPOT_CLIENT_ID);
    console.log('HUBSPOT_REDIRECT_URI:', process.env.HUBSPOT_REDIRECT_URI);
    
    // Exchange the code for an access token
    const tokenResponse = await fetch('https://api.hubapi.com/oauth/v1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.HUBSPOT_CLIENT_ID!,
        client_secret: process.env.HUBSPOT_CLIENT_SECRET!,
        redirect_uri: process.env.HUBSPOT_REDIRECT_URI!,
        code,
      }),
    });

    // Handle API errors
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('HubSpot API Error:', errorText);
      return NextResponse.redirect(`${process.env.FRONTEND_URL}/auth/error?message=Failed to exchange code for token`);
    }

    // Parse the token data
    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    console.log('Access Token:', accessToken);
    
    // Store the token in your database or session here
    // ...
    
    // Redirect to the frontend with success
    return NextResponse.redirect(`${process.env.FRONTEND_URL}/auth/success?token=${accessToken}`);
  } catch (error) {
    console.error('Error in HubSpot OAuth callback:', error);
    return NextResponse.redirect(`${process.env.FRONTEND_URL}/auth/error?message=Internal server error`);
  }
}