const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const initSocket = require('./services/socketManager');
const authRoutes = require('./routes/authRouter');
const mentorRoutes = require('./routes/mentorRouter');
const hodRoutes = require('./routes/hodRouter');
const proposalRoutes = require('./routes/proposalRouter');
const path = require('path');

dotenv.config();

const app = express();
const server = http.createServer(app);
const { io, users } = initSocket(server);

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  req.io = io;
  req.users = users;
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/mentors', mentorRoutes);
app.use('/api/hod', hodRoutes);
app.use('/api/proposals', proposalRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => console.error(err));
