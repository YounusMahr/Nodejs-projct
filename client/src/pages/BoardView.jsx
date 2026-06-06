import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, UserPlus, Calendar, AlertCircle, Edit, Trash2 } from 'lucide-react';
import { api } from '../utils/api';
import { initiateSocket, disconnectSocket, getSocket } from '../utils/socket';

export default function BoardView() {
  const { id: boardId } = useParams();
  const navigate = useNavigate();
  
  const [board, setBoard] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState('viewer'); // Default to restrict actions until loaded

  // Task creation/editing modal states
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    columnId: 'todo',
    priority: 'medium',
    dueDate: '',
    assignees: []
  });

  // Invitation modal states
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    fetchBoardData();

    // Setup real-time Socket connection
    const socket = initiateSocket(boardId);

    socket.on('task_created', (newTask) => {
      setTasks(prev => {
        if (prev.some(t => t._id === newTask._id)) return prev;
        return [...prev, newTask];
      });
    });

    socket.on('task_updated', (updatedTask) => {
      setTasks(prev => prev.map(t => t._id === updatedTask._id ? updatedTask : t));
    });

    socket.on('task_deleted', ({ taskId }) => {
      setTasks(prev => prev.filter(t => t._id !== taskId));
    });

    return () => {
      disconnectSocket(boardId);
    };
  }, [boardId]);

  const fetchBoardData = async () => {
    try {
      setLoading(true);
      const boardData = await api.get(`/boards/${boardId}`);
      setBoard(boardData);

      // Determine active user role
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const currentUser = JSON.parse(storedUser);
        if (boardData.creator?._id === currentUser.id || boardData.creator === currentUser.id) {
          setUserRole('admin');
        } else {
          const memberInfo = boardData.members.find(m => 
            (m.user?._id || m.user) === currentUser.id
          );
          if (memberInfo) {
            setUserRole(memberInfo.role || 'member');
          }
        }
      }

      const tasksData = await api.get(`/tasks/board/${boardId}`);
      setTasks(tasksData);
    } catch (err) {
      setError(err.message || 'Access denied or board not found');
    } finally {
      setLoading(false);
    }
  };

  // Drag and drop implementation
  const handleDragStart = (e, taskId) => {
    if (userRole === 'viewer') {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDragOver = (e) => {
    if (userRole === 'viewer') return;
    e.preventDefault();
  };

  const handleDrop = async (e, columnId) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;

    // Optimistic UI update
    const targetTask = tasks.find(t => t._id === taskId);
    if (!targetTask || targetTask.columnId === columnId) return;

    const originalTasks = [...tasks];
    setTasks(prev => prev.map(t => t._id === taskId ? { ...t, columnId } : t));

    try {
      await api.put(`/tasks/${taskId}`, { columnId });
    } catch (err) {
      console.error('Failed to move task:', err);
      setTasks(originalTasks); // rollback
    }
  };

  // Handle task form submit
  const handleTaskSubmit = async (e) => {
    e.preventDefault();
    if (!taskForm.title.trim()) return;

    try {
      if (editingTask) {
        // Edit flow — socket 'task_updated' event handles state sync
        const updated = await api.put(`/tasks/${editingTask._id}`, taskForm);
        // Optimistically update locally in case socket is slow
        setTasks(prev => prev.map(t => t._id === editingTask._id ? updated : t));
      } else {
        // Create flow — socket 'task_created' event handles adding to state
        // Do NOT add to state here to avoid duplicates
        await api.post('/tasks', {
          ...taskForm,
          boardId
        });
      }
      closeTaskModal();
    } catch (err) {
      alert(err.message || 'Operation failed');
    }
  };

  const openCreateTaskModal = (columnId) => {
    setEditingTask(null);
    setTaskForm({
      title: '',
      description: '',
      columnId: columnId,
      priority: 'medium',
      dueDate: '',
      assignees: []
    });
    setIsTaskModalOpen(true);
  };

  const openEditTaskModal = (task) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title,
      description: task.description,
      columnId: task.columnId,
      priority: task.priority,
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().substr(0, 10) : '',
      assignees: task.assignees.map(a => a._id || a)
    });
    setIsTaskModalOpen(true);
  };

  const closeTaskModal = () => {
    setIsTaskModalOpen(false);
    setEditingTask(null);
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      setTasks(prev => prev.filter(t => t._id !== taskId));
      closeTaskModal();
    } catch (err) {
      alert(err.message || 'Failed to delete task');
    }
  };

  // User search for invitations
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      try {
        setSearchLoading(true);
        const users = await api.get(`/users?query=${searchQuery}`);
        setSearchResults(users);
      } catch (err) {
        console.error(err);
      } finally {
        setSearchLoading(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const handleInviteUser = async (userId) => {
    try {
      const updatedBoard = await api.post(`/boards/${boardId}/members`, { userId });
      setBoard(updatedBoard);
      alert('User added to board successfully!');
      setIsInviteModalOpen(false);
      setSearchQuery('');
    } catch (err) {
      alert(err.message || 'Failed to invite user');
    }
  };

  const getInitials = (name) => name ? name.charAt(0).toUpperCase() : '?';

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-secondary)' }}>Loading Workspace Board...</div>;
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem' }}>
        <h2 style={{ color: 'var(--priority-high)', marginBottom: '1rem' }}>{error}</h2>
        <button className="btn btn-secondary" onClick={() => navigate('/')}>Return to Dashboard</button>
      </div>
    );
  }

  return (
    <div className="board-workspace">
      {/* Workspace Header */}
      <div className="board-workspace-header">
        <div className="board-title-area">
          <h2>{board.title}</h2>
          <p>{board.description || 'Collaborative workspace'}</p>
        </div>
        <div className="board-actions">
          <div className="members-list">
            {board.members.map((m) => (
              <div 
                key={m._id || m.user._id} 
                className="member-avatar" 
                title={`${m.user.username} (${m.role})`}
              >
                {getInitials(m.user.username)}
              </div>
            ))}
          </div>
          {userRole !== 'viewer' && (
            <button className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }} onClick={() => setIsInviteModalOpen(true)}>
              <UserPlus size={16} /> Invite
            </button>
          )}
        </div>
      </div>

      {/* Board Columns container */}
      <div className="board-columns-container">
        {board.columns.map((column) => {
          const columnTasks = tasks.filter(t => t.columnId === column.id);
          return (
            <div 
              key={column.id} 
              className="board-column"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              <div className="column-header">
                <div className="column-title">
                  {column.title}
                  <span className="column-count">{columnTasks.length}</span>
                </div>
                {userRole !== 'viewer' && (
                  <button 
                    className="modal-close-btn" 
                    onClick={() => openCreateTaskModal(column.id)}
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <Plus size={18} />
                  </button>
                )}
              </div>

              <div className="column-cards">
                {columnTasks.map((task) => (
                  <div 
                    key={task._id} 
                    className="task-card"
                    draggable={userRole !== 'viewer'}
                    onDragStart={(e) => handleDragStart(e, task._id)}
                    onClick={() => openEditTaskModal(task)}
                  >
                    <span className={`task-priority-badge task-priority-${task.priority}`}>
                      {task.priority}
                    </span>
                    <h4>{task.title}</h4>
                    {task.description && <p>{task.description}</p>}
                    
                    <div className="task-card-footer">
                      <div className="task-due-date">
                        {task.dueDate ? (
                          <>
                            <Calendar size={12} />
                            {new Date(task.dueDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                          </>
                        ) : null}
                      </div>
                      
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {task.assignees.slice(0, 3).map((assignee) => (
                          <div 
                            key={assignee._id} 
                            className="member-avatar" 
                            style={{ width: '20px', height: '20px', fontSize: '0.6rem', border: '1px solid var(--bg-card)' }}
                            title={assignee.username}
                          >
                            {getInitials(assignee.username)}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}

                {columnTasks.length === 0 && (
                  <div style={{ border: '2px dashed var(--border-color)', padding: '2rem 1rem', borderRadius: '8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    Drag tasks here
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Creation & Edit Modal */}
      {isTaskModalOpen && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content" style={{ maxWidth: '550px' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '1.4rem' }}>{editingTask ? 'Edit Task' : 'Add New Task'}</h2>
              <button className="modal-close-btn" onClick={closeTaskModal}>×</button>
            </div>
            
            <form onSubmit={handleTaskSubmit}>
              <fieldset disabled={userRole === 'viewer'} style={{ border: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label>Task Title</label>
                  <input
                    type="text"
                    className="form-input"
                    value={taskForm.title}
                    onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                    placeholder="What needs to be done?"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    className="form-input"
                    style={{ minHeight: '80px', resize: 'vertical' }}
                    value={taskForm.description}
                    onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                    placeholder="Provide context or instructions..."
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Priority</label>
                    <select
                      className="form-input"
                      style={{ background: 'var(--bg-secondary)', color: 'white' }}
                      value={taskForm.priority}
                      onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Due Date</label>
                    <input
                      type="date"
                      className="form-input"
                      value={taskForm.dueDate}
                      onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Assign Members</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', maxHeight: '100px', overflowY: 'auto', background: 'rgba(0,0,0,0.1)', padding: '0.5rem', borderRadius: '8px' }}>
                    {board.members.map((m) => {
                      const isAssigned = taskForm.assignees.includes(m.user._id);
                      return (
                        <button
                          type="button"
                          key={m.user._id}
                          className={`btn ${isAssigned ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', borderRadius: '4px' }}
                          onClick={() => {
                            if (userRole === 'viewer') return;
                            const updated = isAssigned
                              ? taskForm.assignees.filter(id => id !== m.user._id)
                              : [...taskForm.assignees, m.user._id];
                            setTaskForm({ ...taskForm, assignees: updated });
                          }}
                        >
                          {m.user.username}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </fieldset>

              <div className="modal-actions" style={{ justifyContent: 'space-between', marginTop: '1.5rem' }}>
                {editingTask && userRole !== 'viewer' ? (
                  <button 
                    type="button" 
                    className="btn btn-danger"
                    onClick={() => handleDeleteTask(editingTask._id)}
                    style={{ padding: '0.5rem' }}
                  >
                    <Trash2 size={16} /> Delete
                  </button>
                ) : <div />}
                
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={closeTaskModal}>
                    {userRole === 'viewer' ? 'Close' : 'Cancel'}
                  </button>
                  {userRole !== 'viewer' && (
                    <button type="submit" className="btn btn-primary">
                      {editingTask ? 'Save Changes' : 'Create Task'}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      {isInviteModalOpen && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content">
            <div className="modal-header">
              <h2 style={{ fontSize: '1.4rem' }}>Invite Member</h2>
              <button className="modal-close-btn" onClick={() => setIsInviteModalOpen(false)}>×</button>
            </div>
            
            <div className="form-group">
              <label>Search user by name or email</label>
              <input
                type="text"
                className="form-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type to search..."
                autoFocus
              />
            </div>

            {searchLoading ? (
              <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-secondary)' }}>Searching users...</div>
            ) : searchResults.length > 0 ? (
              <div className="search-results">
                {searchResults.map((user) => (
                  <div key={user._id} className="search-item" onClick={() => handleInviteUser(user._id)}>
                    <div className="search-user-info">
                      <div className="avatar-placeholder" style={{ width: '28px', height: '28px', fontSize: '0.75rem' }}>
                        {getInitials(user.username)}
                      </div>
                      <div>
                        <div className="search-username">{user.username}</div>
                        <div className="search-email">{user.email}</div>
                      </div>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--accent-color)', fontWeight: '600' }}>Add</span>
                  </div>
                ))}
              </div>
            ) : searchQuery.trim() ? (
              <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)' }}>No matching users found</div>
            ) : null}

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setIsInviteModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
