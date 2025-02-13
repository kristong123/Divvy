const { Server } = require("socket.io");

let io;

const initializeSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: ["http://localhost:3000", "http://localhost:5173"],
            methods: ["GET", "POST"],
            credentials: true,
            transports: ['websocket', 'polling']
        },
        allowEIO3: true
    });

    io.on('connection', (socket) => {
        console.log('Client connected:', socket.id);

        socket.on('join', (username) => {
            socket.join(username);
            console.log(`${username} joined their room`);
        });

        socket.on('leave', (username) => {
            socket.leave(username);
            console.log(`${username} left their room`);
        });

        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
        });
    });

    return io;
};

const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};

module.exports = { initializeSocket, getIO }; 