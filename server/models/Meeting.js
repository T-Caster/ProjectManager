const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  proposer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  mentor:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  proposedDate: { type: Date, required: true },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'held', 'expired'],
    default: 'pending',
  },
  attendees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  lastRescheduleReason: { type: String, trim: true },
}, { timestamps: true });

/** Compute the status the document *should* have right now. */
meetingSchema.methods._deriveTemporalStatus = function deriveTemporalStatus(now = Date.now()) {
  const ts = (this.proposedDate instanceof Date ? this.proposedDate.getTime() : new Date(this.proposedDate).getTime());
  const past = Number.isFinite(ts) && ts < now;

  // Past + accepted -> held
  if (this.status === 'accepted' && past) return 'held';
  // Past + pending -> expired
  if (this.status === 'pending' && past)  return 'expired';
  // Otherwise keep as-is
  return this.status;
};

/** Materialize temporal status on this doc (no-op if unchanged). */
meetingSchema.methods.materializeTemporalStatus = async function materializeTemporalStatus() {
  const next = this._deriveTemporalStatus();
  if (next !== this.status) {
    this.status = next;
    await this.save();
  }
  return this;
};

/**
 * Bulk materialize temporal status on a query selector
 * (use before reads that must reflect “held/expired”, and before
 * actions like approve/decline/reschedule on a single meeting).
 */
meetingSchema.statics.materializeTemporalStatusFor = async function materializeTemporalStatusFor(filter = {}) {
  const now = Date.now();

  // pending in the past -> expired
  await this.updateMany(
    { ...filter, status: 'pending', proposedDate: { $lt: new Date(now) } },
    { $set: { status: 'expired' } }
  );

  // accepted in the past -> held
  await this.updateMany(
    { ...filter, status: 'accepted', proposedDate: { $lt: new Date(now) } },
    { $set: { status: 'held' } }
  );
};

const Meeting = mongoose.model('Meeting', meetingSchema);
module.exports = Meeting;
