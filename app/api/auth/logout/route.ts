import { NextRequest, NextResponse } from 'next/server';
import { corsOptionsResponse, corsHeaders } from '@/lib/cors';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';

// Handle OPTIONS request for CORS preflight
export async function OPTIONS() {
  return corsOptionsResponse();
}

export async function POST(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    const refreshToken = request.headers.get('x-refresh-token');
    
    // If we have a token, extract the user ID
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = verifyToken(token);
      
      if (payload && payload.userId) {
        // Delete all refresh tokens for this user
        await prisma.refreshToken.deleteMany({
          where: { userId: payload.userId }
        });
      }
    } 
    // If we have a refresh token, delete that specific token
    else if (refreshToken) {
      await prisma.refreshToken.deleteMany({
        where: { token: refreshToken }
      });
    }

    const response = NextResponse.json({ message: 'Logged out successfully' });
    
    // Clear any cookies if they exist
    response.cookies.set({
      name: 'token',
      value: '',
      path: '/',
      expires: new Date(0), // Expire immediately
    });
    
    // Add CORS headers to the response
    return corsHeaders(response);
  } catch (error) {
    console.error('Logout error:', error);
    const response = NextResponse.json(
      { message: 'Logout successful' }, // Still return success to client
      { status: 200 }
    );
    return corsHeaders(response);
  }
}
