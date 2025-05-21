# HubSpot Integration Guide

This guide explains how to set up and use the HubSpot integration in your application.

## Prerequisites

1. A HubSpot account
2. A HubSpot private app or OAuth app

## Environment Variables

Set the following environment variables in your `.env` file:

```
# HubSpot OAuth Credentials
HUBSPOT_CLIENT_ID=your_client_id
HUBSPOT_CLIENT_SECRET=your_client_secret
HUBSPOT_REDIRECT_URI=http://localhost:3000/api/hubspot/oauth-callback
FRONTEND_URL=http://localhost:3000
```

## OAuth Flow

The HubSpot integration uses OAuth 2.0 for authentication. Here's how it works:

1. User initiates the OAuth flow by visiting `/api/hubspot/authorize`
2. User is redirected to HubSpot's authorization page
3. After authorizing, HubSpot redirects back to `/api/hubspot/oauth-callback`
4. The callback endpoint exchanges the authorization code for access and refresh tokens
5. Tokens are securely stored and used for subsequent API calls

## API Endpoints

### Authorization

- `GET /api/hubspot/authorize` - Initiates the OAuth flow
- `GET /api/hubspot/oauth-callback` - Handles the OAuth callback from HubSpot

### Status

- `GET /api/hubspot/status` - Checks the connection status with HubSpot

### Data

- `GET /api/hubspot/contacts` - Fetches contacts from HubSpot

## Using the HubSpot Client

To use the HubSpot client in your code:

```typescript
import { hubspotClient, initializeHubspotClient, handleHubspotAuthError } from '@/lib/hubspotAuth';

// Make sure we have a valid token
if (!initializeHubspotClient()) {
  // Handle not authenticated case
  return;
}

try {
  // Make API calls
  const result = await hubspotClient.crm.contacts.basicApi.getPage();
  // Process result
} catch (error) {
  // Try to handle auth errors (token expired)
  const canRetry = await handleHubspotAuthError(error);
  
  if (canRetry) {
    // Retry the request with the new token
    const result = await hubspotClient.crm.contacts.basicApi.getPage();
    // Process result
  } else {
    // Handle other errors
  }
}
```

## Token Management

The integration includes automatic token refresh when:

1. An API call fails with a 401 Unauthorized error
2. The access token is expired when making a new request

The refresh token is used to obtain a new access token without requiring the user to re-authorize the application.

## Security Considerations

In a production environment:

1. Store tokens in a secure database, not in memory
2. Use environment variables for sensitive credentials
3. Implement proper error handling and logging
4. Consider using a state parameter in the OAuth flow to prevent CSRF attacks