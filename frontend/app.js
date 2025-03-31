document.addEventListener('DOMContentLoaded', () => {
    // Get DOM elements
    const welcomeScreen = document.getElementById('welcome-screen');
    const waitingScreen = document.getElementById('waiting-screen');
    const gameScreen = document.getElementById('game-screen');
    const gameOverScreen = document.getElementById('game-over-screen');
    
    const playerNameInput = document.getElementById('player-name');
    const joinBtn = document.getElementById('join-btn');
    const gameBoard = document.getElementById('game-board');
    const gameStatus = document.getElementById('game-status');
    const playerWhite = document.getElementById('player-white');
    const playerBlack = document.getElementById('player-black');
    const gameResult = document.getElementById('game-result');
    const finalBoard = document.getElementById('final-board');
    const newGameBtn = document.getElementById('new-game-btn');
    const playAgainBtn = document.getElementById('play-again-btn');
    
    // Game state
    let socket;
    let gameId = null;
    let playerColor = null;
    let currentPlayer = null;
    let board = [];
    let playerName = '';
    let players = { white: '', black: '' };
    
    // Connect to the WebSocket server
    function connectToServer() {
        // Use the current host for deployment compatibility
        const serverUrl = location.hostname === 'localhost' || location.hostname === '127.0.0.1' 
            ? 'http://localhost:3001' 
            : window.location.origin;
            
        socket = io(serverUrl);
        
        // Socket event handlers
        socket.on('connect', () => {
            console.log('Connected to server');
        });
        
        socket.on('waiting', () => {
            showScreen(waitingScreen);
        });
        
        socket.on('gameStart', (data) => {
            gameId = data.gameId;
            board = data.board;
            currentPlayer = data.currentPlayer;
            players = data.players;
            
            // Determine player color
            if (players.white === playerName) {
                playerColor = 'white';
            } else if (players.black === playerName) {
                playerColor = 'black';
            }
            
            // Update player displays
            playerWhite.querySelector('span').textContent = players.white;
            playerBlack.querySelector('span').textContent = players.black;
            
            // Create the board UI
            createBoard();
            updateBoardState();
            updateGameStatus();
            
            // Show game screen
            showScreen(gameScreen);
        });
        
        socket.on('gameUpdate', (data) => {
            // First show rotation animation, then update the board
            animateBoardRotation(() => {
                // After animation is complete, update the board state and game status
                board = data.board;
                currentPlayer = data.currentPlayer;
                updateBoardState();
                updateGameStatus();
            });
        });
        
        socket.on('gameOver', (data) => {
            const winner = data.winner;
            board = data.board;
            
            // Create final board display
            createFinalBoard();
            
            // Set game result message
            if (winner === 'draw') {
                gameResult.textContent = "It's a draw!";
            } else if (winner === playerColor) {
                gameResult.textContent = "You won!";
            } else {
                gameResult.textContent = "You lost!";
            }
            
            // Show game over screen
            showScreen(gameOverScreen);
        });
        
        socket.on('playerLeft', () => {
            alert('Your opponent has left the game.');
            showScreen(welcomeScreen);
        });
        
        socket.on('error', (data) => {
            alert(data.message);
        });
        
        socket.on('disconnect', () => {
            console.log('Disconnected from server');
            alert('Disconnected from server. Please refresh the page.');
        });
    }
    
    // Show specified screen, hide others
    function showScreen(screen) {
        welcomeScreen.classList.add('hidden');
        waitingScreen.classList.add('hidden');
        gameScreen.classList.add('hidden');
        gameOverScreen.classList.add('hidden');
        
        screen.classList.remove('hidden');
    }
    
    // Create the game board UI
    function createBoard() {
        gameBoard.innerHTML = '';
        
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                
                // Mark inner grid cells
                if ((row === 1 || row === 2) && (col === 1 || col === 2)) {
                    cell.classList.add('inner');
                }
                
                // Add click handler
                cell.addEventListener('click', () => handleCellClick(row, col));
                
                gameBoard.appendChild(cell);
            }
        }
    }
    
    // Create the final board display
    function createFinalBoard() {
        finalBoard.innerHTML = '';
        
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                
                // Add piece if present
                if (board[row][col]) {
                    const piece = document.createElement('div');
                    piece.className = `piece ${board[row][col]}`;
                    cell.appendChild(piece);
                }
                
                finalBoard.appendChild(cell);
            }
        }
    }
    
    // Update the board display based on current state
    function updateBoardState() {
        const cells = gameBoard.querySelectorAll('.cell');
        
        // Re-enable board if it was disabled
        gameBoard.classList.remove('board-disabled');
        
        cells.forEach(cell => {
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            
            // Clear existing pieces
            cell.innerHTML = '';
            
            // Add piece if present
            if (board[row][col]) {
                const piece = document.createElement('div');
                piece.className = `piece ${board[row][col]}`;
                cell.appendChild(piece);
            }
        });
    }
    
    // Update game status display
    function updateGameStatus() {
        // Update turn indicator
        playerWhite.querySelector('.player-indicator').classList.add('hidden');
        playerBlack.querySelector('.player-indicator').classList.add('hidden');
        
        if (currentPlayer === 'white') {
            playerWhite.querySelector('.player-indicator').classList.remove('hidden');
        } else {
            playerBlack.querySelector('.player-indicator').classList.remove('hidden');
        }
        
        // Update status text
        if (currentPlayer === playerColor) {
            gameStatus.textContent = 'Your turn';
        } else {
            gameStatus.textContent = 'Opponent\'s turn';
        }
    }
    
    // Animate the board rotation effect
    function animateBoardRotation(callback) {
        // Get inner and outer indicators and add animation classes
        const innerIndicator = document.querySelector('.inner-indicator');
        const outerIndicator = document.querySelector('.outer-indicator');
        
        innerIndicator.classList.add('rotate-clockwise');
        outerIndicator.classList.add('rotate-counter-clockwise');
        
        // Get all inner cells and add clockwise rotation
        const innerCells = document.querySelectorAll('.cell.inner');
        innerCells.forEach(cell => {
            const piece = cell.querySelector('.piece');
            if (piece) {
                piece.classList.add('rotate-clockwise');
            }
            cell.classList.add('inner-highlight');
        });
        
        // Get all outer cells and add counter-clockwise rotation
        const outerCells = document.querySelectorAll('.cell:not(.inner)');
        outerCells.forEach(cell => {
            const piece = cell.querySelector('.piece');
            if (piece) {
                piece.classList.add('rotate-counter-clockwise');
            }
            cell.classList.add('outer-highlight');
        });
        
        // After animation completes, remove classes and call callback
        setTimeout(() => {
            innerIndicator.classList.remove('rotate-clockwise');
            outerIndicator.classList.remove('rotate-counter-clockwise');
            
            innerCells.forEach(cell => {
                const piece = cell.querySelector('.piece');
                if (piece) {
                    piece.classList.remove('rotate-clockwise');
                }
                cell.classList.remove('inner-highlight');
            });
            
            outerCells.forEach(cell => {
                const piece = cell.querySelector('.piece');
                if (piece) {
                    piece.classList.remove('rotate-counter-clockwise');
                }
                cell.classList.remove('outer-highlight');
            });
            
            // Call the callback function to update the board state
            if (callback) callback();
        }, 850); // Animation time plus a small delay
    }
    
    // Handle cell click
    function handleCellClick(row, col) {
        // Check if it's the player's turn
        if (currentPlayer !== playerColor) {
            alert("Not your turn!");
            return;
        }
        
        // Check if cell is empty
        if (board[row][col] !== null) {
            alert("Cell already occupied!");
            return;
        }
        
        // Preview the move locally (this will be overwritten by server update)
        const clickedCell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
        const previewPiece = document.createElement('div');
        previewPiece.className = `piece ${playerColor} highlight`;
        clickedCell.appendChild(previewPiece);
        
        // Disable further clicks until server responds
        gameBoard.classList.add('board-disabled');
        
        // Send move to server
        socket.emit('makeMove', { row, col });
    }
    
    // Join game button click handler
    joinBtn.addEventListener('click', () => {
        playerName = playerNameInput.value.trim();
        if (!playerName) {
            alert('Please enter your name');
            return;
        }
        
        // Connect to server if not already connected
        if (!socket) {
            connectToServer();
        }
        
        // Join game
        socket.emit('joinGame', playerName);
    });
    
    // Play again button click handler
    playAgainBtn.addEventListener('click', () => {
        showScreen(welcomeScreen);
    });
    
    // Allow pressing Enter in the name input
    playerNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            joinBtn.click();
        }
    });
});