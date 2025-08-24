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

const isValidDate = (d) => d instanceof Date && !isNaN(d.getTime());

router.get(
  '/mine',
  authMiddleware,
  async (req, res) => {
    try {
      const uid = req.user.id;

      // Projects where the user is mentor OR a student
      const projects = await Project.find({
        $or: [{ mentor: uid }, { students: uid }],
      }).select('_id');

      if (!projects.length) return res.json([]);

      const projectIds = projects.map(p => p._id);
      const tasks = await populateTask(
        Task.find({ project: { $in: projectIds } }).sort({ dueDate: 1, createdAt: -1 })
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
 * CREATE task (mentor only)
 * Validation:
 *  - meetingId, title, description, dueDate are required (non-empty)
 *  - dueDate must be in the future
 *  - meeting must exist and belong to this mentor
 *  - meeting must be 'held' (explicitly)
 */
router.post(
  '/',
  authMiddleware,
  roleMiddleware(['mentor']),
  async (req, res) => {
    try {
      let { meetingId, title, description, dueDate } = req.body || {};

      // Normalize inputs
      meetingId = typeof meetingId === 'string' ? meetingId.trim() : '';
      title = typeof title === 'string' ? title.trim() : '';
      description = typeof description === 'string' ? description.trim() : '';
      const due = dueDate ? new Date(dueDate) : null;

      // Basic required checks
      const missing = [];
      if (!meetingId) missing.push('meetingId');
      if (!title) missing.push('title');
      if (!description) missing.push('description');
      if (!dueDate) missing.push('dueDate');

      if (missing.length) {
        return res.status(400).json({
          message: `Missing required field(s): ${missing.join(', ')}`
        });
      }

      // Due date validity & future-only
      if (!isValidDate(due)) {
        return res.status(400).json({ message: 'Invalid dueDate' });
      }
      if (due.getTime() <= Date.now()) {
        return res.status(400).json({ message: 'dueDate must be in the future' });
      }

      // Meeting existence + ownership
      const meeting = await Meeting.findById(meetingId)
        .populate('project', 'name students mentor')
        .populate('mentor', '_id');
      if (!meeting) return res.status(404).json({ message: 'Meeting not found' });

      // Must be this mentor's meeting (meeting.mentor or project.mentor)
      const reqUid = String(req.user.id);
      const meetingMentor = String(meeting.mentor?._id || meeting.mentor || '');
      const projectMentor = String(meeting.project?.mentor?._id || meeting.project?.mentor || '');
      if (reqUid !== meetingMentor && reqUid !== projectMentor) {
        return res.status(403).json({ message: 'Not authorized to create tasks for this meeting' });
      }

      // Must be explicitly held
      if (meeting.status !== 'held') {
        return res.status(400).json({ message: 'Tasks can only be created for meetings with status "held".' });
      }

      const task = new Task({
        meeting: meeting._id,
        project: meeting.project._id,
        createdBy: req.user.id,
        title,
        description,
        dueDate: due,
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
      const project = await Project.findById(req.params.projectId)
        .populate('students', '_id')
        .populate('mentor', '_id');
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
      const meeting = await Meeting.findById(req.params.meetingId)
        .populate('project', 'students mentor');
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
      console.error(err);
      return res.status(500).json({ message: 'Server error', error: err });
    }
  }
);

/**
 * COMPLETE task (student or mentor from the project)
 */
router.put(
  '/:taskId/complete',
  authMiddleware,
  roleMiddleware(['student', 'mentor']),
  async (req, res) => {
    try {
      const task = await Task.findById(req.params.taskId);
      if (!task) return res.status(404).json({ message: 'Task not found' });

      const project = await Project.findById(task.project)
        .populate('students', '_id')
        .populate('mentor', '_id');
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

      const project = await Project.findById(task.project)
        .populate('students', '_id')
        .populate('mentor', '_id');
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
      console.error(err);
      return res.status(500).json({ message: 'Server error', error: err });
    }
  }
);

/**
 * UPDATE task (mentor only) — title/description/dueDate
 * Validation:
 *  - If provided, title/description cannot be empty strings
 *  - If provided, dueDate must be valid AND in the future (cannot be cleared)
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

      const project = await Project.findById(task.project)
        .populate('students', '_id')
        .populate('mentor', '_id');
      if (String(project.mentor?._id || project.mentor) !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized to update this task' });
      }

      if (title != null) {
        const t = String(title).trim();
        if (!t) return res.status(400).json({ message: 'Title cannot be empty' });
        task.title = t;
      }
      if (description != null) {
        const d = String(description).trim();
        if (!d) return res.status(400).json({ message: 'Description cannot be empty' });
        task.description = d;
      }
      if (dueDate !== undefined) {
        if (dueDate === null || dueDate === '') {
          return res.status(400).json({ message: 'dueDate is required' });
        }
        const d = new Date(dueDate);
        if (!isValidDate(d)) return res.status(400).json({ message: 'Invalid dueDate' });
        if (d.getTime() <= Date.now()) {
          return res.status(400).json({ message: 'dueDate must be in the future' });
        }
        task.dueDate = d;
      }

      task.lastUpdatedBy = req.user.id;
      await task.save();

      const populated = await populateTask(Task.findById(task._id));
      emitToProject(req, project, 'taskUpdated', populated);
      return res.json(populated);
    } catch (err) {
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

      const project = await Project.findById(task.project)
        .populate('students', '_id')
        .populate('mentor', '_id');
      if (String(project.mentor?._id || project.mentor) !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized to delete this task' });
      }

      await task.deleteOne();

      emitToProject(req, project, 'taskDeleted', { _id: String(task._id) });
      return res.json({ success: true });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Server error', error: err });
    }
  }
);

module.exports = router;
