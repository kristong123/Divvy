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

### Prerequisites
- Node.js (v16 or higher)
- npm (v8 or higher)
- A Firebase project with Firestore enabled
- A Cloudinary account for image uploads

### Installation

1. Clone the repository

```bash
git clone https://github.com/kristong123/Divvy.git
cd Divvy
```

2. Set up environment variables

```bash
# For client
cd client
cp .env.example .env.local
# Edit .env.local with your Firebase configuration
```
```bash
# For server
cd ../server
cp .env.example .env
# Edit .env with your Firebase admin key and other configurations
```

3. Install dependencies

```bash
# Install client dependencies
cd client
npm install
```
```bash
# Install server dependencies
cd ../server
npm install
```

4. Start the development servers

```bash
# Start the client (in client directory)
npm run dev
```

```bash
# Start the server (in server directory)
npm run dev
```

The application will be available at:
- Client: http://localhost:3000
- Server: http://localhost:3002

## Environment Variables

#### Client (.env.local)
```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain_here
VITE_FIREBASE_PROJECT_ID=your_project_id_here
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket_here
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id_here
VITE_FIREBASE_APP_ID=your_app_id_here
VITE_API_URL=http://localhost:3000
```

#### Server (.env)
```env
PORT=3002
FIREBASE_ADMIN_KEY={"type": "service_account", ...}
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLIENT_URL=http://localhost:3000
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

## Troubleshooting

### Common Issues

1. **Environment Files Not Found**
   If you encounter the "path not found" error when copying environment files:
   - Manually create the `.env.local` and `.env` files in their respective directories
   - Copy the content from the Environment Variables section above

2. **Firebase Configuration**
   - Ensure your Firebase project has Firestore enabled
   - Make sure your Firebase Admin key is properly formatted JSON
   - Check that your client Firebase configuration matches your project

3. **Port Conflicts**
   If ports 3000 or 3002 are already in use:
   - Client: Edit vite.config.ts to change the port
   - Server: Change the PORT in your .env file

4. **Cloudinary Setup**
   - Verify your Cloudinary credentials in the server .env file
   - Ensure your Cloudinary account has upload permissions enabled

5. **Real-time Features Not Working**
   - Check that WebSocket connections are not blocked by your firewall
   - Verify that the Socket.IO server URL matches your client configuration
   - Ensure you're connected to a stable internet connection

6. **Authentication Issues**
   - Verify your Firebase configuration in .env.local
   - Check that your Firebase project has Authentication enabled
   - Make sure you've added the appropriate authentication providers in Firebase Console


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
