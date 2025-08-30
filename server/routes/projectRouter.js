const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Project = require("../models/Project");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const projectPopulateOptions = [
  { path: "students", select: "fullName avatarUrl" },
  { path: "mentor", select: "fullName avatarUrl" },
  { path: "proposal" },
];

// Get projects based on user role
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { id } = req.user;
    const user = await User.findById(id);
    let projects;

    if (user.role === "hod") {
      projects = await Project.find().populate(projectPopulateOptions);
    } else if (user.role === "mentor") {
      projects = await Project.find({ mentor: id }).populate(projectPopulateOptions);
    } else if (user.role === "student") {
      projects = await Project.find({ students: id }).populate(projectPopulateOptions);
    } else {
      return res.status(403).json({ message: "You are not authorized to view projects." });
    }
    res.json(projects);
  } catch (error) {
    console.error(500)
    res.status(500).json({ message: "Server error", error });
  }
});

// Get a single project by ID
router.get("/:projectId", authMiddleware, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId).populate(projectPopulateOptions);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

// Update project status
router.put("/:projectId/status", authMiddleware, roleMiddleware(["mentor"]), async (req, res) => {
  try {
    const { status } = req.body;
    const project = await Project.findById(req.params.projectId);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (project.mentor.toString() !== req.user.id) {
      return res.status(403).json({ message: "You are not authorized to update this project's status." });
    }

    project.status = status;
    await project.save();

    const populatedProject = await Project.findById(project._id).populate(projectPopulateOptions);

    const { io, users } = req;
    const studentIds = populatedProject.students.map(student => student._id.toString());
    const mentorId = populatedProject.mentor._id.toString();

    const userIds = [...studentIds, mentorId];

    userIds.forEach(userId => {
      if (users[userId]) {
        io.to(users[userId]).emit('project:updated', populatedProject);
      }
    });

    res.json(populatedProject);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

module.exports = router;
