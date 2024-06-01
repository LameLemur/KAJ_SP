const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const { Chess } = require('chess.js'); 

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(__dirname + '/public'));

let games = [];

io.on('connection', (socket) => {
    console.log('New client connected');
    updateGameList()

    socket.on('createGame', (data) => {
        const gameId = 'game-' + socket.id;
        games[gameId] = {
            id: gameId,
            players: [{ id: socket.id, username: data.username, color: data.color }],
            chess: new Chess()
        };
        socket.join(gameId);
        socket.emit('gameCreated', gameId);
        updateGameList();
    });

    socket.on('joinGame', (data) => {
        const game = games[data.gameId];
        if (game && game.players.length === 1) {
            const color = game.players[0].color == 'white' ? 'black' : 'white'
            game.players.push({ id: socket.id, username: data.username, color: color });
            socket.join(data.gameId);
            console.log(data.gameId)
            io.to(data.gameId).emit('gameStarted', {
                gameId: data.gameId,
                players: game.players
            });
        }
        updateGameList();
    });


    socket.on('move', (move) => {
        const gameId = Array.from(socket.rooms).find(room => room.startsWith('game-'));
        if (gameId) {
            const game = games[gameId];
            const chess = game.chess;

            const onTurn = chess.turn() == 'w' ? 'white' : 'black';

            console.log(onTurn)

            for (p of game.players) {
                console.log(p)
                if(p.id == socket.id && p.color != onTurn) {
                    socket.emit('invalidMove', move);
                    return
                }
            } 

            
            // Validate the move using chess.js
            try {
                const result = chess.move(move);
                if (result) {
                    // If move is valid, broadcast it to the opponent
                    io.to(gameId).emit('move', move);
                }
            } catch(e) {
                socket.emit('invalidMove', move);
            }
            
        }
    });

    socket.on('leaveGame', () => {
        const gameId = Array.from(socket.rooms).find(room => room.startsWith('game-'));
        if (gameId) {
            const game = games[gameId];
            for(p of game.players) {
                if(p.id != socket.id) io.to(p.id).emit('opponentLeft')
            }

            io.to(gameId).emit('gameConcluded', { reason: "not enough players"})
            socket.leave(gameId);
            delete games[gameId];
            updateGameList();
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
        // console.log(socket.rooms.keys())
        // console.log(socket.id)
        // console.log(games)
        delete games['game-' + socket.id];
        updateGameList();
    });

    function updateGameList() {
        io.emit('gameList', Object.values(games).filter(game => game.players.length == 1).map(game => ({
            id: game.id,
            username: game.players[0].username
        })));
    }
});

server.listen(3000, () => {
    console.log('Server is running on port 3000');
});