import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server);
const port = process.env.PORT || 3030;

server.listen(port, () => {
    console.log('Server listening at port', port);
});

app.use(express.static(path.join(__dirname, 'public')));

let roomOfUsers = {};

io.on('connection', (socket) => {
    let addedUser = false;
    socket.on('new message', (data) => {
        socket.broadcast.in(socket.room).emit('new message', {
            username: socket.username,
            message: data
        });
    });

    socket.on('join room', (room) => {
        socket.room = room;
        if (typeof roomOfUsers[socket.room] != 'number') {
            roomOfUsers[socket.room] = 0;
        }
        socket.join(socket.room);
    });

    socket.on('add user', (username) => {
        if (addedUser) return;
        socket.username = username;
        ++roomOfUsers[socket.room];
        addedUser = true;
        socket.emit('login', {
            numUsers: roomOfUsers[socket.room],
            roomId: socket.room
        });
        socket.broadcast.in(socket.room).emit('user joined', {
            username: socket.username,
            numUsers: roomOfUsers[socket.room]
        });
    });

    socket.on('typing', () => {
        socket.broadcast.in(socket.room).emit('typing', {
            username: socket.username
        });
    });

    socket.on('stop typing', () => {
        socket.broadcast.in(socket.room).emit('stop typing', {
            username: socket.username
        });
    });

    socket.on('disconnect', () => {
        if (addedUser) {
            --roomOfUsers[socket.room];
            if (roomOfUsers[socket.room] <= 0) {
                delete roomOfUsers[socket.room];
            }
            socket.leave(socket.room);
            socket.broadcast.in(socket.room).emit('user left', {
                username: socket.username,
                numUsers: roomOfUsers[socket.room]
            });
        }
    });
});
