const User = require('../models/User');

module.exports = (io, socket, users) => {
  // This handler is now mostly empty as mentor requests are handled via proposals.
  // HODs receive proposal notifications directly from the proposal router.
  // You can add other HOD-specific real-time logic here in the future.
};