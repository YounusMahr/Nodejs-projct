import express from 'express';
import Board from '../models/Board.js';
import Task from '../models/Task.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Get all boards of authenticated user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const boards = await Board.find({
      $or: [
        { creator: req.user.id },
        { 'members.user': req.user.id }
      ]
    }).populate('creator', 'username email avatar')
      .populate('members.user', 'username email avatar');
    res.json(boards);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get a single board with its columns and members
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const board = await Board.findById(req.id || req.params.id)
      .populate('creator', 'username email avatar')
      .populate('members.user', 'username email avatar');

    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }

    // Check if user has permission
    const isCreator = board.creator._id.toString() === req.user.id;
    const isMember = board.members.some(m => m.user._id.toString() === req.user.id);
    if (!isCreator && !isMember) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(board);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new board
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }

    const newBoard = new Board({
      title,
      description,
      creator: req.user.id,
      members: [{ user: req.user.id, role: 'admin' }],
      columns: [
        { id: 'todo', title: 'To Do' },
        { id: 'inprogress', title: 'In Progress' },
        { id: 'done', title: 'Done' }
      ]
    });

    await newBoard.save();
    
    const populated = await Board.findById(newBoard._id)
      .populate('creator', 'username email avatar')
      .populate('members.user', 'username email avatar');

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add member to board
router.post('/:id/members', authMiddleware, async (req, res) => {
  try {
    const { userId, role } = req.body;
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const board = await Board.findById(req.params.id);
    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }

    // Only creator or admin can add members
    const isCreator = board.creator.toString() === req.user.id;
    const isAdmin = board.members.some(m => m.user.toString() === req.user.id && m.role === 'admin');
    if (!isCreator && !isAdmin) {
      return res.status(403).json({ message: 'Only board admins or creator can add members' });
    }

    // Check if user is already a member
    const alreadyMember = board.members.some(m => m.user.toString() === userId);
    if (alreadyMember) {
      return res.status(400).json({ message: 'User is already a member' });
    }

    board.members.push({ user: userId, role: role || 'member' });
    await board.save();

    const populated = await Board.findById(board._id)
      .populate('creator', 'username email avatar')
      .populate('members.user', 'username email avatar');

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
