"use client";

import React, { useState, useEffect, useCallback } from 'react';

// ==========================================
// 1. КОНФИГИ И БАЗОВЫЕ ДАННЫЕ
// ==========================================

const THEMES = {
  dark_academia: { bg: 'bg-[#1a1614]', text: 'text-[#e6d5c3]', boardDark: 'bg-[#4a3525]', boardLight: 'bg-[#d0b49f]', primary: 'bg-[#2a221d]', accent: 'text-amber-500', border: 'border-[#3a2e26]' },
  cyberpunk: { bg: 'bg-black', text: 'text-cyan-400', boardDark: 'bg-gray-900', boardLight: 'bg-fuchsia-900', primary: 'bg-gray-800', accent: 'text-fuchsia-500', border: 'border-cyan-800' },
  wood: { bg: 'bg-stone-100', text: 'text-stone-900', boardDark: 'bg-amber-900', boardLight: 'bg-amber-200', primary: 'bg-stone-200', accent: 'text-amber-700', border: 'border-stone-300' },
  light: { bg: 'bg-slate-50', text: 'text-slate-800', boardDark: 'bg-slate-500', boardLight: 'bg-slate-100', primary: 'bg-white', accent: 'text-blue-600', border: 'border-slate-200' },
};

const GAME_MODES = {
  pro: { name: 'Хардкор (Pro)', hints: 0, mult: 1.5, desc: 'Без подсказок и отмен. ELO x1.5, Монеты x1.5' },
  standard: { name: 'Стандарт', hints: 3, mult: 1.0, desc: '3 подсказки. Стандартные награды.' },
  novice: { name: 'Новичок', hints: 999, mult: 0.1, desc: 'Бесконечные подсказки. ELO отключено.' }
};

const BOTS = [
  { id: 'bot_1', name: '👶 Сосед Серик', elo: 800, depth: 1, baseCoins: 10, avatar: '👦', quote: "Я только правила выучил." },
  { id: 'bot_2', name: '👨‍🏫 Учитель Математики', elo: 1200, depth: 2, baseCoins: 25, avatar: '👨‍🏫', quote: "Шашки — это геометрия на практике." },
  { id: 'bot_3', name: '🧠 Студент-Олимпиадник', elo: 1600, depth: 4, baseCoins: 50, avatar: '🏆', quote: "Мой алгоритм уже просчитал твое поражение." },
  { id: 'bot_boss', name: '💀 ДЕД (Босс)', elo: 2500, depth: 6, baseCoins: 200, avatar: '👴🏻', quote: "Вы, молодежь, слишком много думаете. Я просто чувствую доску.", isBoss: true }
];

const SHOP_ITEMS = [
  { id: 'dark_academia', name: 'Dark Academia (База)', price: 0, type: 'theme' },
  { id: 'wood', name: 'Классическое Дерево', price: 100, type: 'theme' },
  { id: 'cyberpunk', name: 'Cyberpunk Neon', price: 500, type: 'theme' },
  { id: 'light', name: 'Светлый Минимализм', price: 200, type: 'theme' },
];

// Типы фигур: 0-пусто, 1-игрок(светлые), 2-бот(темные), 3-дамка(игрок), 4-дамка(бот)
const EMPTY = 0; const PLAYER = 1; const BOT = 2; const PLAYER_KING = 3; const BOT_KING = 4;

// ==========================================
// 2. ДВИЖОК ШАШЕК И ИСКУССТВЕННЫЙ ИНТЕЛЛЕКТ
// ==========================================

// Инициализация доски
const createInitialBoard = () => {
  let b = Array(8).fill(null).map(() => Array(8).fill(0));
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if ((r + c) % 2 === 1) {
        if (r < 3) b[r][c] = BOT;
        if (r > 4) b[r][c] = PLAYER;
      }
    }
  }
  return b;
};

// Проверка принадлежности фигуры
const isPlayerPiece = (p: number) => p === PLAYER || p === PLAYER_KING;
const isBotPiece = (p: number) => p === BOT || p === BOT_KING;

// Получение всех валидных ходов для стороны (с учетом обязательного взятия)
const getValidMoves = (board: number[][], forPlayer: boolean) => {
  let moves: any[] = [];
  let jumpMoves: any[] = [];

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      let piece = board[r][c];
      if ((forPlayer && isPlayerPiece(piece)) || (!forPlayer && isBotPiece(piece))) {
        let isKing = piece === PLAYER_KING || piece === BOT_KING;
        // Направления: игрок идет вверх (-1), бот идет вниз (+1). Дамки ходят во все.
        let dirs = isKing ? [[-1, -1], [-1, 1], [1, -1], [1, 1]] : 
                   (forPlayer ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]]);

        dirs.forEach(([dr, dc]) => {
          let nr = r + dr, nc = c + dc;
          // Обычный ход
          if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && board[nr][nc] === EMPTY) {
            moves.push({ from: {r, c}, to: {r: nr, c: nc}, isJump: false });
          }
          // Взятие
          let jr = r + dr * 2, jc = c + dc * 2;
          if (jr >= 0 && jr < 8 && jc >= 0 && jc < 8) {
            let midPiece = board[nr][nc];
            if (board[jr][jc] === EMPTY && midPiece !== EMPTY && 
                ((forPlayer && isBotPiece(midPiece)) || (!forPlayer && isPlayerPiece(midPiece)))) {
              jumpMoves.push({ from: {r, c}, to: {r: jr, c: jc}, jumpOver: {r: nr, c: nc}, isJump: true });
            }
          }
        });
      }
    }
  }
  // Правило шашек: если есть взятие, обычные ходы недействительны
  return jumpMoves.length > 0 ? jumpMoves : moves;
};

// Клонирование доски и применение хода
const applyMove = (board: number[][], move: any) => {
  let newBoard = board.map(row => [...row]);
  let piece = newBoard[move.from.r][move.from.c];
  newBoard[move.from.r][move.from.c] = EMPTY;
  newBoard[move.to.r][move.to.c] = piece;

  if (move.isJump) {
    newBoard[move.jumpOver.r][move.jumpOver.c] = EMPTY;
  }

  // Превращение в дамку
  if (piece === PLAYER && move.to.r === 0) newBoard[move.to.r][move.to.c] = PLAYER_KING;
  if (piece === BOT && move.to.r === 7) newBoard[move.to.r][move.to.c] = BOT_KING;

  return newBoard;
};

// Оценка доски для Minimax
const evaluateBoard = (board: number[][]) => {
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c] === PLAYER) score -= 10;
      else if (board[r][c] === PLAYER_KING) score -= 30;
      else if (board[r][c] === BOT) score += 10;
      else if (board[r][c] === BOT_KING) score += 30;
    }
  }
  return score;
};

// Minimax алгоритм с Альфа-Бета отсечением
const minimax = (board: number[][], depth: number, alpha: number, beta: number, isMaximizing: boolean): any => {
  if (depth === 0) return { score: evaluateBoard(board) };

  let validMoves = getValidMoves(board, !isMaximizing);
  if (validMoves.length === 0) return { score: isMaximizing ? -1000 : 1000 };

  let bestMove = validMoves[0];

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (let move of validMoves) {
      let evalResult = minimax(applyMove(board, move), depth - 1, alpha, beta, false).score;
      if (evalResult > maxEval) { maxEval = evalResult; bestMove = move; }
      alpha = Math.max(alpha, evalResult);
      if (beta <= alpha) break;
    }
    return { score: maxEval, move: bestMove };
  } else {
    let minEval = Infinity;
    for (let move of validMoves) {
      let evalResult = minimax(applyMove(board, move), depth - 1, alpha, beta, true).score;
      if (evalResult < minEval) { minEval = evalResult; bestMove = move; }
      beta = Math.min(beta, evalResult);
      if (beta <= alpha) break;
    }
    return { score: minEval, move: bestMove };
  }
};


// ==========================================
// 3. ОСНОВНОЙ КОМПОНЕНТ APP
// ==========================================

export default function App() {
  // --- STATE (Профиль) ---
  const [profile, setProfile] = useState({
    elo: 1000,
    coins: 50,
    unlockedThemes: ['dark_academia'],
    activeTheme: 'dark_academia',
    stats: { matches: 0, wins: 0, losses: 0 }
  });
  const [history, setHistory] = useState<any[]>([]);

  // --- STATE (Игра) ---
  const [view, setView] = useState('menu'); // menu, mode_select, boss_select, game, shop, profile
  const [board, setBoard] = useState(createInitialBoard());
  const [selectedPiece, setSelectedPiece] = useState<any>(null);
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [currentBot, setCurrentBot] = useState<any>(null);
  const [currentMode, setCurrentMode] = useState<any>(null);
  const [hintsLeft, setHintsLeft] = useState(3);
  const [botComment, setBotComment] = useState('');
  const [gameOver, setGameOver] = useState<string | null>(null);

  // Загрузка из LocalStorage
  useEffect(() => {
    const savedProf = localStorage.getItem('regicide_profile');
    const savedHist = localStorage.getItem('regicide_history');
    if (savedProf) setProfile(JSON.parse(savedProf));
    if (savedHist) setHistory(JSON.parse(savedHist));
  }, []);

  // Сохранение в LocalStorage
  const saveProfile = (newProf: any) => {
    setProfile(newProf);
    localStorage.setItem('regicide_profile', JSON.stringify(newProf));
  };
  const saveHistory = (newHist: any[]) => {
    setHistory(newHist);
    localStorage.setItem('regicide_history', JSON.stringify(newHist));
  };

  const theme = THEMES[profile.activeTheme as keyof typeof THEMES] || THEMES.dark_academia;

  // --- ИГРОВАЯ ЛОГИКА (React) ---
  
  const initGame = (mode: any, bot: any) => {
    setCurrentMode(mode);
    setCurrentBot(bot);
    setBoard(createInitialBoard());
    setIsPlayerTurn(true);
    setHintsLeft(mode.hints);
    setGameOver(null);
    setBotComment(bot.quote);
    setView('game');
  };

  const calculateEloChange = (isWin: boolean) => {
    if (currentMode.name === 'Новичок') return 0;
    const K = 32 * currentMode.mult;
    const expected = 1 / (1 + Math.pow(10, (currentBot.elo - profile.elo) / 400));
    const actual = isWin ? 1 : 0;
    return Math.round(K * (actual - expected));
  };

  const endGame = useCallback((winner: 'player' | 'bot') => {
    setGameOver(winner);
    const isWin = winner === 'player';
    const eloChange = calculateEloChange(isWin);
    const coinsEarned = isWin ? Math.round(currentBot.baseCoins * currentMode.mult) : 0;

    const newProf = { ...profile, 
      elo: Math.max(0, profile.elo + eloChange),
      coins: profile.coins + coinsEarned,
      stats: { ...profile.stats, matches: profile.stats.matches + 1, [isWin ? 'wins' : 'losses']: profile.stats[isWin ? 'wins' : 'losses'] + 1 }
    };
    saveProfile(newProf);

    const matchRec = { date: new Date().toLocaleDateString(), bot: currentBot.name, mode: currentMode.name, result: isWin ? 'Победа' : 'Поражение', eloChange: eloChange > 0 ? `+${eloChange}` : eloChange };
    saveHistory([matchRec, ...history].slice(0, 20)); // Храним последние 20

    setBotComment(isWin ? "Твой алгоритм оказался сильнее..." : "Шах и мат. То есть... ну ты понял.");
  }, [profile, currentBot, currentMode, history]);

  // Ход бота
  useEffect(() => {
    if (!isPlayerTurn && !gameOver && currentBot) {
      setTimeout(() => {
        const { move } = minimax(board, currentBot.depth, -Infinity, Infinity, true);
        if (!move) {
          endGame('player'); // Бот не может ходить
        } else {
          setBoard(prev => applyMove(prev, move));
          setIsPlayerTurn(true);
          
          // Случайные комментарии
          const reactions = ["Слабый ход.", "Ты уверен?", "Моя позиция улучшается.", "Данные говорят, что ты проиграешь."];
          if (Math.random() > 0.6) setBotComment(reactions[Math.floor(Math.random() * reactions.length)]);
        }
      }, 800); // Имитация "раздумий"
    }
  }, [isPlayerTurn, board, currentBot, gameOver, endGame]);


  const handleCellClick = (r: number, c: number) => {
    if (!isPlayerTurn || gameOver) return;

    let validMoves = getValidMoves(board, true);
    if (validMoves.length === 0) return endGame('bot'); // Игрок не может ходить

    // Выбор фигуры
    if (isPlayerPiece(board[r][c])) {
      // Проверяем, есть ли у этой фигуры валидные ходы
      let pieceMoves = validMoves.filter(m => m.from.r === r && m.from.c === c);
      if (pieceMoves.length > 0) {
        setSelectedPiece({ r, c, validMoves: pieceMoves });
      } else {
        setBotComment("Обязательное взятие, друг. Читай правила.");
      }
    } 
    // Движение выделенной фигурой
    else if (selectedPiece && board[r][c] === EMPTY) {
      let move = selectedPiece.validMoves.find((m: any) => m.to.r === r && m.to.c === c);
      if (move) {
        setBoard(prev => applyMove(prev, move));
        setSelectedPiece(null);
        setIsPlayerTurn(false);
      }
    }
  };

  // Экономика
  const buyTheme = (item: any) => {
    if (profile.coins >= item.price && !profile.unlockedThemes.includes(item.id)) {
      saveProfile({
        ...profile,
        coins: profile.coins - item.price,
        unlockedThemes: [...profile.unlockedThemes, item.id],
        activeTheme: item.id
      });
    }
  };


  // ==========================================
  // 4. UI КОМПОНЕНТЫ
  // ==========================================

  return (
    <div className={`min-h-screen font-sans flex flex-col transition-all duration-700 ${theme.bg} ${theme.text}`}>
      
      {/* HEADER */}
      <nav className={`w-full p-4 border-b shadow-md flex justify-between items-center ${theme.primary} ${theme.border}`}>
        <h1 className="text-2xl font-black tracking-tighter uppercase cursor-pointer flex items-center gap-2" onClick={() => setView('menu')}>
          REGICIDE <span className="text-xs opacity-50 px-2 py-1 bg-black/20 rounded">v2.0 AI Engine</span>
        </h1>
        <div className="flex gap-4 font-mono font-bold">
          <span className="text-blue-500">🧠 {profile.elo}</span>
          <span className="text-yellow-500">🪙 {profile.coins}</span>
        </div>
      </nav>

      {/* MAIN CONTAINER */}
      <main className="flex-1 flex flex-col items-center justify-center p-4">

        {/* 1. ГЛАВНОЕ МЕНЮ */}
        {view === 'menu' && (
          <div className="w-full max-w-sm flex flex-col gap-4 animate-fade-in">
            <button onClick={() => setView('mode_select')} className={`py-4 rounded-xl text-xl font-bold transition transform hover:scale-105 shadow-xl ${theme.border} border-2 ${theme.primary}`}>⚔️ Начать игру</button>
            <button onClick={() => setView('profile')} className={`py-3 rounded-lg border transition shadow-md ${theme.border} ${theme.primary}`}>📊 Статистика & Архив</button>
            <button onClick={() => setView('shop')} className={`py-3 rounded-lg border transition shadow-md ${theme.border} ${theme.primary}`}>💎 Магазин Скинов</button>
          </div>
        )}

        {/* 2. ВЫБОР РЕЖИМА */}
        {view === 'mode_select' && (
          <div className="w-full max-w-4xl animate-fade-in">
            <h2 className="text-3xl font-bold mb-6 text-center">Уровень симуляции</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {Object.values(GAME_MODES).map((mode) => (
                <div key={mode.name} className={`p-6 rounded-xl border-2 cursor-pointer transition transform hover:-translate-y-2 ${theme.primary} ${theme.border} hover:border-blue-500`} onClick={() => { setCurrentMode(mode); setView('boss_select'); }}>
                  <h3 className="text-2xl font-bold mb-2">{mode.name}</h3>
                  <p className="opacity-70 mb-4 h-16">{mode.desc}</p>
                  <div className="text-sm font-mono bg-black/10 p-2 rounded">Подсказки: {mode.hints > 10 ? '∞' : mode.hints}</div>
                </div>
              ))}
            </div>
            <button onClick={() => setView('menu')} className="mt-8 text-sm underline opacity-70 w-full text-center">Назад</button>
          </div>
        )}

        {/* 3. ВЫБОР БОТА */}
        {view === 'boss_select' && currentMode && (
          <div className="w-full max-w-5xl animate-fade-in">
            <h2 className="text-3xl font-bold mb-6 text-center">Выбор противника</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {BOTS.map((bot) => (
                <div key={bot.id} className={`p-5 rounded-xl border flex flex-col cursor-pointer transition transform hover:scale-105 ${bot.isBoss ? 'border-red-600 bg-red-900/10 shadow-[0_0_20px_rgba(220,38,38,0.3)]' : theme.border + ' ' + theme.primary}`} onClick={() => initGame(currentMode, bot)}>
                  <div className="text-4xl mb-2 text-center">{bot.avatar}</div>
                  <h3 className={`text-xl font-bold text-center mb-1 ${bot.isBoss ? 'text-red-500' : ''}`}>{bot.name}</h3>
                  <div className="text-sm opacity-60 text-center mb-4 font-mono">ELO: {bot.elo} | Depth: {bot.depth}</div>
                  <button className={`mt-auto py-2 rounded font-bold w-full ${bot.isBoss ? 'bg-red-800 text-white' : 'bg-black/20'}`}>Сразиться</button>
                </div>
              ))}
            </div>
            <button onClick={() => setView('mode_select')} className="mt-8 text-sm underline opacity-70 w-full text-center">Назад к режимам</button>
          </div>
        )}

        {/* 4. ИГРОВОЙ ЭКРАН */}
        {view === 'game' && currentBot && (
          <div className="flex flex-col lg:flex-row gap-8 w-full max-w-6xl items-center lg:items-start justify-center animate-fade-in">
            
            {/* Сайдбар Информации */}
            <div className={`w-full lg:w-80 p-6 border rounded-xl shadow-2xl flex flex-col ${theme.primary} ${currentBot.isBoss ? 'border-red-500/50' : theme.border}`}>
              <div className="flex items-center gap-4 mb-6 border-b pb-4 border-black/10">
                <div className="text-5xl">{currentBot.avatar}</div>
                <div>
                  <h3 className="text-xl font-bold">{currentBot.name}</h3>
                  <p className="text-sm font-mono opacity-60">AI Depth: {currentBot.depth}</p>
                </div>
              </div>

              {/* Облачко ИИ */}
              <div className="relative p-4 rounded-lg bg-black/20 italic mb-8 min-h-[80px] flex items-center shadow-inner">
                "{botComment}"
              </div>

              <div className="flex justify-between items-center font-mono mb-4 text-sm opacity-80">
                <span>Ход:</span>
                <span className={`font-bold px-2 py-1 rounded ${isPlayerTurn ? 'bg-blue-500/20 text-blue-500' : 'bg-red-500/20 text-red-500'}`}>
                  {isPlayerTurn ? 'Твой' : 'Оппонент думает...'}
                </span>
              </div>

              {gameOver && (
                <div className={`p-4 text-center rounded-lg font-bold mb-4 ${gameOver === 'player' ? 'bg-green-500/20 text-green-600' : 'bg-red-500/20 text-red-600'}`}>
                  {gameOver === 'player' ? 'Победа!' : 'Поражение.'}
                </div>
              )}

              <button onClick={() => setView('menu')} className="mt-auto py-2 w-full bg-black/10 hover:bg-black/20 rounded font-bold transition">
                Сдаться / Выйти
              </button>
            </div>

            {/* Доска */}
            <div className={`p-4 rounded-lg shadow-2xl ${theme.border} border-4 ${theme.primary}`}>
              <div className="grid grid-cols-8 grid-rows-8 w-[320px] h-[320px] sm:w-[500px] sm:h-[500px] shadow-inner">
                {board.map((row, r) => row.map((cell, c) => {
                  const isDark = (r + c) % 2 === 1;
                  const isSelected = selectedPiece?.r === r && selectedPiece?.c === c;
                  const isValidMove = selectedPiece?.validMoves.some((m:any) => m.to.r === r && m.to.c === c);

                  return (
                    <div 
                      key={`${r}-${c}`} 
                      onClick={() => handleCellClick(r, c)}
                      className={`relative w-full h-full flex items-center justify-center cursor-pointer transition-colors
                        ${isDark ? theme.boardDark : theme.boardLight}
                        ${isSelected ? 'ring-inset ring-4 ring-yellow-400 brightness-125' : ''}
                        ${isValidMove ? 'ring-inset ring-4 ring-green-500/50 bg-green-500/20' : ''}
                      `}
                    >
                      {/* Отрисовка фигур */}
                      {(cell === PLAYER || cell === PLAYER_KING) && (
                        <div className={`w-[75%] h-[75%] rounded-full bg-stone-200 shadow-xl border-2 border-stone-400 flex items-center justify-center transition-transform hover:scale-105`}>
                          {cell === PLAYER_KING && <span className="text-yellow-600 font-black">👑</span>}
                        </div>
                      )}
                      {(cell === BOT || cell === BOT_KING) && (
                        <div className={`w-[75%] h-[75%] rounded-full bg-stone-900 shadow-xl border-2 border-stone-700 flex items-center justify-center transition-transform hover:scale-105`}>
                          {cell === BOT_KING && <span className="text-yellow-500 font-black opacity-80">👑</span>}
                        </div>
                      )}
                      {/* Подсветка возможного хода */}
                      {isValidMove && <div className="absolute w-3 h-3 rounded-full bg-green-500 shadow-[0_0_10px_#22c55e]"></div>}
                    </div>
                  );
                }))}
              </div>
            </div>

          </div>
        )}

        {/* 5. МАГАЗИН И ПРОФИЛЬ (Кратко для экономии места) */}
        {view === 'shop' && (
          <div className="w-full max-w-2xl animate-fade-in">
             <h2 className="text-3xl font-bold mb-6 text-center">Системные модификации</h2>
             <div className="grid gap-4">
               {SHOP_ITEMS.map(item => {
                 const isOwned = profile.unlockedThemes.includes(item.id);
                 const isActive = profile.activeTheme === item.id;
                 return (
                   <div key={item.id} className={`p-4 rounded-xl border flex justify-between items-center ${theme.primary} ${theme.border}`}>
                     <span className="text-lg font-bold">{item.name}</span>
                     {isOwned ? (
                       <button onClick={() => saveProfile({...profile, activeTheme: item.id})} className={`px-4 py-2 rounded font-bold ${isActive ? 'bg-blue-500 text-white' : 'bg-black/10'}`}>
                         {isActive ? 'Установлено' : 'Применить'}
                       </button>
                     ) : (
                       <button onClick={() => buyTheme(item)} className={`px-4 py-2 rounded font-bold flex gap-2 ${profile.coins >= item.price ? 'bg-yellow-500 text-black' : 'bg-black/10 opacity-50'}`}>
                         Купить {item.price}🪙
                       </button>
                     )}
                   </div>
                 )
               })}
             </div>
             <button onClick={() => setView('menu')} className="mt-8 text-sm underline opacity-70 w-full text-center">Назад</button>
          </div>
        )}

        {view === 'profile' && (
          <div className="w-full max-w-3xl animate-fade-in">
             <div className={`p-6 rounded-xl border mb-6 flex justify-around text-center ${theme.primary} ${theme.border}`}>
                <div><div className="text-3xl font-bold text-blue-500">{profile.elo}</div><div className="text-sm opacity-60">Текущий ELO</div></div>
                <div><div className="text-3xl font-bold">{profile.stats.wins}</div><div className="text-sm opacity-60">Побед</div></div>
                <div><div className="text-3xl font-bold text-red-500">{profile.stats.losses}</div><div className="text-sm opacity-60">Поражений</div></div>
             </div>
             <h3 className="text-xl font-bold mb-4 opacity-80">История операций</h3>
             <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
               {history.length === 0 ? <p className="opacity-50 text-center py-4">Архив пуст.</p> : history.map((h, i) => (
                 <div key={i} className={`p-4 border rounded flex justify-between items-center ${theme.primary} ${theme.border}`}>
                    <div><div className="font-bold">{h.bot}</div><div className="text-xs opacity-50">{h.mode} | {h.date}</div></div>
                    <div className="text-right">
                      <div className={`font-bold ${h.result==='Победа'?'text-green-500':'text-red-500'}`}>{h.result}</div>
                      <div className="text-sm font-mono opacity-80">{h.eloChange} ELO</div>
                    </div>
                 </div>
               ))}
             </div>
             <button onClick={() => setView('menu')} className="mt-8 text-sm underline opacity-70 w-full text-center">Назад</button>
          </div>
        )}

      </main>

      <style jsx global>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
      `}</style>
    </div>
  );
}
