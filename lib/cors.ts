import { NextResponse } from 'next/server';

// Helper function to add CORS headers to a response
export function corsHeaders(response: NextResponse): NextResponse {
  // Get allowed origin from environment variables or use default
  const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:8080';
  
  // Set CORS headers
  response.headers.set('Access-Control-Allow-Origin', allowedOrigin);
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-refresh-token');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  
  return response;
}

// Helper function to create a CORS preflight response
export function corsOptionsResponse(): NextResponse {
  const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:8080';
  
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-refresh-token',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400', // 24 hours
    },
  });
}