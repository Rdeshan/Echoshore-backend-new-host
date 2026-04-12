# 🚀 EcoShore Deployment Guide

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Backend Deployment (Railway)](#backend-deployment-railway)
  - [Prerequisites](#prerequisites)
  - [Railway Setup](#railway-setup)
  - [Environment Configuration](#environment-configuration)
  - [Deployment Process](#deployment-process)
- [Frontend Deployment (Vercel)](#frontend-deployment-vercel)
  - [Prerequisites](#vercel-prerequisites)
  - [Vercel Setup](#vercel-setup)
  - [Environment Configuration](#vercel-environment-configuration)
  - [Deployment Process](#vercel-deployment-process)
- [Database Setup (MongoDB Atlas)](#database-setup-mongodb-atlas)
- [CI/CD Pipeline](#cicd-pipeline)
- [Post-Deployment](#post-deployment)
- [Monitoring & Logging](#monitoring--logging)
- [Troubleshooting](#troubleshooting)
- [Rollback Procedures](#rollback-procedures)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Production Environment                   │
│                     EcoShore 2026 v1.0.0                    │
└─────────────────────────────────────────────────────────────┘

┌──────────────────┐
│   Vercel CDN     │
│   Frontend       │
│  React 18.x      │                    ┌──────────────────┐
│  - Vite build    │────┐               │   Railway.app    │
│  - Static assets │    │           ┌───┤  Backend Node.js │
└──────────────────┘    │           │   │  Express 5.x     │
                        │           │   │  Port 4000       │
        ┌───────────────┼───────────┤   │                  │
        │               │           │   │  Features:       │
   HTTPS/TLS         Cloudinary    └───┤  - Auto scaling  │
        │              (Images)        │  - Zero downtime │
        │                              │  - Automatic SSL │
        │                              └──────────────────┘
        │
        ├─────────────────────┬────────────────────────┐
        │                     │                        │
   ┌─────────────────┐  ┌──────────────┐    ┌─────────────────┐
   │  MongoDB Atlas  │  │  Firebase    │    │  ML Service     │
   │  (Cluster)      │  │  Realtime DB │    │  Python Flask   │
   │  - Prod Data    │  │  - Messages  │    │  Gunicorn       │
   │  - Backups      │  │  - Auth      │    │  Port 5001      │
   └─────────────────┘  └──────────────┘    └─────────────────┘
```

---

## Backend Deployment (Railway)

Railway is a modern cloud platform that simplifies backend deployments with automatic scaling, built-in database support, and environment management.

### Prerequisites

#### 1. Account & Access

- [ ] Railway account created at [railway.app](https://railway.app)
- [ ] GitHub account connected to Railway
- [ ] Repository access from Railway dashboard
- [ ] Billing information configured

#### 2. Required Tools

```bash
# Install Railway CLI (optional but recommended)
npm install -g @railway/cli
# or
yarn global add @railway/cli

# Verify installation
railway --version
```

#### 3. Repository Preparation

```bash
# Ensure .gitignore is configured correctly
# .gitignore should include:
# - node_modules/
# - .env (NEVER commit!)
# - .env.local
# - .env.*.local
# - logs/
# - uploads/
# - coverage/
# - dist/

# Verify package.json structure
npm run build  # If applicable
npm run test   # Run tests pre-deployment
```

#### 4. Environment Secrets

Prepare all environment variables (request from DevOps/Team Lead):

- MongoDB connection string
- JWT secret
- API keys (Firebase, Google OAuth, etc.)
- Email service credentials
- Cloudinary API tokens

### Railway Setup

#### Step 1: Create Railway Project

**Via Web Dashboard:**

1. Login to [railway.app](https://railway.app)
2. Click **"New Project"**
3. Select **"Deploy from GitHub"**
4. Authorize GitHub if not already connected
5. Select `EcoShore-Backend` repository
6. Choose branch (typically `main` or `production`)
7. Click **"Deploy"**

**Via Railway CLI:**

```bash
# Navigate to project root
cd /path/to/EcoShore-Backend

# Login to Railway
railway login

# Create new project
railway init

# Connect GitHub repository
# Follow prompts to link your GitHub repo
```

#### Step 2: Add Services

**Step 2a: Configure Node.js Service**

1. In Railway dashboard, click project
2. Select **"Add Service"**
3. Choose **"GitHub"** (your repository)
4. Configure:
   - **Build Command**: (leave empty or `npm run build`)
   - **Start Command**: `npm start`
   - **Port**: `4000`

**Step 2b: Add MongoDB (Optional - if using Railway DB)**

```bash
# If using MongoDB Atlas (recommended):
# Skip this step, use connection string in env vars

# If using Railway PostgreSQL alternative:
railway add --plugin=postgres
# Then update connection string
```

**Step 2c: Add Redis (Optional - for caching)**

```bash
# For session/cache management
railway add --plugin=redis
```

#### Step 3: Configure Domains

1. Navigate to **Settings**
2. Go to **Domains**
3. Click **"Generate Domain"**
   - Railway provides: `xxxxx.railway.app`
4. (Optional) Add custom domain:
   - Configure DNS at domain registrar
   - Add CNAME record pointing to Railway domain
   - Update CORS & API URL configurations

**Example DNS Configuration:**

```
Type: CNAME
Name: api
Value: xxxxx.railway.app
TTL: 3600
```

### Environment Configuration

#### Step 1: Prepare Environment Variables

Create `.railway.env` file locally (do NOT commit):

```env
# Node Configuration
NODE_ENV=production
PORT=4000
LOG_LEVEL=info

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ecoshore?retryWrites=true&w=majority
DB_NAME=ecoshore_production

# JWT
JWT_SECRET=your-very-secret-jwt-key-here-min-32-chars
JWT_EXPIRE=7d
REFRESH_TOKEN_SECRET=your-refresh-secret-key-min-32-chars
REFRESH_TOKEN_EXPIRE=30d

# Firebase
FIREBASE_PROJECT_ID=your-firebase-project
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEvQIBA...\n-----END PRIVATE KEY-----
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_DATABASE_URL=https://your-project.firebaseio.com

# Google OAuth
GOOGLE_CLIENT_ID=xxx-xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-secret
GOOGLE_CALLBACK_URL=https://api.yourdomain.com/auth/google/callback

# Email Service
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password
SMTP_FROM=noreply@ecoshore.com

# Cloudinary (Image uploads)
CLOUDINARY_NAME=your-cloudinary-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret

# ML Service
ML_SERVICE_URL=https://ml-api.yourdomain.com
ML_SERVICE_KEY=your-ml-service-key

# Frontend URL
FRONTEND_URL=https://yourdomain.com
FRONTEND_URL_DEV=http://localhost:3000

# CORS
CORS_ORIGIN=https://yourdomain.com

# API Keys
REDIS_URL=redis://default:password@redis-host:port
SESSION_SECRET=session-secret-key-min-32-chars
```

#### Step 2: Add Variables to Railway

**Via Web Dashboard:**

1. Navigate to **Settings** → **Variables**
2. Click **"Add Variable"**
3. Copy from `.railway.env` file:
   ```
   KEY: JWT_SECRET
   VALUE: your-secret-value
   ```
4. Click **"+Add"** for each variable
5. Variables are automatically encrypted

**Via Railway CLI:**

```bash
# Login first
railway login

# Set variables from command line
railway variable set NODE_ENV production
railway variable set JWT_SECRET "your-secret-key"
railway variable set MONGODB_URI "mongodb+srv://..."

# View all variables
railway variable list
```

**Security Best Practices:**

- [ ] Use strong, unique secrets (min 32 characters)
- [ ] Rotate secrets quarterly
- [ ] Never commit `.env` files
- [ ] Enable encryption at rest
- [ ] Restrict Railway dashboard access to team only
- [ ] Use separate secrets for dev/staging/production

#### Step 3: Verify Environment Variables

Railway will automatically load variables at runtime. To verify:

```bash
# View in Railway logs (after deployment)
# They will show: "Loaded from Railway variables"

# Or add debug logging in src/config/logger.js:
logger.info('Environment loaded:', {
  nodeEnv: process.env.NODE_ENV,
  mongodbConfigured: !!process.env.MONGODB_URI,
  jwtConfigured: !!process.env.JWT_SECRET
});
```

### Deployment Process

#### Pre-Deployment Checklist

```bash
# 1. Ensure all tests pass
npm test
npm run test:coverage

# 2. Check code quality
npm run lint
npm run format:check

# 3. Verify build process
npm run build  # if applicable

# 4. Commit all changes
git add .
git commit -m "chore: prepare for deployment"

# 5. Push to deployment branch
git push origin main  # or your production branch
```

#### Automatic Deployment

Railway automatically deploys when code is pushed to connected branch:

```
1. Push to main/production branch
   ↓
2. GitHub webhook triggers Railway build
   ↓
3. Railway pulls latest code
   ↓
4. Runs build command (if configured)
   ↓
5. Installs dependencies: npm ci
   ↓
6. Starts with npm start
   ↓
7. Health checks pass
   ↓
8. Previous version shutdown (zero-downtime)
   ↓
9. New version goes LIVE
```

#### Monitor Deployment

**In Railway Dashboard:**

1. Navigate to **Deployments** tab
2. Watch real-time build logs
3. See deployment progress:
   - Building: npm install, build command
   - Deploying: Starting service
   - Running: Service is live

**View Logs:**

```bash
# Via CLI
railway logs --service=ecoshore-backend

# Or in dashboard: Service → Logs tab
# Shows real-time application logs
```

#### Expected Build Time: **2-5 minutes**

- Dependency installation: ~60s
- Build process: ~30s
- Health checks: ~20s

---

## Frontend Deployment (Vercel)

Vercel is specifically optimized for Next.js and React applications, offering edge deployments, automatic optimizations, and built-in CI/CD.

### Vercel Prerequisites

#### 1. Account & Access

- [ ] Vercel account created at [vercel.com](https://vercel.com)
- [ ] GitHub account connected to Vercel
- [ ] Repository permissions (Admin or Repo access)
- [ ] Billing configured (can deploy free tier)

#### 2. Repository Preparation

```bash
# Navigate to frontend directory
cd EcoShore-Frontend

# Verify build process
npm run build

# Preview build locally
npm run preview

# Check Vite configuration exists
# (vite.config.js should be in root)

# Verify node version
node --version  # v18+ recommended
```

#### 3. Dependencies Ready

```bash
# Ensure package-lock.json is committed
git status | grep package-lock.json

# Verify all dependencies
npm ci  # Clean install to match lock file
```

### Vercel Setup

#### Step 1: Create Vercel Project

**Via Web Dashboard:**

1. Navigate to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Select **"Import Git Repository"**
4. Choose **GitHub** and authorize (if needed)
5. Select `EcoShore-Frontend` repository
6. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `./` (default)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm ci`
7. Click **"Deploy"**

**Via Vercel CLI:**

```bash
# Install Vercel CLI globally
npm install -g vercel

# Navigate to frontend directory
cd EcoShore-Frontend

# Login to Vercel
vercel login

# Deploy project
vercel

# Follow prompts:
# - Link to existing project? (No for first deploy)
# - Project name: ecoshore-frontend
# - Directory: ./
# - Framework: Vite
# - Build command: npm run build
# - Output directory: dist
```

#### Step 2: Configure Project Settings

**In Vercel Dashboard:**

1. Navigate to **Settings**
2. Go to **General**
3. Configure:
   - **Node.js Version**: v18 LTS (or latest stable)
   - **Output Directory**: `dist`
   - **Framework**: Vite
   - **Regions**: Multiple regions (recommended for CDN)

#### Step 3: Set Up Custom Domain

**Option A: Add Custom Domain**

1. Go to **Settings** → **Domains**
2. Click **"Add Custom Domain"**
3. Enter your domain (e.g., `ecoshore.com`)
4. Configure DNS:
   ```
   Type:  CNAME
   Name:  (leave blank or "@" for root)
   Value: cname.vercel-dns.com
   ```
5. Verify ownership (usually automatic)
6. SSL certificate auto-provisioned

**Option B: Use Vercel Subdomain**

- Default: `ecoshore-frontend.vercel.app`
- No DNS configuration needed
- Free SSL included

### Vercel Environment Configuration

#### Step 1: Create Environment Variables File

Create `vercel.json` in frontend root:

```json
{
  "env": {
    "VITE_API_URL": "@api_url",
    "VITE_FIREBASE_CONFIG": "@firebase_config",
    "VITE_GOOGLE_CLIENT_ID": "@google_client_id"
  },
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "nodeVersion": "18.x"
}
```

#### Step 2: Add Environment Variables

**Via Dashboard:**

1. Go to **Settings** → **Environment Variables**
2. Add each variable for each environment (Production, Preview, Development):

```env
# Production Environment
VITE_API_URL=https://api.yourdomain.com
VITE_FIREBASE_PROJECT_ID=your-firebase-project
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_GOOGLE_CLIENT_ID=xxx-xxx.apps.googleusercontent.com
VITE_ANALYTICS_KEY=your-analytics-key
```

**Variable Scope:**

- **Production**: Main deployment
- **Preview**: Pull request previews
- **Development**: Local development

**Via CLI:**

```bash
vercel env add VITE_API_URL
# Prompted: Enter value for VITE_API_URL
# Select environment: Production

vercel env ls  # List all variables
```

#### Step 3: Update Frontend Configuration

Update `src/config/index.js`:

```javascript
const config = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:4000',
  firebase: {
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  },
  google: {
    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
  },
};

export default config;
```

### Vercel Deployment Process

#### Pre-Deployment Checklist

```bash
# 1. Test build locally
npm run build

# 2. Preview built version
npm run preview

# 3. Run linting
npm run lint

# 4. Format code
npm run format:check

# 5. Verify no errors in terminal
# (Fix any issues before deployment)

# 6. Commit changes
git add .
git commit -m "feat: ready for deployment"

# 7. Push to main branch
git push origin main
```

#### Automatic Deployment

Vercel automatically deploys after push:

```
1. Push to main branch
   ↓
2. GitHub webhook notifies Vercel
   ↓
3. Vercel clones repository
   ↓
4. Installs dependencies: npm ci
   ↓
5. Runs build: npm run build
   ↓
6. Build output verified
   ↓
7. Files uploaded to CDN
   ↓
8. Deployment preview URL generated
   ↓
9. Once verified, goes to Production
   ↓
10. CDN caches all files globally
```

#### Monitor Deployment

**In Vercel Dashboard:**

1. Go to **Deployments** tab
2. See deployment status:
   - **Building** (blue): npm install & build running
   - **Ready** (green): Successfully deployed
   - **Failed** (red): Build or deployment error
3. Click deployment to see logs

**Timeline Example:**

- Installing dependencies: 45s
- Building: 30s
- Uploading to CDN: 10s
- **Total**: ~85 seconds

#### Preview Deployments

Every pull request creates automatic preview:

1. Push to feature branch
2. Create PR on GitHub
3. Vercel creates preview URL
4. Share preview URL with team
5. Test before merging to main

**Preview URL Format:**

```
https://ecoshore-frontend-pr-123.vercel.app
(Unique for each PR)
```

---

## Database Setup (MongoDB Atlas)

### Prerequisites

- MongoDB Atlas account at [mongodb.com/cloud](https://mongodb.com/cloud)
- Organization/team access
- Billing configured (free tier up to 512MB)

### Create MongoDB Cluster

#### Step 1: Create Cluster

1. Login to MongoDB Atlas
2. Click **"Create"** → **"Build a Database"**
3. Select **"M0 Shared"** (free) or higher tier
4. Choose region (select geographically close to Railway)
5. Name cluster: `ecoshore-prod` or `ecoshore-staging`
6. Click **"Create Deployment"**
7. Wait 5-10 minutes for cluster creation

#### Step 2: Create Database User

1. Go to **Database Access**
2. Click **"Add New Database User"**
3. Configure:
   - **Username**: Strong username
   - **Password**: Auto-generated (save securely!)
   - **Privileges**: `readWriteAnyDatabase`
4. Click **"Add User"**

#### Step 3: Configure Network Access

1. Go to **Network Access**
2. Click **"Add IP Address"**
3. Options:
   - **Add Current IP**: Your local development machine
   - **Add IP 0.0.0.0/0**: Allow all IPs (less secure, only for development)
   - **Add Railway IP Range**: (if available)
4. For production, use Railway IP whitelisting

#### Step 4: Get Connection String

1. click **"Connect"**
2. Select **"Drivers"**
3. Choose **"Node.js"** version 4.x
4. Copy connection string:
   ```
   mongodb+srv://username:password@cluster-name.mongodb.net/database-name?retryWrites=true&w=majority
   ```
5. Replace `<password>` with user password
6. Replace `database-name` with actual database name
7. Use in Railway environment variables

### Database Backup Strategy

```bash
# Manual backup (via MongoDB Atlas)
1. Go to Clusters → Backup
2. Click "Take backup now"
3. Backups retained for 7-90 days (depends on tier)

# Automated backups
- Daily backups (free tier): 7 days
- NAS backups (paid): Custom retention
- Enable point-in-time recovery for production
```

---

## CI/CD Pipeline

### GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches:
      - main
      - production

env:
  REGISTRY: ghcr.io

jobs:
  test-and-build-backend:
    runs-on: ubuntu-latest
    name: Backend Tests & Build

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Check coverage
        run: npm run test:coverage

      - name: Build
        run: npm run build || true

  deploy-backend:
    needs: test-and-build-backend
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v3

      - name: Deploy to Railway
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
          RAILWAY_PROJECT_ID: ${{ secrets.RAILWAY_PROJECT_ID }}
          SERVICE_ID: ${{ secrets.RAILWAY_SERVICE_ID }}
        run: |
          npm install -g @railway/cli
          railway link $RAILWAY_PROJECT_ID
          railway service set SERVICE_ID=$SERVICE_ID
          railway up

  deploy-frontend:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v3

      - name: Deploy to Vercel
        uses: vercel/actions/deploy-production@v18
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

### Add GitHub Secrets

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Add secrets:

```
RAILWAY_TOKEN: (from railway account settings)
RAILWAY_PROJECT_ID: (from Railway dashboard URL)
RAILWAY_SERVICE_ID: (service ID in Railway)
VERCEL_TOKEN: (from vercel account settings)
VERCEL_ORG_ID: (from vercel dashboard)
VERCEL_PROJECT_ID: (project ID in Vercel)
```

---

## Post-Deployment

### Health Checks

**Backend Health Endpoint:**

```bash
# Should return 200 OK
curl https://api.yourdomain.com/health

# Expected response:
{
  "status": "OK",
  "uptime": 1234,
  "timestamp": "2024-04-12T10:30:00Z",
  "version": "1.0.0"
}
```

**Frontend Health Check:**

```bash
# Test main page loads
curl https://yourdomain.com

# Verify status 200 and HTML content
# Check for React app initialization
```

### Initial Configuration

After deployment, complete:

```bash
# 1. Seed initial data (if needed)
npm run seed:db

# 2. Create admin account
# Via admin panel or API call

# 3. Configure email templates
# Update in Firebase or email service

# 4. Test all integrations
# - Firebase authentication
# - Google OAuth
# - MongoDB connectivity
# - File uploads to Cloudinary
```

### Performance Verification

```bash
# Check Lighthouse scores
# Frontend: Run Lighthouse in DevTools
# Target: >90 in Performance, Accessibility

# Monitor API response times
# Should be <200ms for most endpoints
# Use Railway metrics dashboard

# Check CDN coverage
# Vercel automatically caches assets
# Verify via Browser DevTools → Network
```

---

## Monitoring & Logging

### Railway Monitoring

**Access Logs:**

```bash
railway logs --service=ecoshore-backend

# Or via Dashboard: Service → Logs
# Real-time streaming of application output
```

**Monitor Metrics:**

1. Go to **Metrics** tab in Railway
2. View:
   - CPU usage
   - Memory consumption
   - Request count
   - Response times

**Set Up Alerts:**

1. Navigate to **Alerts**
2. Create rule:
   - CPU > 80%
   - Memory > 500MB
   - Error rate > 5%
3. Send to Slack/Email

### Vercel Monitoring

**View Analytics:**

1. Go to **Analytics** in Vercel dashboard
2. Monitor:
   - Page loads
   - Core Web Vitals
   - Cache hit ratio
   - Edge function usage

**Check performance:**

```
Visit: vercel.com/dashboard → ecoshore-frontend → Analytics

Key metrics:
- TTFB (Time to First Byte): <200ms
- FCP (First Contentful Paint): <1.5s
- LCP (Largest Contentful Paint): <2.5s
```

### Application Logging

**Backend Logging Configuration:**

`src/config/logger.js`:

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

module.exports = logger;
```

**Log Important Events:**

```javascript
logger.info('User registered', { userId, email });
logger.error('Database connection failed', { error });
logger.warn('High response time', { endpoint, duration });
```

### Error Tracking (Optional)

Integrate Sentry for error tracking:

```bash
npm install @sentry/node

# In src/server.js
const Sentry = require('@sentry/node');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.errorHandler());
```

---

## Troubleshooting

### Backend Issues

#### Issue: Build fails with "npm: not found"

**Solution:**

1. Check Node.js version in Railway settings
2. Should be 18.x or higher
3. Clear build cache: Railway dashboard → Rebuild

#### Issue: Application crashes on startup

**Check logs:**

```bash
railway logs --service=ecoshore-backend

# Look for:
# - Missing environment variables
# - Database connection errors
# - Port conflicts
```

**Common causes:**

```javascript
// MongoDB connection string invalid
// Solution: Verify MONGODB_URI in Railway Variables

// Port already in use
// Solution: Use PORT env var (Railway sets automatically)

// Missing required packages
// Solution: Ensure all dependencies in package.json
```

#### Issue: "Cannot find module" errors

**Solution:**

```bash
# Files not committed to Git
git status

# Missing from node_modules
npm list missing-module-name

# Add to package.json and redeploy
npm install missing-module-name
git push
```

#### Issue: Slow response times

**Debug:**

```bash
# Check Railway metrics
# - CPU usage growing?
# - Memory approaching limit?
# - Too many concurrent connections?

# Solutions:
# 1. Upgrade Railway plan for more resources
# 2. Optimize database queries
# 3. Implement caching with Redis
# 4. Reduce image file sizes
```

### Frontend Issues

#### Issue: Build fails "Out of memory"

**Solution:**

1. Check `vite.config.js` for large includes
2. Split code into smaller chunks
3. Remove unused dependencies
4. Trigger rebuild in Vercel dashboard

#### Issue: Environment variables not loading

**Verify:**

```javascript
// In component
console.log(import.meta.env.VITE_API_URL);

// Should NOT be undefined in production
// If undefined: Check Vercel Variables are set for Production

// For preview deployments:
// Set variables for "Preview" environment
```

#### Issue: CSS/Assets not loading

**Solution:**

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/', // Ensure correct base path
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
```

#### Issue: API calls returning CORS errors

**Backend fix:**

```javascript
// src/server.js
const cors = require('cors');

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);
```

**Verify in Vercel:**

- VITE_API_URL matches backend URL
- Backend CORS settings correct

### Database Issues

#### Issue: "Authentication failed" for MongoDB

**Solution:**

1. Verify username/password in connection string
2. Check MongoDB Atlas allows Railway IP
3. Test connection locally:
   ```bash
   mongosh "mongodb+srv://user:pass@cluster.mongodb.net/db"
   ```

#### Issue: Connection pool exhausted

**Solution:**

```javascript
// mongoose.js config
const options = {
  maxPoolSize: 10,
  minPoolSize: 5,
  serverSelectionTimeoutMS: 5000,
};
mongoose.connect(uri, options);
```

---

## Rollback Procedures

### Backend Rollback (Railway)

#### Via Dashboard:

1. Go to **Deployments**
2. Select previous stable deployment
3. Click **"Redeploy This"**
4. Service automatically switches to previous version

**Time to rollback:** ~1-2 minutes

#### Via CLI:

```bash
# View deployment history
railway logs --service=ecoshore-backend | head -50

# Redeploy previous commit
git revert HEAD
git push origin main

# Railway automatically redeploys based on git commit
```

### Frontend Rollback (Vercel)

#### Via Dashboard:

1. Go to **Deployments**
2. Find stable deployment
3. Click "..." menu
4. Select **"Promote to Production"**

**Time to rollback:** ~30 seconds (instant CDN propagation)

#### Via CLI:

```bash
vercel rollback
# Prompts to select previous deployment
# Confirms before rolling back
```

### Database Rollback

MongoDB Atlas provides point-in-time recovery:

1. Go to **Backup** in MongoDB Atlas
2. Select snapshot before issue
3. Click **"Restore"**
4. Choose restore options:
   - Restore different cluster (safe)
   - Restore to point-in-time

**Important:** Always test recovery procedure!

---

## Deployment Timeline

### First-Time Full Deployment

```
Day 1: Setup
├─ Railway account: 10 min
├─ MongoDB Atlas cluster: 10 min
└─ Gather secrets: 30 min

Day 2: Configuration
├─ Add environment variables: 20 min
├─ Configure domains: 15 min
└─ Verify connectivity: 15 min

Day 3: Deployment
├─ Deploy backend: 5 min
├─ Deploy frontend: 3 min
├─ Run health checks: 10 min
└─ Load testing & verification: 30 min

Total: ~2.5 hours
```

### Ongoing Deployments

```
Code push to main
     ↓ (5 seconds)
GitHub webhook triggers
     ↓ (1 minute)
Backend tests & build
     ↓ (2 minutes)
Deploy to Railway
     ↓ (1 minute)
Deploy to Vercel
     ↓ (1 minute)
Live in production
─────────────────
Total: ~5 minutes
```

---

## Deployment Checklist

### Before Every Deployment

- [ ] All tests pass locally
- [ ] Code reviewed and approved
- [ ] No console errors or warnings
- [ ] Environment variables verified
- [ ] Database migration tested
- [ ] Backup created
- [ ] Team notified
- [ ] Rollback plan prepared

### After Deployment

- [ ] Health endpoints respond 200
- [ ] API connects successfully
- [ ] Frontend loads without errors
- [ ] Authentication works
- [ ] File uploads functional
- [ ] Email notifications send
- [ ] Monitor logs for errors
- [ ] Analytics tracking active
- [ ] Performance metrics normal
- [ ] Document any issues

---

## Support & Communication

### Deployment Communication

**Pre-deployment announcement (1 hour before):**

```
Subject: 🚀 Deploying EcoShore Backend/Frontend

We're deploying version 1.2.0 in ~1 hour.
Expected downtime: None (zero-downtime deployment)
Changes: [List features/fixes]
Questions? Contact: @devops channel
```

**Post-deployment confirmation:**

```
Subject: ✅ Deployment Complete

Version 1.2.0 is now live!
Backend: https://api.ecoshore.com
Frontend: https://ecoshore.com

Monitoring: Normal
```

### Emergency Contacts

Create contact list:

- **DevOps Lead**: [Name, Phone, Email]
- **Database Admin**: [Name, Phone, Email]
- **Frontend Lead**: [Name, Phone, Email]
- **Backend Lead**: [Name, Phone, Email]

---

## References & Resources

### Documentation Links

- [Railway Docs](https://docs.railway.app)
- [Vercel Docs](https://vercel.com/docs)
- [MongoDB Atlas Docs](https://docs.atlas.mongodb.com)
- [Node.js Best Practices](https://nodejs.org/en/docs/guides)

### Useful Commands Reference

```bash
# Backend - Local Testing
npm run dev
npm test
npm run test:coverage

# Backend - Railway Deployment
railway login
railway logs --service=ecoshore-backend
railway variable set KEY value

# Frontend - Local Testing
npm run build
npm run preview
npm run lint

# Frontend - Vercel Deployment
vercel
vercel env add VARIABLE_NAME
vercel logs

# Database - MongoDB
mongosh "mongodb+srv://user:pass@cluster.mongodb.net/db"
```

---

**Last Updated**: April 2024  
**Version**: 1.0.0  
**Maintained By**: EcoShore DevOps Team  
**Classification**: Public-SLIIT

---

## Quick Reference: Environment URLs

| Environment    | Backend URL              | Frontend URL          | Status |
| -------------- | ------------------------ | --------------------- | ------ |
| **Local**      | http://localhost:4000    | http://localhost:3000 | DEV    |
| **Staging**    | TBD                      | TBD                   | TBD    |
| **Production** | https://api.ecoshore.com | https://ecoshore.com  | ✅     |
| **ML Service** | https://ml.ecoshore.com  | -                     | ✅     |
