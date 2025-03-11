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


#### Obtaining Required API Keys

1. **Firebase Setup**:

   Client Setup:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project or select an existing one
   - Enable Authentication and Firestore from the left sidebar
   - Go to Project Settings > General
   - Under "Your apps", click the web icon (</>)
   - Register your app and provide a nickname (e.g., "divvy-web")
   - Copy the provided firebaseConfig object that looks like this:
     ```js
     const firebaseConfig = {
       apiKey: "xxx",
       authDomain: "xxx",
       projectId: "xxx",
       storageBucket: "xxx",
       messagingSenderId: "xxx",
       appId: "xxx"
     };
     ```
   - Paste these values into your `/client/.env.local` file, matching the variable names:
     ```
     VITE_FIREBASE_API_KEY=xxx
     VITE_FIREBASE_AUTH_DOMAIN=xxx
     # etc...
     ```

   Server Setup:
   - In Firebase Console, go to Project Settings > Service Accounts
   - Click "Generate New Private Key"
   - Save the downloaded JSON file securely
   - The file will contain a structure like this:
     ```json
     {
       "type": "service_account",
       "project_id": "your-project-id",
       "private_key_id": "key-id",
       "private_key": "-----BEGIN PRIVATE KEY-----\nYour long private key\n-----END PRIVATE KEY-----\n",
       "client_email": "firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com",
       "client_id": "123456789",
       "auth_uri": "https://accounts.google.com/o/oauth2/auth",
       "token_uri": "https://oauth2.googleapis.com/token",
       "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
       "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40your-project.iam.gserviceaccount.com"
     }
     ```
   - Copy the entire contents of the JSON file and paste it as the value for FIREBASE_ADMIN_KEY in `/server/.env`
   - Important: The JSON must be on a single line in the .env file. You can either:
     
     - Remove all newlines from the JSON, or
     - Escape the newlines in the private key (replace \n with \\n)
  
  - Your final FIREBASE_ADMIN_KEY in .env should look like:
     ```
     FIREBASE_ADMIN_KEY={"type":"service_account","project_id":"xxx",...}
     ```

2. **Cloudinary Setup**:
   - Sign up at [Cloudinary](https://cloudinary.com/users/register/free)
   - After logging in, go to Dashboard
   - Your credentials will be displayed in the "Account Details" section:
     ```
     Cloud name: xxxxx
     API Key: 123456789012345
     API Secret: xXxXxxXXxXxXxxXXXxxXxxXXxXxXx
     ```
   - Copy these values into your `/server/.env` file:
     ```env
     CLOUDINARY_CLOUD_NAME=your_cloud_name
     CLOUDINARY_API_KEY=your_api_key
     CLOUDINARY_API_SECRET=your_api_secret
     ```

  **Protecting Sensitive Data**
  - Never commit .env files to version control
   - Ensure your `.gitignore` file includes:
     ```
     # Environment files
     .env
     .env.local
     .env.*.local
     
     # Firebase
     firebase-debug.log
     firebase-debug.*.log
     firebase-adminsdk.json
     
     # IDE and OS files
     .DS_Store
     .idea/
     .vscode/
     ```
### Server Overview

The Divvy server handles:
- User authentication and session management
- Real-time messaging through Socket.IO
- File uploads and media handling via Cloudinary
- Group and expense management
- API endpoints for all client-server communications

Key Server Features:
- RESTful API endpoints for user, group, and expense operations
- WebSocket implementation for real-time updates
- Secure file upload handling
- Firebase Admin SDK integration for enhanced security
- Rate limiting and request validation

### Installation

1. Clone the repository

```bash
git clone https://github.com/kristong123/Divvy.git
cd Divvy
```

2. Set up environment variables and install dependencies

```bash
# Setup client
cd client
cp .env.example .env.local  # If this fails, create .env.local manually
npm install

# Setup server
cd ../server
cp .env.example .env  # If this fails, create .env manually
npm install
```

3. Configure your environment files:

For client (.env.local):
- Get Firebase configuration from Firebase Console > Project Settings > General
- Replace the placeholder values with your Firebase config

For server (.env):
- Add your Firebase Admin key from Firebase Console > Project Settings > Service Accounts
- Add your Cloudinary credentials from Cloudinary Dashboard
- Ensure the CLIENT_URL matches your frontend URL

4. Start both servers:

```bash
# In one terminal (from project root)
cd client && npm run dev

# In another terminal (from project root)
cd server && npm run dev
```

The application will be available at:
- Client: http://localhost:3000
- Server: http://localhost:3002

## Environment Variables

#### Client (.env.local)
```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain_here
# etc...
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
