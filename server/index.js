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

app.use(express.static('srv'))

io.on('connection', function(socket) {
  emitPreset(socket, strings.SERVER_BROADCAST, 'welcome')
  .then(() => emitPreset(socket, strings.SERVER_BROADCAST, 'changelog'))
  .then(() => emitMessage(io, strings.SERVER_BROADCAST, strings.MSG_PLAYER_SPAWNED));
  console.log('player connected');
  socket.on('player input', function(msg) {
    console.log('player input: ' + msg);
    emitMessage(io, 'player broadcast', msg);
  });
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});

function emitMessage(receiver, sender, msg) {
  return new Promise((resolve, reject) => {
    receiver.emit(sender, msg);
    resolve();
  })
}

function emitPreset(receiver, sender, preset) {
  return new Promise((resolve, reject) => {
    filename = 'msgpresets/' + preset + '.txt';
    const rl = readline.createInterface({
      input: fs.createReadStream(filename)
    });
    rl.on('line', function (line) {
      receiver.emit(sender, line);
    })
    rl.on('close', () => {
      resolve();
    })
  });
}
