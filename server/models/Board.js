import mongoose from 'mongoose';

const BoardSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: '',
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  members: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      role: {
        type: String,
        enum: ['admin', 'member', 'viewer'],
        default: 'member',
      }
    }
  ],
  columns: {
    type: [
      {
        id: { type: String, required: true },
        title: { type: String, required: true }
      }
    ],
    default: [
      { id: 'todo', title: 'To Do' },
      { id: 'inprogress', title: 'In Progress' },
      { id: 'done', title: 'Done' }
    ]
  }
}, { timestamps: true });

export default mongoose.model('Board', BoardSchema);
