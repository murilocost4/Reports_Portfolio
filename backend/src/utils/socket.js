import { io } from 'socket.io-client';

const socket = io('https://sua_url.com', {
  autoConnect: false,
  withCredentials: true, // 👈 ESSENCIAL pra sessão/cookie funcionar
  transports: ['websocket'] // 👌 evita fallback zuado com polling
});

export default socket;
