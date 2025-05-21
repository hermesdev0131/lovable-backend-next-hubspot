import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { corsOptionsResponse, corsHeaders } from '@/lib/cors';

// Handle OPTIONS request for CORS preflight
export async function OPTIONS() {
  return corsOptionsResponse();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, currentPassword, newPassword } = body;

    if (!email || !currentPassword || !newPassword) {
      const response = NextResponse.json(
        { message: 'Email, current password, and new password are required' },
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
        { message: 'User not found' },
        { status: 404 }
      );
      return corsHeaders(response);
    }

    // Validate the current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      const response = NextResponse.json(
        { message: 'Current password is incorrect' },
        { status: 401 }
      );
      return corsHeaders(response);
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const updatedAt = new Date();

    // Update the user's password
    await prisma.user.update({
      where: { email },
      data: { 
        password: hashedPassword,
        updatedAt,
      },
    });

    const response = NextResponse.json({ message: 'Your password has been changed successfully.' });
    return corsHeaders(response);
  } catch (error) {
    console.error('Password update error:', error);
    const response = NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
    return corsHeaders(response);
  }
}
