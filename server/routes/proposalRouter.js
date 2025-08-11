const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const Proposal = require("../models/Proposal");
const Project = require("../models/Project");
const User = require("../models/User");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const File = require("../models/File");

const pdfUpload = multer({
  dest: path.join(__dirname, "../uploads"),
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Only PDF files are allowed!"), false);
    }
    cb(null, true);
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

// ------- helpers to target recipients over socket.io -------
const getAllSockets = async (io) => (io ? io.fetchSockets() : []);

// Emits to all HODs
const emitToHods = async (io) => {
  if (!io) return;
  const sockets = await getAllSockets(io);
  sockets
    .filter((s) => s.user && s.user.role === "hod")
    .forEach((s) => s.emit("updateProposals"));
};

// Emits to a list of specific user IDs
const emitToUsers = async (io, userIds) => {
  if (!io || !userIds || userIds.length === 0) return;
  const sockets = await getAllSockets(io);
  const userSet = new Set(userIds.map(id => id.toString()));
  sockets
    .filter((s) => s.user && userSet.has(s.user.id.toString()))
    .forEach((s) => s.emit("updateProposals"));
};

// Helper: student eligibility
const checkStudentEligibility = async (studentId) => {
  const student = await User.findById(studentId);
  if (!student || student.isInProject) {
    return { eligible: false, message: "Student is already in a project." };
  }
  const conflictingProposal = await Proposal.findOne({
    status: "Pending",
    $or: [{ author: studentId }, { coStudent: studentId }],
  });
  if (conflictingProposal) {
    return { eligible: false, message: "Student is already part of another pending proposal." };
  }
  return { eligible: true, student };
};

// Upload a proposal PDF
router.post("/upload", authMiddleware, pdfUpload.single("proposalPdf"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ msg: "No file uploaded." });

    const newFile = new File({
      originalName: req.file.originalname,
      uniqueName: req.file.filename,
      path: path.join("uploads", req.file.filename),
      author: req.user.id,
    });

    await newFile.save();

    res.status(201).json({
      msg: "File uploaded successfully",
      file: { _id: newFile._id, originalName: newFile.originalName },
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
});

/**
 * Create or update a proposal draft.
 * Body can include:
 * - proposalId (for update)
 * - projectName, background, objectives, marketReview, newOrImproved
 * - address, mobilePhone, endOfStudies      <-- stored on Proposal (not on User)
 * - coStudent, suggestedMentor
 * - removeCoStudent: true  (explicitly clear coStudent)
 * - removeSuggestedMentor: true  (explicitly clear suggestedMentor)
 * - attachmentId (to set/replace attachment)
 * - removeAttachment: true (to clear attachments)
 */
router.post("/draft", authMiddleware, roleMiddleware(["student"]), async (req, res) => {
  try {
    const student = await User.findById(req.user.id);
    if (!student) return res.status(404).json({ msg: "User not found" });
    if (student.isInProject) {
      return res.status(400).json({ msg: "You are already in a project and cannot create a new proposal." });
    }

    const { proposalId, attachmentId, removeAttachment, removeCoStudent, removeSuggestedMentor, endOfStudies, ...proposalData } = req.body;

    if (endOfStudies) {
      const d = new Date(endOfStudies);
      if (!isNaN(d.getTime())) proposalData.endOfStudies = d;
    }

    let shouldUnsetCoStudent = false;
    let shouldUnsetSuggestedMentor = false;

    if (proposalData.coStudent === "" || proposalData.coStudent === null) {
      shouldUnsetCoStudent = true;
      delete proposalData.coStudent;
    }
    if (proposalData.suggestedMentor === "" || proposalData.suggestedMentor === null) {
      shouldUnsetSuggestedMentor = true;
      delete proposalData.suggestedMentor;
    }

    if (removeCoStudent === true) shouldUnsetCoStudent = true;
    if (removeSuggestedMentor === true) shouldUnsetSuggestedMentor = true;

    if (proposalData.coStudent && !mongoose.Types.ObjectId.isValid(proposalData.coStudent)) {
      return res.status(400).json({ msg: "Invalid co-student ID." });
    }
    if (proposalData.suggestedMentor && !mongoose.Types.ObjectId.isValid(proposalData.suggestedMentor)) {
      return res.status(400).json({ msg: "Invalid mentor ID." });
    }

    let nextAttachments;
    if (attachmentId) {
      if (!mongoose.Types.ObjectId.isValid(attachmentId)) {
        return res.status(400).json({ msg: "Invalid attachment ID format." });
      }
      const file = await File.findById(attachmentId);
      if (!file || file.author.toString() !== req.user.id) {
        return res.status(400).json({ msg: "Invalid attachment ID." });
      }
      nextAttachments = [{ fileId: file._id.toString(), filename: file.originalName, kind: "proposal_pdf" }];
    } else if (removeAttachment === true) {
      nextAttachments = [];
    }

    const authorSnapshot = {
      fullName: student.fullName,
      idNumber: student.idNumber,
    };

    let proposal;
    if (proposalId) {
      const filter = { _id: proposalId, author: req.user.id, status: { $in: ["Draft", "Rejected"] } };
      const update = { ...proposalData, authorSnapshot, status: "Draft" };
      if (nextAttachments !== undefined) update.attachments = nextAttachments;

      const unset = {};
      if (shouldUnsetCoStudent) unset.coStudent = "";
      if (shouldUnsetSuggestedMentor) unset.suggestedMentor = "";
      if (Object.keys(unset).length) update.$unset = unset;

      proposal = await Proposal.findOneAndUpdate(filter, update, { new: true, runValidators: true });
      if (!proposal) return res.status(404).json({ msg: "Draft not found or permission denied." });
    } else {
      const newProposalData = { ...proposalData, author: req.user.id, authorSnapshot, status: "Draft" };
      if (shouldUnsetCoStudent) delete newProposalData.coStudent;
      if (shouldUnsetSuggestedMentor) delete newProposalData.suggestedMentor;
      if (nextAttachments !== undefined) newProposalData.attachments = nextAttachments;

      proposal = new Proposal(newProposalData);
      await proposal.save();
    }

    res.status(201).json(proposal);
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
});

// Submit a proposal
router.put("/:id/submit", authMiddleware, roleMiddleware(["student"]), async (req, res) => {
  try {
    const authorEligibility = await checkStudentEligibility(req.user.id);
    if (!authorEligibility.eligible) {
      return res.status(400).json({ msg: `You are not eligible to submit a proposal: ${authorEligibility.message}` });
    }

    const proposal = await Proposal.findOne({ _id: req.params.id, author: req.user.id });
    if (!proposal) return res.status(404).json({ msg: "Proposal not found" });

    if (!["Draft", "Rejected"].includes(proposal.status)) {
      return res.status(400).json({ msg: `Cannot submit proposal with status: ${proposal.status}` });
    }

    if (proposal.coStudent) {
      const coStudentEligibility = await checkStudentEligibility(proposal.coStudent);
      if (!coStudentEligibility.eligible) {
        return res.status(400).json({ msg: `Co-student is not eligible: ${coStudentEligibility.message}` });
      }
      proposal.coStudentSnapshot = {
        fullName: coStudentEligibility.student.fullName,
        idNumber: coStudentEligibility.student.idNumber,
      };
    }

    proposal.status = "Pending";
    proposal.submittedAt = new Date();
    await proposal.save();

    // 🔧 NEW: hydrate the payload before emitting so the queue sees mentor name immediately
    let payload = await Proposal.findById(proposal._id)
      .populate("suggestedMentor", "fullName")
      .select("projectName status submittedAt authorSnapshot coStudentSnapshot suggestedMentor attachments createdAt updatedAt")
      .lean();

    if (req.io) {
      await emitToHods(req.io);
      const studentIds = [proposal.author, proposal.coStudent].filter(Boolean);
      await emitToUsers(req.io, studentIds);
    }

    // You can still return the saved doc to the student; not required to be populated
    res.json(proposal);
  } catch (error) {
    console.error(error);
    if (error.code === 11000) {
      return res.status(400).json({ msg: "You already have a proposal pending review." });
    }
    res.status(500).send("Server Error");
  }
});

// Get eligible co-students
router.get("/eligible-co-students", authMiddleware, async (req, res) => {
  try {
    const allStudents = await User.find({ role: "student" }).select("fullName idNumber isInProject");
    const pendingProposals = await Proposal.find({ status: "Pending" }).select("author coStudent");

    const ineligibleIds = new Set();
    allStudents.forEach((s) => {
      if (s.isInProject) ineligibleIds.add(s._id.toString());
    });
    pendingProposals.forEach((p) => {
      ineligibleIds.add(p.author.toString());
      if (p.coStudent) ineligibleIds.add(p.coStudent.toString());
    });

    const eligibleStudents = allStudents.filter((s) => !ineligibleIds.has(s._id.toString()));
    res.json(eligibleStudents);
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
});

// Get all proposals for the logged-in student
router.get("/my", authMiddleware, roleMiddleware(["student"]), async (req, res) => {
  try {
    const proposals = await Proposal.find({
      $or: [
        // 1) Any proposal authored by this user (regardless of status)
        { author: req.user.id },

        // 2) Proposals where this user is the co-student,
        //    but only if status is Pending or Approved
        { coStudent: req.user.id, status: { $in: ["Pending", "Approved"] } },
      ],
    }).sort({ createdAt: -1 });
    res.json(proposals);
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
});

// Get all pending proposals (for HOD)
router.get("/queue", authMiddleware, roleMiddleware(["hod"]), async (req, res) => {
  try {
    const proposals = await Proposal.find({ status: "Pending" })
      .populate("author", "fullName")
      .populate("coStudent", "fullName")
      .populate("suggestedMentor", "fullName")
      .sort({ submittedAt: 1 });
    res.json(proposals);
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
});

// Secure file download
router.get("/file/:fileId", authMiddleware, async (req, res) => {
  try {
    const file = await File.findById(req.params.fileId);
    if (!file) return res.status(404).json({ msg: "File not found." });

    const user = await User.findById(req.user.id);

    const isUploader = file.author.toString() === user._id.toString();
    if (isUploader) {
      const filePath = path.join(__dirname, "..", file.path);
      return res.download(filePath, file.originalName);
    }

    const proposal = await Proposal.findOne({ "attachments.fileId": file._id.toString() });
    if (!proposal) return res.status(404).json({ msg: "Associated proposal not found." });

    const isAuthor = proposal.author.toString() === user._id.toString();
    const isCoStudent = proposal.coStudent && proposal.coStudent.toString() === user._id.toString();
    const isMentor = user.role === "mentor";
    const isHod = user.role === "hod";

    if (!isAuthor && !isCoStudent && !isMentor && !isHod) {
      return res.status(403).json({ msg: "You are not authorized to view this file." });
    }

    const filePath = path.join(__dirname, "..", file.path);
    res.download(filePath, file.originalName);
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
});

// Get a single proposal by ID
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const proposal = await Proposal.findById(req.params.id)
      .populate("author", "fullName email idNumber")
      .populate("coStudent", "fullName email idNumber")
      .populate("suggestedMentor", "fullName email");

    if (!proposal) return res.status(404).json({ msg: "Proposal not found" });

    const user = await User.findById(req.user.id);
    const isHod = user.role === "hod";
    const isAuthor = proposal.author.toString() === req.user.id;
    const isCoStudent = proposal.coStudent && proposal.coStudent.toString() === req.user.id;

    // Co-student can view only when the proposal is Pending or Approved
    const coStudentCanView = isCoStudent && ["Pending", "Approved"].includes(proposal.status);

    if (!isHod && !isAuthor && !coStudentCanView) {
      return res.status(403).json({ msg: "User not authorized" });
    }

    res.json(proposal);
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
});

// Reject a proposal (HOD only)
router.put("/:id/reject", authMiddleware, roleMiddleware(["hod"]), async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ msg: "Rejection reason is required" });

    const proposal = await Proposal.findById(req.params.id);
    if (!proposal) return res.status(404).json({ msg: "Proposal not found" });
    if (proposal.status !== "Pending") {
      return res.status(400).json({ msg: "Can only reject a pending proposal" });
    }

    proposal.status = "Rejected";
    proposal.approval = { approvedBy: req.user.id, decision: "Rejected", reason };
    proposal.reviewedAt = new Date();
    await proposal.save();

    if (req.io) {
      await emitToHods(req.io);
      const studentIds = [proposal.author, proposal.coStudent].filter(Boolean);
      await emitToUsers(req.io, studentIds);
    }

    res.json(proposal);
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
});

// Approve a proposal (HOD only) — no transactions, simple sequential writes
router.put("/:id/approve", authMiddleware, roleMiddleware(["hod"]), async (req, res) => {
  try {
    const { mentorId } = req.body;

    // 1) Load proposal
    const proposal = await Proposal.findById(req.params.id);
    if (!proposal) return res.status(404).json({ msg: "Proposal not found" });
    if (proposal.status !== "Pending") {
      return res.status(400).json({ msg: "Can only approve a pending proposal" });
    }

    // 2) Resolve final mentor
    const finalMentorId = mentorId || proposal.suggestedMentor;
    if (!finalMentorId) {
      return res.status(400).json({ msg: "Mentor must be assigned before approval" });
    }
    const mentorUser = await User.findById(finalMentorId).select("fullName").lean();

    // 3) Create Project from proposal
    const newProject = new Project({
      name: proposal.projectName,
      description: `**Background:**\n${proposal.background}\n\n**Objectives:**\n${proposal.objectives}`,
      students: [proposal.author, ...(proposal.coStudent ? [proposal.coStudent] : [])],
      mentor: finalMentorId,
      proposal: proposal._id,
      snapshots: {
        studentNames: [proposal.authorSnapshot?.fullName || "", ...(proposal.coStudentSnapshot ? [proposal.coStudentSnapshot.fullName] : [])],
        mentorName: mentorUser?.fullName || "",
        approvedAt: new Date(),
        hodReviewer: req.user.id,
      },
    });
    const savedProject = await newProject.save();

    // 4) Mark proposal as approved
    proposal.status = "Approved";
    proposal.approval = { approvedBy: req.user.id, decision: "Approved" };
    proposal.reviewedAt = new Date();
    await proposal.save();

    // 5) Update involved students
    const studentIds = [proposal.author, ...(proposal.coStudent ? [proposal.coStudent] : [])];
    await User.updateMany({ _id: { $in: studentIds } }, { $set: { isInProject: true, project: savedProject._id, mentor: finalMentorId } });

    // 6) Reject conflicting pending proposals for those students
    const conflictingProposals = await Proposal.find({
      _id: { $ne: proposal._id },
      status: "Pending",
      $or: [{ author: { $in: studentIds } }, { coStudent: { $in: studentIds } }],
    });

    for (const p of conflictingProposals) {
      p.status = "Rejected";
      p.conflictCleanup = { triggeredByProposalId: proposal._id, triggeredAt: new Date() };
      p.approval = { decision: "Rejected", reason: "A conflicting project proposal was approved." };
      await p.save();

      // Notify HODs & affected students about conflicting rejections
      // Notify HODs & affected students about conflicting rejections
      if (req.io) {
        await emitToHods(req.io);
        const studentIds = [p.author, p.coStudent].filter(Boolean);
        await emitToUsers(req.io, studentIds);
      }
    }

    // 7) Emit success notifications
    // 7) Emit success notifications
    if (req.io) {
      await emitToHods(req.io);
      await emitToUsers(req.io, studentIds);
    }

    // 8) Done
    return res.json({
      msg: "Proposal approved and project created successfully",
      project: savedProject,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: "Server Error", error: error.message });
  }
});

module.exports = router;
