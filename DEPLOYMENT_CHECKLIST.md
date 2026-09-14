# Production Deployment Checklist

## 🚀 Pre-Deployment

### Security
- [ ] Change `JWT_SECRET` to a strong random string
- [ ] Update database credentials
- [ ] Remove default passwords from `.env` files
- [ ] Enable HTTPS/TLS (Let's Encrypt recommended)
- [ ] Configure proper CORS origins
- [ ] Review and tighten firewall rules
- [ ] Set up rate limiting (express-rate-limit)
- [ ] Enable helmet.js security headers
- [ ] Audit npm dependencies for vulnerabilities

### Environment Variables
- [ ] Create production `.env` files (do not commit)
- [ ] Set `NODE_ENV=production`
- [ ] Configure production database URL
- [ ] Set production API URL in frontend
- [ ] Configure cloud service credentials (for Module 2+)
- [ ] Set up secrets manager (AWS Secrets Manager, Vault, etc.)

### Database
- [ ] Create production database
- [ ] Set up database backups
- [ ] Configure connection pooling
- [ ] Create database indexes
- [ ] Set up monitoring
- [ ] Plan migration strategy

### Build & Test
- [ ] Run `npm run build` successfully
- [ ] Run `npm run type-check` without errors
- [ ] Run `npm run lint` without errors
- [ ] Test all API endpoints
- [ ] Test WebSocket connections
- [ ] Test on mobile devices
- [ ] Load test with expected user count

---

## 🏗️ Infrastructure Setup

### Server Requirements
- [ ] Node.js 18+ installed
- [ ] PostgreSQL 12+ installed
- [ ] Nginx or reverse proxy configured
- [ ] SSL certificates installed
- [ ] Domain name configured
- [ ] Firewall rules configured

### Recommended Specs (for 100 students)
- CPU: 2+ cores
- RAM: 4GB minimum, 8GB recommended
- Storage: 20GB+ SSD
- Network: 100 Mbps+

### Cloud Providers (Choose One)
- [ ] AWS (EC2, RDS, CloudFront)
- [ ] Google Cloud Platform (Compute Engine, Cloud SQL)
- [ ] Azure (Virtual Machines, Azure Database)
- [ ] DigitalOcean (Droplets, Managed Databases)
- [ ] Heroku (easy deployment)

---

## 🔧 Backend Deployment

### Build
```bash
cd apps/backend
npm install --production
npm run build
```

### Environment
```bash
# Create production .env
cp .env.example .env
# Edit with production values
```

### Process Manager (PM2 Recommended)
```bash
npm install -g pm2

# Start application
pm2 start dist/index.js --name live-translation-backend

# Configure auto-restart
pm2 startup
pm2 save

# Monitor
pm2 monit
```

### Alternative: systemd Service
```bash
# Create /etc/systemd/system/live-translation.service
sudo systemctl enable live-translation
sudo systemctl start live-translation
```

---

## 🌐 Frontend Deployment

### Build
```bash
cd apps/frontend
npm install --production
npm run build
```

### Deployment Options

**Option 1: Vercel (Recommended for Next.js)**
```bash
npm install -g vercel
vercel --prod
```

**Option 2: Nginx Static Hosting**
```bash
npm run build
# Copy .next folder to server
# Configure Nginx to serve Next.js
```

**Option 3: Docker**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install --production
RUN npm run build
CMD ["npm", "start"]
```

---

## 🔄 Reverse Proxy (Nginx)

### Sample Nginx Configuration

```nginx
# Frontend
server {
    listen 80;
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Backend API
server {
    listen 80;
    listen 443 ssl;
    server_name api.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;
    }
}
```

---

## 📊 Monitoring & Logging

### Application Monitoring
- [ ] Set up error tracking (Sentry, Rollbar)
- [ ] Configure application metrics (Prometheus, Grafana)
- [ ] Set up uptime monitoring (UptimeRobot, Pingdom)
- [ ] Configure log aggregation (ELK Stack, CloudWatch)

### Database Monitoring
- [ ] Enable slow query logging
- [ ] Set up connection pool monitoring
- [ ] Configure backup monitoring
- [ ] Set up disk space alerts

### Alerts
- [ ] High CPU usage
- [ ] High memory usage
- [ ] Database connection errors
- [ ] API response time degradation
- [ ] WebSocket connection failures

---

## 🔐 Security Hardening

### Application Level
```javascript
// Add to backend/src/index.ts
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

app.use(helmet());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

### Database
- [ ] Use connection pooling
- [ ] Enable SSL for database connections
- [ ] Restrict database access to application server only
- [ ] Regular security patches

### Server
- [ ] Disable root SSH login
- [ ] Use SSH keys instead of passwords
- [ ] Configure firewall (UFW, iptables)
- [ ] Keep OS updated
- [ ] Install fail2ban

---

## 🔄 CI/CD Pipeline

### GitHub Actions Example

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Build
        run: npm run build
      
      - name: Run tests
        run: npm run test
      
      - name: Deploy to server
        run: |
          # Your deployment script
```

---

## 📦 Backup Strategy

### Database Backups
```bash
# Daily automated backup
0 2 * * * pg_dump -U postgres live_translation > /backups/db_$(date +\%Y\%m\%d).sql

# Keep 30 days of backups
find /backups -name "db_*.sql" -mtime +30 -delete
```

### Application Backups
- [ ] Back up `.env` files (securely)
- [ ] Back up uploaded files (if any)
- [ ] Back up logs (rotate and archive)
- [ ] Version control all code

---

## 🧪 Post-Deployment Testing

### Health Checks
```bash
# API health
curl https://api.yourdomain.com/api/health

# Frontend
curl https://yourdomain.com

# WebSocket
# Use browser console to test Socket.IO connection
```

### Load Testing
```bash
# Using Apache Bench
ab -n 1000 -c 10 https://api.yourdomain.com/api/health

# Using k6
k6 run loadtest.js
```

### Smoke Tests
- [ ] Register new organizer
- [ ] Create session
- [ ] Join as student
- [ ] Test WebSocket events
- [ ] Test on mobile device
- [ ] Test with slow connection

---

## 📈 Scaling Considerations

### Horizontal Scaling (Module 6)
- [ ] Set up Redis for session management
- [ ] Configure load balancer
- [ ] Implement sticky sessions
- [ ] Database read replicas
- [ ] CDN for static assets

### Vertical Scaling
- [ ] Increase server resources
- [ ] Optimize database queries
- [ ] Enable database caching
- [ ] Optimize WebSocket connections

---

## 🆘 Rollback Plan

### Preparation
- [ ] Document current version
- [ ] Keep previous version artifacts
- [ ] Test rollback procedure

### Rollback Steps
```bash
# 1. Stop current version
pm2 stop live-translation-backend

# 2. Restore previous version
cp -r /opt/app-backup /opt/app

# 3. Restore database (if needed)
psql -U postgres live_translation < /backups/db_backup.sql

# 4. Start previous version
pm2 start live-translation-backend

# 5. Verify
curl http://localhost:3001/api/health
```

---

## ✅ Go-Live Checklist

- [ ] All security items completed
- [ ] SSL certificates installed
- [ ] Database backups configured
- [ ] Monitoring set up
- [ ] Logs configured
- [ ] Error tracking active
- [ ] Load testing passed
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Team notified
- [ ] Rollback plan ready
- [ ] Support team briefed

---

## 📞 Post-Launch

### First 24 Hours
- [ ] Monitor error rates
- [ ] Check server resources
- [ ] Review logs
- [ ] Monitor user feedback
- [ ] Check database performance
- [ ] Verify backups running

### First Week
- [ ] Analyze usage patterns
- [ ] Optimize based on real data
- [ ] Address any issues
- [ ] Gather user feedback
- [ ] Plan improvements

---

## 📝 Maintenance

### Daily
- [ ] Check error logs
- [ ] Monitor uptime
- [ ] Review metrics

### Weekly
- [ ] Review backup integrity
- [ ] Check disk space
- [ ] Review performance metrics
- [ ] Security updates

### Monthly
- [ ] Review access logs
- [ ] Database optimization
- [ ] Dependency updates
- [ ] Performance review

---

## 🎯 Success Metrics

Track these KPIs:
- Uptime percentage (target: 99.9%)
- Average response time (target: <200ms)
- WebSocket latency (target: <100ms)
- Error rate (target: <0.1%)
- Concurrent users supported
- Session creation time
- Student join time

---

## 📚 Additional Resources

- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [PM2 Documentation](https://pm2.keymetrics.io/)
- [PostgreSQL Performance](https://www.postgresql.org/docs/current/performance-tips.html)
- [Socket.IO Production](https://socket.io/docs/v4/using-multiple-nodes/)
- [Nginx Configuration](https://nginx.org/en/docs/)

---

**Note:** This checklist covers Module 1 deployment. Additional considerations will be needed when implementing Modules 2-7 (STT, Translation, TTS, etc.)
