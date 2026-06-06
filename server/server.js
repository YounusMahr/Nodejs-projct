import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

// Import Routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import boardRoutes from './routes/boards.js';
import taskRoutes from './routes/tasks.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins for local development simplicity
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  }
});

// Pass Socket.io instance to requests
app.set('io', io);

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/boards', boardRoutes);
app.use('/api/tasks', taskRoutes);

// Socket.io Real-time Board Room logic
io.on('connection', (socket) => {
  // Join a board room
  socket.on('join_board', (boardId) => {
    socket.join(boardId);
    console.log(`Socket ${socket.id} joined board room: ${boardId}`);
  });

  // Leave a board room
  socket.on('leave_board', (boardId) => {
    socket.leave(boardId);
    console.log(`Socket ${socket.id} left board room: ${boardId}`);
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

// Database connection
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/taskmanager';

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB connected successfully');
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Database connection failed:', err.message);
  });
