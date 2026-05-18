"use client";

import React, { useState } from 'react';

// --- ДАННЫЕ И КОНФИГИ ---
const BOSSES = [
  { id: 'bro', name: '👦 Младший Брат', elo: 800, style: 'Хаос', coins: 10, quote: "Ты ходишь или спишь?" },
  { id: 'serik', name: '🧑 Сосед Серик', elo: 1000, style: 'Начинающий', coins: 25, quote: "Ну, так у нас во дворе не играют..." },
  { id: 'teacher', name: '👨‍🏫 Учитель Математики', elo: 1400, style: 'Средний', coins: 50, quote: "Интересное решение. Но не оптимальное." },
  { id: 'champ', name: '🏆 Студент-Чемпион', elo: 1800, style: 'Сложный', coins: 100, quote: "Тебе еще учиться и учиться." },
  { id: 'einstein', name: '👴🏻 Эйнштейн', elo: 2200, style: 'Очень сложный', coins: 250, quote: "Всё относительно. Особенно твоя победа." },
  { id: 'ded', name: '🧓 ДЕД', elo: 3000, style: 'Богоподобный', coins: 1000, quote: "Я играл в это, когда доски были каменными." }
];

const SHOP_ITEMS = [
  { id: 'skin_dark', name: 'Dark Academia Board', price: 0, unlocked: true },
  { id: 'skin_neon', name: 'Cyberpunk Neon Grid', price: 500, unlocked: false },
  { id: 'skin_gold', name: 'Royal Gold Pieces', price: 1000, unlocked: false }
];

export default function Home() {
  // --- СОСТОЯНИЯ ---
  const [view, setView] = useState('menu');
  const [coins, setCoins] = useState(150);
  const [playerElo, setPlayerElo] = useState(1200);
  const [selectedBoss, setSelectedBoss] = useState<any>(null);
  const [matchHistory, setMatchHistory] = useState<any[]>([]);
  const [bossComment, setBossComment] = useState('');
  const [activeSkin, setActiveSkin] = useState('skin_dark');
  const [shop, setShop] = useState(SHOP_ITEMS);

  const initialBoard = Array(8).fill(null).map((_, row) => 
    Array(8).fill(0).map((_, col) => {
      if ((row + col) % 2 === 1) {
        if (row < 3) return 2;
        if (row > 4) return 1;
      }
      return 0;
    })
  );
  const [board, setBoard] = useState(initialBoard);
  const [selectedPiece, setSelectedPiece] = useState<any>(null);

  // --- ЛОГИКА ---
  const startGame = (boss: any) => {
    setSelectedBoss(boss);
    setBoard(initialBoard);
    setBossComment(boss.quote);
    setView('game');
  };

  const calculateElo = (playerRating: number, opponentRating: number, isWin: boolean) => {
    const K = 32;
    const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
    const actualScore = isWin ? 1 : 0;
    return Math.round(playerRating + K * (actualScore - expectedScore));
  };

  const handleWin = () => {
    if (!selectedBoss) return;
    const newElo = calculateElo(playerElo, selectedBoss.elo, true);
    const eloDiff = newElo - playerElo;
    setPlayerElo(newElo);
    setCoins(prev => prev + selectedBoss.coins);
    setMatchHistory([{ boss: selectedBoss.name, result: 'Победа', eloChange: `+${eloDiff}`, date: new Date().toLocaleDateString() }, ...matchHistory]);
    setBossComment("Невозможно... Как ты это сделал?");
    setTimeout(() => setView('menu'), 2500);
  };

  const handleLoss = () => {
    if (!selectedBoss) return;
    const newElo = calculateElo(playerElo, selectedBoss.elo, false);
    const eloDiff = playerElo - newElo;
    setPlayerElo(newElo);
    setMatchHistory([{ boss: selectedBoss.name, result: 'Поражение', eloChange: `-${eloDiff}`, date: new Date().toLocaleDateString() }, ...matchHistory]);
    setBossComment("Ожидаемый исход. Тренируйся.");
    setTimeout(() => setView('menu'), 2500);
  };

  const handleCellClick = (r: number, c: number) => {
    if (board[r][c] === 1) {
      setSelectedPiece({r, c});
      setBossComment("Думаешь, это хорошая идея?");
    } 
    else if (selectedPiece && board[r][c] === 0 && (r + c) % 2 === 1) {
      const newBoard = [...board];
      newBoard[selectedPiece.r][selectedPiece.c] = 0;
      newBoard[r][c] = 1;
      setBoard(newBoard);
      setSelectedPiece(null);
      setBossComment("Хм... Мой ход.");
      
      setTimeout(() => {
        setBossComment("Твоя защита слаба!");
      }, 1000);
    }
  };

  const buyItem = (item: any) => {
    if (coins >= item.price && !item.unlocked) {
      setCoins(coins - item.price);
      setShop(shop.map(i => i.id === item.id ? { ...i, unlocked: true } : i));
    }
  };

  // --- ВЕРСТКА ---
  return (
    <div className={`min-h-screen font-serif flex flex-col transition-colors duration-500 ${activeSkin === 'skin_neon' ? 'bg-black text-cyan-400' : 'bg-[#1a1614] text-[#e6d5c3]'}`}>
      <nav className="w-full p-4 border-b border-[#3a2e26] bg-[#120f0e] shadow-xl flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-widest uppercase cursor-pointer hover:text-amber-500 transition" onClick={() => setView('menu')}>
          Regicide <span className="text-sm font-normal opacity-50">♟️</span>
        </h1>
        <div className="flex gap-4 sm:gap-6 items-center font-mono text-sm sm:text-base">
          <div className="flex gap-2 items-center text-amber-200"><span>🧠 ELO: {playerElo}</span></div>
          <div className="flex gap-2 items-center text-yellow-500"><span>💰 {coins}</span></div>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8">
        {view === 'menu' && (
          <div className="w-full max-w-md flex flex-col gap-4 animate-fade-in">
            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold mb-2 tracking-wider">REGICIDE</h2>
              <p className="opacity-60 italic">Древняя игра королей</p>
            </div>
            <button onClick={() => setView('boss_select')} className="w-full py-4 bg-[#2a221d] hover:bg-[#3a2e26] border border-[#4a3b32] rounded-lg text-xl font-bold transition transform hover:scale-105 shadow-lg">⚔️ Играть против Босса</button>
            <button onClick={() => setView('history')} className="w-full py-4 bg-[#1a1614] hover:bg-[#2a221d] border border-[#3a2e26] rounded-lg text-lg transition shadow-md">📜 Архив партий</button>
            <button onClick={() => setView('shop')} className="w-full py-4 bg-[#1a1614] hover:bg-[#2a221d] border border-[#3a2e26] rounded-lg text-lg transition shadow-md">💎 Магазин скинов</button>
            <button onClick={() => setView('settings')} className="w-full py-4 bg-[#1a1614] hover:bg-[#2a221d] border border-[#3a2e26] rounded-lg text-lg transition shadow-md">⚙️ Настройки</button>
          </div>
        )}

        {view === 'boss_select' && (
          <div className="w-full max-w-5xl flex flex-col items-center gap-8 animate-fade-in">
            <h2 className="text-3xl font-bold italic border-b border-[#3a2e26] pb-4">Выбери оппонента</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
              {BOSSES.map((boss) => (
                <div key={boss.id} className="p-6 border border-[#3a2e26] rounded-xl bg-[#1e1916] hover:bg-[#2a221d] cursor-pointer transition transform hover:-translate-y-2 hover:shadow-[0_0_15px_rgba(217,119,6,0.2)] hover:border-amber-700/50 flex flex-col h-full" onClick={() => startGame(boss)}>
                  <h3 className="text-xl font-bold mb-2 text-amber-100">{boss.name}</h3>
                  <div className="flex justify-between text-sm opacity-60 mb-4">
                    <span className="bg-[#120f0e] px-2 py-1 rounded">{boss.style}</span>
                    <span className="bg-[#120f0e] px-2 py-1 rounded">ELO: {boss.elo}</span>
                  </div>
                  <div className="mt-auto pt-4 border-t border-[#3a2e26]"><span className="text-yellow-600/80 font-bold text-sm">Победа: +{boss.coins} 💰</span></div>
                </div>
              ))}
            </div>
            <button onClick={() => setView('menu')} className="mt-4 px-8 py-2 border border-[#4a3b32] rounded hover:bg-[#2a221d] transition">Назад в меню</button>
          </div>
        )}

        {view === 'game' && selectedBoss && (
          <div className="flex flex-col lg:flex-row gap-8 w-full max-w-5xl items-center lg:items-start justify-center animate-slide-up">
            <div className="w-full lg:w-1/3 p-6 bg-[#1e1916] border border-[#3a2e26] rounded-xl flex flex-col items-center text-center shadow-2xl relative">
              <h3 className="text-2xl font-bold mb-1 text-amber-500">{selectedBoss.name}</h3>
              <p className="text-sm opacity-50 mb-6 tracking-widest uppercase">ELO: {selectedBoss.elo}</p>
              <div className="relative bg-[#120f0e] p-4 rounded-lg border border-[#3a2e26] w-full mb-8 italic min-h-[80px] flex items-center justify-center">"{bossComment}"</div>
              <div className="flex gap-2 w-full mt-auto">
                <button onClick={handleLoss} className="flex-1 py-3 bg-red-950/30 text-red-500 border border-red-900/50 rounded hover:bg-red-900/40 transition font-bold text-sm">Сдаться</button>
                <button onClick={handleWin} className="flex-1 py-3 bg-green-950/30 text-green-500 border border-green-900/50 rounded hover:bg-green-900/40 transition font-bold text-sm">Выиграть (Dev)</button>
              </div>
            </div>

            <div className="p-3 bg-[#2c1e16] rounded-sm shadow-2xl border-4 border-[#1a110b]">
              <div className="grid grid-cols-8 grid-rows-8 w-[300px] h-[300px] sm:w-[450px] sm:h-[450px] border border-[#1a110b]">
                {board.map((row, r) => 
                  row.map((cell, c) => {
                    const isDarkCell = (r + c) % 2 === 1;
                    return (
                      <div key={`${r}-${c}`} onClick={() => handleCellClick(r, c)} className={`w-full h-full flex items-center justify-center cursor-pointer ${isDarkCell ? 'bg-[#4a3525] hover:bg-[#5a422e]' : 'bg-[#d0b49f] cursor-default'} ${selectedPiece?.r === r && selectedPiece?.c === c ? 'ring-inset ring-4 ring-amber-400 bg-[#7a5530]' : ''}`}>
                        {cell === 1 && <div className="w-[75%] h-[75%] rounded-full bg-[#e8dcc4] shadow-[inset_-2px_-4px_6px_rgba(0,0,0,0.3),_2px_4px_4px_rgba(0,0,0,0.5)] border border-[#a89c84] transition-transform hover:scale-105"></div>}
                        {cell === 2 && <div className="w-[75%] h-[75%] rounded-full bg-[#1a110b] shadow-[inset_-2px_-4px_6px_rgba(255,255,255,0.1),_2px_4px_4px_rgba(0,0,0,0.7)] border border-black transition-transform hover:scale-105"></div>}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {view === 'history' && (
          <div className="w-full max-w-2xl animate-fade-in">
            <h2 className="text-3xl font-bold mb-8 text-center border-b border-[#3a2e26] pb-4">Архив Сражений</h2>
            <div className="bg-[#1e1916] rounded-xl border border-[#3a2e26] p-4 min-h-[300px]">
              {matchHistory.length === 0 ? (
                <div className="h-full flex items-center justify-center opacity-50 italic">Вы еще не сыграли ни одной партии.</div>
              ) : (
                <div className="space-y-3">
                  {matchHistory.map((match, idx) => (
                    <div key={idx} className="flex justify-between items-center p-4 bg-[#120f0e] border border-[#2a221d] rounded">
                      <div><p className="font-bold">{match.boss}</p><p className="text-xs opacity-50">{match.date}</p></div>
                      <div className="text-right"><p className={match.result === 'Победа' ? 'text-green-500 font-bold' : 'text-red-500 font-bold'}>{match.result}</p><p className="text-sm opacity-60 font-mono">{match.eloChange} ELO</p></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => setView('menu')} className="mt-6 w-full py-3 border border-[#4a3b32] rounded hover:bg-[#2a221d] transition">Назад в меню</button>
          </div>
        )}

        {view === 'shop' && (
          <div className="w-full max-w-2xl animate-fade-in">
            <h2 className="text-3xl font-bold mb-8 text-center border-b border-[#3a2e26] pb-4">Магазин Артефактов</h2>
            <div className="space-y-4">
              {shop.map(item => (
                <div key={item.id} className="flex justify-between items-center p-5 bg-[#1e1916] border border-[#3a2e26] rounded-xl">
                  <span className="text-xl font-bold">{item.name}</span>
                  {item.unlocked ? (
                    <button onClick={() => setActiveSkin(item.id)} className={`px-6 py-2 rounded font-bold transition ${activeSkin === item.id ? 'bg-amber-700/20 text-amber-500 border border-amber-700/50' : 'bg-[#2a221d] hover:bg-[#3a2e26] border border-[#4a3b32]'}`}>
                      {activeSkin === item.id ? 'Экипировано' : 'Выбрать'}
                    </button>
                  ) : (
                    <button onClick={() => buyItem(item)} className={`px-6 py-2 rounded font-bold flex items-center gap-2 transition ${coins >= item.price ? 'bg-yellow-900/30 text-yellow-500 hover:bg-yellow-900/50 border border-yellow-700/50' : 'bg-[#120f0e] text-stone-600 cursor-not-allowed border border-[#2a221d]'}`}>
                      Купить за {item.price} 💰
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button onClick={() => setView('menu')} className="mt-8 w-full py-3 border border-[#4a3b32] rounded hover:bg-[#2a221d] transition">Назад в меню</button>
          </div>
        )}

        {view === 'settings' && (
          <div className="w-full max-w-md animate-fade-in">
            <h2 className="text-3xl font-bold mb-8 text-center border-b border-[#3a2e26] pb-4">Настройки</h2>
            <div className="bg-[#1e1916] p-6 rounded-xl border border-[#3a2e26] space-y-6 text-center opacity-70">
              <p>Здесь пока пусто.</p><p className="text-sm">В будущем здесь будет привязка аккаунта, настройка звука и интеграция Stripe для доната.</p>
            </div>
            <button onClick={() => setView('menu')} className="mt-8 w-full py-3 border border-[#4a3b32] rounded hover:bg-[#2a221d] transition">Назад в меню</button>
          </div>
        )}

      </main>

      <style jsx global>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
        .animate-slide-up { animation: slideUp 0.5s ease-out forwards; }
      `}</style>
    </div>
  );
}