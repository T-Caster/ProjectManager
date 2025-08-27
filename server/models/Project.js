const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    background: { type: String, required: true, trim: true },
    objectives: { type: String, required: true, trim: true },

    status: {
      type: String,
      enum: ['proposal', 'specification', 'code', 'presentation', 'done'],
      default: 'proposal',
    },

    // Exactly 1–2 students
    students: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
      validate: {
        validator: v => Array.isArray(v) && v.length >= 1 && v.length <= 2,
        message: 'Project must have 1–2 students',
      },
      index: true,
    },

    mentor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },

    // Keep a strong link to the approved proposal snapshot
    proposal: { type: mongoose.Schema.Types.ObjectId, ref: 'Proposal', required: true, unique: true },

    // Optional snapshots so the project stays stable even if user profiles change
    snapshots: {
      studentNames: [{ type: String, trim: true }],
      mentorName: { type: String, trim: true },
      approvedAt: { type: Date },
      hodReviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
  },
  { timestamps: true }
);

// Each user can appear in at most 1 active project (app-level constraint is still needed).
projectSchema.index({ students: 1 });

module.exports = mongoose.model('Project', projectSchema);