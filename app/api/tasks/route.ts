import { NextRequest, NextResponse } from 'next/server';
import { corsOptionsResponse, corsHeaders } from '@/lib/cors';

const HUBSPOT_BASE_URL = 'https://api.hubapi.com';

// Map our task types to HubSpot task types
const taskTypeMapping: Record<string, string> = {
  'TODO': 'TODO',
  'CALL': 'CALL',
  'EMAIL': 'EMAIL',
//   'LINKED_IN': 'LINKED_IN',
//   'MEETING': 'MEETING',
//   'LINKED_IN_CONNECT': 'LINKED_IN_CONNECT',
//   'LINKED_IN_MESSAGE': 'LINKED_IN_MESSAGE'
};

// Reverse mapping for getting our type from HubSpot type
const reverseTaskTypeMapping: Record<string, string> = Object.entries(taskTypeMapping).reduce(
  (acc, [key, value]) => ({ ...acc, [value]: key }), {}
);

// Convert our task object to HubSpot properties
function taskToHubspotProperties(taskData: any) {
  const properties: Record<string, any> = {
    hs_timestamp: new Date().getTime().toString(),
    hs_task_subject: taskData.title,
    hs_task_body: taskData.description || '',
    hs_task_priority: taskData.priority?.toUpperCase() || 'MEDIUM',
    hs_task_status: taskData.completed ? 'COMPLETED' : 'NOT_STARTED',
    hs_task_type: taskData.type || 'TODO',
  };

  // Store additional data in the task body as JSON
  const additionalData = {
    source: taskData.source || '',
    customFields: taskData.customFields || {},
    dueDate: taskData.date || '',
  };

  // Append the additional data to the task body
  properties.hs_task_body += `\n\nAdditional Data: ${JSON.stringify(additionalData, null, 2)}`;

  return properties;
}

// Convert HubSpot task to our task object
function hubspotToTask(hubspotTask: any) {
  const props = hubspotTask.properties;
  
  // Initialize task with standard properties
  const task = {
    id: hubspotTask.id,
    hubspotId: hubspotTask.id,
    title: props.hs_task_subject || '',
    description: props.hs_task_body || '',
    completed: props.hs_task_status === 'COMPLETED',
    priority: (props.hs_task_priority || 'MEDIUM').toLowerCase(),
    type: props.hs_task_type || 'TODO',
    date: new Date().toISOString(),
    createdAt: props.hs_timestamp ? new Date(parseInt(props.hs_timestamp)).toISOString() : new Date().toISOString(),
    updatedAt: props.hs_lastmodifieddate ? new Date(parseInt(props.hs_lastmodifieddate)).toISOString() : new Date().toISOString(),
    source: '',
    customFields: {},
  };

  // Try to extract additional data from the task body
  if (props.hs_task_body && props.hs_task_body.includes('Additional Data:')) {
    try {
      const additionalDataStr = props.hs_task_body.split('Additional Data:')[1].trim();
      const additionalData = JSON.parse(additionalDataStr);
      
      // Update task with additional data
      task.source = additionalData.source || '';
      task.customFields = additionalData.customFields || {};
      task.date = additionalData.dueDate || task.date;
      
      // Clean up the description by removing the additional data
      task.description = props.hs_task_body.split('Additional Data:')[0].trim();
    } catch (e) {
      console.error('Error parsing additional data from task body:', e);
    }
  }

  return task;
}

// Handle CORS preflight
export async function OPTIONS() {
  return corsOptionsResponse();
}

// POST: Create a new task
export async function POST(request: NextRequest) {
  try {
    const taskData = await request.json();
    // console.log(taskData);
    if (!taskData.title) {
      return corsHeaders(NextResponse.json({ message: 'Task title is required' }, { status: 400 }));
    }

    const accessToken = process.env.HUBSPOT_ACCESS_TOKEN!;
    const properties = taskToHubspotProperties(taskData);

    // Create task in HubSpot
    const res = await fetch(`${HUBSPOT_BASE_URL}/crm/v3/objects/tasks`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ properties }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('HubSpot API Error Response:', JSON.stringify(data, null, 2));
      if (data.validationResults) {
        throw new Error(JSON.stringify(data.validationResults));
      } else {
        throw new Error(data.message || 'Failed to create task');
      }
    }

    // Convert the HubSpot response to our task format
    const task = {
      id: data.id,
      hubspotId: data.id,
      ...taskData,
    };

    return corsHeaders(
      NextResponse.json({
        ...task,
        message: 'Task created successfully in HubSpot',
      })
    );
  } catch (error: any) {
    console.error('HubSpot Task Creation Error:', error);
    let details = null;
    if (typeof error.message === 'string') {
      try {
        if (error.message.includes('[{')) {
          details = JSON.parse(error.message);
        }
      } catch (parseError) {
        console.error('Error parsing error message:', parseError);
      }
    }
    
    return corsHeaders(
      NextResponse.json({ 
        message: 'Internal Server Error', 
        error: error.message,
        details: details
      }, { status: 500 })
    );
  }
}

// GET: Fetch tasks
export async function GET(request: NextRequest) {
  try {
    const accessToken = process.env.HUBSPOT_ACCESS_TOKEN!;
    console.log("Fetching tasks...");

    // Check if we're looking for a specific task by ID
    const url = new URL(request.url);
    const taskId = url.searchParams.get('id');

    if (taskId) {
      // Fetch a single task by ID
      const fields = [
        'hs_task_subject',
        'hs_task_body',
        'hs_task_priority',
        'hs_task_status',
        'hs_task_type',
        'hs_task_due_date',
        'hs_timestamp',
        'hs_lastmodifieddate',
      ].join(',');

      const res = await fetch(`${HUBSPOT_BASE_URL}/crm/v3/objects/tasks/${taskId}?properties=${fields}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (res.status === 404) {
        return corsHeaders(NextResponse.json({ message: 'Task not found' }, { status: 404 }));
      }

      const task = await res.json();
      if (!res.ok) throw new Error(task.message || 'Failed to fetch task');

      // Convert the HubSpot task to our task format
      const formattedTask = hubspotToTask(task);

      return corsHeaders(NextResponse.json(formattedTask));
    } else {
      // Fetch all tasks
      const fields = [
        'hs_task_subject',
        'hs_task_body',
        'hs_task_priority',
        'hs_task_status',
        'hs_task_type',
        'hs_task_due_date',
        'hs_timestamp',
        'hs_lastmodifieddate',
      ].join(',');

      const res = await fetch(`${HUBSPOT_BASE_URL}/crm/v3/objects/tasks?limit=100&properties=${fields}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fetch tasks');

      // Convert all HubSpot tasks to our task format
      const tasks = data.results.map((task: any) => hubspotToTask(task));

      return corsHeaders(NextResponse.json(tasks));
    }
  } catch (error: any) {
    console.error('HubSpot Task Fetch Error:', error);
    return corsHeaders(
      NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 })
    );
  }
}

// PUT: Update a task by ID
export async function PUT(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const taskId = url.searchParams.get('id');
    
    if (!taskId) {
      return corsHeaders(NextResponse.json({ message: 'Task ID is required' }, { status: 400 }));
    }

    const taskData = await request.json();
    const accessToken = process.env.HUBSPOT_ACCESS_TOKEN!;
    
    if (!taskData.title) {
      return corsHeaders(NextResponse.json({ message: 'Task title is required' }, { status: 400 }));
    }

    // Use hubspotId if available, otherwise use the taskId
    const hubspotId = taskData.hubspotId || taskId;
    
    const properties = taskToHubspotProperties(taskData);
    
    const res = await fetch(`${HUBSPOT_BASE_URL}/crm/v3/objects/tasks/${hubspotId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ properties }),
    });

    // if (res.status === 404) {
    //   return corsHeaders(NextResponse.json({ message: 'Task not found' }, { status: 404 }));
    // }

    if (!res.ok) {
      const errorData = await res.json();
      console.error('HubSpot API Error:', errorData);
      throw new Error(errorData.message || 'Failed to update task');
    }

    const task = {
      id: taskId,
      hubspotId: hubspotId,
      ...taskData,
      updatedAt: new Date().toISOString(),
    };

    return corsHeaders(
      NextResponse.json({
        ...task,
        message: 'Task updated successfully in HubSpot',
      })
    );
  } catch (error: any) {
    console.error('HubSpot Task Update Error:', error);
    return corsHeaders(
      NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 })
    );
  }
}

// DELETE: Delete a task by ID
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const taskId = url.searchParams.get('id');
    
    if (!taskId) {
      return corsHeaders(NextResponse.json({ message: 'Task ID is required' }, { status: 400 }));
    }

    const accessToken = process.env.HUBSPOT_ACCESS_TOKEN!;
    
    // Get the task data to check for hubspotId
    const taskData = await request.json();
    
    // Use hubspotId if available, otherwise use the taskId
    const hubspotId = taskData.hubspotId || taskId;
    
    const res = await fetch(`${HUBSPOT_BASE_URL}/crm/v3/objects/tasks/${hubspotId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      // For DELETE requests, HubSpot returns 204 on success and no body
      // If we get here, it means there was an error
      let errorMessage = 'Failed to delete task';
      try {
        const errorData = await res.json();
        errorMessage = errorData.message || errorMessage;
      } catch (e) {
        // If we can't parse the error response, use the status text
        errorMessage = res.statusText || errorMessage;
      }
      console.error('HubSpot API Error:', errorMessage);
      throw new Error(errorMessage);
    }

    return corsHeaders(
      NextResponse.json({
        message: 'Task deleted successfully from HubSpot',
        id: taskId,
        hubspotId: hubspotId
      })
    );
  } catch (error: any) {
    console.error('HubSpot Task Deletion Error:', error);
    return corsHeaders(
      NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 })
    );
  }
}
