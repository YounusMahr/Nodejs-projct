import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogOut, Layout, User } from 'lucide-react';

export default function Navbar({ user, onLogout }) {
  const navigate = useNavigate();

  const handleLogoutClick = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    onLogout();
    navigate('/login');
  };

  const getInitials = (name) => {
    return name ? name.charAt(0).toUpperCase() : 'U';
  };

  return (
    <nav className="navbar">
      <Link to="/" className="logo-container">
        <Layout size={24} style={{ stroke: 'url(#logo-grad)' || '#6366f1' }} />
        <span>SyncBoard</span>
      </Link>
      
      {user ? (
        <div className="nav-links">
          <Link to="/" className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
            My Boards
          </Link>
          <div className="nav-user">
            <div className="avatar-placeholder" title={user.email}>
              {getInitials(user.username)}
            </div>
            <span className="nav-username">{user.username}</span>
            <button onClick={handleLogoutClick} className="btn btn-secondary" style={{ padding: '0.5rem', display: 'flex', alignItems: 'center' }}>
              <LogOut size={16} />
            </button>
          </div>
        </div>
      ) : (
        <div className="nav-links">
          <Link to="/login" className="btn btn-secondary">Login</Link>
          <Link to="/register" className="btn btn-primary">Sign Up</Link>
        </div>
      )}
    </nav>
  );
}
