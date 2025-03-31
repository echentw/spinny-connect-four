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
        // In production, the backend serves the frontend so we can use the same origin
        // In development, we need to specify the backend URL
        const serverUrl = window.location.origin;
            
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
            // Hide the preview piece during animation
            const previewPiece = document.getElementById('preview-piece');
            if (previewPiece) {
                previewPiece.style.opacity = '0';
            }
            
            // Store the new board state but don't apply it until animation is done
            const newBoard = data.board;
            const newCurrentPlayer = data.currentPlayer;
            
            // First show rotation animation, then update the board
            animateBoardRotation(() => {
                // After animation is complete, update the board state and game status
                board = newBoard;
                currentPlayer = newCurrentPlayer;
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
            
            // Remove faded original pieces
            const existingPiece = cell.querySelector('.piece');
            if (existingPiece) {
                cell.removeChild(existingPiece);
            }
            
            // Add piece if present in the new board state
            if (board[row][col]) {
                const piece = document.createElement('div');
                piece.className = `piece ${board[row][col]}`;
                
                // Only animate pieces that weren't in this position before
                const wasOccupiedBefore = existingPiece && 
                    ((existingPiece.classList.contains('white') && board[row][col] === 'white') || 
                     (existingPiece.classList.contains('black') && board[row][col] === 'black'));
                
                if (!wasOccupiedBefore) {
                    piece.animate([
                        { opacity: 0, transform: 'scale(0.9)' },
                        { opacity: 1, transform: 'scale(1)' }
                    ], {
                        duration: 200,
                        easing: 'ease-out'
                    });
                }
                
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
    
    // Animate the board rotation effect with actual piece movement
    function animateBoardRotation(callback) {
        // Get inner and outer indicators and add animation classes
        const innerIndicator = document.querySelector('.inner-indicator');
        const outerIndicator = document.querySelector('.outer-indicator');
        
        innerIndicator.classList.add('rotate-clockwise');
        outerIndicator.classList.add('pulse-animation');
        
        // Create a clone of the current board state to use for animation
        const currentBoardState = [];
        for (let row = 0; row < 4; row++) {
            currentBoardState[row] = [];
            for (let col = 0; col < 4; col++) {
                const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
                const piece = cell.querySelector('.piece');
                currentBoardState[row][col] = piece ? piece.className.includes('white') ? 'white' : 'black' : null;
                
                // Don't hide original pieces - we'll create animation pieces that overlay them
            }
        }
        
        // First, highlight the cells that will be animated
        const innerCells = document.querySelectorAll('.cell.inner');
        innerCells.forEach(cell => {
            cell.classList.add('inner-highlight');
        });
        
        const outerCells = document.querySelectorAll('.cell:not(.inner)');
        outerCells.forEach(cell => {
            cell.classList.add('outer-highlight');
        });
        
        // Create animation pieces immediately (no delay)
        // Inner 2x2 clockwise rotation animation
        if (currentBoardState[1][1]) createMovingPiece([1, 1], [1, 2], currentBoardState[1][1], 'rotate-move');
        if (currentBoardState[1][2]) createMovingPiece([1, 2], [2, 2], currentBoardState[1][2], 'rotate-move');
        if (currentBoardState[2][2]) createMovingPiece([2, 2], [2, 1], currentBoardState[2][2], 'rotate-move');
        if (currentBoardState[2][1]) createMovingPiece([2, 1], [1, 1], currentBoardState[2][1], 'rotate-move');
        
        // Outer ring shift animations - top row
        if (currentBoardState[0][3]) createMovingPiece([0, 3], [0, 2], currentBoardState[0][3], 'shift-move');
        if (currentBoardState[0][2]) createMovingPiece([0, 2], [0, 1], currentBoardState[0][2], 'shift-move');
        if (currentBoardState[0][1]) createMovingPiece([0, 1], [0, 0], currentBoardState[0][1], 'shift-move');
        if (currentBoardState[0][0]) createMovingPiece([0, 0], [1, 0], currentBoardState[0][0], 'shift-move');
        
        // Right column
        if (currentBoardState[1][3]) createMovingPiece([1, 3], [0, 3], currentBoardState[1][3], 'shift-move');
        if (currentBoardState[2][3]) createMovingPiece([2, 3], [1, 3], currentBoardState[2][3], 'shift-move');
        if (currentBoardState[3][3]) createMovingPiece([3, 3], [2, 3], currentBoardState[3][3], 'shift-move');
        
        // Bottom row
        if (currentBoardState[3][0]) createMovingPiece([3, 0], [3, 1], currentBoardState[3][0], 'shift-move');
        if (currentBoardState[3][1]) createMovingPiece([3, 1], [3, 2], currentBoardState[3][1], 'shift-move');
        if (currentBoardState[3][2]) createMovingPiece([3, 2], [3, 3], currentBoardState[3][2], 'shift-move');
        
        // Left column
        if (currentBoardState[1][0]) createMovingPiece([1, 0], [2, 0], currentBoardState[1][0], 'shift-move');
        if (currentBoardState[2][0]) createMovingPiece([2, 0], [3, 0], currentBoardState[2][0], 'shift-move');
        
        // After animation completes, remove all animation elements and show the updated board
        setTimeout(() => {
            innerIndicator.classList.remove('rotate-clockwise');
            outerIndicator.classList.remove('pulse-animation');
            
            innerCells.forEach(cell => {
                cell.classList.remove('inner-highlight');
            });
            
            outerCells.forEach(cell => {
                cell.classList.remove('outer-highlight');
            });
            
            // Remove all animation pieces
            document.querySelectorAll('.animation-piece').forEach(el => el.remove());
            
            // Call the callback function to update the board state with the server's data
            if (callback) callback();
        }, 1000); // Animation duration
    }
    
    // Helper function to create and animate a moving piece
    function createMovingPiece(fromPos, toPos, pieceColor, animationType) {
        const [fromRow, fromCol] = fromPos;
        const [toRow, toCol] = toPos;
        
        // Get position of source and target cells
        const fromCell = document.querySelector(`.cell[data-row="${fromRow}"][data-col="${fromCol}"]`);
        const toCell = document.querySelector(`.cell[data-row="${toRow}"][data-col="${toCol}"]`);
        
        if (!fromCell || !toCell) return;
        
        // Get the original piece and temporarily make it semi-transparent
        const originalPiece = fromCell.querySelector('.piece');
        if (originalPiece) {
            originalPiece.style.opacity = '0.3'; // Make original piece semi-transparent during animation
        }
        
        const fromRect = fromCell.getBoundingClientRect();
        const toRect = toCell.getBoundingClientRect();
        
        // Create animated piece
        const animPiece = document.createElement('div');
        animPiece.className = `piece ${pieceColor} animation-piece`;
        document.body.appendChild(animPiece);
        
        // Position at start
        const startX = fromRect.left + (fromRect.width / 2) - 25; // 25 is half the piece width
        const startY = fromRect.top + (fromRect.height / 2) - 25;
        animPiece.style.position = 'fixed';
        animPiece.style.left = startX + 'px';
        animPiece.style.top = startY + 'px';
        animPiece.style.zIndex = '1000';
        animPiece.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)'; // Add shadow for better visibility
        
        // Set end position for animation
        const endX = toRect.left + (toRect.width / 2) - 25;
        const endY = toRect.top + (toRect.height / 2) - 25;
        
        // For inner rotation, we want to rotate while moving
        if (animationType === 'rotate-move') {
            animPiece.style.transition = 'left 1s, top 1s, transform 1s';
            animPiece.style.transform = 'rotate(0deg)';
            
            // Start the animation immediately
            requestAnimationFrame(() => {
                animPiece.style.left = endX + 'px';
                animPiece.style.top = endY + 'px';
                animPiece.style.transform = 'rotate(90deg)';
            });
        } 
        // For outer shift, we just move without rotation
        else {
            animPiece.style.transition = 'left 1s, top 1s';
            
            // Start the animation immediately
            requestAnimationFrame(() => {
                animPiece.style.left = endX + 'px';
                animPiece.style.top = endY + 'px';
            });
        }
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
        previewPiece.id = 'preview-piece';
        clickedCell.appendChild(previewPiece);
        
        // Disable further clicks until server responds
        gameBoard.classList.add('board-disabled');
        
        // Add a "placement" animation to show the piece dropping into place
        previewPiece.animate([
            { transform: 'translateY(-50px) scale(0.8)', opacity: 0 },
            { transform: 'translateY(0) scale(1)', opacity: 1 }
        ], { 
            duration: 300,
            easing: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        });
        
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