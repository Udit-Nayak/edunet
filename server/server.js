require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/database');
const { scheduleDraftCleanup } = require('./jobs/draftCleanup');


require('./config/redis');
require('./config/firebase');

const app = express();

connectDB();

scheduleDraftCleanup();

app.use(helmet()); 
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true, 
}));
app.use(morgan('dev')); 
app.use(express.json({ limit: '50mb' })); // Increased for base64 images
app.use(express.urlencoded({ extended: true, limit: '50mb' })); 
app.use(cookieParser()); 

const { trackActivity } = require('./middleware/activityMiddleware');


// Routes
app.use('/api/auth', trackActivity, require('./routes/authRoutes'));
app.use('/api/posts', trackActivity, require('./routes/postRoutes'));
app.use('/api/answers', trackActivity, require('./routes/answerRoutes'));
app.use('/api/comments', trackActivity, require('./routes/commentRoutes'));
app.use('/api/upload', trackActivity, require('./routes/uploadRoutes'));
app.use('/api/notifications', trackActivity, require('./routes/notificationRoutes'));
app.use('/api/search', trackActivity, require('./routes/searchRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));



app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to EduConnect API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      posts: '/api/posts',
      answers: '/api/answers',
      comments: '/api/comments', 
      upload:'/api/upload',
    },
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      error: err 
    }),
  });
});

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log('');
  console.log('='.repeat(50));
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔒 Environment: ${process.env.NODE_ENV}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log('='.repeat(50));
  console.log('');
});

process.on('unhandledRejection', (err) => {
  console.error(`❌ Unhandled Rejection: ${err.message}`);
  server.close(() => process.exit(1));
});