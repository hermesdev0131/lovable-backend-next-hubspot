import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// Ensure you have this environment variable set in your .env.local file
const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;

export async function POST(req: NextRequest) {
  try {
    const { eventType, data } = await req.json();

    // Send data to the n8n webhook
    const response = await axios.post(`${n8nWebhookUrl}/workflow`, { eventType, data });
    return NextResponse.json({ message: 'Data processed successfully', response: response.data });
  } catch (error) {
    console.error('Error processing data:', error);
    
    // Type guard for error handling
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Unknown error occurred';
      
    return NextResponse.json({ message: 'Error processing data', error: errorMessage }, { status: 500 });
  }
}
