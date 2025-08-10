const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const mentorHandler = require('../socketHandlers/mentorHandler');
const hodHandler = require('../socketHandlers/hodHandler');
const proposalHandler = require('../socketHandlers/proposalHandler');

const users = {}; // To map userId to socketId

const socketAuthMiddleware = async (socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error'));
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return next(new Error('Authentication error'));
    }
    socket.user = user;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
};

const initSocket = (server) => {
  const io = socketIo(server, {
    cors: {
      origin: 'http://localhost:5173',
      methods: ['GET', 'POST'],
    },
  });

  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
    console.log('a user connected:', socket.user.fullName);
    users[socket.user.id] = socket.id;

    mentorHandler(io, socket, users);
    hodHandler(io, socket, users);
    proposalHandler(io, socket, users);

    socket.on('disconnect', () => {
      console.log('user disconnected:', socket.user.fullName);
      delete users[socket.user.id];
    });
  });

  return { io, users };
};

module.exports = initSocket;