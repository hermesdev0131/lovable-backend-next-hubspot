import { Client } from '@hubspot/api-client';
import { getTokens, updateAccessToken, isTokenExpired } from './tokenStorage';

// Create and export the HubSpot client
// Initially created without an access token
export const hubspotClient = new Client({});

// Initialize the HubSpot client with stored tokens if available
export const initializeHubspotClient = (): boolean => {
  const tokens = getTokens();
  
  if (tokens && !isTokenExpired()) {
    // Set the access token on the client
    hubspotClient.setAccessToken(tokens.accessToken);
    return true;
  } else if (tokens && isTokenExpired()) {
    // Token is expired but we have a refresh token
    // We'll refresh it when needed
    return false;
  } else {
    // No tokens available
    return false;
  }
};

// Try to initialize the client when this module is imported
initializeHubspotClient();

// OAuth token refresh function
export const refreshHubspotToken = async () => {
  try {
    // Get stored tokens
    const tokens = getTokens();
    
    // If no tokens are stored, try to use environment variables as fallback
    const refreshToken = tokens?.refreshToken || process.env.HUBSPOT_REFRESH_TOKEN;
    const clientId = process.env.HUBSPOT_CLIENT_ID;
    const clientSecret = process.env.HUBSPOT_CLIENT_SECRET;
    
    if (!refreshToken || !clientId || !clientSecret) {
      console.error('Missing required HubSpot OAuth credentials');
      return false;
    }
    
    const result = await hubspotClient.oauth.tokensApi.create(
      'refresh_token',
      undefined,
      undefined,
      clientId,
      clientSecret,
      refreshToken
    );
    
    // Update the client with new tokens
    hubspotClient.setAccessToken(result.accessToken);
    
    // Store the new access token
    updateAccessToken(result.accessToken, result.expiresIn);
    
    console.log('HubSpot token refreshed successfully');
    
    return true;
  } catch (error) {
    console.error('Failed to refresh HubSpot token:', error);
    return false;
  }
};

// Function to handle API errors related to authentication
export const handleHubspotAuthError = async (error: any) => {
  if (error.statusCode === 401) {
    // Attempt to refresh the token
    const refreshed = await refreshHubspotToken();
    if (refreshed) {
      return true; // Retry the operation
    }
  }
  return false; // Cannot recover from this error
};

// Function to get the current access token (for API calls)
export const getHubspotAccessToken = async (): Promise<string | null> => {
  // Check if we have a valid token
  if (!initializeHubspotClient()) {
    // Try to refresh the token
    const refreshed = await refreshHubspotToken();
    if (!refreshed) {
      return null;
    }
  }
  
  // Get the current token
  const tokens = getTokens();
  return tokens?.accessToken || null;
};