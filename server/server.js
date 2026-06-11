const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 6043;

const DATA_DIR = path.join(__dirname, 'data');
const PREFERENCES_FILE = path.join(DATA_DIR, 'preferences.json');
const LEADERBOARD_FILE = path.join(DATA_DIR, 'leaderboard.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadJSON(filepath, defaultValue) {
  try {
    if (fs.existsSync(filepath)) {
      const content = fs.readFileSync(filepath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error(`读取文件失败 ${filepath}:`, err.message);
  }
  return defaultValue;
}

function saveJSON(filepath, data) {
  try {
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error(`写入文件失败 ${filepath}:`, err.message);
    return false;
  }
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));

const CARD_PAIRS = 8;
let leaderboard = loadJSON(LEADERBOARD_FILE, []);
let preferences = loadJSON(PREFERENCES_FILE, {});

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

app.get('/api/shuffle', (req, res) => {
  const cardIds = [];
  for (let i = 1; i <= CARD_PAIRS; i++) {
    cardIds.push(i, i);
  }
  const shuffled = shuffle(cardIds);
  res.json({ cards: shuffled });
});

app.post('/api/score', (req, res) => {
  const { time, playerName } = req.body;
  
  if (typeof time !== 'number' || time <= 0) {
    return res.status(400).json({ error: '无效的成绩数据' });
  }

  const entry = {
    id: Date.now(),
    time: time,
    playerName: playerName || '匿名玩家',
    date: new Date().toLocaleString('zh-CN')
  };

  leaderboard.push(entry);
  leaderboard.sort((a, b) => a.time - b.time);
  leaderboard = leaderboard.slice(0, 10);
  saveJSON(LEADERBOARD_FILE, leaderboard);

  const rank = leaderboard.findIndex(e => e.id === entry.id) + 1;

  res.json({
    success: true,
    rank: rank,
    leaderboard: leaderboard
  });
});

app.get('/api/leaderboard', (req, res) => {
  res.json({ leaderboard: leaderboard });
});

app.get('/api/preferences', (req, res) => {
  const playerId = req.query.playerId || 'default';
  res.json({
    preferences: preferences[playerId] || {
      soundEnabled: true,
      soundVolume: 0.7,
      animationIntensity: 2,
      darkMode: false
    }
  });
});

app.post('/api/preferences', (req, res) => {
  const { playerId, soundEnabled, soundVolume, animationIntensity, darkMode } = req.body;
  const pid = playerId || 'default';

  if (typeof soundEnabled !== 'undefined' && typeof soundEnabled !== 'boolean') {
    return res.status(400).json({ error: '无效的音效设置' });
  }
  if (typeof soundVolume !== 'undefined' && (typeof soundVolume !== 'number' || soundVolume < 0 || soundVolume > 1)) {
    return res.status(400).json({ error: '无效的音量设置' });
  }
  if (typeof animationIntensity !== 'undefined' && (!Number.isInteger(animationIntensity) || animationIntensity < 0 || animationIntensity > 3)) {
    return res.status(400).json({ error: '无效的动画强度设置' });
  }
  if (typeof darkMode !== 'undefined' && typeof darkMode !== 'boolean') {
    return res.status(400).json({ error: '无效的深色模式设置' });
  }

  preferences[pid] = {
    soundEnabled: soundEnabled ?? preferences[pid]?.soundEnabled ?? true,
    soundVolume: soundVolume ?? preferences[pid]?.soundVolume ?? 0.7,
    animationIntensity: animationIntensity ?? preferences[pid]?.animationIntensity ?? 2,
    darkMode: darkMode ?? preferences[pid]?.darkMode ?? false
  };

  saveJSON(PREFERENCES_FILE, preferences);

  res.json({
    success: true,
    preferences: preferences[pid]
  });
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
