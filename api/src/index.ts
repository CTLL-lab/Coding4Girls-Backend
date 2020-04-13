import express = require('express');
import * as cors from 'cors';
import * as bodyParser from 'body-parser';
import * as expressValidator from 'express-validator';
import { Server } from 'socket.io';
import {
  CreateANewNoteForLobby,
  GetAllNotesForLobby,
  MoveNote,
  UpdateZValueOfNotes,
  DeleteNote,
  UpdateNote,
} from './models/note';

// Create a new express application instance
const app: express.Application = express();

app.use(cors());
app.use(bodyParser.json({ limit: '8mb' }));
app.use(expressValidator());

app.use('/login', require('./endpoints/login'));
app.use('/register', require('./endpoints/register'));
app.use('/lobbies', require('./endpoints/lobbies'));
app.use('/users', require('./endpoints/users'));
app.use('/mini_games', require('./endpoints/mini_games'));
app.use('/challenges', require('./endpoints/challenges'));
app.use('/images', require('./endpoints/images'));
app.use('/me', require('./endpoints/me'));
app.use('/metrics', require('./endpoints/metrics'));
app.get('/', (req, res) => {
  res.json({
    success: true,
    error: false,
    data: {
      token: '1234',
      user: {
        id: 1,
        username: 'steel',
        role: 'student',
      },
    },
  });
});

var server = require('http').Server(app);
var io: Server = require('socket.io')(server);

server.listen(5000, function () {
  console.log('Coding4Girls app listening on port 5000!');
});

// socket.io code
// handles brainstorm notes

io.on('connection', function (socket) {
  socket.on('room', async (room, user) => {
    socket.join(room);
    GetAllNotesForLobby(room)
      .then((x) => {
        socket.emit('join-room', x);
      })
      .catch((err) => {
        console.error(err);
      });
  });
  socket.on('leave-room', (room, user) => {
    socket.leave(room);
  });
  socket.on('new-note', (incomingJSON, room, userID) => {
    CreateANewNoteForLobby(incomingJSON, room)
      .then((_) => {
        socket.to(room).emit('new-note', incomingJSON);
      })
      .catch((err) => {
        console.error(err);
      });
  });
  socket.on('move-note', (incomingJSON, room) => {
    MoveNote(incomingJSON['note'])
      .then((x) => {
        socket.to(room).emit('move-note', incomingJSON);
      })
      .catch((err) => {
        console.error(err);
      });
  });
  socket.on('edit-note', (incomingJSON, room) => {
    UpdateNote(incomingJSON['note'])
      .then(() => {
        socket.to(room).emit('edit-note', incomingJSON);
      })
      .catch((err) => {
        console.error(err);
      });
  });
  socket.on('delete-note', (incomingJSON, room, userID) => {
    DeleteNote(incomingJSON['note'])
      .then((_) => {
        socket.to(room).emit('delete-note', incomingJSON);
      })
      .catch((err) => {
        console.error(err);
      });
  });
  socket.on('z-note', (incomingJSON, room) => {
    try {
      UpdateZValueOfNotes(incomingJSON);
      socket.to(room).emit('z-note', incomingJSON);
    } catch (err) {
      console.error(err);
    }
  });
});
