const express = require('express');
const router = express.Router();
const Meeting = require('../models/Meeting');
const Project = require('../models/Project');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

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

      meeting.status = 'accepted';
      await meeting.save();

      // Emit socket update to all attendees + mentor
      const targetUsers = [...new Set([meeting.mentor._id, ...meeting.attendees.map(a => a._id)])];
      targetUsers.forEach(uid => {
        const socketId = req.users?.[uid.toString()];
        if (socketId) req.io.to(socketId).emit('meetingUpdated', meeting);
      });

      res.json(meeting);
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

      meeting.status = 'rejected';
      await meeting.save();

      // Emit socket update to all attendees + mentor
      const targetUsers = [...new Set([meeting.mentor._id, ...meeting.attendees.map(a => a._id)])];
      targetUsers.forEach(uid => {
        const socketId = req.users?.[uid.toString()];
        if (socketId) req.io.to(socketId).emit('meetingUpdated', meeting);
      });

      res.json(meeting);
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