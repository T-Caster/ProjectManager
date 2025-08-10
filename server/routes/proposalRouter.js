const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const Proposal = require('../models/Proposal');
const Project = require('../models/Project');
const User = require('../models/User');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const File = require('../models/File');

const pdfUpload = multer({
  dest: path.join(__dirname, '../uploads'),
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files are allowed!'), false);
    }
    cb(null, true);
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// Helper function to check student eligibility
const checkStudentEligibility = async (studentId) => {
  const student = await User.findById(studentId);
  if (!student || student.isInProject) {
    return { eligible: false, message: 'Student is already in a project.' };
  }

  const conflictingProposal = await Proposal.findOne({
    status: 'Pending',
    $or: [{ author: studentId }, { coStudent: studentId }],
  });
  
  if (conflictingProposal) {
    return { eligible: false, message: 'Student is already part of another pending proposal.' };
  }

  return { eligible: true, student };
};

// Upload a proposal PDF
router.post('/upload', authMiddleware, pdfUpload.single('proposalPdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ msg: 'No file uploaded.' });
    }

    const newFile = new File({
      originalName: req.file.originalname,
      uniqueName: req.file.filename,
      path: path.join('uploads', req.file.filename),
      author: req.user.id,
    });

    await newFile.save();

    // We don't link it to a proposal here, we do it when the draft is saved.
    res.status(201).json({
      msg: 'File uploaded successfully',
      file: {
        _id: newFile._id,
        originalName: newFile.originalName,
        // The URL will be constructed on the client side
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

// Create or update a proposal draft
router.post('/draft', authMiddleware, roleMiddleware(['student']), async (req, res) => {
  try {
    const student = await User.findById(req.user.id);
    if (!student) {
      return res.status(404).json({ msg: 'User not found' });
    }
    if (student.isInProject) {
      return res.status(400).json({ msg: 'You are already in a project and cannot create a new proposal.' });
    }

    const { proposalId, ...proposalData } = req.body;

    const authorSnapshot = {
      fullName: student.fullName,
      idNumber: student.idNumber,
      address: student.address,
      mobilePhone: student.mobilePhone,
      endOfStudies: student.endOfStudies,
    };

    // Mongoose will cast an empty string to an ObjectId and fail.
    // We need to remove the fields if they are empty.
    if (!proposalData.coStudent) delete proposalData.coStudent;
    if (!proposalData.suggestedMentor) delete proposalData.suggestedMentor;
    if (proposalData.attachmentId) {
      const file = await File.findById(proposalData.attachmentId);
      if (!file || file.author.toString() !== req.user.id) {
        return res.status(400).json({ msg: 'Invalid attachment ID.' });
      }
      // Use the attachmentId from the request to populate the attachments array
      proposalData.attachments = [{
        fileId: file._id,
        filename: file.originalName,
        kind: 'proposal_pdf',
      }];
    } else {
      proposalData.attachments = [];
    }

    let proposal;
    if (proposalId) {
      proposal = await Proposal.findOneAndUpdate(
        { _id: proposalId, author: req.user.id, status: 'Draft' },
        { ...proposalData, authorSnapshot, status: 'Draft' },
        { new: true, runValidators: true }
      );
      if (!proposal) {
        return res.status(404).json({ msg: 'Draft not found or permission denied.' });
      }
    } else {
      const newProposalData = {
        ...proposalData,
        author: req.user.id,
      };
      if (!newProposalData.coStudent) delete newProposalData.coStudent;
      if (!newProposalData.suggestedMentor) delete newProposalData.suggestedMentor;
      proposal = new Proposal({
        ...newProposalData,
        authorSnapshot,
        status: 'Draft',
      });
      await proposal.save();
    }

    res.status(201).json(proposal);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

// Submit a proposal
router.put('/:id/submit', authMiddleware, roleMiddleware(['student']), async (req, res) => {
  try {
    const authorEligibility = await checkStudentEligibility(req.user.id);
    if (!authorEligibility.eligible) {
      return res.status(400).json({ msg: `You are not eligible to submit a proposal: ${authorEligibility.message}` });
    }

    const proposal = await Proposal.findOne({ _id: req.params.id, author: req.user.id });
    if (!proposal) {
      return res.status(404).json({ msg: 'Proposal not found' });
    }
    if (proposal.status !== 'Draft' && proposal.status !== 'Rejected') {
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

    proposal.status = 'Pending';
    proposal.submittedAt = new Date();
    await proposal.save();
    
    // Notify HODs
    const hods = await User.find({ role: 'hod' });
    hods.forEach(hod => {
      const hodSocketId = Object.keys(req.io.sockets.sockets).find(key => req.io.sockets.sockets[key].user.id === hod._id.toString());
      if (hodSocketId) {
        req.io.to(hodSocketId).emit('new_pending_proposal', proposal);
      }
    });

    res.json(proposal);
  } catch (error) {
    console.error(error);
    if (error.code === 11000) {
      return res.status(400).json({ msg: 'You already have a proposal pending review.' });
    }
    res.status(500).send('Server Error');
  }
});

// Get eligible co-students
router.get('/eligible-co-students', authMiddleware, async (req, res) => {
  try {
    const allStudents = await User.find({ role: 'student' }).select('fullName idNumber isInProject');
    const pendingProposals = await Proposal.find({ status: 'Pending' }).select('author coStudent');
    
    const ineligibleIds = new Set();
    allStudents.forEach(s => {
      if (s.isInProject) ineligibleIds.add(s._id.toString());
    });
    pendingProposals.forEach(p => {
      ineligibleIds.add(p.author.toString());
      if (p.coStudent) ineligibleIds.add(p.coStudent.toString());
    });

    const eligibleStudents = allStudents.filter(s => !ineligibleIds.has(s._id.toString()));

    res.json(eligibleStudents);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

// Get all proposals for the logged-in student
router.get('/my', authMiddleware, roleMiddleware(['student']), async (req, res) => {
  try {
    const proposals = await Proposal.find({ author: req.user.id }).sort({ createdAt: -1 });
    res.json(proposals);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

// Get all pending proposals (for HOD)
router.get('/queue', authMiddleware, roleMiddleware(['hod']), async (req, res) => {
  try {
    const proposals = await Proposal.find({ status: 'Pending' })
      .populate('author', 'fullName')
      .populate('coStudent', 'fullName')
      .populate('suggestedMentor', 'fullName')
      .sort({ submittedAt: 1 });
    res.json(proposals);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

// Get a file (secure download)
router.get('/file/:fileId', authMiddleware, async (req, res) => {
  try {
    const file = await File.findById(req.params.fileId);
    if (!file) {
      return res.status(404).json({ msg: 'File not found.' });
    }

    const proposal = await Proposal.findOne({ 'attachments.fileId': file._id });
    if (!proposal) {
      return res.status(404).json({ msg: 'Associated proposal not found.' });
    }

    const user = await User.findById(req.user.id);
    const isAuthor = proposal.author.toString() === user._id.toString();
    const isCoStudent = proposal.coStudent && proposal.coStudent.toString() === user._id.toString();
    const isMentor = user.role === 'mentor'; // Simplified for now
    const isHod = user.role === 'hod';

    if (!isAuthor && !isCoStudent && !isMentor && !isHod) {
      return res.status(403).json({ msg: 'You are not authorized to view this file.' });
    }

    const filePath = path.join(__dirname, '..', file.path);
    res.download(filePath, file.originalName);

  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

// Get a single proposal by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const proposal = await Proposal.findById(req.params.id)
      .populate('author', 'fullName email idNumber')
      .populate('coStudent', 'fullName email idNumber')
      .populate('suggestedMentor', 'fullName email');

    if (!proposal) {
      return res.status(404).json({ msg: 'Proposal not found' });
    }

    if (proposal.author.toString() !== req.user.id && req.user.role !== 'hod') {
      return res.status(403).json({ msg: 'User not authorized' });
    }

    res.json(proposal);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

// Reject a proposal (HOD only)
router.put('/:id/reject', authMiddleware, roleMiddleware(['hod']), async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) {
      return res.status(400).json({ msg: 'Rejection reason is required' });
    }

    const proposal = await Proposal.findById(req.params.id);
    if (!proposal) {
      return res.status(404).json({ msg: 'Proposal not found' });
    }
    if (proposal.status !== 'Pending') {
      return res.status(400).json({ msg: 'Can only reject a pending proposal' });
    }

    proposal.status = 'Rejected';
    proposal.approval = {
      approvedBy: req.user.id,
      decision: 'Rejected',
      reason: reason,
    };
    proposal.reviewedAt = new Date();
    
    await proposal.save();

    // Notify student
    const studentSocketId = Object.keys(req.io.sockets.sockets).find(key => req.io.sockets.sockets[key].user.id === proposal.author.toString());
    if (studentSocketId) {
      req.io.to(studentSocketId).emit('proposal_rejected', proposal);
    }

    res.json(proposal);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

// Approve a proposal (HOD only)
router.put('/:id/approve', authMiddleware, roleMiddleware(['hod']), async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { mentorId } = req.body;
    const proposal = await Proposal.findById(req.params.id).session(session);

    if (!proposal) throw new Error('Proposal not found');
    if (proposal.status !== 'Pending') throw new Error('Can only approve a pending proposal');

    const finalMentorId = mentorId || proposal.suggestedMentor;
    if (!finalMentorId) throw new Error('Mentor must be assigned before approval');

    const newProject = new Project({
      name: proposal.projectName,
      description: `${proposal.background}\n\n**Objectives:**\n${proposal.objectives}`,
      students: [proposal.author, ...(proposal.coStudent ? [proposal.coStudent] : [])],
      mentor: finalMentorId,
      proposal: proposal._id,
      snapshots: {
        studentNames: [proposal.authorSnapshot.fullName, ...(proposal.coStudentSnapshot ? [proposal.coStudentSnapshot.fullName] : [])],
        mentorName: (await User.findById(finalMentorId).select('fullName').lean()).fullName,
        approvedAt: new Date(),
        hodReviewer: req.user.id,
      }
    });
    const savedProject = await newProject.save({ session });

    proposal.status = 'Approved';
    proposal.approval = { approvedBy: req.user.id, decision: 'Approved' };
    proposal.reviewedAt = new Date();
    await proposal.save({ session });

    const studentIds = [proposal.author, ...(proposal.coStudent ? [proposal.coStudent] : [])];
    await User.updateMany(
      { _id: { $in: studentIds } },
      { $set: { isInProject: true, project: savedProject._id, mentor: finalMentorId } },
      { session }
    );

    const conflictingProposals = await Proposal.find({
      _id: { $ne: proposal._id },
      status: 'Pending',
      $or: [{ author: { $in: studentIds } }, { coStudent: { $in: studentIds } }]
    }).session(session);

    for (const p of conflictingProposals) {
      p.status = 'Rejected';
      p.conflictCleanup = { triggeredByProposalId: proposal._id, triggeredAt: new Date() };
      p.approval = { decision: 'Rejected', reason: 'A conflicting project proposal was approved.' };
      await p.save({ session });
      
      // Notify student about the conflicting rejection
      const studentSocketId = Object.keys(req.io.sockets.sockets).find(key => req.io.sockets.sockets[key].user.id === p.author.toString());
      if (studentSocketId) {
        req.io.to(studentSocketId).emit('proposal_rejected', p);
      }
    }

    await session.commitTransaction();
    
    // Notify the approved students
    studentIds.forEach(studentId => {
      const studentSocketId = Object.keys(req.io.sockets.sockets).find(key => req.io.sockets.sockets[key].user.id === studentId.toString());
      if (studentSocketId) {
        req.io.to(studentSocketId).emit('proposal_approved', savedProject);
      }
    });

    // Notify all clients to update their eligible co-student lists
    req.io.emit('co_student_list_updated');

    // Notify the assigned mentor
    const mentorSocketId = Object.keys(req.io.sockets.sockets).find(key => req.io.sockets.sockets[key].user.id === finalMentorId.toString());
    if (mentorSocketId) {
      req.io.to(mentorSocketId).emit('new_student_assigned', savedProject);
    }

    res.json({ msg: 'Proposal approved and project created successfully', project: savedProject });

  } catch (error) {
    await session.abortTransaction();
    console.error(error);
    res.status(500).json({ msg: 'Server Error', error: error.message });
  } finally {
    session.endSession();
  }
});

module.exports = router;