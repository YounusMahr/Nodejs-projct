import { io } from 'socket.io-client';

const SOCKET_URL = window.location.hostname === 'localhost' && window.location.port === '5173'
  ? 'http://localhost:5000'
  : window.location.origin;

let socket;

export const initiateSocket = (boardId) => {
  socket = io(SOCKET_URL);
  if (boardId) {
    socket.emit('join_board', boardId);
  }
  return socket;
};

export const disconnectSocket = (boardId) => {
  if (socket) {
    if (boardId) {
      socket.emit('leave_board', boardId);
    }
    socket.disconnect();
  }
};

export const getSocket = () => socket;
