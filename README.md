# Divvy

A social and financial app that streamlines expense sharing and group communication. Divvy combines financial management with social features to eliminate the complexity of tracking shared expenses and coordinating group activities.

## Beta Release

Currently with this beta, we implemented the core features of our messaging app. Where users can login/sign up, send messages and create a group chat. This covers most of our basic use cases of messaging others. Then for the main use cases of requesting and sending money to each other we have the front end of this implementation completed. Users can create these events but none of it will be saved to the database.

## Features

- **Expense Splitting**: Automatically calculate individual shares while accounting for taxes and tips
- **Friend System**: Connect with friends and create custom groups for different sharing scenarios
- **Event Creation**: Plan and coordinate gatherings with built-in tools for managing RSVPs and schedules
- **Group Management**: Create and manage groups for different expense sharing scenarios
- **Integrated Messaging**: Built-in communication system for discussing plans and coordinating payments
- **Calendar Integration**: Sync events with your preferred calendar applications
- **Multi-Platform Payment Support**: Integration with Venmo, PayPal, Zelle, and other payment services

## Tech Stack

### Frontend

- React
- TypeScript
- Tailwind CSS
- Vite

### Backend

- Node.js
- Express.js
- Socket.io (for real-time messaging)
- Cloudinary (for image uploads)
- Jest (for testing)

### Database

- Firebase

### Deployment

- Vercel (Frontend)
- Render (Backend)

## Getting Started

### Installation

1. Clone the repository

```bash
git clone [repository-url]
```

2. Install dependencies

```bash
cd divvy
npm install
```

3. Set up environment variables

```bash
cp .env.example .env
```

Fill in your API keys and configuration values in the `.env` file.

### Frontend Setup (Client Folder)

1. Install Dependencies

```bash
cd client
npm install
```

2. Install Firebase SDK

```bash
npm install firebase
```

3. Set Up Environment Variables

- Create a .env.local file inside client/ directory and add:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
```

4. Run the Frontend locally

```bash
npm run dev
```

### Backend Setup (Server Folder)

1. Install Dependencies

```bash
cd server
npm install
```

2. Set Up Environment Variables

- Create a .env file in the server/ directory and add:

```bash
FIREBASE_ADMIN_KEY='{
  "type": "service_account",
  "project_id": "your_project_id",
  "private_key": "your_private_key"
}'
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

3. Run the Backend Locally

```bash
npm run dev
```

## Running the System

1. Start the Frontend

```bash
cd client
npm run dev
```

2. Start the Backend

```bash
cd server
npm run dev
```

Production Deployment
- Frontend is hosted on Vercel
- Backend is hosted on Render
- Database is Firestore (NoSQL)

To deploy the frontend to Vercel:

```bash
vercel --prod
```

## Testing the System
We use Vitest for frontend testing and Jest for backend testing.

### Running Tests Locally
- Run frontend tests (Vitest)

```bash
cd client
npm run test
```

- Run backend tests (Jest)

```bash
cd server
npm run test
```

## Security

Divvy implements several security measures:

- Secure user authentication
- Data encryption in transit and at rest
- Regular security audits
- Compliance with data privacy guidelines

## License

MIT License

Copyright (c) 2024 Kris Tong

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
