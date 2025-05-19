# Restaurant Reservation System with CallFluent AI

A web-based application for restaurant owners that uses CallFluent AI to manage and automate phone-based table reservations.

## Features

- **AI Call Answering Integration**: Automatically handle phone reservations using CallFluent AI
- **Admin Dashboard**: View and manage all reservations in a clean, modern interface
- **Reservation Management**: Create, edit, and update reservation status
- **Webhook Integration**: Receive reservation data from CallFluent AI
- **SMS Notifications**: Optional SMS confirmations via Twilio
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## Tech Stack

- **Frontend**: React, TypeScript, Material UI
- **Backend**: Node.js, Express
- **Storage**: JSON file (can be upgraded to a database)
- **API Documentation**: Swagger UI

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or pnpm

### Installation

1. Clone the repository
2. Install dependencies:

```bash
pnpm install
```

3. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Update the values as needed

### Running the Application

Start both the frontend and backend:

```bash
pnpm run dev:all
```

Or run them separately:

```bash
# Frontend only
pnpm run dev

# Backend only
pnpm run server
```

## CallFluent AI Integration

To integrate with CallFluent AI:

1. Start the application
2. Go to the Settings page
3. Copy the webhook URL
4. Configure CallFluent AI to send reservation data to this webhook URL
5. Ensure CallFluent AI is set up to collect:
   - Customer name
   - Phone number
   - Date
   - Time
   - Party size
   - Any special requests (notes)

## SMS Notifications (Optional)

To enable SMS notifications:

1. Create a Twilio account
2. Get your Account SID, Auth Token, and a Twilio phone number
3. Update the `.env` file with your Twilio credentials
4. Enable SMS notifications in the Settings page

## API Documentation

API documentation is available at `/api-docs` when the server is running.

## Project Structure

```
restaurant-reservation-system/
├── public/                  # Static assets
├── src/
│   ├── components/          # Reusable UI components
│   ├── contexts/            # React context providers
│   ├── pages/               # Page components
│   ├── server/              # Backend server code
│   ├── types/               # TypeScript type definitions
│   ├── App.tsx              # Main application component
│   └── main.tsx             # Application entry point
├── .env                     # Environment variables
├── package.json             # Project dependencies
└── README.md                # Project documentation
```

## License

MIT

## Database Setup

This application can use either a local JSON file (default) or Supabase for data storage.

### Supabase Database Setup

1. Create a free Supabase account at [https://supabase.com](https://supabase.com)
2. Create a new project in Supabase
3. In your project, go to SQL Editor and run the SQL script located in `supabase/schema.sql` to create the necessary tables and types
4. Get your Supabase URL and anon key from the project settings > API section
5. Add these values to your `.env` file:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

With these settings, the application will automatically use Supabase as the database. If the Supabase configuration is missing, the app will fallback to the local JSON file storage.
