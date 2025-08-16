const Meeting = require('../models/Meeting');

/**
 * This middleware checks for any pending meetings relevant to the request
 * and automatically rejects them if their proposed date has passed.
 * It's designed to be used on GET routes that list meetings.
 */
const updateExpiredMeetingsMiddleware = async (req, res, next) => {
  try {
    const { user, params } = req;
    const now = new Date();

    if (!user) {
      return next();
    }

    // Build the query based on the user's role and available params.
    let query = {
      status: 'pending',
      proposedDate: { $lt: now },
    };

    if (user.role === 'student' && params.projectId) {
      query.project = params.projectId;
    } else if (user.role === 'mentor') {
      // For the /for-mentor/me route, there's no project ID, just the user's ID as mentor.
      query.mentor = user.id;
    } else {
      // If the role/params don't match our specific use cases, do nothing.
      return next();
    }

    await Meeting.updateMany(query, { $set: { status: 'rejected' } });

    next();
  } catch (error) {
    // Log the error but don't fail the request, as this is a background task.
    console.error('Error in updateExpiredMeetingsMiddleware:', error);
    next();
  }
};

module.exports = updateExpiredMeetingsMiddleware;
