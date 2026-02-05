# Event Pass Manager

A full-stack event management system with QR code-based pass generation and scanning for seamless event check-ins.

## Features

- **User Authentication**: Secure JWT-based authentication with role-based access (Admin/User)
- **Event Management**: Admins can create, update, and manage events
- **Event Registration**: Users can browse and register for events
- **QR Code Passes**: Automatic QR code generation for registered attendees
- **QR Code Scanner**: Built-in scanner for admins to verify attendees at events
- **Real-time Notifications**: In-app notification system for users
- **Dashboard Analytics**: Admin dashboard with event statistics and attendee tracking
- **Export Data**: Export registration data to Excel format

## Tech Stack

### Frontend
- **React 19** - UI Framework
- **Vite** - Build tool and dev server
- **TailwindCSS** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives
- **React Query** - Server state management
- **Wouter** - Lightweight routing
- **Framer Motion** - Animations
- **QRCode.react** - QR code generation
- **html5-qrcode** - QR code scanning

### Backend
- **Express.js 5** - Web framework
- **TypeScript** - Type safety
- **MongoDB Atlas** - Cloud database
- **Mongoose** - MongoDB ODM
- **JWT** - Authentication tokens
- **bcryptjs** - Password hashing

## Project Structure

```
Event-Pass-Manager/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   └── lib/            # Utilities and store
│   └── public/             # Static assets
├── server/                 # Backend Express application
│   ├── models/             # MongoDB models
│   ├── auth.ts             # Authentication middleware
│   ├── routes.ts           # API routes
│   └── db.ts               # Database connection
├── shared/                 # Shared types and schemas
└── api/                    # Vercel serverless functions
```

## Prerequisites

- Node.js 18+ 
- npm or yarn
- MongoDB Atlas account (or local MongoDB instance)

## Environment Variables

Create a `.env` file in the root directory:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>
JWT_SECRET=your-super-secret-jwt-key
NODE_ENV=development
```

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/Event-Pass-Manager.git
   cd Event-Pass-Manager
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your MongoDB URI and JWT secret
   ```

4. **Run development server**
   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:5000`

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run check` | TypeScript type checking |
| `npm run db:push` | Push database schema changes |

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Events
- `GET /api/events` - Get all events
- `POST /api/events` - Create event (Admin)
- `PUT /api/events/:id` - Update event (Admin)
- `DELETE /api/events/:id` - Delete event (Admin)

### Registrations
- `GET /api/registrations` - Get user registrations
- `POST /api/registrations` - Register for event
- `DELETE /api/registrations/:id` - Cancel registration
- `POST /api/registrations/scan` - Scan QR code (Admin)

### Users
- `GET /api/users` - Get all users (Admin)

## User Roles

### Admin
- Create, edit, and delete events
- View all registrations and attendees
- Scan QR codes for event check-in
- View analytics and export data

### User
- Browse available events
- Register for events
- View and download QR code passes
- Receive notifications
- Cancel registrations

## Deployment

### Deploying to Render

1. **Create a Render Account**
   - Sign up at [Render](https://render.com)

2. **Create a New Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository

3. **Configure Build Settings**
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`

4. **Set Environment Variables**
   - Go to your service's "Environment" tab
   - Add the following variables:
     - `MONGODB_URI` - Your MongoDB Atlas connection string
     - `JWT_SECRET` - Your JWT secret key
     - `NODE_ENV` - Set to `production`

5. **Deploy**
   - Click "Create Web Service"
   - Render will automatically build and deploy your application

### MongoDB Atlas Setup

1. Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a database user with read/write permissions
3. Whitelist `0.0.0.0/0` for cloud deployments (or add Render's specific IPs)
4. Get your connection string and add it to environment variables

### Alternative Deployment Options

#### Railway
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

#### Vercel
1. Install Vercel CLI: `npm install -g vercel`
2. Run `vercel` to deploy
3. Add environment variables in Vercel dashboard

#### Docker (Self-hosted)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["npm", "start"]
```

## License

MIT

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
