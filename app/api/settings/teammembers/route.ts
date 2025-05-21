import { NextRequest, NextResponse } from 'next/server';
import { corsOptionsResponse, corsHeaders } from '@/lib/cors';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// Handle OPTIONS request for CORS preflight
export async function OPTIONS() {
  return corsOptionsResponse();
}

// DELETE: Remove a team member from the database
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return corsHeaders(NextResponse.json(
        { message: 'Team member ID is required' },
        { status: 400 }
      ));
    }

    // Convert string ID to number since Prisma schema uses Int for id
    const memberId = parseInt(id, 10);
    
    // Check if the team member exists
    const existingMember = await prisma.user.findUnique({
      where: { id: memberId },
    });

    if (!existingMember) {
      return corsHeaders(NextResponse.json(
        { message: 'Team member not found' },
        { status: 404 }
      ));
    }

    // Delete the team member
    await prisma.user.delete({
      where: { id: memberId },
    });

    const response = NextResponse.json({ 
      message: 'Team member removed successfully',
      id: memberId
    });
    return corsHeaders(response);
  } catch (error) {
    console.error('Error removing team member from DB:', error);
    const errorResponse = NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
    return corsHeaders(errorResponse);
  }
}

// PATCH: Update a team member's role
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return corsHeaders(NextResponse.json(
        { message: 'Team member ID is required' },
        { status: 400 }
      ));
    }

    const { role } = await request.json();
    
    if (!role) {
      return corsHeaders(NextResponse.json(
        { message: 'Role is required' },
        { status: 400 }
      ));
    }

    // Validate role
    if (!['admin', 'editor', 'viewer'].includes(role)) {
      return corsHeaders(NextResponse.json(
        { message: 'Invalid role. Must be admin, editor, or viewer' },
        { status: 400 }
      ));
    }

    // Convert string ID to number since Prisma schema uses Int for id
    const memberId = parseInt(id, 10);
    
    // Check if the team member exists
    const existingMember = await prisma.user.findUnique({
      where: { id: memberId },
    });

    if (!existingMember) {
      return corsHeaders(NextResponse.json(
        { message: 'Team member not found' },
        { status: 404 }
      ));
    }

    // Update the team member's role
    const updatedMember = await prisma.user.update({
      where: { id: memberId },
      data: { 
        role,
        updatedAt: new Date()
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        updatedAt: true,
      },
    });

    const response = NextResponse.json(updatedMember);
    return corsHeaders(response);
  } catch (error) {
    console.error('Error updating team member role:', error);
    const errorResponse = NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
    return corsHeaders(errorResponse);
  }
}

// GET: Fetch team members from the local database
export async function GET(request: NextRequest) {
    
  try {
    const teamMembers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        updatedAt: true,
      },
    });
    // console.log(teamMembers)
    const response = NextResponse.json(teamMembers);
    return corsHeaders(response);
  } catch (error) {
    console.error('Error fetching team members from DB:', error);
    const errorResponse = NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
    return corsHeaders(errorResponse);
  }
}

// POST: Add a new team member to the local database
export async function POST(request: NextRequest) {
  try {

    const { name, email, role, status } = await request.json();
    
    // Validate input
    if (!name || !email || !role || !status) {
      return corsHeaders(NextResponse.json(
        { message: 'Name, email, and role are required' },
        { status: 400 }
      ));
    }
    
    const password = email.split('@')[0]; // Placeholder – consider hashing password if needed
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Check for duplicate email
    const existingMember = await prisma.user.findUnique({
      where: { email },
    });

    if (existingMember) {
      return corsHeaders(
        NextResponse.json(
          { message: 'A team member with this email already exists.' },
          { status: 409 }
        )
      );
    }

    const newTeamMember = await prisma.user.create({
      data: {
        name,
        email,
        role,
        password,
        status: status || 'active',
      },
    });

    const response = NextResponse.json(newTeamMember);
    return corsHeaders(response);
  } catch (error) {
    console.error('Error creating team member in DB:', error);
    const errorResponse = NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
    return corsHeaders(errorResponse);
  }
}
