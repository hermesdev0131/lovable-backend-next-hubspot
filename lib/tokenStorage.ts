// Token storage interface
export interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Timestamp when the token expires
}

// In-memory storage for development purposes only
// In production, use a secure database or secret manager
let tokenStore: TokenData | null = null;

/**
 * Store OAuth tokens securely
 * In production, replace this with database storage
 */
export const storeTokens = (
  accessToken: string,
  refreshToken: string,
  expiresIn: number
): void => {
  // Calculate expiration time (current time + expires_in seconds)
  const expiresAt = Date.now() + expiresIn * 1000;
  
  // Store tokens
  tokenStore = {
    accessToken,
    refreshToken,
    expiresAt
  };
  
  console.log('Tokens stored successfully');
};

/**
 * Retrieve stored tokens
 * Returns null if no tokens are stored
 */
export const getTokens = (): TokenData | null => {
  return tokenStore;
};

/**
 * Update the access token while keeping the same refresh token
 */
export const updateAccessToken = (
  accessToken: string,
  expiresIn: number
): void => {
  if (!tokenStore) {
    throw new Error('No tokens stored. Cannot update access token.');
  }
  
  const expiresAt = Date.now() + expiresIn * 1000;
  
  tokenStore = {
    ...tokenStore,
    accessToken,
    expiresAt
  };
  
  console.log('Access token updated successfully');
};

/**
 * Check if the current access token is expired
 * Returns true if token is expired or doesn't exist
 */
export const isTokenExpired = (): boolean => {
  if (!tokenStore) return true;
  
  // Consider token expired if we're within 5 minutes of expiration
  const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
  return Date.now() + bufferTime > tokenStore.expiresAt;
};

/**
 * Clear all stored tokens
 */
export const clearTokens = (): void => {
  tokenStore = null;
  console.log('Tokens cleared');
};