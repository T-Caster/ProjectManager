// server/models/Task.js
const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema(
  {
    // Context
    meeting: { type: mongoose.Schema.Types.ObjectId, ref: 'Meeting', required: true, index: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },

    // Actors
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true }, // usually mentor

    // Content
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 4000 },

    // Lifecycle
    status: { type: String, enum: ['open', 'completed'], default: 'open', index: true },
    dueDate: { type: Date, index: true },

    // Completion tracking
    completedAt: { type: Date },
    dueDateAtCompletion: { type: Date },
    completedLate: { type: Boolean, default: false },

    // Light audit
    lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Derived "overdue now" flag
TaskSchema.virtual('isOverdue').get(function () {
  if (!this.dueDate) return false;
  if (this.status === 'completed') return false;
  return this.dueDate.getTime() < Date.now();
});

// Ensure lateness is captured when completing
TaskSchema.pre('save', function (next) {
  if (this.isModified('status')) {
    if (this.status === 'completed') {
      if (!this.completedAt) this.completedAt = new Date();
      if (this.dueDateAtCompletion == null) this.dueDateAtCompletion = this.dueDate || null;
      const cmpDue = this.dueDateAtCompletion ? this.dueDateAtCompletion.getTime() : Infinity;
      this.completedLate = this.completedAt.getTime() > cmpDue;
    } else if (this.status === 'open') {
      this.completedAt = undefined;
      this.dueDateAtCompletion = undefined;
      this.completedLate = false;
    }
  }
  next();
});

// Helpful indexes
TaskSchema.index({ project: 1, status: 1, dueDate: 1 });
TaskSchema.index({ meeting: 1, dueDate: 1 });

module.exports = mongoose.model('Task', TaskSchema);
