document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const generateTicketBtn = document.getElementById('generateTicketBtn');
    const drawNumbersBtn = document.getElementById('drawNumbersBtn');
    const ticketDiv = document.getElementById('ticket');
    const drawnNumbersDiv = document.getElementById('drawnNumbers');
    const drawnCountSpan = document.getElementById('drawnCount');
    const matchResultP = document.getElementById('matchResult');

    // Game State
    let playerTicket = null; // Will hold the 5x5 grid data
    let ticketCells = {}; // To store references to TD elements { number: tdElement }
    let drawnNumbers = new Set(); // Use a Set for efficient lookup
    let allPossibleNumbers = []; // Array 1-75

    // Constants
    const TICKET_SIZE = 5;
    const NUMBERS_PER_COLUMN = 15;
    const MAX_NUMBER = 75;
    const NUM_BALLS_TO_DRAW = 75; // <<< How many numbers to draw in a game
    const COLUMN_LETTERS = ['B', 'I', 'N', 'G', 'O'];
    // REMOVED: const FREE_SPACE_INDEX = { row: 2, col: 2 };

    // --- Initialization ---
    function initializeGame() {
        allPossibleNumbers = Array.from({ length: MAX_NUMBER }, (_, i) => i + 1);
        generateTicketBtn.addEventListener('click', generateNewTicket);
        drawNumbersBtn.addEventListener('click', drawWinningNumbers);
        resetGameDisplay(); // Set initial UI state
    }

    // --- Ticket Generation ---
    function generateNewTicket() {
        playerTicket = generateBingoCardData();
        displayTicket(playerTicket);
        resetDrawArea(); // Clear previous draw results if any
        drawNumbersBtn.disabled = false; // Enable drawing
        matchResultP.textContent = ''; // Clear previous match results
        console.log("New ticket generated:", playerTicket);
    }

    function generateBingoCardData() {
        const card = Array(TICKET_SIZE).fill(null).map(() => Array(TICKET_SIZE).fill(null));
        ticketCells = {}; // Reset cell references

        for (let col = 0; col < TICKET_SIZE; col++) {
            const min = col * NUMBERS_PER_COLUMN + 1;
            const max = (col + 1) * NUMBERS_PER_COLUMN;
            // Need TICKET_SIZE unique numbers for the column
            const columnNumbers = getRandomUniqueNumbers(min, max, TICKET_SIZE);

            for (let row = 0; row < TICKET_SIZE; row++) {
                // *** REMOVED FREE SPACE LOGIC ***
                // Just assign the next number from the generated list for the column
                card[row][col] = columnNumbers.pop();
            }
        }
        return card;
    }

    function getRandomUniqueNumbers(min, max, count) {
        const numbers = new Set();
        while (numbers.size < count) {
            const randomNum = Math.floor(Math.random() * (max - min + 1)) + min;
            numbers.add(randomNum);
        }
        // Convert Set to Array and shuffle it slightly so popping isn't predictable
        return Array.from(numbers).sort(() => Math.random() - 0.5);
    }

    function displayTicket(ticketData) {
        ticketDiv.innerHTML = ''; // Clear previous ticket
        const table = document.createElement('table');
        const thead = document.createElement('thead');
        const tbody = document.createElement('tbody');

        // Create header row (B, I, N, G, O)
        const headerRow = document.createElement('tr');
        COLUMN_LETTERS.forEach(letter => {
            const th = document.createElement('th');
            th.textContent = letter;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);

        // Create data rows
        for (let row = 0; row < TICKET_SIZE; row++) {
            const tr = document.createElement('tr');
            for (let col = 0; col < TICKET_SIZE; col++) {
                const td = document.createElement('td');
                const cellValue = ticketData[row][col];
                td.textContent = cellValue;
                td.dataset.row = row; // Store row/col for potential future use
                td.dataset.col = col;
                td.dataset.number = cellValue; // Store the number in data attribute
                ticketCells[cellValue] = td; // Store reference for quick lookup

                 // *** REMOVED FREE SPACE CLASS HANDLING ***

                tr.appendChild(td);
            }
            tbody.appendChild(tr);
        }

        table.appendChild(thead);
        table.appendChild(tbody);
        ticketDiv.appendChild(table);
    }

    // --- Drawing Numbers ---
    function drawWinningNumbers() {
        if (!playerTicket) {
            alert("Please generate a ticket first!");
            return;
        }
        resetDrawArea(); // Clear previous results before new draw

        // Shuffle all possible numbers (1-75)
        const shuffledNumbers = shuffleArray([...allPossibleNumbers]);

        // *** DRAW ONLY A SUBSET OF NUMBERS ***
        const currentDraw = shuffledNumbers.slice(0, NUM_BALLS_TO_DRAW);
        drawnNumbers = new Set(currentDraw); // Store only the drawn subset

        displayDrawnNumbers(currentDraw); // Display only the drawn subset
        checkMatches();

        // Optionally disable draw button after drawing once per ticket
        // drawNumbersBtn.disabled = true;
        console.log(`Drawn ${NUM_BALLS_TO_DRAW} numbers:`, currentDraw);
    }

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]]; // Swap elements
        }
        return array;
    }

    function displayDrawnNumbers(numbers) {
        drawnNumbersDiv.innerHTML = ''; // Clear previous numbers
        numbers.forEach(num => {
            const span = document.createElement('span');
            span.textContent = num;
            span.classList.add('drawn-number');
            drawnNumbersDiv.appendChild(span);
        });
        // Update count based on actual numbers drawn and displayed
        drawnCountSpan.textContent = numbers.length;
        // Update heading text
        const drawnHeading = drawnNumbersDiv.closest('.drawn-section').querySelector('h2');
        if(drawnHeading) {
             drawnHeading.innerHTML = `Drawn Numbers (<span id="drawnCount">${numbers.length}</span>/${MAX_NUMBER})`;
        }
    }


    // --- Checking Matches ---
    function checkMatches() {
        if (!playerTicket || drawnNumbers.size === 0) return;

        let matchCount = 0;

        // Reset previous matches visually
        Object.values(ticketCells).forEach(cell => cell.classList.remove('matched'));

        // Iterate through the player's ticket numbers (using the stored references)
        for (const numberStr in ticketCells) {
            const number = parseInt(numberStr); // Ensure we compare numbers
            const cellElement = ticketCells[numberStr];
            if (drawnNumbers.has(number)) { // Check if the number was drawn
                cellElement.classList.add('matched');
                matchCount++;
            }
        }

        // *** REMOVED FREE SPACE MATCHING LOGIC ***

        matchResultP.textContent = `You matched ${matchCount} out of ${Object.keys(ticketCells).length} numbers on your ticket!`;
        console.log(`Matches found: ${matchCount}`);
    }

    // --- Resetting ---
    function resetDrawArea() {
        drawnNumbers = new Set();
        drawnNumbersDiv.innerHTML = '<p>Waiting for draw...</p>';
        // Reset count and heading
        drawnCountSpan.textContent = '0';
         const drawnHeading = drawnNumbersDiv.closest('.drawn-section')?.querySelector('h2');
         if (drawnHeading) {
            drawnHeading.innerHTML = `Drawn Numbers (<span id="drawnCount">0</span>/${MAX_NUMBER})`;
         }

        matchResultP.textContent = '';
        // Also reset visual matches on the ticket if resetting the draw
        if(playerTicket) {
             Object.values(ticketCells).forEach(cell => cell.classList.remove('matched'));
        }
    }

     function resetGameDisplay() {
        ticketDiv.innerHTML = '<p>Please generate a ticket.</p>';
        drawNumbersBtn.disabled = true;
        resetDrawArea();
        playerTicket = null; // Ensure ticket is cleared
        ticketCells = {}; // Ensure cell references are cleared
    }

    // --- Start the game ---
    initializeGame();
});