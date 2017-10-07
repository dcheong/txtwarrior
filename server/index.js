const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const readline = require('readline');
const fs = require('fs');
const strings = require('./strings');

app.get('/', function(req, res){
  res.sendFile(__dirname + '/srv/index.html');
});

app.use(express.static('srv'));

let socketList = io.sockets.sockets;
const playerLocs = {};
const dirToChar = [
  ['\u2196', '\u2191', '\u2197'],
  ['\u2190', '', '\u2192'],
  ['\u2199', '\u2193', '\u2198']
]

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}

function getDirection(pos1, pos2) {
  let dx = pos2[0] - pos1[0];
  let dy = pos2[1] - pos1[1];
  if (dx != 0) {
    dx = dx / Math.abs(dx);
  }
  if (dy != 0) {
    dy = dy / Math.abs(dy);
  }
  return dirToChar[dy + 1][dx + 1];
}

io.on('connection', function(socket) {
  playerLocs[socket.id] = [getRandomInt(0, 10), getRandomInt(0, 10)];
  console.log(playerLocs[socket.id]);
  emitPreset(socket, strings.SERVER_BROADCAST, 'welcome')
  .then(() => emitPreset(socket, strings.SERVER_BROADCAST, 'changelog'))
  .then(() => emitMessage(io, strings.SERVER_BROADCAST, strings.MSG_PLAYER_SPAWNED + ' ' + socket.id));
  console.log('player connected');
  socket.on(strings.PLAYER_INPUT, (input) => {handleInput(input, socket)});
});

function handleInput(input, socket) {
  let msgSplit = input.split(" ");
  const command = msgSplit.shift();
  switch (command) {
    case 'say':
      if (msgSplit.length > 0) {
        const msg = msgSplit.join(' ');
        for (var socketId in socketList) {
          const receiver = socketList[socketId];
          if (socketId == socket.id) {
            emitMessage(socket, 'self broadcast', msg);
            continue;
          }
          const pos1 = playerLocs[socketId];
          const pos2 = playerLocs[socket.id];
          const dir = getDirection(pos1, pos2);
          console.log('emitting ' + dir + msg + ' to' + socketId)
          emitMessage(receiver, 'player broadcast', getDirection(pos1, pos2) + ' ' + socket.id + ' ' + msg)
        }
      }
      break;
    case 'id':
      emitMessage(socket, 'server broadcast', command + ': ' + socket.id);
      break;
    case 'coords':
      emitMessage(socket, 'server broadcast', command + ': ' + playerLocs[socket.id]);
      break;
    default:
      console.log('default out');
  }
}

http.listen(3000, function(){
  console.log('listening on *:3000');
});

function emitMessage(receiver, sender, msg) {
  return new Promise((resolve, reject) => {
    receiver.emit(sender, msg);
    resolve();
  });
}

function emitPreset(receiver, sender, preset) {
  return new Promise((resolve, reject) => {
    filename = 'msgpresets/' + preset + '.txt';
    const rl = readline.createInterface({
      input: fs.createReadStream(filename)
    });
    rl.on('line', function (line) {
      receiver.emit(sender, line);
    });
    rl.on('close', () => {
      resolve();
    });
  });
}
