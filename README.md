# Lovable Backend

Next.js API routes with MySQL and HubSpot integration for managing contacts, tasks, and team collaboration.

## Features

- **Contact Management**
  - Sync contacts with HubSpot
  - Track contact interactions
  - Manage contact details and history
  - Automated contact updates

- **Task Management**
  - Create and assign tasks
  - Track task progress
  - Set deadlines and priorities
  - Task notifications

- **Team Collaboration**
  - Team member management
  - Role-based access control
  - Activity tracking
  - Team performance metrics

- **HubSpot Integration**
  - Two-way contact sync
  - Deal tracking
  - Email integration
  - Contact activity logging

## Setup

1. Install dependencies:
```sh
npm install
```

2. Create `.env` file:
```env
# Database Configuration
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=contact_pipeline

# HubSpot Configuration
HUBSPOT_API_KEY=your_hubspot_api_key
HUBSPOT_CLIENT_ID=your_client_id
HUBSPOT_CLIENT_SECRET=your_client_secret

# Authentication
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d

# Email (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

3. Initialize Database:
```sh
# Run Prisma migrations
npx prisma migrate dev

# Seed initial data (optional)
npx prisma db seed
```

4. Start server:
```sh
npm run dev
```

## API Routes

### Auth
- `POST /api/auth/register` - Register new user with email verification
- `POST /api/auth/login` - User login with JWT token
- `POST /api/auth/logout` - Invalidate JWT token
- `GET /api/auth/me` - Get current user profile

### Contacts
- `GET /api/contacts` - Get all contacts with pagination
- `POST /api/contacts` - Create new contact
- `PUT /api/contacts/:id` - Update contact details
- `DELETE /api/contacts/:id` - Delete contact
- `POST /api/contacts/sync` - Sync contacts with HubSpot
- `GET /api/contacts/:id/activities` - Get contact activity history

### Tasks
- `GET /api/tasks` - Get all tasks with filters
- `POST /api/tasks` - Create new task
- `PUT /api/tasks/:id` - Update task status/details
- `DELETE /api/tasks/:id` - Delete task
- `GET /api/tasks/assigned` - Get assigned tasks
- `GET /api/tasks/created` - Get created tasks

### Team
- `GET /api/team` - Get all team members
- `POST /api/team` - Add new team member
- `PUT /api/team/:id` - Update team member role/status
- `DELETE /api/team/:id` - Remove team member
- `GET /api/team/stats` - Get team performance stats

### Settings
- `GET /api/settings` - Get user settings
- `PUT /api/settings` - Update user preferences
- `POST /api/settings/validatepassword` - Validate password
- `PUT /api/settings/hubspot` - Update HubSpot integration settings

## Tech Stack

- **Framework**: Next.js
- **Database**: MySQL with Prisma ORM
- **Authentication**: JWT with refresh tokens
- **Integration**: HubSpot API
- **Email**: Nodemailer with SMTP
- **Validation**: Zod
- **Testing**: Jest & Supertest

## Development

- API routes are in `/pages/api`
- Database schema in `/prisma/schema.prisma`
- HubSpot integration in `/lib/hubspot`
- Authentication in `/lib/auth`
- Types in `/types`

## Deployment

1. Build the application:
```sh
npm run build
```

2. Start production server:
```sh
npm start
```

3. For database migrations in production:
```sh
npx prisma migrate deploy
```