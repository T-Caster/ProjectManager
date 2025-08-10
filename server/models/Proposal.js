const mongoose = require('mongoose');

const ProposalSchema = new mongoose.Schema(
  {
    // 1) Project basic info
    projectName: { type: String, required: true, trim: true }, // Project name is essential even for a draft
    background: { type: String, trim: true },
    objectives: { type: String, trim: true },
    marketReview: { type: String, trim: true },
    newOrImproved: { type: String, trim: true },

    // 2) Student details (author snapshots so drafts/submissions remain stable)
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    authorSnapshot: {
      fullName: { type: String, trim: true },
      idNumber: { type: String, trim: true },
      address: { type: String, trim: true },
      mobilePhone: { type: String, trim: true },     // validate xxx-xxxxxx in service layer
      endOfStudies: { type: Date },
    },

    // 3) Optional co-student (only one; projects enforce max 2 students)
    coStudent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    coStudentSnapshot: {
      fullName: { type: String, trim: true },
      idNumber: { type: String, trim: true },
    },

    // 4) Mentor suggestion (optional) - A simple reference to an existing mentor
    suggestedMentor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // 5) Attachments (proposal PDF, etc.)
    attachments: [
      {
        fileId: { type: String, required: true, trim: true }, // your file store key
        kind: { type: String, enum: ['proposal_pdf', 'other'], default: 'proposal_pdf' },
        filename: { type: String, trim: true },
        mime: { type: String, trim: true },
        size: { type: Number }, // enforce <= 4MB in service layer
      },
    ],

    // Status & lifecycle
    status: {
      type: String,
      enum: ['Draft', 'Pending', 'Approved', 'Rejected'],
      default: 'Draft',
      index: true,
    },
    submittedAt: { type: Date },
    reviewedAt: { type: Date },
    approval: {
      approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // HOD
      decision: { type: String, enum: ['Approved', 'Rejected'] },
      reason: { type: String, trim: true },
    },

    // Bookkeeping for cleanup: when this got auto-rejected due to conflict
    conflictCleanup: {
      triggeredByProposalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Proposal' },
      triggeredAt: { type: Date },
    },
  },
  { timestamps: true }
);

/**
 * Helpful indexes:
 * - Fast queries for “pending proposals involving user X”
 */
ProposalSchema.index(
  { status: 1, author: 1 }
);
ProposalSchema.index(
  { status: 1, coStudent: 1 }
);

// Optional: prevent the author from having TWO Pending proposals at once (partial unique index)
ProposalSchema.index(
  { author: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'Pending' } }
);
// Optional: also block coStudent from appearing in >1 Pending proposal (if you want strictness)
ProposalSchema.index(
  { coStudent: 1, status: 1 },
  { unique: true, sparse: true, partialFilterExpression: { status: 'Pending' } }
);

module.exports = mongoose.model('Proposal', ProposalSchema);