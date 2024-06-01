import { Chess } from './chess.min.js';

$(document).ready(function() {
    const socket = io('localhost:3000', {
        transports: ['websocket'], // Use WebSocket transport
        reconnectionAttempts: 5, // Try to reconnect up to 5 times
        reconnectionDelay: 2000, // Wait 2 seconds between reconnection attempts
        timeout: 20000 // Connection timeout of 20 seconds
    });
    let board;
    let game = new Chess();
    let playerColor;
    let hosting = false;

    $('#createGame').click(() => {
        const username = $('#username').val();
        const color = $('#colorSelect').val();
        if (username) {
            socket.emit('createGame', { username, color });
            playerColor = color
        } else {
            alert('Please enter your username');
        }
    });

    $('#leaveGame').click(() => {
        socket.emit('leaveGame');
        $('#game').hide();
        $('#lobby').show();
    });

    socket.on('gameCreated', (gameId) => {
        $('#lobby').hide();
        $('#game').show();
        initChessboard();
    });

    socket.on('gameList', (games) => {
        $('#gamesList').empty();
        games.forEach(game => {
            $('#gamesList').append(
                `<div>${game.id} - ${game.username} <button onclick="joinGame('${game.id}')">Join</button></div>`
            );
        });
    });

    socket.on('gameConcluded', (data) => {
        // alert("Game concluded" + data.reason);
        $('#game').hide();
        $('#lobby').show();
    });

    socket.on('opponentLeft', () => {
        alert("Opponent dissconnected");
        $('#game').hide();
        $('#lobby').show();
    });

    socket.on('gameStarted', (data) => {

        console.log(data.players[0])

        for (let i = 0; i < data.players.length; i++) {
            if(data.players[i].id == socket.id) playerColor = data.players[i].color
            console.log(data.players[i]);
        }

        // console.log(data)
        // console.log(socket.id)
        // playerColor = hosting == true ? 'white' : 'black';

        $('#lobby').hide();
        $('#game').show();
        game = new Chess();
        console.log(playerColor)
        board = Chessboard('board', {
            draggable: true,
            position: 'start',
            orientation: playerColor,
            onDrop: handleMove
        });
        updateStatus()
    });

    window.joinGame = (gameId) => {
        console.log("game join")
        console.log(gameId)
        socket.emit('joinGame', { gameId });
    };

    socket.on('move', (move) => {
        game.move(move);
        board.position(game.fen());
        updateStatus()
    });

    socket.on('invalidMove', (move) => {
        alert(`Invalid move: ${move.from} to ${move.to}`);
        board.position(game.fen());
    });

    function onSnapEnd () {
        board.position(game.fen())
    }

    function initChessboard() {
        board = Chessboard('board', {
            draggable: false,
            position: 'start',
            onDrop: handleMove,
            onDragStart: onDragStart,
            onSnapEnd: onSnapEnd
        });
    }

    function handleMove(source, target) {

        const onTurn = game.turn() == 'w' ? 'white' : 'black';

        if(onTurn != playerColor) return 'snapback'

        const move = game.move({
            from: source,
            to: target,
            promotion: 'q' // always promote to a queen for simplicity
        });

        if (move === null) return 'snapback';
        
        socket.emit('move', move);   
        updateStatus()     
    }

    function updateStatus () {
        var status = 'Waiting for opponent'
      
        var moveColor = 'White'
        if (game.turn() === 'b') {
          moveColor = 'Black'
        }
      
        // checkmate?
        if (game.in_checkmate()) {
          status = 'Game over, ' + moveColor + ' is in checkmate.'
        }
      
        // draw?
        else if (game.in_draw()) {
          status = 'Game over, drawn position'
        }
      
        // game still on
        else {
          status = moveColor + ' to move'
      
          // check?
          if (game.in_check()) {
            status += ', ' + moveColor + ' is in check'
          }
        }
      
        $('#status').html(status)
        $('#pgn').html(game.pgn())
      }

      function onDragStart (source, piece, position, orientation) {
        // do not pick up pieces if the game is over
        if (game.game_over()) return false
      
        // only pick up pieces for the side to move
        if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
            (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
          return false
        }
      }
});