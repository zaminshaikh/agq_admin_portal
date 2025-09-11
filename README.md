# AGQ Admin Portal

A comprehensive administrative dashboard for managing clients, activities, and financial statements. Built with React, TypeScript, and Firebase, the AGQ Admin Portal provides a modern, responsive interface for business management operations.

## 🚀 Features

### 📊 Dashboard
- **Client Management**: Complete CRUD operations for client data
- **Client Overview**: Display client information with status indicators
- **Import/Export**: Bulk client data import and export functionality
- **Client Linking**: Link and unlink clients with user accounts

### 📈 Activities Management
- **Activity Tracking**: Create, edit, and delete business activities
- **Scheduled Activities**: Manage and track scheduled activities
- **Activity Export**: Export activity data to CSV format
- **Client Filtering**: Filter activities by specific clients
- **Real-time Updates**: Live activity status tracking

### 📄 Statements
- **Document Management**: Upload and manage client statements
- **Statement Generation**: Generate financial statements
- **Client-specific Views**: Organize statements by client
- **File Storage**: Secure document storage with Firebase

### 🔐 Authentication & Security
- **Firebase Authentication**: Secure login/logout functionality
- **Protected Routes**: Route-level access control
- **User Management**: Registration and user account management

## 🛠️ Tech Stack

### Frontend
- **React 18.3.1** - Modern React with hooks and functional components
- **TypeScript 5.4.5** - Type-safe development
- **CoreUI Pro 5.0.0** - Professional admin template components
- **Vite 5.2.10** - Fast build tool and development server
- **React Router 6.26.2** - Client-side routing
- **Redux & React-Redux** - State management

### Backend & Database
- **Firebase 10.14.1** - Backend as a Service
  - **Firestore** - NoSQL document database
  - **Firebase Functions** - Serverless cloud functions
  - **Firebase Storage** - File storage and management
  - **Firebase Authentication** - User authentication

### UI & Styling
- **CoreUI React Pro** - Professional React components
- **SCSS/Sass** - Advanced CSS preprocessing
- **Material-UI 6.1.1** - Additional UI components
- **FontAwesome** - Icon library
- **Chart.js** - Data visualization

### Development Tools
- **ESLint** - Code linting and quality
- **Prettier** - Code formatting
- **TypeScript ESLint** - TypeScript-specific linting
- **Autoprefixer** - CSS vendor prefixing

## 📁 Project Structure

```
agq-admin-portal/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── header/         # Header components
│   │   ├── AppSidebar.tsx  # Navigation sidebar
│   │   └── ...
│   ├── views/              # Main application views
│   │   ├── dashboard/      # Client management dashboard
│   │   ├── activities/     # Activity management
│   │   ├── statements/     # Statement management
│   │   └── pages/         # Authentication pages
│   ├── db/                # Database utilities and models
│   ├── utils/             # Helper functions and utilities
│   ├── assets/            # Static assets (images, logos)
│   ├── scss/              # Styling and themes
│   └── i18n.ts           # Internationalization setup
├── functions/             # Firebase Cloud Functions
│   ├── src/
│   │   ├── callable/      # Callable functions
│   │   ├── triggers/      # Database triggers
│   │   ├── scheduled/     # Scheduled functions
│   │   └── helpers/       # Utility functions
├── admin/                 # Administrative scripts
├── public/               # Static public assets
│   └── locales/          # Translation files
└── build/                # Production build output
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18 or higher
- npm or yarn package manager
- Firebase CLI (for deployment)
- Firebase project setup

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd agq-admin-portal
   ```

2. **Install dependencies**
   ```bash
   # Install frontend dependencies
   npm install
   
   # Install Firebase Functions dependencies
   cd functions
   npm install
   cd ..
   ```

3. **Firebase Configuration**
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com)
   - Enable Authentication, Firestore, and Storage
   - Update Firebase configuration in `src/App.tsx` (currently configured for team-shaikh-app-52dc5)

4. **Environment Setup**
   - Configure Firebase project settings
   - Set up Firestore security rules
   - Configure authentication providers

### Development

1. **Start the development server**
   ```bash
   npm start
   ```
   The application will open at `http://localhost:3000`

2. **Start Firebase emulators** (optional)
   ```bash
   firebase emulators:start
   ```

3. **Build for production**
   ```bash
   npm run build
   ```

### Firebase Functions

1. **Build functions**
   ```bash
   cd functions
   npm run build
   ```

2. **Deploy functions**
   ```bash
   npm run deploy
   ```

3. **Run functions locally**
   ```bash
   npm run serve
   ```

## 🔧 Available Scripts

### Frontend Scripts
- `npm start` - Start development server
- `npm run build` - Build for production
- `npm run serve` - Preview production build
- `npm run lint` - Run ESLint
- `npm run type-check` - TypeScript type checking

### Firebase Functions Scripts
- `npm run build` - Compile TypeScript functions
- `npm run build:watch` - Watch mode compilation
- `npm run deploy` - Deploy functions to Firebase
- `npm run serve` - Run functions locally
- `npm run logs` - View function logs

## 📚 Key Features Explained

### Client Management
The dashboard provides comprehensive client management capabilities:
- Create new clients with detailed information
- Edit existing client data
- Delete clients with confirmation
- Import clients from CSV files
- Export client data
- Link clients to user accounts
- View client activity history

### Activity Tracking
Robust activity management system:
- Create various types of business activities
- Schedule future activities
- Track activity completion status
- Filter activities by client
- Export activity reports
- Automated activity processing via scheduled functions

### Document Management
Secure document handling:
- Upload client statements
- Generate financial reports
- Organize documents by client
- Secure file storage with Firebase Storage
- Document access control

### Real-time Updates
Firebase integration provides:
- Real-time data synchronization
- Automatic UI updates
- Offline capability
- Secure data access
- Scalable backend infrastructure

## 🌍 Internationalization

The application supports multiple languages:
- **English** (default)
- **Spanish** (Español)
- **Polish** (Polski)

Translation files are located in `public/locales/` and can be easily extended for additional languages.

## 🔐 Security Features

- **Firebase Authentication** - Secure user login/logout
- **Protected Routes** - Route-level access control
- **Firestore Security Rules** - Database-level security
- **Input Validation** - Form validation and sanitization
- **Error Handling** - Comprehensive error management

## 🚀 Deployment

### Firebase Hosting
1. **Build the application**
   ```bash
   npm run build
   ```

2. **Deploy to Firebase**
   ```bash
   firebase deploy
   ```

### Manual Deployment
The build folder can be deployed to any static hosting service:
- Netlify
- Vercel
- AWS S3
- GitHub Pages

## 📊 Firebase Functions

The application includes several cloud functions:

### Callable Functions
- `linkNewUser` - Link users to client accounts
- `unlinkUser` - Unlink user accounts
- `checkUIDExists` - Verify user existence
- `calculateYTD` - Calculate year-to-date metrics
- `checkDocumentExists` - Verify document existence

### Triggers
- `onActivityWrite` - Handle activity changes
- `onAssetUpdate` - Process asset updates
- `onConnectedUsersChange` - Manage user connections
- `handleStorageDocumentUpload` - Process document uploads

### Scheduled Functions
- `scheduledYTDReset` - Reset year-to-date calculations
- `processScheduledActivities` - Process scheduled activities

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 Code Style

The project uses:
- **ESLint** for code linting
- **Prettier** for code formatting
- **TypeScript** for type safety
- **Conventional Commits** for commit messages

## 🐛 Troubleshooting

### Common Issues

1. **Firebase Configuration**
   - Ensure Firebase project is properly configured
   - Verify API keys and project settings
   - Check Firestore security rules

2. **Build Issues**
   - Clear node_modules and reinstall dependencies
   - Check TypeScript errors
   - Verify environment variables

3. **Authentication Problems**
   - Verify Firebase Authentication is enabled
   - Check authentication provider settings
   - Ensure proper redirect URLs

## 📄 License

This project is licensed under the terms specified in the LICENSE file.

## 🏢 About AGQ

AGQ (formerly team_shaikh_app) is a comprehensive business management platform designed to streamline client management, activity tracking, and financial reporting operations.

---

**Note**: This application was previously known as `ts_admin_portal` and has been rebranded to AGQ Admin Portal. Some internal references to `team_shaikh_app` may still exist as this is the Firebase project name.
