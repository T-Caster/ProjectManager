const Request = require('../models/Request');
const User = require('../models/User');

module.exports = (io, socket, users) => {
  socket.on('mentor:request', async ({ mentorId }) => {
    try {
      const studentId = socket.user.id;
      const existingRequest = await Request.findOne({ student: studentId, status: { $ne: 'rejected' } });
      if (existingRequest) {
        return socket.emit('error', { message: 'You already have a pending or approved request' });
      }
      const request = new Request({ student: studentId, mentor: mentorId });
      await request.save();
      const newRequest = await Request.findById(request._id).populate('student', 'fullName').populate('mentor', 'fullName');

      const hods = await User.find({ role: 'hod' });
      hods.forEach(hod => {
        if (users[hod._id]) {
          io.to(users[hod._id]).emit('request:new', newRequest);
        }
      });
      socket.emit('request:sent', newRequest);
    } catch (err) {
      socket.emit('error', { message: 'Failed to send request' });
    }
  });
};