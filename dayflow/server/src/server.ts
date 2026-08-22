import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

import authRoutes from './routes/authRoutes';
import employeeRoutes from './routes/employeeRoutes';
import attendanceRoutes from './routes/attendanceRoutes';
import leaveRoutes from './routes/leaveRoutes';
import payrollRoutes from './routes/payrollRoutes';
import notificationRoutes from './routes/notificationRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import announcementRoutes from './routes/announcementRoutes';
import { errorHandler, notFound } from './middleware/errorHandler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));

// CORS configuration (Render compatible)
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    
    const allowed = [
      process.env.CLIENT_URL,
      'http://localhost:5173',
      'http://localhost:5000',
      'http://localhost:3000',
    ].filter(Boolean);

    if (
      allowed.includes(origin) ||
      origin.endsWith('.onrender.com') ||
      origin.endsWith('.vercel.app')
    ) {
      return callback(null, true);
    }

    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Work Suite HRMS API',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/announcements', announcementRoutes);

// Static frontend serving in production (Express 5 compatible)
const clientDistPaths = [
  path.resolve(__dirname, 'public'),
  path.resolve(__dirname, '../public'),
  path.resolve(process.cwd(), 'public'),
  path.resolve(__dirname, '../../client/dist'),
  path.resolve(__dirname, '../client/dist'),
  path.resolve(process.cwd(), '../client/dist'),
  path.resolve(process.cwd(), 'client/dist'),
  path.resolve(process.cwd(), '../../client/dist'),
];

const existingClientDist = clientDistPaths.find((p) => fs.existsSync(p));
if (existingClientDist) {
  console.log(`📁 Serving client static build from: ${existingClientDist}`);
  app.use(express.static(existingClientDist));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/health')) {
      if (path.extname(req.path)) {
        return res.status(404).send('Asset not found');
      }
      return res.sendFile(path.join(existingClientDist, 'index.html'));
    }
    next();
  });
}

// Static frontend serving in production (Express 5 compatible)
const clientDistPaths = [
  path.resolve(__dirname, 'public'),
  path.resolve(__dirname, '../public'),
  path.resolve(process.cwd(), 'public'),
  path.resolve(__dirname, '../../client/dist'),
  path.resolve(__dirname, '../client/dist'),
  path.resolve(process.cwd(), '../client/dist'),
  path.resolve(process.cwd(), 'client/dist'),
  path.resolve(process.cwd(), '../../client/dist'),
];

const existingClientDist = clientDistPaths.find((p) => fs.existsSync(p));
if (existingClientDist) {
  console.log(`📁 Serving client static build from: ${existingClientDist}`);
  app.use(express.static(existingClientDist));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/health')) {
      if (path.extname(req.path)) {
        return res.status(404).send('Asset not found');
      }
      return res.sendFile(path.join(existingClientDist, 'index.html'));
    }
    next();
  });
}

// Error handling
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════╗
  ║       Work Suite HRMS Server          ║
  ║   "Every workday, perfectly aligned." ║
  ╠═══════════════════════════════════════╣
  ║  Status:  Running                     ║
  ║  Port:    ${PORT}                          ║
  ║  Mode:    ${process.env.NODE_ENV || 'development'}               ║
  ╚═══════════════════════════════════════╝
  `);
});

export default app;
