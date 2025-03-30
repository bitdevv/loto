document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const newGameBtn = document.getElementById('new-game-btn');
    const addTicketBtn = document.getElementById('add-ticket-btn');
    const drawNextBtn = document.getElementById('draw-next-btn');
    const drawAllBtn = document.getElementById('draw-all-btn');
    const clearStatsBtn = document.getElementById('clear-stats-btn'); // Clear Stats Btn
    const ticketsDisplayArea = document.getElementById('tickets-display-area');
    const drawnNumbersList = document.getElementById('drawn-numbers-list');
    const drawCountSpan = document.getElementById('draw-count');
    const statusMessages = document.getElementById('status-messages');
    const ticketCountSpan = document.getElementById('ticket-count');
    const totalCostSpan = document.getElementById('total-cost');
    const jackpotDrawInfoSpan = document.getElementById('jackpot-draw-info');
    // Lifetime Stats Spans
    const statsTotalTicketsSpan = document.getElementById('stats-total-tickets');
    const statsCenterWinsSpan = document.getElementById('stats-center-wins');
    const statsCornersWinsSpan = document.getElementById('stats-corners-wins');
    const statsDiagonalsWinsSpan = document.getElementById('stats-diagonals-wins');
    const statsOneMissingWinsSpan = document.getElementById('stats-one-missing-wins');
    const statsFullHouseWinsSpan = document.getElementById('stats-full-house-wins');
    const statsJackpotWinsSpan = document.getElementById('stats-jackpot-wins');


    // --- Game State Variables ---
    let playerTickets = []; // Array of ticket objects: { id, grid, wins }
    let allPossibleNumbers = []; // Array from 1 to 75
    let drawnNumbers = [];
    let drawInterval = null;
    let gameActive = false;
    let ticketCounter = 0;
    let jackpotDrawNumber = 0;
    let jackpotWasWonLastGame = false; // This should ideally be read from storage if persisting across browser close/open
    let lastDrawCountChecked = -1;
    let centerWinCheckDone = false; // <<< New flag for Center Win check

    // --- Lifetime Statistics State ---
    let lifetimeStats = {
        tickets: 0,
        center: 0,
        corners: 0,
        diagonals: 0,
        oneMissing: 0,
        fullHouse: 0,
        jackpot: 0
    };
    const STATS_STORAGE_KEY = 'bingoLottoLifetimeStats';


    // --- Constants ---
    const RANGES = { B: { min: 1, max: 15 }, I: { min: 16, max: 30 }, N: { min: 31, max: 45 }, G: { min: 46, max: 60 }, O: { min: 61, max: 75 } };
    const COLUMNS = ['B', 'I', 'N', 'G', 'O'];
    const GRID_SIZE = 5;
    const TOTAL_NUMBERS = 75;
    const CORNERS_DRAW_COUNT = 33;
    const DIAGONALS_DRAW_COUNT = 38;
    const MAX_TICKETS = 10;
    const TICKET_PRICE = 2;
    const DEFAULT_JACKPOT_DRAW = 50;
    const JACKPOT_DRAW_AFTER_WIN = 41;

    // --- Helper Functions ---
    function getRandomInt(min, max) { /* ... (no changes) ... */
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    function shuffleArray(array) { /* ... (no changes) ... */
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
    function addStatusMessage(message, type = 'info', ticketId = null) { /* ... (no changes) ... */
        const p = document.createElement('p');
        let prefix = '';
        if (ticketId !== null) {
            prefix = `<strong>Ticket #${ticketId}:</strong> `;
        }
        p.innerHTML = prefix + message;
        p.classList.add(type);
        statusMessages.appendChild(p);
        statusMessages.scrollTop = statusMessages.scrollHeight;
    }

    // --- Local Storage Functions ---
    function loadLifetimeStats() {
        const storedStats = localStorage.getItem(STATS_STORAGE_KEY);
        if (storedStats) {
            try {
                const parsedStats = JSON.parse(storedStats);
                // Validate and merge, ensuring all keys exist and are numbers
                Object.keys(lifetimeStats).forEach(key => {
                    lifetimeStats[key] = parseInt(parsedStats[key]) || 0;
                });
            } catch (error) {
                console.error("Error parsing lifetime stats from localStorage:", error);
                // Reset to defaults if parsing fails
                Object.keys(lifetimeStats).forEach(key => { lifetimeStats[key] = 0; });
            }
        } else {
             // Initialize if nothing is stored
             Object.keys(lifetimeStats).forEach(key => { lifetimeStats[key] = 0; });
        }
         console.log("Loaded lifetime stats:", lifetimeStats);
    }

    function saveLifetimeStats() {
        try {
            localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(lifetimeStats));
             console.log("Saved lifetime stats:", lifetimeStats);
        } catch (error) {
            console.error("Error saving lifetime stats to localStorage:", error);
             addStatusMessage("Could not save statistics.", 'error');
        }
    }

     function clearLifetimeStats() {
        if (confirm("Are you sure you want to clear all lifetime statistics? This cannot be undone.")) {
             Object.keys(lifetimeStats).forEach(key => { lifetimeStats[key] = 0; });
             saveLifetimeStats(); // Save the cleared stats
             updateLifetimeStatsUI(); // Update the display
             addStatusMessage("Lifetime statistics cleared.", 'info');
        }
    }


    // --- UI Update Functions ---
    function updateGameInfoUI() { /* ... (no changes) ... */
        ticketCountSpan.textContent = playerTickets.length;
        totalCostSpan.textContent = playerTickets.length * TICKET_PRICE;
        jackpotDrawInfoSpan.textContent = gameActive ? jackpotDrawNumber : "N/A (Game Ended)";
        if (gameActive && jackpotDrawNumber > 0) {
             jackpotDrawInfoSpan.textContent = `${jackpotDrawNumber}${jackpotDrawNumber === JACKPOT_DRAW_AFTER_WIN ? ' (Jackpot won last game)' : ''}`;
        } else if (!gameActive && playerTickets.length > 0) {
            jackpotDrawInfoSpan.textContent = "N/A (Game Ended)";
        } else {
             jackpotDrawInfoSpan.textContent = "N/A";
        }
    }
    function updateButtonStates() { /* ... (no changes) ... */
        const ticketsExist = playerTickets.length > 0;
        const maxTicketsReached = playerTickets.length >= MAX_TICKETS;

        addTicketBtn.disabled = gameActive || maxTicketsReached;
        drawNextBtn.disabled = !ticketsExist;
        drawAllBtn.disabled = !ticketsExist;
        newGameBtn.disabled = gameActive && drawnNumbers.length > 0; // Disable reset during active draw
        // Clear stats button is always enabled unless potentially disabled by game logic later
    }
    function updateLifetimeStatsUI() {
        statsTotalTicketsSpan.textContent = lifetimeStats.tickets;
        statsCenterWinsSpan.textContent = lifetimeStats.center;
        statsCornersWinsSpan.textContent = lifetimeStats.corners;
        statsDiagonalsWinsSpan.textContent = lifetimeStats.diagonals;
        statsOneMissingWinsSpan.textContent = lifetimeStats.oneMissing;
        statsFullHouseWinsSpan.textContent = lifetimeStats.fullHouse;
        statsJackpotWinsSpan.textContent = lifetimeStats.jackpot;
    }


    // --- Ticket Generation and Rendering ---
    function generateSingleTicketData() { /* ... (no changes) ... */
        ticketCounter++;
        const grid = [];
        const usedNumbers = new Set();
        const ticketId = ticketCounter;

        for (let col = 0; col < GRID_SIZE; col++) {
            const colLetter = COLUMNS[col];
            const { min, max } = RANGES[colLetter];
            const colNumbers = new Set();
            let attempts = 0; // Safety break

            while (colNumbers.size < GRID_SIZE && attempts < 1000) {
                 const num = getRandomInt(min, max);
                 if (!usedNumbers.has(num)) {
                     // Check if adding this number respects the column distribution (max 5 per range)
                     let countInColRange = 0;
                      grid.forEach(row => {
                         if(row && row[col] && row[col].number >=min && row[col].number <=max) countInColRange++;
                      });
                      if(Array.from(colNumbers).filter(n => n >= min && n <= max).length < GRID_SIZE){
                         colNumbers.add(num);
                         usedNumbers.add(num);
                      }
                 }
                 attempts++;
            }
             if (attempts >= 1000) {
                console.error(`Failed to generate unique numbers for column ${colLetter} on ticket ${ticketId}`);
                 addStatusMessage(`Error generating ticket ${ticketId}. Please try starting a new game.`, 'error');
                 return null; // Indicate failure
             }


            const sortedColNumbers = Array.from(colNumbers).sort((a, b) => a - b);

            for (let row = 0; row < GRID_SIZE; row++) {
                if (!grid[row]) {
                    grid[row] = [];
                }
                grid[row][col] = {
                    number: sortedColNumbers[row],
                    marked: false,
                    isCenter: (row === 2 && col === 2),
                    isCorner: (row === 0 || row === GRID_SIZE - 1) && (col === 0 || col === GRID_SIZE - 1),
                    isDiagonal1: row === col,
                    isDiagonal2: row + col === GRID_SIZE - 1
                };
            }
        }

        return {
            id: ticketId,
            grid: grid,
            wins: { center: false, corners: false, diagonals: false, fullHouse: false, oneMissing: false, jackpot: false }
        };
    }
    function renderTicket(ticket) { /* ... (no changes) ... */
        const wrapper = document.createElement('div');
        wrapper.classList.add('ticket-wrapper');
        wrapper.id = `ticket-${ticket.id}`;

        const heading = document.createElement('h3');
        heading.textContent = `Ticket #${ticket.id}`;
        wrapper.appendChild(heading);

        const table = document.createElement('table');
        table.classList.add('bingo-ticket-table'); // Use class selector
        const thead = document.createElement('thead');
        const tbody = document.createElement('tbody');
        table.appendChild(thead);
        table.appendChild(tbody);

        // Header Row (BINGO)
        const trHead = document.createElement('tr');
        COLUMNS.forEach(colLetter => {
            const th = document.createElement('th');
            th.textContent = colLetter;
            trHead.appendChild(th);
        });
        thead.appendChild(trHead);

        // Number Rows
        for (let row = 0; row < GRID_SIZE; row++) {
            const tr = document.createElement('tr');
            for (let col = 0; col < GRID_SIZE; col++) {
                const td = document.createElement('td');
                const cellData = ticket.grid[row][col];
                td.textContent = cellData.number; // *** CHANGE: Always show number ***
                td.dataset.number = cellData.number;
                td.dataset.row = row;
                td.dataset.col = col;
                td.dataset.ticketId = ticket.id; // Link cell to ticket

                if (cellData.marked) {
                    td.classList.add('marked');
                }
                tr.appendChild(td);
            }
            tbody.appendChild(tr);
        }

        wrapper.appendChild(table);
        ticketsDisplayArea.appendChild(wrapper);
    }
    function renderAllTickets() { /* ... (no changes) ... */
        ticketsDisplayArea.innerHTML = ''; // Clear previous tickets
        playerTickets.forEach(ticket => renderTicket(ticket));
    }


    // --- Game Flow and Logic ---

    function startNewGame() {
        clearInterval(drawInterval);

        jackpotDrawNumber = jackpotWasWonLastGame ? JACKPOT_DRAW_AFTER_WIN : DEFAULT_JACKPOT_DRAW;
        console.log(`New game started. Jackpot draw number set to: ${jackpotDrawNumber}`);

        playerTickets = [];
        drawnNumbers = [];
        allPossibleNumbers = Array.from({ length: TOTAL_NUMBERS }, (_, i) => i + 1);
        shuffleArray(allPossibleNumbers);
        gameActive = false;
        ticketCounter = 0;
        jackpotWasWonLastGame = false; // Reset jackpot flag for the new game session
        lastDrawCountChecked = -1;
        centerWinCheckDone = false; // <<< Reset Center Win check flag

        ticketsDisplayArea.innerHTML = '';
        drawnNumbersList.innerHTML = '';
        drawCountSpan.textContent = '0';
        statusMessages.innerHTML = '';

        addStatusMessage(`New game session started. Jackpot draw is #${jackpotDrawNumber}. Add tickets to begin.`, 'info');
        updateGameInfoUI();
        updateButtonStates();
        // Lifetime stats UI is updated on load and when stats change
    }

    function addTicket() {
        if (playerTickets.length >= MAX_TICKETS) { /* ... (no changes) ... */
            addStatusMessage("Maximum number of tickets (10) reached.", 'error');
            return;
        }
        if (gameActive) { /* ... (no changes) ... */
             addStatusMessage("Cannot add tickets while a draw is active.", 'error');
             return;
        }

        const newTicket = generateSingleTicketData();
         if (newTicket) {
            playerTickets.push(newTicket);
            renderTicket(newTicket);
            addStatusMessage(`Ticket #${newTicket.id} added.`, 'info');

            // --- Update Lifetime Stats ---
            lifetimeStats.tickets++;
            saveLifetimeStats();
            updateLifetimeStatsUI();
            // --- End Update ---

            if (!gameActive && playerTickets.length > 0) {
                addStatusMessage(`Ready to draw! Click "Draw Next" or "Draw Full Game".`, 'info');
            }
            updateGameInfoUI();
            updateButtonStates();
         }
    }

    function markNumberOnTickets(drawnNumber) { /* ... (no changes) ... */
        playerTickets.forEach(ticket => {
            for (let row = 0; row < GRID_SIZE; row++) {
                for (let col = 0; col < GRID_SIZE; col++) {
                    const cell = ticket.grid[row][col];
                    if (!cell.marked && cell.number === drawnNumber) {
                        cell.marked = true;
                        // Update corresponding TD element visually
                        const td = ticketsDisplayArea.querySelector(`td[data-ticket-id="${ticket.id}"][data-row="${row}"][data-col="${col}"]`);
                        if (td) {
                            td.classList.add('marked');
                        }
                        // No need to break loops, mark on all tickets where it exists
                    }
                }
            }
        });
    }
    function countMarkedCells(ticketGrid) { /* ... (no changes) ... */
        let count = 0;
        for (let row = 0; row < GRID_SIZE; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
                if (ticketGrid[row][col].marked) {
                    count++;
                }
            }
        }
        return count;
    }

    function checkWinConditions() {
        const drawCount = drawnNumbers.length;
        if (drawCount === lastDrawCountChecked || !gameActive) return;
        lastDrawCountChecked = drawCount;

        let isFirstFullHouse = true; // Flag for stopping game on first FH per draw cycle

        // --- Center Square Game (Check based on first N number drawn) ---
        if (!centerWinCheckDone && drawnNumbers.length > 0) {
            let firstNNumber = null;
            // Find the first number drawn that is in the N range
            for (const num of drawnNumbers) {
                if (num >= RANGES.N.min && num <= RANGES.N.max) {
                    firstNNumber = num;
                    break;
                }
            }

            if (firstNNumber !== null) {
                 console.log(`First N number identified: ${firstNNumber}`);
                playerTickets.forEach(ticket => {
                    const centerCell = ticket.grid[2][2];
                    if (!ticket.wins.center && centerCell.number === firstNNumber) {
                         // The cell should already be marked by markNumberOnTickets if it was drawn
                         if (centerCell.marked) {
                            ticket.wins.center = true;
                            lifetimeStats.center++; // Increment stat
                            saveLifetimeStats();    // Save stat
                            updateLifetimeStatsUI();// Update UI
                            addStatusMessage(`🏆 Center Square Game WIN! (Center [${centerCell.number}] matched first N draw [${firstNNumber}])`, 'win', ticket.id);
                         } else {
                             // This case shouldn't happen if markNumberOnTickets works correctly, but good for debugging
                             console.warn(`Ticket ${ticket.id}: Center cell ${centerCell.number} matched first N draw ${firstNNumber}, but wasn't marked.`);
                         }
                    }
                });
                centerWinCheckDone = true; // Mark check as done for this game
                 // Add a general status message after checking all tickets
                 let winnerFound = playerTickets.some(t => t.wins.center);
                 if (winnerFound) {
                     addStatusMessage(`Center Square win check complete (First N draw: ${firstNNumber}).`, 'stage-check');
                 } else {
                     addStatusMessage(`Center Square check (First N draw: ${firstNNumber}) - No win.`, 'stage-check');
                 }
            }
        }

        // --- Check other wins for each ticket ---
        playerTickets.forEach(ticket => {
            if (ticket.wins.fullHouse) return; // Skip checks if already won FH

            const currentMarkedCount = countMarkedCells(ticket.grid);
            let potentialOneMissingThisDraw = false;

             if (!ticket.wins.oneMissing && currentMarkedCount === (GRID_SIZE * GRID_SIZE - 1)) {
                potentialOneMissingThisDraw = true;
             }

            // --- Corners Game (Draw 33) ---
            if (drawCount === CORNERS_DRAW_COUNT && !ticket.wins.corners) {
                const corners = [ticket.grid[0][0], ticket.grid[0][4], ticket.grid[4][0], ticket.grid[4][4]];
                if (corners.every(cell => cell.marked)) {
                    ticket.wins.corners = true;
                    lifetimeStats.corners++; // Increment stat
                    saveLifetimeStats();     // Save stat
                    updateLifetimeStatsUI(); // Update UI
                    addStatusMessage(`🏆 Corners Game WIN! (Completed by draw ${CORNERS_DRAW_COUNT})`, 'win', ticket.id);
                } else if (ticket.id === playerTickets[0]?.id) { // Log check only once per game
                     addStatusMessage(`Draw ${CORNERS_DRAW_COUNT}: Corners check - No win`, 'stage-check');
                }
            }

            // --- Diagonals Game (Draw 38) ---
            if (drawCount === DIAGONALS_DRAW_COUNT && !ticket.wins.diagonals) {
                let diag1Marked = true, diag2Marked = true;
                for (let i = 0; i < GRID_SIZE; i++) {
                    if (!ticket.grid[i][i].marked) diag1Marked = false;
                    if (!ticket.grid[i][GRID_SIZE - 1 - i].marked) diag2Marked = false;
                }
                if (diag1Marked && diag2Marked) {
                    ticket.wins.diagonals = true;
                    lifetimeStats.diagonals++; // Increment stat
                    saveLifetimeStats();      // Save stat
                    updateLifetimeStatsUI();  // Update UI
                    addStatusMessage(`🏆 Diagonals Game WIN! (Completed by draw ${DIAGONALS_DRAW_COUNT})`, 'win', ticket.id);
                } else if (ticket.id === playerTickets[0]?.id) { // Log check only once per game
                    addStatusMessage(`Draw ${DIAGONALS_DRAW_COUNT}: Diagonals check - No win`, 'stage-check');
                }
            }

            // --- Full House Game ---
             if (currentMarkedCount === GRID_SIZE * GRID_SIZE && !ticket.wins.fullHouse && isFirstFullHouse) {
                 ticket.wins.fullHouse = true;
                 isFirstFullHouse = false; // Found the first winner for this draw
                 gameActive = false;       // Stop the entire game
                 clearInterval(drawInterval);
                 potentialOneMissingThisDraw = false;

                 lifetimeStats.fullHouse++; // Increment stat
                 saveLifetimeStats();       // Save stat
                 updateLifetimeStatsUI();   // Update UI

                 addStatusMessage(`🏆 FULL HOUSE WIN! (Draw ${drawCount})`, 'win', ticket.id);

                 if (drawCount === jackpotDrawNumber) {
                     ticket.wins.jackpot = true;
                     jackpotWasWonLastGame = true;
                     lifetimeStats.jackpot++; // Increment stat
                     saveLifetimeStats();     // Save stat
                     updateLifetimeStatsUI(); // Update UI
                     addStatusMessage(`🎉 JACKPOT WIN! (Full House on Jackpot Draw #${jackpotDrawNumber})`, 'jackpot', ticket.id);
                     console.log(`Jackpot won on ticket ${ticket.id}. Next game Jackpot draw will be ${JACKPOT_DRAW_AFTER_WIN}`);
                 } else {
                     console.log(`Full House on ticket ${ticket.id}. Draw ${drawCount} != Jackpot Draw ${jackpotDrawNumber}`);
                 }

                 addStatusMessage(`GAME OVER - Full House achieved.`, 'info');
                 updateButtonStates();
                 updateGameInfoUI();
             }

            // --- One Missing Game ---
             if (potentialOneMissingThisDraw && !ticket.wins.fullHouse && !ticket.wins.oneMissing) {
                 ticket.wins.oneMissing = true;
                 lifetimeStats.oneMissing++; // Increment stat
                 saveLifetimeStats();       // Save stat
                 updateLifetimeStatsUI();   // Update UI

                 let missingNumber = '?'; // Find missing number for message
                 for (let r = 0; r < GRID_SIZE; r++) {for (let c = 0; c < GRID_SIZE; c++) {if (!ticket.grid[r][c].marked) {missingNumber = ticket.grid[r][c].number;break;}} if (missingNumber !== '?') break;}
                 addStatusMessage(`🏆 One-Missing WIN! (Only [${missingNumber}] left before next draw)`, 'win', ticket.id);
             }
        }); // End forEach ticket

        // --- End of Draw Check ---
        if (gameActive && drawCount === TOTAL_NUMBERS) {
             gameActive = false;
             clearInterval(drawInterval);
             addStatusMessage(`Draw ${TOTAL_NUMBERS}: All numbers drawn. Game Over.`, 'info');
             updateButtonStates();
             updateGameInfoUI();
        }

         
        updateButtonStates();
        updateGameInfoUI();
         
    }


    function drawNextNumber() { /* ... (no changes except function call placement) ... */
        if (allPossibleNumbers.length === 0) { return; }
        if (!gameActive) gameActive = true;
        const drawnNumber = allPossibleNumbers.pop();
        drawnNumbers.push(drawnNumber);

        // Update UI for drawn number
        const numberDiv = document.createElement('div');
        numberDiv.classList.add('drawn-number');
        numberDiv.textContent = drawnNumber;
        drawnNumbersList.appendChild(numberDiv);
        drawCountSpan.textContent = drawnNumbers.length;
        drawnNumbersList.scrollTop = drawnNumbersList.scrollHeight;

        // Mark on ALL tickets
        markNumberOnTickets(drawnNumber);

        // Check for wins AFTER marking and AFTER updating drawnNumbers array
        checkWinConditions();
    }

    function drawFullGame() { /* ... (no changes) ... */
        if (!gameActive) gameActive = true;
        updateButtonStates(); // Disable buttons during auto draw
        clearInterval(drawInterval);
        addStatusMessage('Drawing remaining numbers automatically...', 'info');

        drawInterval = setInterval(() => {
            if (!gameActive || allPossibleNumbers.length === 0) {
                clearInterval(drawInterval);
                 if (gameActive && allPossibleNumbers.length === 0) {
                    addStatusMessage("All numbers drawn during auto-draw.", 'info');
                    gameActive = false;
                    checkWinConditions(); // Final check
                    updateButtonStates();
                    updateGameInfoUI();
                 } else if (!gameActive) {
                     addStatusMessage("Auto-draw stopped (Full House).", 'info');
                 }
                 updateButtonStates();
                 updateGameInfoUI();
                return;
            }
            drawNextNumber();
        }, 100);
    }


    // --- Event Listeners ---
    newGameBtn.addEventListener('click', startNewGame);
    addTicketBtn.addEventListener('click', addTicket);
    drawNextBtn.addEventListener('click', drawNextNumber);
    drawAllBtn.addEventListener('click', drawFullGame);
    clearStatsBtn.addEventListener('click', clearLifetimeStats); // Listener for clear button

    // --- Initial Setup ---
    loadLifetimeStats();    // Load stats from localStorage first
    updateLifetimeStatsUI();// Display loaded stats
    startNewGame();         // Initialize the game state (doesn't affect loaded stats)

}); // End DOMContentLoaded