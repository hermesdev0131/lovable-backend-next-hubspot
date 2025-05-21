import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { signToken, verifyToken } from '@/lib/jwt';
import { corsOptionsResponse, corsHeaders } from '@/lib/cors';
import crypto from 'crypto';

// Handle OPTIONS request for CORS preflight
export async function OPTIONS() {
  return corsOptionsResponse();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      const response = NextResponse.json(
        { message: 'Refresh token is required' },
        { status: 400 }
      );
      return corsHeaders(response);
    }

    // Find the refresh token in the database
    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true }
    });

    // Check if token exists and is not expired
    if (!tokenRecord || new Date() > tokenRecord.expiresAt) {
      // Delete the token if it exists but is expired
      if (tokenRecord) {
        await prisma.refreshToken.delete({
          where: { id: tokenRecord.id }
        });
      }

      const response = NextResponse.json(
        { message: 'Invalid or expired refresh token' },
        { status: 401 }
      );
      return corsHeaders(response);
    }

    // Generate new access token
    const accessToken = signToken(
      { userId: tokenRecord.userId, role: tokenRecord.user.role },
      3600 // 1 hour
    );

    // Generate new refresh token
    const newRefreshToken = crypto.randomBytes(40).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days from now

    // Update the refresh token in the database
    await prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: {
        token: newRefreshToken,
        expiresAt
      }
    });

    // Return the new tokens
    const response = NextResponse.json({
      token: accessToken,
      refreshToken: newRefreshToken,
      expiresIn: 3600, // 1 hour
      user: {
        id: tokenRecord.user.id,
        name: tokenRecord.user.name,
        email: tokenRecord.user.email,
        role: tokenRecord.user.role
      }
    });

    return corsHeaders(response);
  } catch (error) {
    console.error('Refresh token error:', error);
    const response = NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
    return corsHeaders(response);
  }
}