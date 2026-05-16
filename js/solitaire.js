const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUIT_SYMBOLS = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠'
};

const state = {
    deck: [],
    stock: [],
    waste: [],
    foundations: [[], [], [], []],
    tableaus: [[], [], [], [], [], [], []],
    moves: 0,
    time: 0,
    score: 0,
    timerInterval: null,
    draggedCards: [],
    sourcePile: null,
    startX: 0,
    startY: 0,
    eventsSetup: false
};

let stateHistory = [];
let isAnimating = false; // Bloqueia cliques durante animações

// DOM Elements
const elements = {
    stock: document.getElementById('stock'),
    waste: document.getElementById('waste'),
    foundations: [
        document.getElementById('foundation-0'),
        document.getElementById('foundation-1'),
        document.getElementById('foundation-2'),
        document.getElementById('foundation-3')
    ],
    tableaus: [
        document.getElementById('tableau-0'),
        document.getElementById('tableau-1'),
        document.getElementById('tableau-2'),
        document.getElementById('tableau-3'),
        document.getElementById('tableau-4'),
        document.getElementById('tableau-5'),
        document.getElementById('tableau-6')
    ],
    movesCount: document.getElementById('moves-count'),
    scoreCount: document.getElementById('score-count'),
    timer: document.getElementById('timer'),
    restartBtn: document.getElementById('restart-btn'),
    winScreen: document.getElementById('win-screen'),
    winRestartBtn: document.getElementById('win-restart-btn'),
    winTime: document.getElementById('win-time'),
    winMoves: document.getElementById('win-moves'),
    winScore: document.getElementById('win-score'),
    undoBtn: document.getElementById('undo-btn'),
    autoBtn: document.getElementById('auto-btn'),
    noMovesScreen: document.getElementById('no-moves-screen'),
    noMovesUndoBtn: document.getElementById('no-moves-undo-btn'),
    noMovesRestartBtn: document.getElementById('no-moves-restart-btn')
};

// Initialize
function init() {
    clearBoard();
    resetState();
    createDeck();
    shuffleDeck();
    dealCards();
    startTimer();
    renderAll();
    setupEvents();
}

function resetState() {
    state.deck = [];
    state.stock = [];
    state.waste = [];
    state.foundations = [[], [], [], []];
    state.tableaus = [[], [], [], [], [], [], []];
    state.moves = 0;
    state.time = 0;
    state.score = 0;
    state.draggedCards = [];
    state.sourcePile = null;
    stateHistory = [];
    if (elements.undoBtn) elements.undoBtn.disabled = true;
    if (elements.autoBtn) elements.autoBtn.style.display = 'none';
    if (elements.noMovesScreen) elements.noMovesScreen.classList.remove('show');
    clearInterval(state.timerInterval);
    updateStats();
    elements.winScreen.classList.remove('show');
    
    // Remove ALL win canvases in case multiple were created
    document.querySelectorAll('#win-canvas').forEach(c => c.remove());
}

function clearBoard() {
    elements.stock.innerHTML = '';
    elements.waste.innerHTML = '';
    elements.foundations.forEach(el => el.innerHTML = '');
    elements.tableaus.forEach(el => el.innerHTML = '');
}

function createDeck() {
    for (let suit of SUITS) {
        for (let i = 0; i < RANKS.length; i++) {
            state.deck.push({
                suit: suit,
                rank: RANKS[i],
                value: i + 1,
                color: (suit === 'hearts' || suit === 'diamonds') ? 'red' : 'black',
                faceUp: false,
                id: `${suit}-${RANKS[i]}`
            });
        }
    }
}

function shuffleDeck() {
    for (let i = state.deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [state.deck[i], state.deck[j]] = [state.deck[j], state.deck[i]];
    }
}

function dealCards() {
    let cardIndex = 0;
    for (let i = 0; i < 7; i++) {
        for (let j = i; j < 7; j++) {
            const card = state.deck[cardIndex++];
            if (i === j) {
                card.faceUp = true;
            }
            state.tableaus[j].push(card);
        }
    }
    while (cardIndex < state.deck.length) {
        state.stock.push(state.deck[cardIndex++]);
    }
}

function formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

function updateStats() {
    elements.movesCount.textContent = state.moves;
    elements.timer.textContent = formatTime(state.time);
    if(elements.scoreCount) elements.scoreCount.textContent = state.score;
    // Sync mobile stats bar
    const mScore = document.getElementById('score-count-m');
    const mMoves = document.getElementById('moves-count-m');
    const mTimer = document.getElementById('timer-m');
    if(mScore) mScore.textContent = state.score;
    if(mMoves) mMoves.textContent = state.moves;
    if(mTimer) mTimer.textContent = formatTime(state.time);
}

function updateScore(points) {
    state.score = Math.max(0, state.score + points);
    updateStats();
}

function startTimer() {
    state.timerInterval = setInterval(() => {
        state.time++;
        const t = formatTime(state.time);
        elements.timer.textContent = t;
        const mTimer = document.getElementById('timer-m');
        if(mTimer) mTimer.textContent = t;
    }, 1000);
}

function createCardElement(card) {
    const el = document.createElement('div');
    el.className = `card ${card.faceUp ? card.color : 'face-down'}`;
    el.dataset.id = card.id;
    // Magic for buttery smooth animations when moving!
    el.style.viewTransitionName = `card-${card.suit}-${card.rank}`;
    
    if (card.faceUp) {
        el.innerHTML = `
            <div class="top-left">
                <span>${card.rank}</span>
                <span>${SUIT_SYMBOLS[card.suit]}</span>
            </div>
            <div class="center-suit">${SUIT_SYMBOLS[card.suit]}</div>
            <div class="bottom-right">
                <span>${card.rank}</span>
                <span>${SUIT_SYMBOLS[card.suit]}</span>
            </div>
        `;
    }
    return el;
}

function renderPile(cards, container, pileType) {
    container.innerHTML = '';
    cards.forEach((card, index) => {
        const el = createCardElement(card);
        if (pileType === 'tableau') {
            el.style.top = `${index * 25}px`;
        }
        container.appendChild(el);
    });
}

function _renderAll() {
    renderPile(state.stock, elements.stock, 'stock');
    renderPile(state.waste, elements.waste, 'waste');
    
    state.foundations.forEach((pile, i) => {
        renderPile(pile, elements.foundations[i], 'foundation');
    });
    
    state.tableaus.forEach((pile, i) => {
        renderPile(pile, elements.tableaus[i], 'tableau');
    });
    
    checkWin();
}

function renderAll() {
    // Cancela transforms a meio para snapshot correto
    document.querySelectorAll('.card').forEach(el => {
        if (el.style.transition || el.style.transform) {
            el.style.transition = 'none';
            el.style.transform = '';
        }
    });

    // Universal smooth animation (FLIP technique)
    const oldRects = {};
    document.querySelectorAll('.card').forEach(el => {
        oldRects[el.dataset.id] = el.getBoundingClientRect();
    });

    _renderAll();

    const newElements = document.querySelectorAll('.card');
    newElements.forEach(el => {
        const id = el.dataset.id;
        const oldRect = oldRects[id];
        if (oldRect) {
            const newRect = el.getBoundingClientRect();
            const dx = oldRect.left - newRect.left;
            const dy = oldRect.top - newRect.top;
            
            if (dx !== 0 || dy !== 0) {
                el.style.transition = 'none';
                el.style.transform = `translate(${dx}px, ${dy}px)`;
                // Force reflow
                void el.offsetWidth;
            }
        }
    });

    const ANIM_MS = 450; // 0.75x speed
    isAnimating = true;

    requestAnimationFrame(() => {
        newElements.forEach(el => {
            const id = el.dataset.id;
            if (oldRects[id]) {
                el.style.transition = `transform ${ANIM_MS}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
                el.style.transform = 'translate(0, 0)';
                setTimeout(() => {
                    el.style.transition = '';
                    el.style.transform = '';
                }, ANIM_MS);
            }
        });
        
        setTimeout(() => {
            isAnimating = false;
            checkGameState();
        }, ANIM_MS);
    });
}


// Interaction Logic
function setupEvents() {
    if (state.eventsSetup) return;
    state.eventsSetup = true;

    elements.stock.addEventListener('click', handleStockClick);
    
    document.addEventListener('mousedown', handleDragStart);
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
    
    // Touch support
    document.addEventListener('touchstart', handleDragStart, {passive: false});
    document.addEventListener('touchmove', handleDragMove, {passive: false});
    document.addEventListener('touchend', handleDragEnd);
    
    elements.restartBtn.addEventListener('click', init);
    elements.winRestartBtn.addEventListener('click', init);
    
    if (elements.undoBtn) elements.undoBtn.addEventListener('click', undoMove);
    if (elements.autoBtn) elements.autoBtn.addEventListener('click', performAutoComplete);
    if (elements.noMovesUndoBtn) elements.noMovesUndoBtn.addEventListener('click', undoMove);
    if (elements.noMovesRestartBtn) elements.noMovesRestartBtn.addEventListener('click', init);
}

function handleStockClick(e) {
    if (isAnimating) return; // Bloqueia spam
    if (state.stock.length > 0) {
        saveState();
        const card = state.stock.pop();
        card.faceUp = true;
        state.waste.push(card);
    } else if (state.waste.length > 0) {
        saveState();
        while(state.waste.length > 0) {
            const card = state.waste.pop();
            card.faceUp = false;
            state.stock.push(card);
        }
    }
    state.moves++;
    updateStats();
    renderAll();
}

function getCardAndPile(target) {
    const cardEl = target.closest('.card');
    if (!cardEl) return null;
    
    const pileEl = cardEl.parentElement;
    const id = cardEl.dataset.id;
    let pileInfo = null;
    let cardIndex = -1;

    // Find card in state
    if (pileEl === elements.waste) {
        pileInfo = { type: 'waste', index: 0, pile: state.waste };
        cardIndex = state.waste.findIndex(c => c.id === id);
    } else {
        for (let i=0; i<4; i++) {
            if (pileEl === elements.foundations[i]) {
                pileInfo = { type: 'foundation', index: i, pile: state.foundations[i] };
                cardIndex = state.foundations[i].findIndex(c => c.id === id);
                break;
            }
        }
        if (!pileInfo) {
            for (let i=0; i<7; i++) {
                if (pileEl === elements.tableaus[i]) {
                    pileInfo = { type: 'tableau', index: i, pile: state.tableaus[i] };
                    cardIndex = state.tableaus[i].findIndex(c => c.id === id);
                    break;
                }
            }
        }
    }

    if (!pileInfo || cardIndex === -1) return null;
    const card = pileInfo.pile[cardIndex];
    if (!card.faceUp) return null;
    
    // Only top card for waste and foundation
    if ((pileInfo.type === 'waste' || pileInfo.type === 'foundation') && cardIndex !== pileInfo.pile.length - 1) {
        return null;
    }

    return { card, cardIndex, pileInfo, cardEl };
}

function handleDragStart(e) {
    if (isAnimating) return; // Bloqueia spam de cliques durante animação
    if (e.target.closest('#stock') || e.target.closest('.controls') || e.target.closest('.win-overlay')) return;
    
    const touch = e.type.includes('touch') ? e.touches[0] : e;
    const info = getCardAndPile(e.target);
    
    if (!info) return;
    
    e.preventDefault(); // Prevent default dragging

    state.sourcePile = info.pileInfo;
    state.startX = touch.clientX;
    state.startY = touch.clientY;
    
    const cardsToMove = info.pileInfo.pile.slice(info.cardIndex);
    
    state.draggedCards = cardsToMove.map((card, idx) => {
        let parentEl;
        if (info.pileInfo.type === 'waste') {
            parentEl = elements.waste;
        } else {
            parentEl = elements[info.pileInfo.type + 's'][info.pileInfo.index];
        }
        const el = parentEl.children[info.cardIndex + idx];
        const rect = el.getBoundingClientRect();
        
        // Setup dragged element
        el.classList.add('dragging');
        el.style.position = 'fixed';
        el.style.left = rect.left + 'px';
        el.style.top = rect.top + 'px';
        el.style.zIndex = 1000 + idx;
        
        return {
            card,
            el,
            offsetX: touch.clientX - rect.left,
            offsetY: touch.clientY - rect.top
        };
    });
}

function handleDragMove(e) {
    if (state.draggedCards.length === 0) return;
    e.preventDefault();
    
    const touch = e.type.includes('touch') ? e.touches[0] : e;
    
    state.draggedCards.forEach((item, idx) => {
        // Only top card determines offset, others follow
        item.el.style.left = (touch.clientX - state.draggedCards[0].offsetX) + 'px';
        // 25px stack offset
        item.el.style.top = (touch.clientY - state.draggedCards[0].offsetY + (idx * 25)) + 'px';
    });
}

function handleDragEnd(e) {
    if (state.draggedCards.length === 0) return;
    
    const touch = e.type.includes('touch') ? e.changedTouches[0] : e;
    
    // Find drop target
    state.draggedCards[0].el.style.visibility = 'hidden'; // Hide to get element underneath
    const targetEl = document.elementFromPoint(touch.clientX, touch.clientY);
    state.draggedCards[0].el.style.visibility = 'visible';
    
    let validMove = false;
    
    // Check if it was just a tap/click
    const dist = Math.abs(touch.clientX - state.startX) + Math.abs(touch.clientY - state.startY);
    
    if (dist > 5 && targetEl) {
        const tableauSlot = targetEl.closest('.tableau-pile');
        const foundationSlot = targetEl.closest('.foundation');
        
        if (tableauSlot) {
            const index = parseInt(tableauSlot.id.split('-')[1]);
            if (canMoveToTableau(state.draggedCards[0].card, state.tableaus[index])) {
                saveState();
                if (state.sourcePile.type === 'waste') updateScore(5);
                else if (state.sourcePile.type === 'foundation') updateScore(-15);
                
                moveCards(state.sourcePile, {type: 'tableau', index, pile: state.tableaus[index]});
                validMove = true;
            }
        } else if (foundationSlot && state.draggedCards.length === 1) {
            const index = parseInt(foundationSlot.id.split('-')[1]);
            if (canMoveToFoundation(state.draggedCards[0].card, state.foundations[index])) {
                saveState();
                if (state.sourcePile.type === 'waste') updateScore(10);
                else if (state.sourcePile.type === 'tableau') updateScore(10);
                
                moveCards(state.sourcePile, {type: 'foundation', index, pile: state.foundations[index]});
                validMove = true;
            }
        }
    }
    
    // Reset dragged styles
    state.draggedCards.forEach(item => {
        item.el.classList.remove('dragging');
        item.el.style.position = '';
        item.el.style.left = '';
        item.el.style.top = '';
        item.el.style.zIndex = '';
    });
    
    // Check if it was just a tap/click
    
    if (dist <= 5) {
        // It was a tap, trigger auto move
        const info = getCardAndPile(state.draggedCards[0].el);
        state.draggedCards = [];
        state.sourcePile = null;
        if (info) performAutoMove(info);
        renderAll();
        return;
    }
    
    state.draggedCards = [];
    state.sourcePile = null;
    
    if (validMove) {
        flipTopCards();
        state.moves++;
        updateStats();
    }
    
    renderAll();
}

function performAutoMove(info) {
    const card = info.card;
    const isTopCard = (info.cardIndex === info.pileInfo.pile.length - 1);
    
    // 1. Try to auto-move to foundation (must be top card)
    if (isTopCard) {
        for (let i = 0; i < 4; i++) {
            if (canMoveToFoundation(card, state.foundations[i])) {
                saveState();
                if (info.pileInfo.type === 'waste') updateScore(10);
                else if (info.pileInfo.type === 'tableau') updateScore(10);
                
                moveCards(info.pileInfo, {type: 'foundation', index: i, pile: state.foundations[i]}, 1);
                flipTopCards();
                state.moves++;
                updateStats();
                return;
            }
        }
    }
    
    // 2. Try to auto-move to tableau (can be stack)
    for (let i = 0; i < 7; i++) {
        if (canMoveToTableau(card, state.tableaus[i])) {
            saveState();
            if (info.pileInfo.type === 'waste') updateScore(5);
            else if (info.pileInfo.type === 'foundation') updateScore(-15);
            
            const numCards = info.pileInfo.pile.length - info.cardIndex;
            moveCards(info.pileInfo, {type: 'tableau', index: i, pile: state.tableaus[i]}, numCards);
            flipTopCards();
            state.moves++;
            updateStats();
            return;
        }
    }
}

function canMoveToTableau(card, targetPile) {
    if (targetPile.length === 0) {
        return card.rank === 'K';
    }
    const topCard = targetPile[targetPile.length - 1];
    return topCard.faceUp && topCard.color !== card.color && topCard.value === card.value + 1;
}

function canMoveToFoundation(card, targetPile) {
    if (targetPile.length === 0) {
        return card.rank === 'A';
    }
    const topCard = targetPile[targetPile.length - 1];
    // Must match suit of foundation, but foundation is fixed to a suit in UI?
    // Actually standard is foundation piles aren't fixed, but we hardcoded data-suit.
    // Let's check if it matches the top card's suit. If empty, we can just allow A, but we have data-suit.
    if (targetPile.length > 0) {
        return topCard.suit === card.suit && topCard.value === card.value - 1;
    }
    return false; // Handled by empty case above, wait, if empty and 'A', but what if wrong foundation?
    // Let's enforce foundation suit if empty. We can check the DOM element.
}

// Override canMoveToFoundation to check exact slot suit if empty
function canMoveToFoundation(card, targetPile) {
    const index = state.foundations.indexOf(targetPile);
    const expectedSuit = elements.foundations[index].dataset.suit;
    
    if (targetPile.length === 0) {
        return card.rank === 'A' && card.suit === expectedSuit;
    }
    
    const topCard = targetPile[targetPile.length - 1];
    return topCard.suit === card.suit && topCard.value === card.value - 1;
}


function moveCards(source, target, count = null) {
    const numToMove = count || state.draggedCards.length;
    const cards = source.pile.splice(source.pile.length - numToMove, numToMove);
    target.pile.push(...cards);
}

function flipTopCards() {
    state.tableaus.forEach(pile => {
        if (pile.length > 0 && !pile[pile.length - 1].faceUp) {
            pile[pile.length - 1].faceUp = true;
            updateScore(5);
        }
    });
}

function checkWin() {
    const isWin = state.foundations.every(pile => pile.length === 13);
    if (isWin) {
        clearInterval(state.timerInterval);
        elements.winTime.textContent = formatTime(state.time);
        elements.winMoves.textContent = state.moves;
        if(elements.winScore) elements.winScore.textContent = state.score;
        elements.winScreen.classList.add('show');
        
        if (!document.getElementById('win-canvas')) {
            startWinAnimation();
        }
    }
}

function startWinAnimation() {
    const canvas = document.createElement('canvas');
    canvas.id = 'win-canvas';
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '1999';
    document.body.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const cards = [];
    const colors = ['#e74c3c', '#2c3e50'];
    
    for(let i=0; i<50; i++) {
        cards.push({
            x: window.innerWidth / 2,
            y: window.innerHeight,
            vx: (Math.random() - 0.5) * 15,
            vy: -Math.random() * 15 - 5,
            color: colors[Math.floor(Math.random()*colors.length)],
            width: 40,
            height: 60,
            rot: Math.random() * Math.PI * 2,
            vrot: (Math.random() - 0.5) * 0.1
        });
    }
    
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let active = false;
        
        cards.forEach(c => {
            c.vy += 0.3; // Slower gravity
            c.x += c.vx;
            c.y += c.vy;
            c.rot += c.vrot;
            
            if (c.y > canvas.height - c.height && c.vy > 0) {
                c.vy *= -0.8;
                c.y = canvas.height - c.height;
            }
            if (c.x < 0 || c.x > canvas.width - c.width) {
                c.vx *= -1;
            }
            
            if (Math.abs(c.vx) > 0.1 || Math.abs(c.vy) > 0.1) active = true;
            
            ctx.save();
            ctx.translate(c.x + c.width/2, c.y + c.height/2);
            ctx.rotate(c.rot);
            ctx.fillStyle = '#fff';
            ctx.fillRect(-c.width/2, -c.height/2, c.width, c.height);
            ctx.strokeStyle = '#ccc';
            ctx.strokeRect(-c.width/2, -c.height/2, c.width, c.height);
            ctx.fillStyle = c.color;
            ctx.fillRect(-c.width/4, -c.height/4, c.width/2, c.height/2);
            ctx.restore();
        });
        
        if(active) requestAnimationFrame(draw);
    }
    draw();
}

function startup() {
    const letterOverlay = document.getElementById('love-letter-screen');
    const closeLetterBtn = document.getElementById('close-letter-btn');
    
    try {
        if (!localStorage.getItem('loveLetterRead')) {
            letterOverlay.classList.add('show');
        }
    } catch(e) {}
    
    if (closeLetterBtn) {
        closeLetterBtn.addEventListener('click', () => {
            letterOverlay.classList.remove('show');
            try { localStorage.setItem('loveLetterRead', 'true'); } catch(e){}
        });
    }

    init();
}

// Start game
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startup);
} else {
    startup();
}

// --- Advanced Features ---
function saveState() {
    const serialized = JSON.stringify({
        stock: state.stock,
        waste: state.waste,
        foundations: state.foundations,
        tableaus: state.tableaus,
        score: state.score,
        moves: state.moves
    });
    stateHistory.push(serialized);
    if (elements.undoBtn) elements.undoBtn.disabled = false;
}

function undoMove() {
    if (stateHistory.length === 0) return;
    const previous = JSON.parse(stateHistory.pop());
    state.stock = previous.stock;
    state.waste = previous.waste;
    state.foundations = previous.foundations;
    state.tableaus = previous.tableaus;
    state.score = previous.score;
    state.moves = previous.moves;
    
    if (stateHistory.length === 0 && elements.undoBtn) {
        elements.undoBtn.disabled = true;
    }
    
    if (elements.noMovesScreen) elements.noMovesScreen.classList.remove('show');
    updateStats();
    renderAll();
}

function hasAvailableMoves() {
    if (state.stock.length > 0) return true;
    if (state.waste.length > 0 && state.stock.length === 0) return true;
    
    if (state.waste.length > 0) {
        const card = state.waste[state.waste.length - 1];
        for (let f = 0; f < 4; f++) if (canMoveToFoundation(card, state.foundations[f])) return true;
        for (let t = 0; t < 7; t++) if (canMoveToTableau(card, state.tableaus[t])) return true;
    }
    
    for (let i = 0; i < 7; i++) {
        const pile = state.tableaus[i];
        if (pile.length === 0) continue;
        
        const topCard = pile[pile.length - 1];
        for (let f = 0; f < 4; f++) if (canMoveToFoundation(topCard, state.foundations[f])) return true;
        
        for (let j = 0; j < pile.length; j++) {
            if (pile[j].faceUp) {
                const card = pile[j];
                for (let t = 0; t < 7; t++) {
                    if (i === t) continue;
                    if (canMoveToTableau(card, state.tableaus[t])) {
                        if (card.rank === 'K' && j === 0) continue;
                        return true;
                    }
                }
            }
        }
    }
    
    for (let f = 0; f < 4; f++) {
        if (state.foundations[f].length > 0) {
            const card = state.foundations[f][state.foundations[f].length - 1];
            for (let t = 0; t < 7; t++) {
                if (canMoveToTableau(card, state.tableaus[t])) return true;
            }
        }
    }
    
    return false;
}

function checkAutoComplete() {
    if (state.stock.length > 0 || state.waste.length > 0) {
        if (elements.autoBtn) elements.autoBtn.style.display = 'none';
        return false;
    }
    
    let allFaceUp = true;
    for (let i = 0; i < 7; i++) {
        for (let j = 0; j < state.tableaus[i].length; j++) {
            if (!state.tableaus[i][j].faceUp) {
                allFaceUp = false;
                break;
            }
        }
    }
    
    const isWin = state.foundations.every(pile => pile.length === 13);
    
    if (allFaceUp && !isWin) {
        if (elements.autoBtn) elements.autoBtn.style.display = 'block';
        return true;
    } else {
        if (elements.autoBtn) elements.autoBtn.style.display = 'none';
        return false;
    }
}

function performAutoComplete() {
    if (elements.autoBtn) elements.autoBtn.style.display = 'none';
    
    function moveNext() {
        let moved = false;
        for (let i = 0; i < 7; i++) {
            if (state.tableaus[i].length > 0) {
                const card = state.tableaus[i][state.tableaus[i].length - 1];
                for (let f = 0; f < 4; f++) {
                    if (canMoveToFoundation(card, state.foundations[f])) {
                        saveState();
                        moveCards({type: 'tableau', index: i, pile: state.tableaus[i]}, {type: 'foundation', index: f, pile: state.foundations[f]}, 1);
                        renderAll();
                        moved = true;
                        break;
                    }
                }
            }
            if (moved) break;
        }
        
        if (moved) {
            setTimeout(moveNext, 450);
        } else {
            checkWin();
        }
    }
    
    moveNext();
}

function checkGameState() {
    const isWin = state.foundations.every(pile => pile.length === 13);
    if (isWin) return;
    
    checkAutoComplete();
    
    if (!hasAvailableMoves()) {
        if (elements.noMovesScreen) elements.noMovesScreen.classList.add('show');
    } else {
        if (elements.noMovesScreen) elements.noMovesScreen.classList.remove('show');
    }
}
