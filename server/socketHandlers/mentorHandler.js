const User = require('../models/User');

module.exports = (io, socket, users) => {
  // Listen for when a HOD assigns this mentor to a new project
  socket.on('new_student_assigned', (project) => {
    // In a real application, you might trigger a push notification or an email here.
    // For now, we'll just log it and maybe emit an event back to the mentor's client.
    console.log(`Mentor ${socket.user.fullName} has been assigned a new project: ${project.name}`);
    socket.emit('notification', {
      title: 'New Project Assignment',
      message: `You have been assigned as the mentor for the project: "${project.name}".`,
    });
  });
};