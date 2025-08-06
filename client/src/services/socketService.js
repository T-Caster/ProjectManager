import io from 'socket.io-client';

let socket;

export const initSocket = () => {
  const token = localStorage.getItem('token');
  if (token && !socket) {
    socket = io('http://localhost:5000', {
      auth: {
        token,
      },
    });

    socket.on('connect', () => {
      console.log('connected to socket server');
    });

    socket.on('disconnect', () => {
      console.log('disconnected from socket server');
    });
  }
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const emitEvent = (eventName, data) => {
  if (socket) {
    socket.emit(eventName, data);
  }
};

export const onEvent = (eventName, callback) => {
  if (socket) {
    socket.on(eventName, callback);
  }
};

export const offEvent = (eventName, callback) => {
  if (socket) {
    socket.off(eventName, callback);
  }
};