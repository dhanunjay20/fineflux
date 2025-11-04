# 🚀 Production Deployment Guide

## Prerequisites Checklist

### ✅ Environment Setup
- [ ] Copy `.env.example` to `.env`
- [ ] Update all environment variables with production values
- [ ] Verify API endpoints are accessible
- [ ] Verify Cloudinary credentials are correct
- [ ] Ensure `.env` is in `.gitignore` (✓ Already configured)

### ✅ Code Quality
- [ ] All TypeScript errors resolved (run `npm run type-check`)
- [ ] No console.log statements in production code (✓ Using logger)
- [ ] API configuration centralized (✓ Using API_CONFIG)
- [ ] All hardcoded URLs removed (✓ Completed)

### ✅ Security
- [ ] Environment variables not committed to repository
- [ ] API keys secured in environment variables
- [ ] CORS configured on backend
- [ ] Authentication tokens handled securely
- [ ] Rate limiting configured on API

---

## Build Process

### Development Build
```bash
npm run build:dev
```
- Enables debug logging
- Source maps included
- Development optimizations

### Production Build
```bash
npm run build:production
```
- Debug logging disabled (logger.debug, logger.warn suppressed)
- Only error logs in production
- Minified and optimized
- Source maps excluded (configure in vite.config.ts if needed)

### Type Check (Before Build)
```bash
npm run type-check
```
Run this before building to catch TypeScript errors.

---

## Environment Variables

### Required Variables
Create a `.env` file in the project root with:

```env
# API Configuration
VITE_API_BASE_URL=https://your-production-api.com
VITE_API_LOGIN_URL=https://your-production-api.com/api/auth/login

# Cloudinary Configuration
VITE_CLOUDINARY_UPLOAD_URL=https://api.cloudinary.com/v1_1/YOUR_CLOUD_NAME/auto/upload
VITE_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
VITE_CLOUDINARY_PROFILE_UPLOAD_PRESET=your_profile_preset
```

### Environment-Specific Files
- `.env` - Local development (git-ignored)
- `.env.example` - Template for documentation (committed)
- `.env.production` - Production overrides (git-ignored)
- `.env.local` - Local overrides (git-ignored)

---

## Deployment Platforms

### Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to production
vercel --prod

# Set environment variables in Vercel dashboard
```

### Netlify
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Build and deploy
npm run build:production
netlify deploy --prod --dir=dist

# Set environment variables in Netlify dashboard
```

### Docker
```dockerfile
# Dockerfile example
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build:production

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### AWS S3 + CloudFront
```bash
# Build
npm run build:production

# Deploy to S3
aws s3 sync dist/ s3://your-bucket-name --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

---

## Pre-Deployment Checklist

### 1. Code Quality
```bash
# Type check
npm run type-check

# Lint check
npm run lint

# Build test
npm run build:production
```

### 2. Performance
- [ ] Bundle size optimized (check dist/ folder)
- [ ] Lazy loading implemented for routes
- [ ] Images optimized (using Cloudinary)
- [ ] API calls optimized (proper caching)

### 3. Security
- [ ] Authentication working correctly
- [ ] Protected routes implemented (✓ Using ProtectedRoute)
- [ ] API keys not exposed in client code
- [ ] HTTPS enforced on production domain

### 4. Functionality
- [ ] All features tested
- [ ] Login/logout working
- [ ] Dashboard data loading correctly
- [ ] Forms submitting successfully
- [ ] File uploads working (Cloudinary)
- [ ] Error handling working properly

### 5. Browser Compatibility
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile browsers (iOS Safari, Chrome Mobile)

---

## Post-Deployment

### Monitoring
- [ ] Set up error monitoring (Sentry, LogRocket, etc.)
- [ ] Configure analytics (Google Analytics, Mixpanel, etc.)
- [ ] Set up uptime monitoring (UptimeRobot, Pingdom, etc.)
- [ ] Monitor API performance

### Logging
- Production logs only show errors (logger.error)
- Development logs show all levels (logger.debug, logger.warn, logger.error)
- Configure external logging service if needed

### Rollback Plan
1. Keep previous deployment/build artifacts
2. Document rollback procedure for your platform
3. Test rollback process in staging

---

## Troubleshooting

### Build Fails
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json dist
npm install
npm run build:production
```

### Environment Variables Not Working
- Ensure variables start with `VITE_` prefix
- Restart dev server after changing `.env`
- Check `import.meta.env.VITE_VARIABLE_NAME` syntax

### API Calls Failing
- Verify `VITE_API_BASE_URL` is correct
- Check CORS configuration on backend
- Verify authentication tokens are being sent
- Check network tab in browser DevTools

### White Screen After Deployment
- Check browser console for errors
- Verify all assets loaded correctly
- Check if base path is configured correctly
- Verify environment variables are set on hosting platform

---

## Architecture Overview

### Code Organization
```
src/
├── components/       # Reusable UI components
├── contexts/         # React contexts (Auth, etc.)
├── hooks/            # Custom React hooks
├── lib/             # Utilities (api-config, logger, utils)
├── pages/           # Page components
└── main.tsx         # Application entry point
```

### Key Infrastructure Files
- **api-config.ts**: Centralized API configuration
- **logger.ts**: Conditional logging system (dev vs prod)
- **useOrgContext.ts**: Organization/employee context hook
- **AuthContext.tsx**: Authentication state management

### Request Flow
```
User Action → Component → API Call (using API_CONFIG) → 
Backend → Response → State Update → UI Update
```

---

## Performance Optimization

### Already Implemented
- ✅ API configuration centralized
- ✅ Conditional logging (no debug logs in production)
- ✅ TypeScript for type safety
- ✅ React SWC for faster builds
- ✅ Vite for optimized bundling

### Recommended
- [ ] Implement React Query for better data fetching
- [ ] Add service worker for offline support
- [ ] Implement code splitting for large pages
- [ ] Use React.memo for expensive components
- [ ] Add loading skeletons for better UX

---

## Security Best Practices

### ✅ Already Implemented
- Environment variables for sensitive data
- Protected routes with authentication
- Secure token storage (localStorage with proper checks)
- Input validation on forms

### Recommended
- [ ] Implement Content Security Policy (CSP)
- [ ] Add rate limiting on authentication endpoints
- [ ] Implement proper session timeout
- [ ] Add CSRF protection if using cookies
- [ ] Regular dependency updates (`npm audit`)

---

## Support & Maintenance

### Regular Tasks
- **Weekly**: Check error logs
- **Monthly**: Update dependencies
- **Quarterly**: Security audit
- **As needed**: Performance monitoring

### Useful Commands
```bash
# Check for outdated packages
npm outdated

# Update dependencies
npm update

# Security audit
npm audit

# Fix vulnerabilities
npm audit fix
```

---

## 📝 Documentation

- [PRODUCTION_READY_UPGRADE.md](./PRODUCTION_READY_UPGRADE.md) - Code quality improvements
- [RESPONSIVE_IMPROVEMENTS_SUMMARY.md](./RESPONSIVE_IMPROVEMENTS_SUMMARY.md) - UI responsiveness
- [README.md](./README.md) - Project overview

---

## Contact

For issues or questions:
1. Check the troubleshooting section above
2. Review error logs in browser console
3. Check network requests in DevTools
4. Verify environment variables are set correctly

---

**Last Updated**: November 2025  
**Version**: 1.0.0
