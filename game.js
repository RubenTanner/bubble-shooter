// Game constants
const COLOURS = ["#FF47C7", "#47F9FF", "#FFDD47", "#47FF8D", "#FF6B47"];
const BUBBLE_RADIUS = 20;
const GRID_ROWS = 8;
const GRID_COLS = 12;
const GRID_TOP_MARGIN = 40;
const CANNON_HEIGHT = 60;
const CANNON_WIDTH = 40;
const SHOOT_SPEED = 10;
const MATCH_COUNT = 3;

// Game variables
let canvas, ctx;
let bubbleGrid = [];
let shooterBubble = null;
let nextBubble = null;
let cannonAngle = 0;
let bubbleMoving = false;
let score = 0;
let gameOver = false;

// init the game
function init() {
  canvas = document.getElementById("gameCanvas");
  ctx = canvas.getContext("2d");

  // Set canvas size
  canvas.width = Math.min(600, window.innerWidth - 40);
  canvas.height = Math.min(800, window.innerHeight - 200);

  // init bubble grid
  initBubbleGrid();

  // Create shooter bubble and next bubble
  createShooterBubble();
  createNextBubble();

  // Reset score
  score = 0;
  document.getElementById("score").textContent = score;

  // Set game over to false
  gameOver = false;

  // Add event listeners
  canvas.addEventListener("mousemove", handleMouseMove);
  canvas.addEventListener("click", handleClick);
  document.getElementById("restart-btn").addEventListener("click", restartGame);

  // Start game loop
  requestAnimationFrame(gameLoop);
}

// init bubble grid
function initBubbleGrid() {
  bubbleGrid = [];

  // Calculate bubble spacing
  const bubbleSpacing = BUBBLE_RADIUS * 2;
  const offsetX =
    (canvas.width - GRID_COLS * bubbleSpacing) / 2 + BUBBLE_RADIUS;

  // Create initial rows of bubbles
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      // Offset every other row
      const rowOffset = row % 2 === 0 ? 0 : BUBBLE_RADIUS;

      // Only create a bubble with 80% probability for a more interesting pattern
      if (Math.random() < 0.8) {
        const bubble = {
          x: offsetX + col * bubbleSpacing + rowOffset,
          y: GRID_TOP_MARGIN + row * bubbleSpacing,
          radius: BUBBLE_RADIUS,
          color: COLOURS[Math.floor(Math.random() * COLOURS.length)],
          row: row,
          col: col,
        };
        bubbleGrid.push(bubble);
      }
    }
  }
}

// Create a new shooter bubble
function createShooterBubble() {
  shooterBubble = {
    x: canvas.width / 2,
    y: canvas.height - CANNON_HEIGHT - BUBBLE_RADIUS,
    radius: BUBBLE_RADIUS,
    color: COLOURS[Math.floor(Math.random() * COLOURS.length)],
    velocityX: 0,
    velocityY: 0,
    moving: false,
  };
}

// Create the next bubble
function createNextBubble() {
  nextBubble = {
    color: COLOURS[Math.floor(Math.random() * COLOURS.length)],
  };
}

// Handle mouse movement
function handleMouseMove(e) {
  if (bubbleMoving || gameOver) return;

  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  // Calculate angle between cannon and mouse position
  const cannonX = canvas.width / 2;
  const cannonY = canvas.height - CANNON_HEIGHT;

  cannonAngle = Math.atan2(mouseX - cannonX, cannonY - mouseY);

  // Limit the angle to prevent shooting sideways or downwards
  cannonAngle = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, cannonAngle));
}

// Handle mouse click
function handleClick() {
  if (bubbleMoving || gameOver) return;

  // Set bubble in motion
  shooterBubble.velocityX = Math.sin(cannonAngle) * SHOOT_SPEED;
  shooterBubble.velocityY = -Math.cos(cannonAngle) * SHOOT_SPEED;
  shooterBubble.moving = true;
  bubbleMoving = true;
}

// Update game state
function update() {
  if (gameOver) return;

  // Update shooter bubble position if it's moving
  if (shooterBubble.moving) {
    shooterBubble.x += shooterBubble.velocityX;
    shooterBubble.y += shooterBubble.velocityY;

    // Check for wall collisions
    if (
      shooterBubble.x - shooterBubble.radius < 0 ||
      shooterBubble.x + shooterBubble.radius > canvas.width
    ) {
      shooterBubble.velocityX *= -1;
      shooterBubble.x =
        shooterBubble.x < BUBBLE_RADIUS
          ? BUBBLE_RADIUS
          : canvas.width - BUBBLE_RADIUS;
    }

    // Check for ceiling collision
    if (shooterBubble.y - shooterBubble.radius < 0) {
      snapToGrid();
      return;
    }

    // Check for collisions with other bubbles
    for (const bubble of bubbleGrid) {
      const dx = shooterBubble.x - bubble.x;
      const dy = shooterBubble.y - bubble.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < shooterBubble.radius + bubble.radius) {
        snapToGrid();
        return;
      }
    }
  }
}

// Snap the shooter bubble to the grid
function snapToGrid() {
  // Calculate bubble spacing
  const bubbleSpacing = BUBBLE_RADIUS * 2;
  const offsetX =
    (canvas.width - GRID_COLS * bubbleSpacing) / 2 + BUBBLE_RADIUS;

  // Find the closest grid position
  let closestRow = Math.round(
    (shooterBubble.y - GRID_TOP_MARGIN) / bubbleSpacing
  );
  closestRow = Math.max(0, Math.min(GRID_ROWS - 1, closestRow));

  const rowOffset = closestRow % 2 === 0 ? 0 : BUBBLE_RADIUS;
  let closestCol = Math.round(
    (shooterBubble.x - offsetX - rowOffset) / bubbleSpacing
  );
  closestCol = Math.max(0, Math.min(GRID_COLS - 1, closestCol));

  // Check if the position is already occupied
  const isOccupied = bubbleGrid.some(
    (bubble) => bubble.row === closestRow && bubble.col === closestCol
  );

  if (!isOccupied) {
    // Add the bubble to the grid
    const newBubble = {
      x: offsetX + closestCol * bubbleSpacing + rowOffset,
      y: GRID_TOP_MARGIN + closestRow * bubbleSpacing,
      radius: BUBBLE_RADIUS,
      color: shooterBubble.color,
      row: closestRow,
      col: closestCol,
    };

    bubbleGrid.push(newBubble);

    // Check for matches
    const matches = findMatches(newBubble);
    if (matches.length >= MATCH_COUNT) {
      // Pop the matching bubbles
      popBubbles(matches);

      // Check for floating bubbles
      checkFloatingBubbles();

      // Update score
      score += matches.length * 10;
      document.getElementById("score").textContent = score;
    }

    // Check if the grid has reached the bottom
    if (
      bubbleGrid.some(
        (bubble) =>
          bubble.y + bubble.radius >
          canvas.height - CANNON_HEIGHT - BUBBLE_RADIUS
      )
    ) {
      gameOver = true;
      return;
    }
  }

  // Reset shooter bubble
  shooterBubble = {
    x: canvas.width / 2,
    y: canvas.height - CANNON_HEIGHT - BUBBLE_RADIUS,
    radius: BUBBLE_RADIUS,
    color: nextBubble.color,
    velocityX: 0,
    velocityY: 0,
    moving: false,
  };

  // Create new next bubble
  createNextBubble();

  // Reset bubble moving flag
  bubbleMoving = false;
}

// Find matching bubbles of the same color
function findMatches(bubble) {
  const matches = [bubble];
  const checked = new Set();

  function checkNeighbours(currentBubble) {
    const key = `${currentBubble.row},${currentBubble.col}`;
    if (checked.has(key)) return;
    checked.add(key);

    // Get neighbours
    const neighbours = getNeighbours(currentBubble);

    // Check each neighbour
    for (const neighbour of neighbours) {
      if (neighbour.color === bubble.color) {
        matches.push(neighbour);
        checkNeighbours(neighbour);
      }
    }
  }

  checkNeighbours(bubble);
  return matches;
}

// Get neighbouring bubbles
function getNeighbours(bubble) {
  const neighbours = [];
  const directions =
    bubble.row % 2 === 0
      ? [
          [-1, -1],
          [-1, 0],
          [0, -1],
          [0, 1],
          [1, -1],
          [1, 0],
        ]
      : [
          [-1, 0],
          [-1, 1],
          [0, -1],
          [0, 1],
          [1, 0],
          [1, 1],
        ];

  for (const [rowOffset, colOffset] of directions) {
    const neighbourRow = bubble.row + rowOffset;
    const neighbourCol = bubble.col + colOffset;

    // Find the bubble at this position
    const neighbour = bubbleGrid.find(
      (b) => b.row === neighbourRow && b.col === neighbourCol
    );

    if (neighbour) {
      neighbours.push(neighbour);
    }
  }

  return neighbours;
}

// Pop the matching bubbles
function popBubbles(matches) {
  // Remove the matching bubbles from the grid
  bubbleGrid = bubbleGrid.filter(
    (bubble) =>
      !matches.some(
        (match) => match.row === bubble.row && match.col === bubble.col
      )
  );
}

// Check for floating bubbles
function checkFloatingBubbles() {
  // Mark all bubbles as not visited
  const visited = new Set();

  // Find all bubbles connected to the top
  for (const bubble of bubbleGrid) {
    if (bubble.row === 0) {
      markConnected(bubble, visited);
    }
  }

  // Remove all bubbles that are not connected to the top
  const floatingBubbles = bubbleGrid.filter(
    (bubble) => !visited.has(`${bubble.row},${bubble.col}`)
  );

  // Update score for floating bubbles
  score += floatingBubbles.length * 20;
  document.getElementById("score").textContent = score;

  // Remove floating bubbles
  bubbleGrid = bubbleGrid.filter((bubble) =>
    visited.has(`${bubble.row},${bubble.col}`)
  );
}

// Mark connected bubbles
function markConnected(bubble, visited) {
  const key = `${bubble.row},${bubble.col}`;
  if (visited.has(key)) return;
  visited.add(key);

  // Get neighbours
  const neighbours = getNeighbours(bubble);

  // Mark each neighbour as connected
  for (const neighbour of neighbours) {
    markConnected(neighbour, visited);
  }
}

// Draw the game
function draw() {
  // Clear the canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw background grid pattern
  drawBackgroundGrid();

  // Draw bubble grid
  for (const bubble of bubbleGrid) {
    drawBubble(bubble);
  }

  // Draw shooter bubble
  drawBubble(shooterBubble);

  //draw aim line
  drawAimLine();

  // Draw next bubble preview
  drawNextBubble();

  // Draw cannon
  drawCannon();

  // Draw game over message
  if (gameOver) {
    drawGameOver();
  }
}

// Draw background grid pattern
function drawBackgroundGrid() {
  ctx.save();
  ctx.globalAlpha = 0.1;
  ctx.strokeStyle = "#ffffff";

  const gridSize = 20;

  for (let x = 0; x < canvas.width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  for (let y = 0; y < canvas.height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  ctx.restore();
}

function drawAimLine() {
  //find the cannon angle
  const cannonX = canvas.width / 2;
  const cannonY = canvas.height - CANNON_HEIGHT;

  // Calculate the direction vector for the aim line
  let dirX = Math.sin(cannonAngle);
  let dirY = -Math.cos(cannonAngle);

  // Start from the cannon position
  let startX = cannonX;
  let startY = cannonY;

  // Set a maximum number of bounces to avoid infinite loops
  let maxBounces = 3;
  let bounces = 0;

  // Store the points for the aim line
  let points = [{ x: startX, y: startY }];

  while (bounces < maxBounces) {
    // Calculate intersection with left and right walls
    let tLeft = dirX < 0 ? (0 - startX) / dirX : Infinity;
    let tRight = dirX > 0 ? (canvas.width - startX) / dirX : Infinity;
    let tTop = dirY < 0 ? (0 - startY) / dirY : Infinity;

    // Find the nearest intersection
    let t = Math.min(tLeft, tRight, tTop);

    // Calculate intersection point
    let hitX = startX + dirX * t;
    let hitY = startY + dirY * t;

    points.push({ x: hitX, y: hitY });

    // If hit the top, stop
    if (t === tTop) break;

    // If hit left or right wall, reflect direction and continue
    if (t === tLeft || t === tRight) {
      dirX = -dirX;
      startX = hitX;
      startY = hitY;
      bounces++;
    } else {
      break;
    }
  }

  // Draw the aim line using the calculated points
  ctx.save();
  ctx.strokeStyle = "#FFFF";
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  ctx.save();
}

// Draw a bubble
function drawBubble(bubble) {
  ctx.beginPath();
  ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
  ctx.fillStyle = bubble.color;
  ctx.fill();

  // Add highlight
  ctx.beginPath();
  ctx.arc(
    bubble.x - bubble.radius * 0.3,
    bubble.y - bubble.radius * 0.3,
    bubble.radius * 0.3,
    0,
    Math.PI * 2
  );
  ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
  ctx.fill();

  // Add outline
  ctx.beginPath();
  ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
  ctx.lineWidth = 2;
  ctx.stroke();
}

// Draw the next bubble preview
function drawNextBubble() {
  const x = canvas.width - 50;
  const y = canvas.height - 50;

  // Draw label
  ctx.fillStyle = "#ffffff";
  ctx.font = '10px "Press Start 2P"';
  ctx.textAlign = "right";
  ctx.fillText("NEXT:", x - 20, y - 5);

  // Draw bubble
  ctx.beginPath();
  ctx.arc(x, y, BUBBLE_RADIUS * 0.8, 0, Math.PI * 2);
  ctx.fillStyle = nextBubble.color;
  ctx.fill();

  // Add highlight
  ctx.beginPath();
  ctx.arc(
    x - BUBBLE_RADIUS * 0.24,
    y - BUBBLE_RADIUS * 0.24,
    BUBBLE_RADIUS * 0.24,
    0,
    Math.PI * 2
  );
  ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
  ctx.fill();

  // Add outline
  ctx.beginPath();
  ctx.arc(x, y, BUBBLE_RADIUS * 0.8, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
  ctx.lineWidth = 2;
  ctx.stroke();
}

// Draw the cannon
function drawCannon() {
  const cannonX = canvas.width / 2;
  const cannonY = canvas.height - CANNON_HEIGHT / 2;

  ctx.save();
  ctx.translate(cannonX, cannonY);
  ctx.rotate(cannonAngle);

  // Draw cannon base
  ctx.beginPath();
  ctx.arc(0, CANNON_HEIGHT / 2, CANNON_WIDTH / 1.5, 0, Math.PI, true);
  ctx.fillStyle = "#8B4513";
  ctx.fill();

  // Draw cannon barrel
  ctx.beginPath();
  ctx.rect(
    -CANNON_WIDTH / 4,
    -CANNON_HEIGHT / 2,
    CANNON_WIDTH / 2,
    CANNON_HEIGHT
  );
  ctx.fillStyle = "#A52A2A";
  ctx.fill();
  ctx.strokeStyle = "#8B4513";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.restore();
}

// Draw game over message
function drawGameOver() {
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#FF47C7";
  ctx.font = '30px "Press Start 2P"';
  ctx.textAlign = "center";
  ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 20);

  ctx.fillStyle = "#ffffff";
  ctx.font = '16px "Press Start 2P"';
  ctx.fillText(
    `FINAL SCORE: ${score}`,
    canvas.width / 2,
    canvas.height / 2 + 20
  );

  ctx.fillStyle = "#47F9FF";
  ctx.font = '12px "Press Start 2P"';
  ctx.fillText(
    "CLICK RESTART TO PLAY AGAIN",
    canvas.width / 2,
    canvas.height / 2 + 60
  );
}

// Restart the game
function restartGame() {
  initBubbleGrid();
  createShooterBubble();
  createNextBubble();
  score = 0;
  document.getElementById("score").textContent = score;
  gameOver = false;
}

// Game loop
function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

// Start the game when the window loads
window.addEventListener("load", init);

// Handle window resize
window.addEventListener("resize", function () {
  // Preserve the current game state
  const oldWidth = canvas.width;
  const oldHeight = canvas.height;

  // Resize canvas
  canvas.width = Math.min(600, window.innerWidth - 40);
  canvas.height = Math.min(800, window.innerHeight - 200);

  // Scale bubble positions
  const scaleX = canvas.width / oldWidth;
  const scaleY = canvas.height / oldHeight;

  for (const bubble of bubbleGrid) {
    bubble.x *= scaleX;
    bubble.y *= scaleY;
  }

  if (shooterBubble) {
    shooterBubble.x *= scaleX;
    shooterBubble.y *= scaleY;
  }
});
