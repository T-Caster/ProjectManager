const User = require('../models/User');

module.exports = (io, socket, users) => {
  // The 'new_student_assigned' event is deprecated.
  // The client will now refetch proposals on the 'updateProposals' event.
};