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

/**
 * --------- Socket helpers (aligned with meetings/tasks style) ---------
 * We emit by userId using req.users[userId] -> socketId mapping.
 * Event name remains "updateProposals" to keep the client wiring intact.
 */

// Emit "updateProposals" to a list of userIds (strings/ObjectIds ok)
const emitToUserIds = (req, userIds) => {
  if (!req?.io || !req?.users || !Array.isArray(userIds) || userIds.length === 0) return;
  const unique = [...new Set(userIds.map((id) => id?.toString()).filter(Boolean))];
  unique.forEach((uid) => {
    const sid = req.users[uid];
    if (sid) req.io.to(sid).emit("updateProposals");
  });
};

// Emit "updateProposals" to all HODs by looking up their userIds
const emitToHods = async (req) => {
  if (!req?.io || !req?.users) return;
  const hods = await User.find({ role: "hod" }).select("_id").lean();
  const ids = hods.map((h) => h._id);
  emitToUserIds(req, ids);
};

// Convenience wrapper for students (author + optional coStudent)
const emitToProposalStudents = async (req, proposal) => {
  const studentIds = [proposal.author, proposal.coStudent].filter(Boolean);
  emitToUserIds(req, studentIds);
};

/**
 * Helper: student eligibility (unchanged)
 */
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

// ---------- Routes (logic unchanged) ----------

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
 */
router.post("/draft", authMiddleware, roleMiddleware(["student"]), async (req, res) => {
  try {
    const student = await User.findById(req.user.id);
    if (!student) return res.status(404).json({ msg: "User not found" });
    if (student.isInProject) {
      return res.status(400).json({ msg: "You are already in a project and cannot create a new proposal." });
    }

    const {
      proposalId,
      attachmentId,
      removeAttachment,
      removeCoStudent,
      removeSuggestedMentor,
      endOfStudies,
      address,
      mobilePhone, // ignored
      ...proposalData
    } = req.body;

    proposalData.address = typeof address === "string" ? address.trim() : (address ?? "");
    proposalData.mobilePhone = (student.phoneNumber || "").trim();

    if (endOfStudies) {
      const d = new Date(endOfStudies);
      if (!isNaN(d.getTime())) proposalData.endOfStudies = d;
      else delete proposalData.endOfStudies;
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

    return res.status(201).json(proposal);
  } catch (error) {
    console.error(error);
    return res.status(500).send("Server Error");
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

    // (Hydrated payload kept as-is; clients listen to "updateProposals" to refresh)
    await Proposal.findById(proposal._id)
      .populate("suggestedMentor", "fullName")
      .select("projectName status submittedAt authorSnapshot coStudentSnapshot suggestedMentor attachments createdAt updatedAt")
      .lean();

    // Socket: notify HODs + involved students using req.users map
    await emitToHods(req);
    await emitToProposalStudents(req, proposal);

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
        { author: req.user.id },
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

    // Notify HODs + involved students via req.users map
    await emitToHods(req);
    await emitToProposalStudents(req, proposal);

    res.json(proposal);
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
});

// Approve a proposal (HOD only)
router.put("/:id/approve", authMiddleware, roleMiddleware(["hod"]), async (req, res) => {
  try {
    const { mentorId } = req.body;

    const proposal = await Proposal.findById(req.params.id);
    if (!proposal) return res.status(404).json({ msg: "Proposal not found" });
    if (proposal.status !== "Pending") {
      return res.status(400).json({ msg: "Can only approve a pending proposal" });
    }

    const finalMentorId = mentorId || proposal.suggestedMentor;
    if (!finalMentorId) {
      return res.status(400).json({ msg: "Mentor must be assigned before approval" });
    }
    const mentorUser = await User.findById(finalMentorId).select("fullName").lean();

    const newProject = new Project({
      name: proposal.projectName,
      background: proposal.background || "",
      objectives: proposal.objectives || "",
      students: [proposal.author, ...(proposal.coStudent ? [proposal.coStudent] : [])],
      mentor: finalMentorId,
      proposal: proposal._id,
      snapshots: {
        studentNames: [
          proposal.authorSnapshot?.fullName || "",
          ...(proposal.coStudentSnapshot ? [proposal.coStudentSnapshot.fullName] : []),
        ],
        mentorName: mentorUser?.fullName || "",
        approvedAt: new Date(),
        hodReviewer: req.user.id,
      },
    });
    const savedProject = await newProject.save();

    proposal.status = "Approved";
    proposal.approval = { approvedBy: req.user.id, decision: "Approved" };
    proposal.reviewedAt = new Date();
    await proposal.save();

    const studentIds = [proposal.author, ...(proposal.coStudent ? [proposal.coStudent] : [])];
    await User.updateMany(
      { _id: { $in: studentIds } },
      { $set: { isInProject: true, project: savedProject._id, mentor: finalMentorId } }
    );

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

      await emitToHods(req);
      const affected = [p.author, p.coStudent].filter(Boolean);
      emitToUserIds(req, affected);
    }

    await emitToHods(req);
    emitToUserIds(req, studentIds);

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
