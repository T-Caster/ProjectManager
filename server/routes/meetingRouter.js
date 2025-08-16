const express = require('express');
const router = express.Router();
const Meeting = require('../models/Meeting');
const Project = require('../models/Project');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const updateExpiredMeetingsMiddleware = require('../middleware/updateExpiredMeetingsMiddleware');

// Propose a meeting
router.post(
  '/propose',
  authMiddleware,
  roleMiddleware(['student']),
  async (req, res) => {
    try {
      const { projectId, proposedDate } = req.body;
      const proposerId = req.user.id;

      const project = await Project.findById(projectId).populate('students').populate('mentor');
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }

      if (!project.mentor) {
        return res.status(400).json({ message: 'Project does not have a mentor' });
      }

      const proposedDateTime = new Date(proposedDate);
      const proposedHour = proposedDateTime.getHours();

      if (proposedHour < 8 || proposedHour >= 17) {
        return res.status(400).json({ message: 'Meetings can only be scheduled between 8:00 and 17:00' });
      }

      const thirtyMinutes = 30 * 60 * 1000;
      const mentorMeetings = await Meeting.find({ mentor: project.mentor._id });

      const conflictingMeeting = mentorMeetings.find(meeting => {
        const existingMeetingTime = new Date(meeting.proposedDate).getTime();
        const proposedTime = proposedDateTime.getTime();
        return Math.abs(existingMeetingTime - proposedTime) < thirtyMinutes;
      });

      if (conflictingMeeting) {
        return res.status(400).json({ message: 'Mentor is unavailable at this time.' });
      }

      const attendees = [...project.students, project.mentor];

      const meeting = new Meeting({
        project: projectId,
        proposer: proposerId,
        mentor: project.mentor,
        proposedDate,
        attendees,
      });

      await meeting.save();

      const populatedMeeting = await Meeting.findById(meeting._id).populate('proposer', 'fullName').populate('attendees', 'fullName').populate('mentor', 'fullName');

      attendees.forEach(attendee => {
        const socketId = req.users[attendee._id.toString()];
        if (socketId) {
          req.io.to(socketId).emit('newMeeting', populatedMeeting);
        }
      });

      res.status(201).json(populatedMeeting);
    } catch (error) {
      res.status(500).json({ message: 'Server error', error });
    }
  }
);

// Get meetings for a project
router.get(
  '/:projectId',
  authMiddleware,
  updateExpiredMeetingsMiddleware,
  async (req, res) => {
    try {
      const meetings = await Meeting.find({ project: req.params.projectId }).populate('proposer', 'fullName').populate('attendees', 'fullName').populate('mentor', 'fullName');
      res.json(meetings);
    } catch (error) {
      res.status(500).json({ message: 'Server error', error });
    }
  }
);

// Mentor approves a meeting
router.put(
  '/:meetingId/approve',
  authMiddleware,
  roleMiddleware(['mentor']),
  async (req, res) => {
    try {
      const meeting = await Meeting.findById(req.params.meetingId)
        .populate('proposer', 'fullName avatarUrl')
        .populate('attendees', 'fullName avatarUrl')
        .populate('mentor', 'fullName avatarUrl')
        .populate('project', 'name');

      if (!meeting) return res.status(404).json({ message: 'Meeting not found' });
      if (meeting.mentor._id.toString() !== req.user.id) {
        return res.status(403).json({ message: 'You are not authorized to approve this meeting' });
      }
      // Can only approve if a student was the last proposer
      if (meeting.proposer._id.toString() === meeting.mentor._id.toString()) {
        return res.status(403).json({ message: 'You cannot approve a meeting you proposed.' });
      }

      meeting.status = 'accepted';
      meeting.lastRescheduleReason = null; // Clear reason on approval
      await meeting.save();

      // Re-fetch to ensure we have the fully populated object for emit
      const populatedMeeting = await Meeting.findById(meeting._id)
        .populate('proposer', 'fullName avatarUrl')
        .populate('attendees', 'fullName avatarUrl')
        .populate('mentor', 'fullName avatarUrl')
        .populate('project', 'name');

      // Emit socket update to all attendees + mentor
      const targetUsers = [...new Set([populatedMeeting.mentor._id, ...populatedMeeting.attendees.map(a => a._id)])];
      targetUsers.forEach(uid => {
        const socketId = req.users?.[uid.toString()];
        if (socketId) req.io.to(socketId).emit('meetingUpdated', populatedMeeting);
      });

      res.json(populatedMeeting);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error', error });
    }
  }
);

// Mentor declines a meeting
router.put(
  '/:meetingId/decline',
  authMiddleware,
  roleMiddleware(['mentor']),
  async (req, res) => {
    try {
      const meeting = await Meeting.findById(req.params.meetingId)
        .populate('proposer', 'fullName avatarUrl')
        .populate('attendees', 'fullName avatarUrl')
        .populate('mentor', 'fullName avatarUrl')
        .populate('project', 'name');

      if (!meeting) return res.status(404).json({ message: 'Meeting not found' });
      if (meeting.mentor._id.toString() !== req.user.id) {
        return res.status(403).json({ message: 'You are not authorized to decline this meeting' });
      }
      // Can only decline if a student was the last proposer
      if (meeting.proposer._id.toString() === meeting.mentor._id.toString()) {
        return res.status(403).json({ message: 'You cannot decline a meeting you proposed.' });
      }

      meeting.status = 'rejected';
      meeting.lastRescheduleReason = null; // Clear reason on decline
      await meeting.save();

      // Re-fetch to ensure we have the fully populated object for emit
      const populatedMeeting = await Meeting.findById(meeting._id)
        .populate('proposer', 'fullName avatarUrl')
        .populate('attendees', 'fullName avatarUrl')
        .populate('mentor', 'fullName avatarUrl')
        .populate('project', 'name');

      // Emit socket update to all attendees + mentor
      const targetUsers = [...new Set([populatedMeeting.mentor._id, ...populatedMeeting.attendees.map(a => a._id)])];
      targetUsers.forEach(uid => {
        const socketId = req.users?.[uid.toString()];
        if (socketId) req.io.to(socketId).emit('meetingUpdated', populatedMeeting);
      });

      res.json(populatedMeeting);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error', error });
    }
  }
);

// Reschedule a meeting (mentor or student)
router.put(
  '/:meetingId/reschedule',
  authMiddleware,
  async (req, res) => {
    try {
      const { proposedDate, reason } = req.body;
      const meetingId = req.params.meetingId;
      const currentUserId = req.user.id;

      if (!proposedDate) {
        return res.status(400).json({ message: 'A new date must be proposed.' });
      }

      const meeting = await Meeting.findById(meetingId).populate('attendees');
      if (!meeting) {
        return res.status(404).json({ message: 'Meeting not found' });
      }

      // Validate status and date before allowing reschedule
      if (meeting.status === 'rejected' || new Date(meeting.proposedDate) < new Date()) {
        return res.status(403).json({ message: 'Cannot reschedule a rejected or past meeting.' });
      }

      // Authorization: must be mentor or an attendee (student)
      const isMentor = meeting.mentor.toString() === currentUserId;
      const isAttendee = meeting.attendees.some(a => a._id.toString() === currentUserId);
      if (!isMentor && !isAttendee) {
        return res.status(403).json({ message: 'You are not authorized to reschedule this meeting.' });
      }

      // Validation
      const proposedDateTime = new Date(proposedDate);
      if (proposedDateTime.getTime() <= Date.now()) {
        return res.status(400).json({ message: 'Meeting must be in the future.' });
      }
      const proposedHour = proposedDateTime.getHours();
      if (proposedHour < 8 || proposedHour >= 17) {
        return res.status(400).json({ message: 'Meetings can only be scheduled between 8:00 and 17:00' });
      }

      // Mentor availability check (30-min buffer)
      const thirtyMinutes = 30 * 60 * 1000;
      const mentorMeetings = await Meeting.find({
        mentor: meeting.mentor,
        _id: { $ne: meetingId }, // Exclude the current meeting
        status: 'accepted',
      });

      const conflictingMeeting = mentorMeetings.find(m => {
        const existingMeetingTime = new Date(m.proposedDate).getTime();
        return Math.abs(existingMeetingTime - proposedDateTime.getTime()) < thirtyMinutes;
      });

      if (conflictingMeeting) {
        return res.status(400).json({ message: 'Mentor is unavailable at this time due to a conflict.' });
      }

      // Update meeting
      meeting.proposedDate = proposedDateTime;
      meeting.status = 'pending';
      meeting.proposer = currentUserId;
      meeting.lastRescheduleReason = reason || '';
      await meeting.save();

      const populatedMeeting = await Meeting.findById(meetingId)
        .populate('proposer', 'fullName avatarUrl')
        .populate('attendees', 'fullName avatarUrl')
        .populate('mentor', 'fullName avatarUrl')
        .populate('project', 'name');

      // Emit socket update to all participants
      const targetUsers = [...new Set([populatedMeeting.mentor._id, ...populatedMeeting.attendees.map(a => a._id)])];
      targetUsers.forEach(uid => {
        const socketId = req.users?.[uid.toString()];
        if (socketId) req.io.to(socketId).emit('meetingUpdated', populatedMeeting);
      });

      res.json(populatedMeeting);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error', error });
    }
  }
);

// Student approves a meeting
router.put(
  '/:meetingId/student-approve',
  authMiddleware,
  roleMiddleware(['student']),
  async (req, res) => {
    try {
      const meeting = await Meeting.findById(req.params.meetingId)
        .populate('proposer', 'fullName avatarUrl')
        .populate('attendees', 'fullName avatarUrl')
        .populate('mentor', 'fullName avatarUrl')
        .populate('project', 'name');

      if (!meeting) return res.status(404).json({ message: 'Meeting not found' });

      // Authorize: user must be an attendee
      const isAttendee = meeting.attendees.some(a => a._id.toString() === req.user.id);
      if (!isAttendee) {
        return res.status(403).json({ message: 'You are not an attendee of this meeting.' });
      }

      // Can only approve if mentor was the last proposer
      if (meeting.proposer._id.toString() !== meeting.mentor._id.toString()) {
        return res.status(403).json({ message: 'You cannot approve a meeting you or another student proposed.' });
      }

      meeting.status = 'accepted';
      meeting.lastRescheduleReason = null; // Clear reason on approval
      await meeting.save();

      // Re-fetch to ensure we have the fully populated object for emit
      const populatedMeeting = await Meeting.findById(meeting._id)
        .populate('proposer', 'fullName avatarUrl')
        .populate('attendees', 'fullName avatarUrl')
        .populate('mentor', 'fullName avatarUrl')
        .populate('project', 'name');

      const targetUsers = [...new Set([populatedMeeting.mentor._id, ...populatedMeeting.attendees.map(a => a._id)])];
      targetUsers.forEach(uid => {
        const socketId = req.users?.[uid.toString()];
        if (socketId) req.io.to(socketId).emit('meetingUpdated', populatedMeeting);
      });

      res.json(populatedMeeting);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error', error });
    }
  }
);

// Student declines a meeting
router.put(
  '/:meetingId/student-decline',
  authMiddleware,
  roleMiddleware(['student']),
  async (req, res) => {
    try {
      const meeting = await Meeting.findById(req.params.meetingId)
        .populate('proposer', 'fullName avatarUrl')
        .populate('attendees', 'fullName avatarUrl')
        .populate('mentor', 'fullName avatarUrl')
        .populate('project', 'name');

      if (!meeting) return res.status(404).json({ message: 'Meeting not found' });

      // Authorize: user must be an attendee
      const isAttendee = meeting.attendees.some(a => a._id.toString() === req.user.id);
      if (!isAttendee) {
        return res.status(403).json({ message: 'You are not an attendee of this meeting.' });
      }

      // Can only decline if mentor was the last proposer
      if (meeting.proposer._id.toString() !== meeting.mentor._id.toString()) {
        return res.status(403).json({ message: 'You cannot decline a meeting you or another student proposed.' });
      }

      meeting.status = 'rejected';
      meeting.lastRescheduleReason = null; // Clear reason on decline
      await meeting.save();

      // Re-fetch to ensure we have the fully populated object for emit
      const populatedMeeting = await Meeting.findById(meeting._id)
        .populate('proposer', 'fullName avatarUrl')
        .populate('attendees', 'fullName avatarUrl')
        .populate('mentor', 'fullName avatarUrl')
        .populate('project', 'name');

      const targetUsers = [...new Set([populatedMeeting.mentor._id, ...populatedMeeting.attendees.map(a => a._id)])];
      targetUsers.forEach(uid => {
        const socketId = req.users?.[uid.toString()];
        if (socketId) req.io.to(socketId).emit('meetingUpdated', populatedMeeting);
      });

      res.json(populatedMeeting);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error', error });
    }
  }
);

// Mentor: list my meetings
router.get(
  '/for-mentor/me',
  authMiddleware,
  roleMiddleware(['mentor']),
  updateExpiredMeetingsMiddleware,
  async (req, res) => {
    try {
      const meetings = await Meeting.find({ mentor: req.user.id })
        .populate('proposer', 'fullName avatarUrl')
        .populate('attendees', 'fullName avatarUrl')
        .populate('mentor', 'fullName avatarUrl')
        .populate('project', 'name');
      res.json(meetings);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error', error });
    }
  }
);

module.exports = router;