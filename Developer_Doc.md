#Developer Documentation

## Obtaining Source Code:

To contribute or make changes with Divvy, you will just need to clone Divvy’s repository.
To get started, clone the repository from GitHub:
	git clone https://github.com/kristong123/Divvy.git
cd Divvy
## Directory Structure
The project consists of a frontend (React/TypeScript) and a backend (Node.js/Express).

### **Root Structure**
- `client/`: Contains the React frontend.
- `server/`: Contains the Express.js backend.
- `README.md`: Project documentation.

```
Divvy/
├── client/   # Frontend application
├── server/   # Backend application
└── README.md # Documentation
```

### **Frontend (client/)**
```
client/
├── src/                    # Source code
│   ├── assets/             # Static assets like images
│   ├── components/         # React components
│   ├── config/             # Configuration files (API endpoints)
│   ├── services/           # API and socket services
│   ├── store/              # Redux store and slices
│   │   └── slice/          # Redux slices
│   ├── types/              # TypeScript type definitions
│   ├── App.tsx            # Main application component
│   └── main.tsx           # Application entry point
├── test/                   # Test files
├── .env                    # Environment variables
└── vite.config.ts          # Vite configuration
```

### **Key Files**
- `client/src/assets/`: Stores static files such as images, fonts, and stylesheets.
- `client/src/components/`: Contains reusable React components.
- `client/src/services/`: Handles API and WebSocket interactions.
- `client/src/store/`: Manages global state using Redux.
- `client/.env`: Frontend environment variables.
- `client/test/`: Contains frontend test cases.
- `client/vite.config.ts`: Configuration for Vite, the frontend build tool.

---

## **Server (server/)**
```
server/
├── src/
│   ├── config/             # Configuration files for environment variables and services
│   │   ├── firebase.js     # Firebase authentication configuration
│   │   ├── socket.js       # WebSocket setup for real-time communication
│   │   └── corsOptions.js  # CORS settings to handle cross-origin requests
│   ├── controllers/        # API route handlers and business logic
│   ├── middleware/         # Express.js middleware for authentication and error handling
│   └── routes/             # API endpoints for the backend
├── test/                   # Unit and integration test files
│   └── *.test.js           # Jest test files for backend functionality
├── __mocks__/              # Mock files for testing (e.g., mocking API responses)
├── .env                    # Backend environment variables
└── index.js                # Main entry point for the backend server
```

### **Key Files**
- `server/src/config/`: Stores environment configurations such as Firebase and WebSocket setup.
- `server/src/controllers/`: Handles API requests and executes business logic.
- `server/src/middleware/`: Middleware functions for security, authentication, and error handling.
- `server/src/routes/`: Defines backend API endpoints.
- `server/.env`: Backend environment variables.
- `server/test/`: Contains Jest test files for unit and integration testing.
- `server/__mocks__/`: Mocks external services for testing.
- `server/index.js`: The main file that initializes and runs the Express server.

## Building the software Locally

This will help you set up, run, and deploy both the frontend and backend of the project once you clone the repository.

1. Install dependencies

```bash
cd divvy
npm install
```

2. Set up environment variables

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

### Running the System

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
## Testing Divvy
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

## Adding New Tests

To incorporate new frontend tests, you will go into the client folder to access the test folder (for directory path, client/test). The test folder contains frontend tests to ensure the major components of the web application are working fine. When creating a new test, you should follow the naming convention of [YOUR IMPLEMENTATION].test.tsx

To incorporate new backend tests, you will go into the server folder and finally you will find the test folder(for directory path, server/test). The test folder contains backend tests to ensure communication between client and server are operational. When creating a new test, you should follow the naming convention of [YOUR IMPLEMENTATION].test.js.

## CI Service
The Divvy project uses GitHub Actions for continuous integration. GitHub Actions is directly integrated with our GitHub repository, making it easy to manage our CI/CD pipeline alongside our code.

## Build History
You can find the complete build history for this project at:

[GitHub Actions](https://github.com/kristong123/Divvy/actions)

Click on any workflow run to see detailed logs, test results, and build artifacts.

## CI Configuration File
Our CI configuration is defined in the following file:

`.github/workflows/ci.yml` - Main workflow for building and testing the application on push and pull requests

## Workflow Overview
The main workflow runs on push events to any branch and on pull requests to the main branch. It includes the following steps:

Setup: Configures the environment with Node.js
Install Dependencies: Installs project dependencies using npm
Type Checking: Runs type-checking to ensure code quality
Lint: Runs the linter to ensure code quality
Build: Builds the application
Unit Tests: Executes unit tests

## Local Testing
Before pushing your changes, you can run the same checks locally:
```bash
# Install dependencies
npm install

# Run linting
npm run lint

# Run tests
npm run test

# Build the application
npm run build
```
## Troubleshooting
If you encounter CI-related issues:

1. Check the specific workflow run in GitHub Actions for detailed error logs
2. Ensure your code passes all tests locally before pushing
3. Verify that your changes adhere to the project's linting rules

## Contribution Guidelines
When contributing to this project:

1. Create a new branch for your changes
2. Make your changes and commit them
3. Push your branch and create a pull request
4. Wait for the CI to complete all checks
5. Address any issues identified by the CI
6. Request a code review

The CI system will automatically run on your pull request, and maintainers will be able to see the results before merging.
