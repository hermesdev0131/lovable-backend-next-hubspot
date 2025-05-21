import { NextResponse } from 'next/server';
import { getTokens, isTokenExpired } from '@/lib/tokenStorage';
import { refreshHubspotToken } from '@/lib/hubspotAuth';

export async function GET() {
  try {
    const tokens = getTokens();
    
    // No tokens stored
    if (!tokens) {
      return NextResponse.json({
        connected: false,
        message: 'Not connected to HubSpot. Please authorize the application.'
      });
    }
    
    // Check if token is expired
    if (isTokenExpired()) {
      // Try to refresh the token
      const refreshed = await refreshHubspotToken();
      
      if (!refreshed) {
        return NextResponse.json({
          connected: false,
          message: 'HubSpot connection expired. Please reauthorize the application.'
        });
      }
      
      return NextResponse.json({
        connected: true,
        message: 'Connected to HubSpot (token refreshed)'
      });
    }
    
    // Token is valid
    return NextResponse.json({
      connected: true,
      message: 'Connected to HubSpot'
    });
  } catch (error) {
    console.error('Error checking HubSpot connection status:', error);
    return NextResponse.json(
      { 
        connected: false, 
        message: 'Error checking HubSpot connection status' 
      },
      { status: 500 }
    );
  }
}