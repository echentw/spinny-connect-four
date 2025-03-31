const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

// Enable CORS for all routes
app.use(cors());

// Middleware to parse JSON
app.use(express.json());

// Serve static files from the frontend directory
// This is important for deployment - we'll serve the frontend from the backend
const path = require('path');
app.use(express.static(path.join(__dirname, '../frontend')));

// Game state
const games = {};
const waitingPlayers = [];

// Game logic
function createGame() {
  return {
    board: Array(4).fill().map(() => Array(4).fill(null)),
    currentPlayer: 'white',
    players: { white: null, black: null },
    status: 'waiting',
    winner: null
  };
}

function rotateInnerClockwise(board) {
  // Clone the board to avoid direct mutations
  const newBoard = board.map(row => [...row]);
  
  // Extract inner 2x2 grid
  const inner = [
    [board[1][1], board[1][2]],
    [board[2][1], board[2][2]]
  ];
  
  // Rotate inner 2x2 clockwise (90 degrees)
  // [1,1] <- [2,1] (bottom-left to top-left)
  // [1,2] <- [1,1] (top-left to top-right)
  // [2,2] <- [1,2] (top-right to bottom-right)
  // [2,1] <- [2,2] (bottom-right to bottom-left)
  newBoard[1][1] = inner[1][0]; // bottom-left to top-left
  newBoard[1][2] = inner[0][0]; // top-left to top-right  
  newBoard[2][2] = inner[0][1]; // top-right to bottom-right
  newBoard[2][1] = inner[1][1]; // bottom-right to bottom-left
  
  return newBoard;
}

function rotateOuterCounterClockwise(board) {
  // Clone the board after inner rotation
  const newBoard = board.map(row => [...row]);
  
  // Outer ring consists of 12 cells:
  // - Top row: [0,0], [0,1], [0,2], [0,3]
  // - Right column (excluding corners): [1,3], [2,3]
  // - Bottom row: [3,0], [3,1], [3,2], [3,3]
  // - Left column (excluding corners): [1,0], [2,0]
  
  // Save the current state before shifting
  const topRow = [board[0][0], board[0][1], board[0][2], board[0][3]];
  const rightCol = [board[1][3], board[2][3]];
  const bottomRow = [board[3][0], board[3][1], board[3][2], board[3][3]];
  const leftCol = [board[1][0], board[2][0]];
  
  // Shift counter-clockwise (each piece moves one position counter-clockwise)
  
  // Top row shifts left (except leftmost which goes down)
  newBoard[0][0] = topRow[1];      // [0,1] → [0,0]
  newBoard[0][1] = topRow[2];      // [0,2] → [0,1]
  newBoard[0][2] = topRow[3];      // [0,3] → [0,2]
  
  // Right column shifts up (except topmost which goes left)
  newBoard[0][3] = rightCol[0];    // [1,3] → [0,3]
  newBoard[1][3] = rightCol[1];    // [2,3] → [1,3]
  
  // Bottom row shifts right (except rightmost which goes up)
  newBoard[2][3] = bottomRow[3];   // [3,3] → [2,3]
  newBoard[3][3] = bottomRow[2];   // [3,2] → [3,3]
  newBoard[3][2] = bottomRow[1];   // [3,1] → [3,2]
  newBoard[3][1] = bottomRow[0];   // [3,0] → [3,1]
  
  // Left column shifts down (except bottommost which goes right)
  newBoard[3][0] = leftCol[1];     // [2,0] → [3,0]
  newBoard[2][0] = leftCol[0];     // [1,0] → [2,0]
  newBoard[1][0] = topRow[0];      // [0,0] → [1,0]
  
  return newBoard;
}

function checkWinner(board) {
  // Check rows
  for (let i = 0; i < 4; i++) {
    if (board[i][0] && board[i][0] === board[i][1] && board[i][1] === board[i][2] && board[i][2] === board[i][3]) {
      return board[i][0];
    }
  }
  
  // Check columns
  for (let j = 0; j < 4; j++) {
    if (board[0][j] && board[0][j] === board[1][j] && board[1][j] === board[2][j] && board[2][j] === board[3][j]) {
      return board[0][j];
    }
  }
  
  // Check diagonals
  if (board[0][0] && board[0][0] === board[1][1] && board[1][1] === board[2][2] && board[2][2] === board[3][3]) {
    return board[0][0];
  }
  
  if (board[0][3] && board[0][3] === board[1][2] && board[1][2] === board[2][1] && board[2][1] === board[3][0]) {
    return board[0][3];
  }
  
  // Check if board is full (draw)
  const isFull = board.every(row => row.every(cell => cell !== null));
  if (isFull) return 'draw';
  
  return null;
}

// Socket.io connection
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  // Join or create a game
  socket.on('joinGame', (playerName) => {
    if (waitingPlayers.length > 0) {
      // Match with a waiting player
      const opponent = waitingPlayers.shift();
      const gameId = uuidv4();
      
      // Create new game
      const game = createGame();
      game.players.white = opponent.id;
      game.players.black = socket.id;
      game.status = 'playing';
      games[gameId] = game;
      
      // Join both players to the game room
      socket.join(gameId);
      io.sockets.sockets.get(opponent.id).join(gameId);
      
      // Notify players
      io.to(gameId).emit('gameStart', {
        gameId,
        board: game.board,
        currentPlayer: game.currentPlayer,
        players: {
          white: opponent.name,
          black: playerName
        }
      });
      
      // Store player info
      socket.data.gameId = gameId;
      socket.data.color = 'black';
      io.sockets.sockets.get(opponent.id).data.gameId = gameId;
      io.sockets.sockets.get(opponent.id).data.color = 'white';
      
    } else {
      // Add to waiting queue
      waitingPlayers.push({
        id: socket.id,
        name: playerName
      });
      socket.emit('waiting');
    }
  });
  
  // Handle player moves
  socket.on('makeMove', ({ row, col }) => {
    const gameId = socket.data.gameId;
    const playerColor = socket.data.color;
    
    if (!gameId || !games[gameId]) {
      socket.emit('error', { message: 'Game not found' });
      return;
    }
    
    const game = games[gameId];
    
    // Check if it's player's turn
    if (game.currentPlayer !== playerColor) {
      socket.emit('error', { message: 'Not your turn' });
      return;
    }
    
    // Check if the cell is empty
    if (game.board[row][col] !== null) {
      socket.emit('error', { message: 'Cell already occupied' });
      return;
    }
    
    // Make the move
    game.board[row][col] = playerColor;
    
    // Rotate inner grid clockwise
    game.board = rotateInnerClockwise(game.board);
    
    // Rotate outer ring counter-clockwise
    game.board = rotateOuterCounterClockwise(game.board);
    
    // Check for a winner
    const winner = checkWinner(game.board);
    if (winner) {
      game.status = 'finished';
      game.winner = winner;
      io.to(gameId).emit('gameOver', {
        winner,
        board: game.board
      });
      
      // Clean up the game after some time
      setTimeout(() => {
        delete games[gameId];
      }, 3600000); // 1 hour
      
      return;
    }
    
    // Switch turns
    game.currentPlayer = game.currentPlayer === 'white' ? 'black' : 'white';
    
    // Broadcast updated game state
    io.to(gameId).emit('gameUpdate', {
      board: game.board,
      currentPlayer: game.currentPlayer
    });
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    // Remove from waiting queue if present
    const waitingIndex = waitingPlayers.findIndex(p => p.id === socket.id);
    if (waitingIndex !== -1) {
      waitingPlayers.splice(waitingIndex, 1);
    }
    
    // Handle active game disconnection
    const gameId = socket.data.gameId;
    if (gameId && games[gameId]) {
      const game = games[gameId];
      game.status = 'abandoned';
      
      // Notify the other player
      const opponentColor = socket.data.color === 'white' ? 'black' : 'white';
      if (game.players[opponentColor]) {
        io.to(gameId).emit('playerLeft');
      }
      
      // Clean up the game
      delete games[gameId];
    }
  });
});

// Route for status
app.get('/api/status', (req, res) => {
  res.json({ 
    games: Object.keys(games).length,
    waiting: waitingPlayers.length
  });
});

// Catch-all route to serve the frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});