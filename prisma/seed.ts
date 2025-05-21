import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const accessToken = process.env.HUBSPOT_ACCESS_TOKEN;

  if (!accessToken) {
    console.error('Missing HUBSPOT_ACCESS_TOKEN in environment variables.');
    return;
  }

  try {
    // Get the first owner from HubSpot
    const res = await fetch('https://api.hubapi.com/crm/v3/owners', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`HubSpot API error: ${res.status}`);
    }

    const data = await res.json();
    const ownerEmail = data?.results?.[0]?.email;

    if (!ownerEmail) {
      throw new Error('No owner email found in HubSpot API response.');
    }

    const ownerName = data?.results?.[0]?.firstName + ' ' + data?.results?.[0]?.lastName || 'Admin User';
    const ownerPassword = ownerEmail.split('@')[0];

    // Use a static test user or pull from HubSpot if needed
    // const testEmail = 'admin@example.com';
    // const testPassword = 'password123'; // OR use ownerPassword if needed

    // Check if test user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: ownerEmail },
    });
    

    if (!existingUser) {
      const hashedPassword = await bcrypt.hash(ownerPassword, 10);

      await prisma.user.create({
        data: {
          email: ownerEmail,
          name: ownerName,
          password: hashedPassword,
          role: 'admin',
          status: 'active'
        },
      });

      console.log(`Admin user "${ownerEmail}" created successfully.`);
    } else {
      console.log(`Admin user "${ownerEmail}" already exists.`);
    }

  } catch (error) {
    console.error('Error in main():', error);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });