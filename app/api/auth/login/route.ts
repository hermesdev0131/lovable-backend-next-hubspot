import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { signToken } from '@/lib/jwt';
import { corsOptionsResponse, corsHeaders } from '@/lib/cors';
import crypto from 'crypto';

// Handle OPTIONS request for CORS preflight
export async function OPTIONS() {
  return corsOptionsResponse();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, rememberMe = false } = body;
     
    
    if (!email || !password) {
      const response = NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      );
      return corsHeaders(response);
    }
    
    // Fetch user from the database
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      const response = NextResponse.json(
        { message: 'Invalid email or password' },
        { status: 401 }
      );
      return corsHeaders(response);
    }
    
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      const response = NextResponse.json(
        { message: 'Invalid email or password' },
        { status: 401 }
      );
      return corsHeaders(response);
    }

    // Generate JWT token
    const token = signToken({ userId: user.id, role: user.role }, 3600); // 1 hour

    // Generate refresh token
    const refreshToken = crypto.randomBytes(40).toString('hex');
    
    // Set expiration date based on rememberMe flag
    const expiresAt = new Date();
    if (rememberMe) {
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 days
    } else {
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
    }

    // Delete any existing refresh tokens for this user
    await prisma.refreshToken.deleteMany({
      where: { userId: user.id }
    });

    // Store refresh token in the database
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        expiresAt,
        userId: user.id,
        userAgent: request.headers.get('user-agent') || 'unknown',
        ipAddress: request.headers.get('x-forwarded-for') || request.ip || 'unknown'
      }
    });

    // Respond with user data and tokens
    const response = NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: 'admin',
      },
      token,
      refreshToken,
      expiresIn: 3600, // 1 hour
    });
    
    // Add CORS headers to the response
    return corsHeaders(response);
  } catch (error) {
    console.error('Login error:', error);
    const response = NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
    return corsHeaders(response);
  }
}


