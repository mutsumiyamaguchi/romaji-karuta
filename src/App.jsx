import React, { useState, useEffect } from 'react';
import { Star, CheckCircle2, XCircle, Home, Award, Play } from 'lucide-react';

// ローマ字のデータリスト
const romajiList = [
  { h: 'あ', r: 'a', row: 'あ' }, { h: 'い', r: 'i', row: 'あ' }, { h: 'う', r: 'u', row: 'あ' }, { h: 'え', r: 'e', row: 'あ' }, { h: 'お', r: 'o', row: 'あ' },
  { h: 'か', r: 'ka', row: 'か' }, { h: 'き', r: 'ki', row: 'か' }, { h: 'く', r: 'ku', row: 'か' }, { h: 'け', r: 'ke', row: 'か' }, { h: 'こ', r: 'ko', row: 'か' },
  { h: 'さ', r: 'sa', row: 'さ' }, { h: 'し', r: 'shi', row: 'さ' }, { h: 'す', r: 'su', row: 'さ' }, { h: 'せ', r: 'se', row: 'さ' }, { h: 'そ', r: 'so', row: 'さ' },
  { h: 'た', r: 'ta', row: 'た' }, { h: 'ち', r: 'chi', row: 'た' }, { h: 'つ', r: 'tsu', row: 'た' }, { h: 'て', r: 'te', row: 'た' }, { h: 'と', r: 'to', row: 'た' },
  { h: 'な', r: 'na', row: 'な' }, { h: 'に', r: 'ni', row: 'な' }, { h: 'ぬ', r: 'nu', row: 'な' }, { h: 'ね', r: 'ne', row: 'な' }, { h: 'の', r: 'no', row: 'な' },
  { h: 'は', r: 'ha', row: 'は' }, { h: 'ひ', r: 'hi', row: 'は' }, { h: 'ふ', r: 'fu', row: 'は' }, { h: 'へ', r: 'he', row: 'は' }, { h: 'ほ', r: 'ho', row: 'は' },
  { h: 'ま', r: 'ma', row: 'ま' }, { h: 'み', r: 'mi', row: 'ま' }, { h: 'む', r: 'mu', row: 'ま' }, { h: 'め', r: 'me', row: 'ま' }, { h: 'も', r: 'mo', row: 'ま' },
  { h: 'や', r: 'ya', row: 'や' }, { h: 'ゆ', r: 'yu', row: 'や' }, { h: 'よ', r: 'yo', row: 'や' },
  { h: 'ら', r: 'ra', row: 'ら' }, { h: 'り', r: 'ri', row: 'ら' }, { h: 'る', r: 'ru', row: 'ら' }, { h: 'れ', r: 're', row: 'ら' }, { h: 'ろ', r: 'ro', row: 'ら' },
  { h: 'わ', r: 'wa', row: 'わ' }, { h: 'を', r: 'wo', row: 'わ' }, { h: 'ん', r: 'n', row: 'わ' }
];

const rows = ['あ', 'か', 'さ', 'た', 'な', 'は', 'ま', 'や', 'ら', 'わ'];

// 配列をシャッフルする関数
const shuffle = (array) => {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

export default function App() {
  const [mode, setMode] = useState('menu'); // 'menu', 'playing', 'result'
  const [points, setPoints] = useState(0);
  
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [choices, setChoices] = useState([]);
  const [score, setScore] = useState(0);
  const [earnedPoints, setEarnedPoints] = useState(0);
  
  const [feedback, setFeedback] = useState(null); // 'correct', 'incorrect'
  const [isAnimating, setIsAnimating] = useState(false);

  // ポイントの読み込み
  useEffect(() => {
    try {
      const saved = localStorage.getItem('romajiPoints');
      if (saved) setPoints(parseInt(saved, 10));
    } catch (e) {
      console.log('localStorage not available');
    }
  }, []);

  // ポイントの保存
  const updatePoints = (newPoints) => {
    setPoints(newPoints);
    try {
      localStorage.setItem('romajiPoints', newPoints);
    } catch (e) {
      // ignore
    }
  };

  // ゲームの開始
  const startGame = (targetRow) => {
    let selectedQuestions = [];
    
    if (targetRow === 'random') {
      // 全てからランダムに15問
      selectedQuestions = shuffle([...romajiList]).slice(0, 15);
    } else {
      // 特定の行の全ての文字（あ行なら5問）
      // selectedQuestions = shuffle(romajiList.filter(item => item.row === targetRow));
      selectedQuestions = romajiList.filter(item => item.row === targetRow);
    }

    setQuestions(selectedQuestions);
    setCurrentQuestionIndex(0);
    setScore(0);
    setEarnedPoints(0);
    setChoices(generateChoices(selectedQuestions[0]));
    setMode('playing');
  };

  // 選択肢（札）の生成
  const generateChoices = (correctItem) => {
    // 正解以外のリストを作成
    const others = romajiList.filter(item => item.r !== correctItem.r);
    // 不正解をランダムに3つ選ぶ
    const shuffledOthers = shuffle(others).slice(0, 3);
    // 正解と不正解を混ぜてシャッフルし、カルタっぽく少し傾きを持たせる
    const newChoices = shuffle([correctItem, ...shuffledOthers]).map(c => ({
      ...c,
      rotation: Math.floor(Math.random() * 12) - 6 // -6度から+5度
    }));
    return newChoices;
  };

  // 札を選んだときの処理
  const handleChoiceClick = (choice) => {
    if (isAnimating) return; // アニメーション中は連打防止
    setIsAnimating(true);
    
    const correct = questions[currentQuestionIndex].r === choice.r;
    
    if (correct) {
      setFeedback('correct');
      setScore(s => s + 1);
      setEarnedPoints(p => p + 10);
      updatePoints(points + 10);
    } else {
      setFeedback('incorrect');
    }

    // 2秒後に次の問題へ
    setTimeout(() => {
      setFeedback(null);
      setIsAnimating(false);
      
      if (currentQuestionIndex < questions.length - 1) {
        const nextIndex = currentQuestionIndex + 1;
        setCurrentQuestionIndex(nextIndex);
        setChoices(generateChoices(questions[nextIndex]));
      } else {
        setMode('result');
      }
    }, 2500); // 小さい子がしっかり見れるように2.5秒表示
  };

  // メニュー画面のレンダリング
  if (mode === 'menu') {
    return (
      <div className="min-h-screen bg-yellow-50 text-gray-800 font-sans p-4 flex flex-col items-center justify-center">
        {/* ポイント表示 */}
        <div className="absolute top-4 right-4 bg-white px-4 py-2 rounded-full shadow-md flex items-center gap-2 border-2 border-yellow-400">
          <Star className="text-yellow-400 fill-yellow-400 w-6 h-6" />
          <span className="text-xl font-bold text-yellow-600">{points} ぽいんと</span>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-5xl md:text-7xl font-black text-orange-500 mb-4 drop-shadow-sm tracking-wider">
            ローマじ かるた
          </h1>
          <p className="text-xl md:text-2xl text-orange-700 font-bold">
            れんしゅうする ぎょうを えらんでね！
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4 w-full max-w-3xl mb-6">
          {rows.map(row => (
            <button
              key={row}
              onClick={() => startGame(row)}
              className="bg-white border-4 border-orange-400 rounded-2xl py-4 shadow-[0_6px_0_#f6ad55] active:shadow-[0_0px_0_#f6ad55] active:translate-y-2 transition-all flex items-center justify-center text-3xl font-bold text-orange-600 hover:bg-orange-50"
            >
              {row} ぎょう
            </button>
          ))}
        </div>

        <button
          onClick={() => startGame('random')}
          className="w-full max-w-sm bg-gradient-to-r from-red-400 to-pink-500 border-4 border-pink-600 rounded-3xl py-5 shadow-[0_8px_0_#be185d] active:shadow-[0_0px_0_#be185d] active:translate-y-2 transition-all flex flex-col items-center justify-center text-white"
        >
          <span className="text-3xl font-black mb-1">ぜんぶ まぜまぜ</span>
          <span className="text-lg font-bold bg-white/30 px-3 py-1 rounded-full">ランダム 15もん</span>
        </button>
      </div>
    );
  }

  // 結果画面のレンダリング
  if (mode === 'result') {
    return (
      <div className="min-h-screen bg-orange-100 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl text-center max-w-md w-full border-8 border-orange-300">
          <Award className="w-32 h-32 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-5xl font-black text-orange-500 mb-6">おわり！</h2>
          
          <div className="text-3xl font-bold text-gray-700 mb-6 space-y-4">
            <p>{questions.length} もんちゅう</p>
            <p className="text-4xl text-red-500">
              {score} もん せいかい！
            </p>
          </div>

          <div className="bg-yellow-100 rounded-2xl p-4 mb-8 flex justify-center items-center gap-3">
            <Star className="text-yellow-500 fill-yellow-500 w-8 h-8" />
            <span className="text-3xl font-bold text-yellow-600">+{earnedPoints} ぽいんと</span>
          </div>

          <button
            onClick={() => setMode('menu')}
            className="w-full bg-blue-400 border-4 border-blue-600 rounded-2xl py-4 shadow-[0_6px_0_#2563eb] active:shadow-[0_0px_0_#2563eb] active:translate-y-2 transition-all flex items-center justify-center text-white text-2xl font-bold"
          >
            <Home className="w-8 h-8 mr-2" />
            メニューにもどる
          </button>
        </div>
      </div>
    );
  }

  // プレイ画面のレンダリング
  const currentQ = questions[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-green-50 flex flex-col items-center relative overflow-hidden font-sans">
      
      {/* ヘッダー情報 */}
      <div className="w-full p-4 flex justify-between items-center bg-white/50 mb-4">
        
        {/* 左側：もどるボタンと問題数 */}
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={() => setMode('menu')}
            className="bg-white p-2 sm:px-4 sm:py-2 rounded-full shadow-sm flex items-center gap-2 border-2 border-blue-400 hover:bg-blue-50 active:translate-y-1 transition-all text-blue-500 font-bold"
            title="メニューにもどる"
          >
            <Home className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="hidden sm:inline">もどる</span>
          </button>
          
          <div className="bg-white px-3 py-2 sm:px-4 rounded-full shadow-sm font-bold text-gray-600 text-base sm:text-lg border-2 border-gray-200">
            {currentQuestionIndex + 1} / {questions.length} もんめ
          </div>
        </div>

        {/* 右側：ポイント表示 */}
        <div className="bg-white px-3 py-2 sm:px-4 rounded-full shadow-sm flex items-center gap-1 sm:gap-2 border-2 border-yellow-300">
          <Star className="text-yellow-400 fill-yellow-400 w-4 h-4 sm:w-5 sm:h-5" />
          <span className="text-base sm:text-lg font-bold text-yellow-600">{points} ぽいんと</span>
        </div>
      </div>

      {/* 問題表示（大きく） */}
      <div className="flex-1 flex flex-col justify-center items-center w-full px-4 mb-8">
        <div className="text-2xl font-bold text-gray-500 mb-4 bg-white/50 px-6 py-2 rounded-full">
          これ なーんだ？
        </div>
        <div className="text-[12rem] leading-none font-black text-gray-800 drop-shadow-xl select-none">
          {currentQ.h}
        </div>
      </div>

      {/* 選択肢（カルタの札） */}
      <div className="w-full max-w-4xl p-4 pb-12 flex flex-wrap justify-center gap-4 sm:gap-6">
        {choices.map((choice, idx) => (
          <button
            key={`${choice.r}-${idx}`}
            onClick={() => handleChoiceClick(choice)}
            style={{ transform: `rotate(${choice.rotation}deg)` }}
            className={`
              w-28 h-36 sm:w-40 sm:h-48 bg-white border-4 rounded-xl flex items-center justify-center 
              text-5xl sm:text-7xl font-bold text-gray-800 transition-transform select-none
              ${isAnimating ? 'cursor-not-allowed opacity-90' : 'hover:scale-105 active:translate-y-2'}
              border-amber-500 shadow-[0_8px_0_#d97706] active:shadow-[0_0px_0_#d97706]
            `}
          >
            {choice.r}
          </button>
        ))}
      </div>

      {/* フィードバックのオーバーレイ（正解/不正解） */}
      {feedback && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-10 md:p-16 text-center shadow-2xl border-8 border-white animate-bounce-short">
            {feedback === 'correct' ? (
              <div className="flex flex-col items-center">
                <CheckCircle2 className="w-40 h-40 text-green-500 mb-6 drop-shadow-md" />
                <h2 className="text-6xl md:text-7xl font-black text-green-500 tracking-wider">
                  せいかい！
                </h2>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <XCircle className="w-40 h-40 text-red-500 mb-6 drop-shadow-md" />
                <h2 className="text-6xl md:text-7xl font-black text-red-500 tracking-wider mb-6">
                  ざんねん！
                </h2>
                <div className="bg-red-50 p-6 rounded-2xl border-4 border-red-200">
                  <p className="text-3xl md:text-4xl font-bold text-gray-700">
                    せいかいは
                  </p>
                  <p className="text-7xl md:text-8xl font-black text-red-600 mt-4">
                    {currentQ.r}
                  </p>
                  <p className="text-3xl md:text-4xl font-bold text-gray-700 mt-4">
                    だよ！
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ちょっとしたCSSアニメーション用のスタイル追加 */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes bounce-short {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        .animate-bounce-short {
          animation: bounce-short 0.5s ease-in-out 1;
        }
      `}} />
    </div>
  );
}