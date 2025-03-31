# Spinny Connect Four

A multiplayer rotating Connect Four game with WebSockets.

## Game Rules

1. Players take turns placing their pieces (white or black) on a 4x4 grid
2. After each move, the inner 2x2 grid rotates 90 degrees clockwise:
   - Pieces in positions [1,1], [1,2], [2,2], and [2,1] rotate
   - Example: a piece at [1,1] moves to [1,2], a piece at [1,2] moves to [2,2], etc.
3. At the same time, pieces on the outer ring (all cells except the inner 2x2) shift one position counter-clockwise:
   - Top row: Each piece shifts left, with the leftmost piece moving down
   - Right column: Each piece shifts up, with the topmost piece moving left
   - Bottom row: Each piece shifts right, with the rightmost piece moving up
   - Left column: Each piece shifts down, with the bottommost piece moving right
   - Examples:
     - A piece at [0,2] shifts to [0,1]
     - A piece at [0,0] shifts to [1,0]
     - A piece at [2,0] shifts to [3,0]
     - A piece at [3,3] shifts to [3,2]
4. The first player to connect 4 same-colored pieces in a row (horizontal, vertical, or diagonal) wins
5. The movement happens automatically after each move, creating a dynamic and challenging game!

## Setup

1. Install dependencies:
   ```
   npm run install:all
   ```

## Development

1. Run the development server:
   ```
   npm run dev
   ```
   This will start both the frontend and backend servers.
   - Frontend will be available at: http://localhost:5000
   - Backend will be available at: http://localhost:3001

2. Open the frontend URL in two different browser windows to play against yourself, or share the URL with a friend if deployed.

## Gameplay

1. Enter your name and click "Join Game"
2. Wait for another player to join
3. Take turns placing pieces on the board
4. Watch as the board rotates after each move
5. First to connect 4 in a row wins!

## Deployment

This application can be deployed to several platforms:

### Render

1. Push your code to GitHub
2. Create a new Web Service on Render
3. Connect to your GitHub repository
4. Use the following settings:
   - Build Command: `npm run install:all`
   - Start Command: `npm run start`

### Railway

1. Push your code to GitHub
2. Create a new project on Railway
3. Connect to your GitHub repository
4. It should automatically detect and deploy your Node.js application

### Vercel

This application is best deployed to platforms that support WebSockets like Render or Railway, but can be deployed on Vercel with some modifications:

1. Push your code to GitHub
2. Create a new project on Vercel
3. Import your GitHub repository
4. Configure the project settings:
   - Build Command: `cd frontend && npm install && npm run build`
   - Output Directory: `frontend`
   - Development Command: `npm run dev`
5. Set up the backend separately on Render or Railway

## Structure

- `/frontend` - HTML/CSS/JS frontend with Socket.io client
- `/backend` - Express.js server with Socket.io for real-time communication

## Technologies Used

- **Frontend**: HTML, CSS, JavaScript, Socket.io client
- **Backend**: Node.js, Express, Socket.io
- **Communication**: WebSockets for real-time gameplay