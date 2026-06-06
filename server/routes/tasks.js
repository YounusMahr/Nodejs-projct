import express from 'express';
import Task from '../models/Task.js';
import Board from '../models/Board.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Helper: check user permission to access board tasks
const checkBoardAccess = async (boardId, userId) => {
  const board = await Board.findById(boardId);
  if (!board) return false;
  if (board.creator.toString() === userId) return true;
  return board.members.some(m => m.user.toString() === userId);
};

// Get tasks for a board
router.get('/board/:boardId', authMiddleware, async (req, res) => {
  try {
    const hasAccess = await checkBoardAccess(req.params.boardId, req.user.id);
    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const tasks = await Task.find({ boardId: req.params.boardId })
      .populate('assignees', 'username email avatar')
      .populate('creator', 'username email avatar')
      .sort({ position: 1, createdAt: 1 });

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create task
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, description, boardId, columnId, priority, dueDate, assignees } = req.body;
    if (!title || !boardId || !columnId) {
      return res.status(400).json({ message: 'Title, boardId, and columnId are required' });
    }

    const hasAccess = await checkBoardAccess(boardId, req.user.id);
    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied to board' });
    }

    const maxPositionTask = await Task.findOne({ boardId, columnId }).sort({ position: -1 });
    const position = maxPositionTask ? maxPositionTask.position + 1000 : 1000;

    const task = new Task({
      title,
      description,
      boardId,
      columnId,
      priority: priority || 'medium',
      dueDate,
      assignees: assignees || [],
      creator: req.user.id,
      position,
    });

    await task.save();

    const populated = await Task.findById(task._id)
      .populate('assignees', 'username email avatar')
      .populate('creator', 'username email avatar');

    // Notify room of board
    const io = req.app.get('io');
    if (io) {
      io.to(boardId.toString()).emit('task_created', populated);
    }

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update task
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const hasAccess = await checkBoardAccess(task.boardId, req.user.id);
    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { title, description, columnId, priority, dueDate, assignees, position } = req.body;

    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (columnId !== undefined) task.columnId = columnId;
    if (priority !== undefined) task.priority = priority;
    if (dueDate !== undefined) task.dueDate = dueDate;
    if (assignees !== undefined) task.assignees = assignees;
    if (position !== undefined) task.position = position;

    await task.save();

    const populated = await Task.findById(task._id)
      .populate('assignees', 'username email avatar')
      .populate('creator', 'username email avatar');

    // Notify room of board for task updates
    const io = req.app.get('io');
    if (io) {
      io.to(task.boardId.toString()).emit('task_updated', populated);
    }

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete task
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const hasAccess = await checkBoardAccess(task.boardId, req.user.id);
    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const boardId = task.boardId.toString();
    const taskId = task._id.toString();

    await task.deleteOne();

    const io = req.app.get('io');
    if (io) {
      io.to(boardId).emit('task_deleted', { boardId, taskId });
    }

    res.json({ message: 'Task deleted successfully', taskId });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
