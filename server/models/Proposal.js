const mongoose = require('mongoose');

const ProposalSchema = new mongoose.Schema(
  {
    // 1) Project basic info
    projectName: { type: String, required: true, trim: true },
    background: { type: String, trim: true },
    objectives: { type: String, trim: true },
    marketReview: { type: String, trim: true },
    newOrImproved: { type: String, trim: true },

    // 2) Author (user reference) and minimal snapshot (no contact fields)
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    authorSnapshot: {
      fullName: { type: String, trim: true },
      idNumber: { type: String, trim: true },
    },

    // 3) Contact fields for this proposal (NOT in user model, NOT snapshotted)
    address: { type: String, trim: true },
    mobilePhone: { type: String, trim: true },
    endOfStudies: { type: Date },

    // 4) Optional co-student
    coStudent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    coStudentSnapshot: {
      fullName: { type: String, trim: true },
      idNumber: { type: String, trim: true },
    },

    // 5) Mentor suggestion (optional)
    suggestedMentor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // 6) Attachments (proposal PDF, etc.)
    attachments: [
      {
        fileId: { type: String, required: true, trim: true },
        kind: { type: String, enum: ['proposal_pdf', 'other'], default: 'proposal_pdf' },
        filename: { type: String, trim: true },
        mime: { type: String, trim: true },
        size: { type: Number },
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

    // Cleanup bookkeeping
    conflictCleanup: {
      triggeredByProposalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Proposal' },
      triggeredAt: { type: Date },
    },
  },
  { timestamps: true }
);

// Helpful indexes
ProposalSchema.index({ status: 1, author: 1 });
ProposalSchema.index({ status: 1, coStudent: 1 });

// Optional: Prevent >1 pending proposal per author
ProposalSchema.index(
  { author: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'Pending' } }
);

// Optional: Prevent >1 pending proposal per co-student
ProposalSchema.index(
  { coStudent: 1, status: 1 },
  { unique: true, sparse: true, partialFilterExpression: { status: 'Pending' } }
);

module.exports = mongoose.model('Proposal', ProposalSchema);
