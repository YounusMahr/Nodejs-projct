import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, User, Users, FolderOpen } from 'lucide-react';
import { api } from '../utils/api';

export default function Dashboard() {
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchBoards();
  }, []);

  const fetchBoards = async () => {
    try {
      setLoading(true);
      const data = await api.get('/boards');
      setBoards(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch boards');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBoard = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      const newBoard = await api.post('/boards', { title, description });
      setBoards([newBoard, ...boards]);
      setIsModalOpen(false);
      setTitle('');
      setDescription('');
      // Navigate straight to the new board
      navigate(`/board/${newBoard._id}`);
    } catch (err) {
      alert(err.message || 'Failed to create board');
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Workspace</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage your team projects and board collaborations</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} /> Create Board
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Loading your boards...</div>
      ) : error ? (
        <div style={{ color: 'var(--priority-high)', padding: '2rem', textAlign: 'center' }}>{error}</div>
      ) : boards.length === 0 ? (
        <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <FolderOpen size={48} style={{ color: 'var(--text-muted)' }} />
          <h3>No Boards Found</h3>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '400px' }}>
            Get started by creating your first board to structure and prioritize your tasks.
          </p>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            Create a Board
          </button>
        </div>
      ) : (
        <div className="boards-grid">
          {boards.map((board) => (
            <div key={board._id} className="glass-panel board-card" onClick={() => navigate(`/board/${board._id}`)}>
              <div>
                <h3>{board.title}</h3>
                <p>{board.description || 'No description provided.'}</p>
              </div>
              <div className="board-meta">
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <User size={12} />
                  Owner: {board.creator?.username || 'You'}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Users size={12} />
                  {board.members?.length || 1} {board.members?.length === 1 ? 'member' : 'members'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Board Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content">
            <div className="modal-header">
              <h2 style={{ fontSize: '1.4rem' }}>Create New Board</h2>
              <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleCreateBoard}>
              <div className="form-group">
                <label>Board Title</label>
                <input
                  type="text"
                  className="form-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Sprint Planning"
                  required
                />
              </div>
              <div className="form-group">
                <label>Description (Optional)</label>
                <textarea
                  className="form-input"
                  style={{ minHeight: '80px', resize: 'vertical' }}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Summarize the board objectives..."
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Board
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
