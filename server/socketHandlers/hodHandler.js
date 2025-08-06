const Request = require('../models/Request');
const User = require('../models/User');

module.exports = (io, socket, users) => {
  socket.on('request:approve', async ({ requestId }) => {
    try {
      const request = await Request.findById(requestId);
      if (!request) return socket.emit('error', { message: 'Request not found' });

      request.status = 'approved';
      await request.save();

      const student = await User.findById(request.student);
      student.mentor = request.mentor;
      await student.save();

      const updatedRequest = await Request.findById(request._id).populate('student', 'fullName').populate('mentor', 'fullName');

      if (users[request.student]) {
        io.to(users[request.student]).emit('status:update', updatedRequest);
      }
      if (users[request.mentor]) {
        io.to(users[request.mentor]).emit('status:update', updatedRequest);
      }
      io.to(socket.id).emit('request:updated', updatedRequest);
    } catch (err) {
      socket.emit('error', { message: 'Failed to approve request' });
    }
  });

  socket.on('request:reject', async ({ requestId }) => {
    try {
      const request = await Request.findById(requestId);
      if (!request) return socket.emit('error', { message: 'Request not found' });

      request.status = 'rejected';
      await request.save();

      const updatedRequest = await Request.findById(request._id).populate('student', 'fullName').populate('mentor', 'fullName');

      if (users[request.student]) {
        io.to(users[request.student]).emit('status:update', updatedRequest);
      }
      io.to(socket.id).emit('request:updated', updatedRequest);
    } catch (err) {
      socket.emit('error', { message: 'Failed to reject request' });
    }
  });
};