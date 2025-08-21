const express = require('express');
const router = express.Router();

const Task = require('../models/Task');
const Meeting = require('../models/Meeting');
const Project = require('../models/Project');

const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

/**
 * Helpers
 */
const populateTask = (q) =>
  q
    .populate({
      path: 'project',
      select: 'name students mentor',
      populate: [
        { path: 'students', select: 'fullName avatarUrl email' },
        { path: 'mentor', select: 'fullName avatarUrl email' },
      ],
    })
    .populate('meeting', 'proposedDate status')
    .populate('createdBy', 'fullName avatarUrl')
    .populate('lastUpdatedBy', 'fullName avatarUrl');

const emitToProject = (req, project, event, payload) => {
  if (!project) return;
  const targets = new Set();
  if (project.mentor) targets.add(String(project.mentor._id || project.mentor));
  (project.students || []).forEach((s) => targets.add(String(s._id || s)));
  targets.forEach((uid) => {
    const socketId = req.users?.[uid];
    if (socketId) req.io.to(socketId).emit(event, payload);
  });
};

/**
 * CREATE task (mentor only)
 * Rules:
 * - meeting must exist, belong to this mentor's project
 * - meeting must be accepted AND in the past (tasks created after meeting)
 * - task is project-wide (no per-student assignment)
 */
router.post(
  '/',
  authMiddleware,
  roleMiddleware(['mentor']),
  async (req, res) => {
    try {
      const { meetingId, title, description, dueDate } = req.body || {};
      if (!meetingId || !title) {
        return res.status(400).json({ message: 'meetingId and title are required' });
      }

      const meeting = await Meeting.findById(meetingId).populate('project', 'name students mentor');
      if (!meeting) return res.status(404).json({ message: 'Meeting not found' });

      // Must be this mentor's meeting
      if (String(meeting.mentor) !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized to create tasks for this meeting' });
      }

      // Must be accepted and already held (past)
      const isAccepted = meeting.status === 'accepted';
      const isPast = new Date(meeting.proposedDate).getTime() < Date.now();
      if (!isAccepted || !isPast) {
        return res.status(400).json({ message: 'Tasks can be created only after a held meeting' });
      }

      const task = new Task({
        meeting: meeting._id,
        project: meeting.project._id,
        createdBy: req.user.id,
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        status: 'open',
        lastUpdatedBy: req.user.id,
      });

      await task.save();
      const populated = await populateTask(Task.findById(task._id));

      emitToProject(req, meeting.project, 'taskCreated', populated);
      return res.status(201).json(populated);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      return res.status(500).json({ message: 'Server error', error: err });
    }
  }
);

/**
 * LIST tasks by project (student or mentor from that project)
 */
router.get(
  '/project/:projectId',
  authMiddleware,
  async (req, res) => {
    try {
      const project = await Project.findById(req.params.projectId).populate('students', '_id').populate('mentor', '_id');
      if (!project) return res.status(404).json({ message: 'Project not found' });

      const uid = req.user.id;
      const isMentor = String(project.mentor?._id || project.mentor) === uid;
      const isStudent = (project.students || []).some((s) => String(s._id || s) === uid);
      if (!isMentor && !isStudent) {
        return res.status(403).json({ message: 'Not authorized to view tasks for this project' });
      }

      const tasks = await populateTask(
        Task.find({ project: project._id }).sort({ dueDate: 1, createdAt: -1 })
      );
      return res.json(tasks);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      return res.status(500).json({ message: 'Server error', error: err });
    }
  }
);

/**
 * LIST tasks by meeting (student or mentor in that project)
 */
router.get(
  '/meeting/:meetingId',
  authMiddleware,
  async (req, res) => {
    try {
      const meeting = await Meeting.findById(req.params.meetingId).populate('project', 'students mentor');
      if (!meeting) return res.status(404).json({ message: 'Meeting not found' });

      const uid = req.user.id;
      const isMentor = String(meeting.project.mentor?._id || meeting.project.mentor) === uid;
      const isStudent = (meeting.project.students || []).some((s) => String(s._id || s) === uid);
      if (!isMentor && !isStudent) {
        return res.status(403).json({ message: 'Not authorized to view tasks for this meeting' });
      }

      const tasks = await populateTask(
        Task.find({ meeting: meeting._id }).sort({ dueDate: 1, createdAt: -1 })
      );
      return res.json(tasks);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      return res.status(500).json({ message: 'Server error', error: err });
    }
  }
);

/**
 * COMPLETE task (student or mentor from the project)
 * - Students can mark project-wide tasks complete
 * - Mentor can also mark complete
 * - Lateness snapshot is handled in Task model pre-save
 */
router.put(
  '/:taskId/complete',
  authMiddleware,
  roleMiddleware(['student', 'mentor']),
  async (req, res) => {
    try {
      const task = await Task.findById(req.params.taskId);
      if (!task) return res.status(404).json({ message: 'Task not found' });

      const project = await Project.findById(task.project).populate('students', '_id').populate('mentor', '_id');
      const uid = req.user.id;
      const isMentor = String(project.mentor?._id || project.mentor) === uid;
      const isStudent = (project.students || []).some((s) => String(s._id || s) === uid);
      if (!isMentor && !isStudent) {
        return res.status(403).json({ message: 'Not authorized to complete this task' });
      }

      task.status = 'completed';
      task.lastUpdatedBy = uid;
      await task.save();

      const populated = await populateTask(Task.findById(task._id));
      emitToProject(req, project, 'taskUpdated', populated);
      return res.json(populated);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      return res.status(500).json({ message: 'Server error', error: err });
    }
  }
);

/**
 * REOPEN task (mentor only)
 */
router.put(
  '/:taskId/reopen',
  authMiddleware,
  roleMiddleware(['mentor']),
  async (req, res) => {
    try {
      const task = await Task.findById(req.params.taskId);
      if (!task) return res.status(404).json({ message: 'Task not found' });

      const project = await Project.findById(task.project).populate('students', '_id').populate('mentor', '_id');
      if (String(project.mentor?._id || project.mentor) !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized to reopen this task' });
      }

      task.status = 'open';
      task.completedAt = undefined;
      task.dueDateAtCompletion = undefined;
      task.completedLate = false;
      task.lastUpdatedBy = req.user.id;
      await task.save();

      const populated = await populateTask(Task.findById(task._id));
      emitToProject(req, project, 'taskUpdated', populated);
      return res.json(populated);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      return res.status(500).json({ message: 'Server error', error: err });
    }
  }
);

/**
 * UPDATE task (mentor only) — title/description/dueDate
 * (Project/meeting/createdBy are immutable here)
 */
router.put(
  '/:taskId',
  authMiddleware,
  roleMiddleware(['mentor']),
  async (req, res) => {
    try {
      const { title, description, dueDate } = req.body || {};
      const task = await Task.findById(req.params.taskId);
      if (!task) return res.status(404).json({ message: 'Task not found' });

      const project = await Project.findById(task.project).populate('students', '_id').populate('mentor', '_id');
      if (String(project.mentor?._id || project.mentor) !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized to update this task' });
      }

      if (title != null) task.title = String(title);
      if (description != null) task.description = String(description);
      if (dueDate !== undefined) task.dueDate = dueDate ? new Date(dueDate) : undefined;

      task.lastUpdatedBy = req.user.id;
      await task.save();

      const populated = await populateTask(Task.findById(task._id));
      emitToProject(req, project, 'taskUpdated', populated);
      return res.json(populated);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      return res.status(500).json({ message: 'Server error', error: err });
    }
  }
);

/**
 * DELETE task (mentor only)
 */
router.delete(
  '/:taskId',
  authMiddleware,
  roleMiddleware(['mentor']),
  async (req, res) => {
    try {
      const task = await Task.findById(req.params.taskId);
      if (!task) return res.status(404).json({ message: 'Task not found' });

      const project = await Project.findById(task.project).populate('students', '_id').populate('mentor', '_id');
      if (String(project.mentor?._id || project.mentor) !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized to delete this task' });
      }

      await task.deleteOne();

      // We can emit a separate deletion event, or reuse 'taskUpdated' with a flag.
      emitToProject(req, project, 'taskDeleted', { _id: String(task._id) });
      return res.json({ success: true });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      return res.status(500).json({ message: 'Server error', error: err });
    }
  }
);

module.exports = router;
