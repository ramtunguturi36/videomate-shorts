# Auth App - Phase 3: Reels Feed & Folder Navigation

A TikTok-like video feed with smooth short-form video viewing, folder navigation, and integrated payment system built with React, TypeScript, Express.js, MongoDB, and Razorpay.

## Features

### 🔐 Authentication System (Phase 1)
- **User Registration/Login**: Email and password authentication
- **Google OAuth**: Social login integration
- **Admin Login**: Separate admin authentication system
- **JWT Tokens**: Secure token-based authentication with configurable expiration
- **Password Security**: Bcrypt hashing with salt rounds

### 👥 User Management (Phase 1)
- **Role-Based Access**: User and Admin roles with different permissions
- **User Profiles**: Complete user information management
- **Subscription Management**: Track user subscription plans and status
- **Purchase History**: Record and manage user purchases

### 📁 File Management System (Phase 2)
- **Nested Folder Structure**: Create unlimited nested folders (outer → inner)
- **Cloudflare R2 Integration**: Secure file storage with CDN delivery
- **File Upload System**: Upload videos and images with metadata
- **Folder Tree Navigation**: Expandable/collapsible folder tree for users
- **File Metadata**: Title, tags, price, description, and upload information
- **Search & Filter**: Search files by title, tags, or description
- **File Viewer**: Built-in video and image viewer with fullscreen support

### 🎬 Reels Feed System (Phase 3)
- **TikTok-like Video Feed**: Smooth short-form video viewing experience
- **Auto-play Videos**: Videos autoplay as users scroll/swipe
- **Video Player Controls**: Play/pause, volume, progress bar, fullscreen
- **Folder-based Navigation**: Browse videos by folder structure
- **Image Unlock System**: Purchase associated images with "Unlock Pic" CTA
- **Payment Integration**: Razorpay integration for secure payments
- **Subscription Support**: Free access for active subscribers
- **Infinite Scroll**: Seamless video loading with pagination

### 🛡️ Security Features
- **JWT Middleware**: Automatic token validation on protected routes
- **Password Hashing**: Secure password storage with bcrypt
- **Account Lockout**: Admin account protection against brute force attacks
- **Input Validation**: Server-side validation for all inputs
- **CORS Protection**: Configured for secure cross-origin requests
- **File Type Validation**: Restrict uploads to allowed video/image formats

### 🎨 Professional UI
- **Modern Design**: Clean, professional interface with Tailwind CSS
- **Responsive Layout**: Mobile-first responsive design
- **Interactive Components**: Smooth animations and transitions
- **Toast Notifications**: User feedback for all actions
- **File Management Interface**: Intuitive folder and file management

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Axios** for API calls
- **React Hot Toast** for notifications
- **Lucide React** for icons

### Backend
- **Express.js** with TypeScript
- **MongoDB** with Mongoose ODM
- **JWT** for authentication
- **Bcryptjs** for password hashing
- **Passport.js** for Google OAuth
- **CORS** for cross-origin requests
- **Cloudflare R2** for file storage
- **AWS SDK** for R2 integration
- **Multer** for file uploads
- **Razorpay** for payment processing

## Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- Google OAuth credentials (for Google login)
- Cloudflare R2 account and bucket
- Razorpay account for payments

### 1. Clone and Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..
```

### 2. Environment Configuration

Create environment files:

**Frontend (.env):**
```env
VITE_API_URL=http://localhost:5000/api
```

**Backend (server/.env):**
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/auth-app
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=24h
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
CLIENT_URL=http://localhost:3000

# Cloudflare R2 Configuration
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_BUCKET_NAME=your-bucket-name
R2_PUBLIC_URL=https://your-bucket-name.your-account-id.r2.cloudflarestorage.com

# Razorpay Configuration
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-key-secret
```

### 3. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:5000/api/auth/google/callback`
6. Copy Client ID and Client Secret to your `.env` file

### 4. Cloudflare R2 Setup

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to R2 Object Storage
3. Create a new bucket
4. Go to "Manage R2 API tokens"
5. Create a new API token with R2 permissions
6. Copy the Account ID, Access Key ID, and Secret Access Key to your `.env` file
7. Set up a custom domain or use the default R2 URL for `R2_PUBLIC_URL`

### 5. Razorpay Setup

1. Go to [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. Create a new account or sign in
3. Go to "Settings" → "API Keys"
4. Generate API keys (use test keys for development)
5. Copy the Key ID and Key Secret to your `.env` file
6. Add the Razorpay Key ID to your frontend `.env` file

### 6. Database Setup

Make sure MongoDB is running:
```bash
# Start MongoDB (if installed locally)
mongod
```

### 7. Run the Application

```bash
# Start both frontend and backend
npm run dev:full

# Or start them separately:
# Frontend (port 3000)
npm run dev

# Backend (port 5000)
npm run server
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/admin/login` - Admin login
- `GET /api/auth/google` - Google OAuth
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

### User Routes (Protected)
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update profile
- `PUT /api/user/change-password` - Change password
- `GET /api/user/purchases` - Get purchase history
- `POST /api/user/purchases` - Add purchase
- `GET /api/user/subscription` - Get subscription info
- `PUT /api/user/subscription` - Update subscription

### Admin Routes (Protected)
- `GET /api/admin/users` - Get all users
- `GET /api/admin/users/:id` - Get user by ID
- `PUT /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Delete user
- `GET /api/admin/dashboard/stats` - Get dashboard stats
- `GET /api/admin/purchases` - Get all purchases

### File Management Routes (Protected)
- `POST /api/files/folders` - Create folder (Admin only)
- `GET /api/files/folders/tree` - Get folder tree
- `GET /api/files/folders/:path` - Get folder contents
- `DELETE /api/files/folders/:path` - Delete folder (Admin only)
- `POST /api/files/upload` - Upload files (Admin only)
- `GET /api/files/files` - Get files by folder
- `GET /api/files/files/search` - Search files
- `GET /api/files/files/:id` - Get file details
- `DELETE /api/files/files/:id` - Delete file (Admin only)

### Feed & Purchase Routes (Protected)
- `GET /api/feed/videos` - Get video feed for reels
- `GET /api/feed/video/:id` - Get single video with associated image
- `POST /api/feed/purchase/create-order` - Create payment order for image purchase
- `POST /api/feed/purchase/verify` - Verify payment and complete purchase
- `GET /api/feed/purchases` - Get user's purchase history
- `GET /api/feed/purchase/check/:fileId` - Check if user has purchased specific file

## Database Schema

### User Collection
```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  role: String (enum: 'user', 'admin'),
  subscriptionInfo: {
    isActive: Boolean,
    plan: String (enum: 'free', 'basic', 'premium'),
    startDate: Date,
    endDate: Date
  },
  purchaseHistory: [{
    productId: String,
    productName: String,
    amount: Number,
    purchaseDate: Date,
    status: String (enum: 'pending', 'completed', 'failed')
  }],
  googleId: String,
  isEmailVerified: Boolean,
  lastLogin: Date
}
```

### Admin Collection
```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  permissions: {
    canManageUsers: Boolean,
    canManageContent: Boolean,
    canViewAnalytics: Boolean,
    canManagePayments: Boolean,
    canAccessReports: Boolean
  },
  isActive: Boolean,
  lastLogin: Date,
  loginAttempts: Number,
  lockUntil: Date
}
```

### Folder Collection
```javascript
{
  name: String,
  path: String (unique),
  parentPath: String,
  level: Number,
  children: [ObjectId],
  files: [ObjectId],
  isRoot: Boolean,
  createdBy: ObjectId (Admin),
  metadata: {
    description: String,
    tags: [String],
    isPublic: Boolean
  }
}
```

### File Collection
```javascript
{
  title: String,
  originalName: String,
  filename: String (unique),
  fileType: String (enum: 'video', 'image'),
  mimeType: String,
  size: Number,
  folderPath: String,
  folder: ObjectId,
  r2Key: String (unique),
  r2Url: String,
  thumbnailUrl: String,
  metadata: {
    duration: Number,
    dimensions: { width: Number, height: Number },
    tags: [String],
    description: String,
    price: Number,
    isPublic: Boolean,
    downloadCount: Number,
    viewCount: Number
  },
  uploadInfo: {
    uploadedBy: ObjectId (Admin),
    uploadDate: Date,
    lastModified: Date
  },
  status: String (enum: 'uploading', 'processing', 'ready', 'error')
}
```

### Purchase Collection
```javascript
{
  user: ObjectId (User),
  file: ObjectId (File),
  amount: Number,
  currency: String (default: 'INR'),
  paymentMethod: String (enum: 'razorpay', 'subscription', 'free'),
  razorpayOrderId: String,
  razorpayPaymentId: String,
  razorpaySignature: String,
  status: String (enum: 'pending', 'completed', 'failed', 'refunded'),
  purchaseDate: Date,
  metadata: {
    userAgent: String,
    ipAddress: String,
    platform: String
  }
}
```

## Usage

### User Flow
1. **Registration**: Users can register with email/password or Google OAuth
2. **Login**: Secure login with JWT token generation
3. **Dashboard**: Access to user dashboard with reels feed, profile, purchases, subscription, and file browser
4. **Reels Feed**: TikTok-like video viewing with auto-play and folder navigation
5. **Image Unlock**: Purchase associated images with "Unlock Pic" button
6. **Profile Management**: Update personal information and change password
7. **File Browser**: Browse folders and view files with search and filter capabilities

### Admin Flow
1. **Admin Login**: Separate admin authentication
2. **Admin Dashboard**: Overview of users, subscriptions, purchases, and file management
3. **User Management**: View, edit, and delete users
4. **File Management**: Create folders, upload files, and manage file metadata
5. **Analytics**: Dashboard statistics and insights

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: Bcrypt with salt rounds for password security
- **Account Lockout**: Protection against brute force attacks
- **Input Validation**: Server-side validation for all inputs
- **CORS Configuration**: Secure cross-origin request handling
- **Environment Variables**: Sensitive data stored in environment variables

## Development

### Project Structure
```
├── src/
│   ├── components/
│   │   ├── auth/          # Authentication components
│   │   └── dashboard/     # Dashboard components
│   ├── contexts/          # React contexts
│   ├── services/          # API services
│   └── types/             # TypeScript types
├── server/
│   ├── models/            # MongoDB models
│   ├── routes/            # API routes
│   ├── middleware/        # Custom middleware
│   └── config/            # Configuration files
└── public/                # Static assets
```

### Available Scripts
- `npm run dev` - Start frontend development server
- `npm run server` - Start backend server
- `npm run dev:full` - Start both frontend and backend
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Next Phases

This is Phase 3 of an 8-phase application. Future phases will include:
- Phase 4: [Next phase details]
- Phase 5: [Next phase details]
- ...and so on

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License.
