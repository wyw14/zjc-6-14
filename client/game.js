const API_BASE_URL = 'http://localhost:6043/api';

const CARD_EMOJIS = {
  1: '🍎',
  2: '🍊',
  3: '🍋',
  4: '🍇',
  5: '🍓',
  6: '🍑',
  7: '🍒',
  8: '🥝'
};

const gameBoard = document.getElementById('gameBoard');
const timerEl = document.getElementById('timer');
const movesEl = document.getElementById('moves');
const matchedEl = document.getElementById('matched');
const restartBtn = document.getElementById('restartBtn');
const leaderboardBtn = document.getElementById('leaderboardBtn');
const settingsBtn = document.getElementById('settingsBtn');
const winModal = document.getElementById('winModal');
const leaderboardModal = document.getElementById('leaderboardModal');
const settingsModal = document.getElementById('settingsModal');
const finalTimeEl = document.getElementById('finalTime');
const finalMovesEl = document.getElementById('finalMoves');
const playerNameInput = document.getElementById('playerName');
const submitScoreBtn = document.getElementById('submitScoreBtn');
const playAgainBtn = document.getElementById('playAgainBtn');
const closeLeaderboardBtn = document.getElementById('closeLeaderboardBtn');
const leaderboardList = document.getElementById('leaderboardList');
const soundEnabledCheckbox = document.getElementById('soundEnabled');
const soundVolumeSlider = document.getElementById('soundVolume');
const volumeValueSpan = document.getElementById('volumeValue');
const darkModeCheckbox = document.getElementById('darkMode');
const animBtns = document.querySelectorAll('.anim-btn');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');

let audioContext = null;
let currentPreferences = {
  soundEnabled: true,
  soundVolume: 0.7,
  animationIntensity: 2,
  darkMode: false
};
let playerId = localStorage.getItem('playerId') || 'player_' + Date.now();
localStorage.setItem('playerId', playerId);

function initAudio() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playSound(type) {
  if (!currentPreferences.soundEnabled) return;
  
  initAudio();
  
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  gainNode.gain.setValueAtTime(currentPreferences.soundVolume * 0.3, audioContext.currentTime);
  
  switch (type) {
    case 'flip':
      oscillator.frequency.setValueAtTime(523, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(659, audioContext.currentTime + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.15);
      break;
    case 'match':
      oscillator.frequency.setValueAtTime(523, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(659, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(784, audioContext.currentTime + 0.2);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.4);
      break;
    case 'mismatch':
      oscillator.frequency.setValueAtTime(311, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(261, audioContext.currentTime + 0.15);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
      break;
    case 'win':
      const notes = [523, 587, 659, 698, 784, 880, 988, 1047];
      notes.forEach((freq, i) => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.frequency.setValueAtTime(freq, audioContext.currentTime + i * 0.1);
        gain.gain.setValueAtTime(currentPreferences.soundVolume * 0.2, audioContext.currentTime + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + i * 0.1 + 0.15);
        osc.start(audioContext.currentTime + i * 0.1);
        osc.stop(audioContext.currentTime + i * 0.1 + 0.15);
      });
      break;
    case 'click':
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.05);
      break;
  }
}

function applyPreferences(prefs) {
  currentPreferences = { ...currentPreferences, ...prefs };
  
  if (currentPreferences.darkMode) {
    document.body.classList.add('dark-mode');
  } else {
    document.body.classList.remove('dark-mode');
  }
  
  document.body.classList.remove('anim-level-0', 'anim-level-1', 'anim-level-2', 'anim-level-3');
  document.body.classList.add(`anim-level-${currentPreferences.animationIntensity}`);
  
  soundEnabledCheckbox.checked = currentPreferences.soundEnabled;
  soundVolumeSlider.value = currentPreferences.soundVolume * 100;
  volumeValueSpan.textContent = `${Math.round(currentPreferences.soundVolume * 100)}%`;
  darkModeCheckbox.checked = currentPreferences.darkMode;
  
  animBtns.forEach(btn => {
    const level = parseInt(btn.dataset.level);
    btn.classList.toggle('active', level === currentPreferences.animationIntensity);
  });
}

async function loadPreferences() {
  try {
    const response = await fetch(`${API_BASE_URL}/preferences?playerId=${playerId}`);
    const data = await response.json();
    applyPreferences(data.preferences);
  } catch (error) {
    console.error('加载偏好设置失败:', error);
    const saved = localStorage.getItem('preferences');
    if (saved) {
      applyPreferences(JSON.parse(saved));
    }
  }
}

async function savePreferences() {
  const prefs = {
    playerId: playerId,
    soundEnabled: soundEnabledCheckbox.checked,
    soundVolume: parseInt(soundVolumeSlider.value) / 100,
    animationIntensity: currentPreferences.animationIntensity,
    darkMode: darkModeCheckbox.checked
  };
  
  try {
    const response = await fetch(`${API_BASE_URL}/preferences`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(prefs)
    });
    
    const data = await response.json();
    if (data.success) {
      applyPreferences(data.preferences);
      localStorage.setItem('preferences', JSON.stringify(data.preferences));
      alert('设置已保存！');
      playSound('match');
    }
  } catch (error) {
    console.error('保存偏好设置失败:', error);
    applyPreferences(prefs);
    localStorage.setItem('preferences', JSON.stringify(prefs));
    alert('设置已本地保存！');
  }
}

function openSettings() {
  playSound('click');
  applyPreferences(currentPreferences);
  settingsModal.classList.remove('hidden');
}

function closeSettings() {
  playSound('click');
  settingsModal.classList.add('hidden');
}

let cards = [];
let flippedCards = [];
let matchedPairs = 0;
let moves = 0;
let timer = null;
let startTime = null;
let elapsedTime = 0;
let gameStarted = false;
let isProcessing = false;

async function initGame() {
  resetGameState();
  const shuffledCards = await fetchShuffledCards();
  renderCards(shuffledCards);
}

function resetGameState() {
  cards = [];
  flippedCards = [];
  matchedPairs = 0;
  moves = 0;
  elapsedTime = 0;
  gameStarted = false;
  isProcessing = false;
  
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  
  updateTimerDisplay();
  movesEl.textContent = '0';
  matchedEl.textContent = '0/8';
  gameBoard.innerHTML = '';
}

async function fetchShuffledCards() {
  try {
    const response = await fetch(`${API_BASE_URL}/shuffle`);
    const data = await response.json();
    return data.cards;
  } catch (error) {
    console.error('获取洗牌数据失败:', error);
    const fallbackCards = [];
    for (let i = 1; i <= 8; i++) {
      fallbackCards.push(i, i);
    }
    for (let i = fallbackCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [fallbackCards[i], fallbackCards[j]] = [fallbackCards[j], fallbackCards[i]];
    }
    return fallbackCards;
  }
}

function renderCards(cardIds) {
  cardIds.forEach((cardId, index) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.id = cardId;
    card.dataset.index = index;
    
    const cardBack = document.createElement('div');
    cardBack.className = 'card-face card-back';
    
    const cardFront = document.createElement('div');
    cardFront.className = 'card-face card-front';
    cardFront.textContent = CARD_EMOJIS[cardId] || '❓';
    
    card.appendChild(cardBack);
    card.appendChild(cardFront);
    
    card.addEventListener('click', () => handleCardClick(card));
    
    gameBoard.appendChild(card);
    cards.push(card);
  });
}

function handleCardClick(card) {
  if (isProcessing) return;
  if (card.classList.contains('flipped')) return;
  if (card.classList.contains('matched')) return;
  if (flippedCards.length >= 2) return;

  if (!gameStarted) {
    startTimer();
    gameStarted = true;
  }

  flipCard(card);
  flippedCards.push(card);

  if (flippedCards.length === 2) {
    moves++;
    movesEl.textContent = moves;
    checkMatch();
  }
}

function flipCard(card) {
  playSound('flip');
  card.classList.add('flipped');
}

function unflipCard(card) {
  card.classList.remove('flipped');
}

function checkMatch() {
  isProcessing = true;
  
  const [card1, card2] = flippedCards;
  const id1 = parseInt(card1.dataset.id);
  const id2 = parseInt(card2.dataset.id);

  const matchDelays = [0, 800, 500, 300];
  const mismatchDelays = [0, 1500, 1000, 600];
  const delayIndex = currentPreferences.animationIntensity;

  if (id1 === id2) {
    setTimeout(() => {
      playSound('match');
      card1.classList.add('matched');
      card2.classList.add('matched');
      matchedPairs++;
      matchedEl.textContent = `${matchedPairs}/8`;
      flippedCards = [];
      isProcessing = false;
      
      if (matchedPairs === 8) {
        endGame();
      }
    }, matchDelays[delayIndex]);
  } else {
    setTimeout(() => {
      playSound('mismatch');
      unflipCard(card1);
      unflipCard(card2);
      flippedCards = [];
      isProcessing = false;
    }, mismatchDelays[delayIndex]);
  }
}

function startTimer() {
  startTime = Date.now() - elapsedTime;
  timer = setInterval(() => {
    elapsedTime = Date.now() - startTime;
    updateTimerDisplay();
  }, 100);
}

function updateTimerDisplay() {
  const totalSeconds = Math.floor(elapsedTime / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  timerEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function endGame() {
  clearInterval(timer);
  timer = null;
  
  finalTimeEl.textContent = timerEl.textContent;
  finalMovesEl.textContent = moves;
  
  playSound('win');
  
  const delays = [0, 800, 500, 300];
  setTimeout(() => {
    winModal.classList.remove('hidden');
  }, delays[currentPreferences.animationIntensity]);
}

async function submitScore() {
  const playerName = playerNameInput.value.trim() || '匿名玩家';
  const timeInSeconds = Math.floor(elapsedTime / 1000);

  try {
    const response = await fetch(`${API_BASE_URL}/score`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        time: timeInSeconds,
        playerName: playerName
      })
    });

    const data = await response.json();
    
    if (data.success) {
      alert(`恭喜！你排名第 ${data.rank} 名！`);
      winModal.classList.add('hidden');
      showLeaderboard();
    }
  } catch (error) {
    console.error('提交成绩失败:', error);
    alert('提交成绩失败，请稍后重试');
  }
}

async function showLeaderboard() {
  try {
    const response = await fetch(`${API_BASE_URL}/leaderboard`);
    const data = await response.json();
    renderLeaderboard(data.leaderboard);
  } catch (error) {
    console.error('获取排行榜失败:', error);
    leaderboardList.innerHTML = '<li>加载排行榜失败</li>';
  }
  
  leaderboardModal.classList.remove('hidden');
}

function renderLeaderboard(leaderboard) {
  if (!leaderboard || leaderboard.length === 0) {
    leaderboardList.innerHTML = '<li class="empty-message">暂无记录，快来挑战吧！</li>';
    return;
  }

  leaderboardList.innerHTML = '';
  
  leaderboard.forEach((entry, index) => {
    const li = document.createElement('li');
    li.className = 'rank-item';
    
    const minutes = Math.floor(entry.time / 60);
    const seconds = entry.time % 60;
    const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    
    li.innerHTML = `
      <span class="rank-name">
        <span class="rank">#${index + 1}</span>
        <span class="name">${entry.playerName}</span>
      </span>
      <span class="time">${timeStr}</span>
    `;
    
    leaderboardList.appendChild(li);
  });
}

restartBtn.addEventListener('click', initGame);
playAgainBtn.addEventListener('click', () => {
  playSound('click');
  winModal.classList.add('hidden');
  initGame();
});
leaderboardBtn.addEventListener('click', () => {
  playSound('click');
  showLeaderboard();
});
closeLeaderboardBtn.addEventListener('click', () => {
  playSound('click');
  leaderboardModal.classList.add('hidden');
});
submitScoreBtn.addEventListener('click', submitScore);

settingsBtn.addEventListener('click', openSettings);
closeSettingsBtn.addEventListener('click', closeSettings);
saveSettingsBtn.addEventListener('click', savePreferences);

soundVolumeSlider.addEventListener('input', (e) => {
  volumeValueSpan.textContent = `${e.target.value}%`;
});

animBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    playSound('click');
    const level = parseInt(btn.dataset.level);
    currentPreferences.animationIntensity = level;
    animBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    applyPreferences({ animationIntensity: level });
  });
});

settingsModal.addEventListener('click', (e) => {
  if (e.target === settingsModal) {
    closeSettings();
  }
});

async function init() {
  await loadPreferences();
  initGame();
}

init();
