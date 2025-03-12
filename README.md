# Divvy

A social and financial app that streamlines expense sharing and group communication. Divvy combines financial management with social features to eliminate the complexity of tracking shared expenses and coordinating group activities.

## Final Release 1.0 (Github Version ID a8d3085)

The offical version 1.0 release of Divvy is here! In our offical release, we largely improved the social communication aspects of web app. We improved our messaging system which now includes timestamps and read reciepts! Our group chats also got more improvements by now having group profile pictures, editing group names, and event creation! In addition core features went through a UI makeover and improve their functionality. So you can expect new differences when you send message, create group chats, and events! One last feature that we felt was important was including a dark theme! You can now save your eyes from the dangers of white space! Keep reading to know all our changes we made!

## Features

### Core Functionality

- **Expense Splitting**

  - Automatically calculate individual shares
  - Account for taxes and tips
  - Support for uneven splits and special arrangements
  - Real-time updates and calculations

- **Friend System**

  - Connect with friends via username
  - View friend activity and shared expenses
  - Manage friend requests and connections

- **Event Creation**

  - Create and manage group events
  - Set event dates
  - Add event descriptions and details
  - Manage event-specific expenses

- **Group Management**

  - Create unlimited groups
  - Assign group administrators
  - Customize group settings and images
  - Track group-specific expenses
  - Members can leave group

- **Integrated Messaging**

  - Real-time chat functionality
  - Support for image sharing via Firebase Storage
  - Message read receipts
  - Group and direct messaging
  - Event notifications and updates
  - Timestamps

- **3rd Party Payment Support**
  - Venmo integration
  - Track payment status
  - Payment history and records

### Additional Features

- Dark/Light mode support
- Real-time notifications
- Profile customization

## Tech Stack

### Frontend

- React with Vite
- TypeScript
- Tailwind CSS
- Firebase (Authentication, Storage)
- Socket.io Client

### Backend

- Node.js
- Express
- Firebase Admin SDK (Firestore, Storage)
- Socket.io

### DevOps

- GitHub Actions (CI/CD)
- Vercel (Frontend Hosting)
- Render (Backend Hosting)

### Database

- Firebase

### Deployment

- Vercel (Frontend)
- Render (Backend)

### Server Overview

The Divvy server handles:

- User authentication and session management
- Real-time messaging through Socket.IO
- File uploads and media handling via Firebase Storage
- Group and expense management
- API endpoints for all client-server communications

## Get Started Using Divvy

### Accessing Divvy

Divvy is very simple to use! All you have to do is go the Divvy website by clicking [here](https://divvy-chi.vercel.app/login) or go to https://divvy-chi.vercel.app/login. It's still only made for desktop browers so be warned if you go on mobile. Then from there all you have to do sign-up, login, and your ready to use Divvy! If you want a full guide on using Divvy, you can click [here](https://github.com/kristong123/Divvy/blob/main/User_Doc.md) for User documentations about Divvy.

### Bug reporting

If you experience any sorts of bugs using Divvy you can report it! Before you report a bug, please look at our User Documentations(by going to https://github.com/kristong123/Divvy/blob/main/User_Doc.md) as it has the latest documentation of known bugs that we are trying to fix! If you don't the bug in the "Bugs Known" section then in the User Documention follow the steps to report the bug. Thank you for reporting it!

## Setting up Divvy Locally

If you're curious about how Divvy is made, well look no further! We allow anyone to clone your repository if they want to play around with our application or maybe tell us what we can improve on! Below are the steps on how to get Divvy working locally on your laptop/desktop. This is just a quick getting started, so if you want more in-deph information click [here](https://github.com/kristong123/Divvy/blob/main/Developer_Doc.md) for our Developer documentions.

### Prerequisites

Before setting up Divvy, ensure you have the following:

- Node.js 18+
- npm or yarn
- Firebase account
- Firebase project with Firestore and Storage enabled

⚠️ Don't have Firebase or Cloudinary API keys yet?

- Follow the Environment Variables section below for step-by-step setup instructions.

### Installation

1. Clone the repository

```bash
git clone https://github.com/kristong123/Divvy.git
cd Divvy
```

2. Install dependencies

```bash
# Setup client
cd client
npm install

# Setup server
cd ../server
npm install
```

3. Set up environment variables:

```bash
# Client
cd client && cp .env.example .env.local

# Server
cd ../server && cp .env.example .env
```

If the command fails, manually create .env.local and .env and copy from the Environment Variables section below.

For client (.env.local):

- Get Firebase configuration from Firebase Console > Project Settings > General
- Replace the placeholder values with your Firebase config

For server (.env):

- Add your Firebase Admin key from Firebase Console > Project Settings > Service Accounts
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

### CI Services

---

In conjunction with our tests, we use Github Actions for continuous integration. This makes it easy to manage our CI/CD pipeline alongside our code to ensure things are working properly. If you curious about how we implemented our CI service, then click [here](https://github.com/kristong123/Divvy/blob/main/Developer_Doc.md) or go to https://github.com/kristong123/Divvy/blob/main/Developer_Doc.md and head to the "CI Services". This will go in-depth about how we use GitHub Actions and how you can use it.

## Environment Variables

To run this project, you'll need to set up the following environment variables:

### Client (.env.local)

```
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
```

### Server (.env)

```
PORT=3002
FIREBASE_ADMIN_KEY=your_firebase_admin_key_json
```

## Setting Up Environment Variables

1. **Firebase Setup**:

   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)

   Client Setup:

   - In Firebase Console, go to Project Settings > General
   - Scroll down to "Your apps" section and click the web app
   - Copy the firebaseConfig object:
     ```js
     const firebaseConfig = {
       apiKey: "xxx",
       authDomain: "xxx",
       projectId: "xxx",
       storageBucket: "xxx",
       messagingSenderId: "xxx",
       appId: "xxx",
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

**Protecting Sensitive Data**

- Never commit .env files to version control
- Ensure your `.gitignore` file includes:
  ```
  # Environment files
  .env
  .env.local
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

### Need more support or want to do more?

If you still having trouble or are wanting to play around more with Divvy, you look into our Developer documentions for more information! Click [here](https://github.com/kristong123/Divvy/blob/main/Developer_Doc.md) for the Developer documentions.

## License

MIT License

Copyright (c) 2024 Kris Tong, Kevin Duong, Matthew Pham, Kenny Vo, Annmarie Vo, Johny Ho

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
