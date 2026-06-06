import express from 'express';
import User from '../models/User.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Search users
router.get('/', authMiddleware, async (req, res) => {
  try {
    const query = req.query.query;
    if (!query) {
      return res.json([]);
    }
    // Search by username or email, excluding current user
    const users = await User.find({
      _id: { $ne: req.user.id },
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ]
    }).select('username email avatar');
    
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
