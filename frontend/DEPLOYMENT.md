# Vercel Deployment Guide

This frontend is configured to be deployed on Vercel with the backend hosted on Render.

## Backend Configuration
- Backend URL: https://csis3784-project-backend-1.onrender.com/
- WebSocket URL: wss://csis3784-project-backend-1.onrender.com

## Deployment Steps

1. **Connect to Vercel:**
   - Visit [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Select the `frontend` folder as the root directory

2. **Build Settings:**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

3. **Environment Variables (if needed):**
   - Add any additional environment variables in Vercel dashboard
   - The production environment will automatically use the backend URL

4. **Deploy:**
   - Vercel will automatically build and deploy your application
   - The app will be available at your Vercel subdomain

## Files Added for Vercel Deployment

- `vercel.json` - Vercel configuration
- `.vercelignore` - Files to exclude from deployment
- Updated `vite.config.js` with production optimizations
- Updated `WebSocketContext.jsx` with correct Render backend URL

## Notes

- The WebSocket connection will automatically use the correct protocol (wss:// for production)
- The app is configured for SPA routing with fallback to index.html
- Build artifacts are optimized for production with code splitting