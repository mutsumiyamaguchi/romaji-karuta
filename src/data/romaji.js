// ローマ字のデータリスト
//
// step: 出題ステップ分類。`'seion' | 'dakuon' | 'youon'`
//   - seion: 清音（あ行〜わ行 + ん、計46文字）+ 互換のうぃ/うぇ
//   - dakuon: 濁音・半濁音（ぢ・づ は除外、計23文字）
//   - youon: 拗音（ぢゃ系は除外、計33文字）
// r: 主表記（訓令式優先 = タイピング効率を重視。SI/TI/TU/HU など）。
//    内部 ID として使うため、ユニークかつ不変。比較・記録の主キー。
// alts: 訓令式以外の代替表記（ヘボン式）。表示時のみランダムで使われる。
//       set/delete 時は r に揃える。
//
// 出題時は [r, ...(alts ?? [])] からランダムに 1 つ表示する。
export const romajiList = [
  // ----- 清音 (seion) -----
  { h: 'あ', r: 'a', row: 'あ', step: 'seion' }, { h: 'い', r: 'i', row: 'あ', step: 'seion' }, { h: 'う', r: 'u', row: 'あ', step: 'seion' }, { h: 'え', r: 'e', row: 'あ', step: 'seion' }, { h: 'お', r: 'o', row: 'あ', step: 'seion' },
  { h: 'か', r: 'ka', row: 'か', step: 'seion' }, { h: 'き', r: 'ki', row: 'か', step: 'seion' }, { h: 'く', r: 'ku', row: 'か', step: 'seion' }, { h: 'け', r: 'ke', row: 'か', step: 'seion' }, { h: 'こ', r: 'ko', row: 'か', step: 'seion' },
  { h: 'さ', r: 'sa', row: 'さ', step: 'seion' }, { h: 'し', r: 'si', alts: ['shi'], row: 'さ', step: 'seion' }, { h: 'す', r: 'su', row: 'さ', step: 'seion' }, { h: 'せ', r: 'se', row: 'さ', step: 'seion' }, { h: 'そ', r: 'so', row: 'さ', step: 'seion' },
  { h: 'た', r: 'ta', row: 'た', step: 'seion' }, { h: 'ち', r: 'ti', alts: ['chi'], row: 'た', step: 'seion' }, { h: 'つ', r: 'tu', alts: ['tsu'], row: 'た', step: 'seion' }, { h: 'て', r: 'te', row: 'た', step: 'seion' }, { h: 'と', r: 'to', row: 'た', step: 'seion' },
  { h: 'な', r: 'na', row: 'な', step: 'seion' }, { h: 'に', r: 'ni', row: 'な', step: 'seion' }, { h: 'ぬ', r: 'nu', row: 'な', step: 'seion' }, { h: 'ね', r: 'ne', row: 'な', step: 'seion' }, { h: 'の', r: 'no', row: 'な', step: 'seion' },
  { h: 'は', r: 'ha', row: 'は', step: 'seion' }, { h: 'ひ', r: 'hi', row: 'は', step: 'seion' }, { h: 'ふ', r: 'hu', alts: ['fu'], row: 'は', step: 'seion' }, { h: 'へ', r: 'he', row: 'は', step: 'seion' }, { h: 'ほ', r: 'ho', row: 'は', step: 'seion' },
  { h: 'ま', r: 'ma', row: 'ま', step: 'seion' }, { h: 'み', r: 'mi', row: 'ま', step: 'seion' }, { h: 'む', r: 'mu', row: 'ま', step: 'seion' }, { h: 'め', r: 'me', row: 'ま', step: 'seion' }, { h: 'も', r: 'mo', row: 'ま', step: 'seion' },
  { h: 'や', r: 'ya', row: 'や', step: 'seion' }, { h: 'ゆ', r: 'yu', row: 'や', step: 'seion' }, { h: 'よ', r: 'yo', row: 'や', step: 'seion' },
  { h: 'ら', r: 'ra', row: 'ら', step: 'seion' }, { h: 'り', r: 'ri', row: 'ら', step: 'seion' }, { h: 'る', r: 'ru', row: 'ら', step: 'seion' }, { h: 'れ', r: 're', row: 'ら', step: 'seion' }, { h: 'ろ', r: 'ro', row: 'ら', step: 'seion' },
  { h: 'わ', r: 'wa', row: 'わ', step: 'seion' }, { h: 'うぃ', r: 'wi', row: 'わ', step: 'seion' }, { h: 'うぇ', r: 'we', row: 'わ', step: 'seion' }, { h: 'を', r: 'wo', row: 'わ', step: 'seion' }, { h: 'ん', r: 'nn', row: 'わ', step: 'seion' },

  // ----- 濁音・半濁音 (dakuon) -----
  // が行
  { h: 'が', r: 'ga', row: 'が', step: 'dakuon' }, { h: 'ぎ', r: 'gi', row: 'が', step: 'dakuon' }, { h: 'ぐ', r: 'gu', row: 'が', step: 'dakuon' }, { h: 'げ', r: 'ge', row: 'が', step: 'dakuon' }, { h: 'ご', r: 'go', row: 'が', step: 'dakuon' },
  // ざ行
  { h: 'ざ', r: 'za', row: 'ざ', step: 'dakuon' }, { h: 'じ', r: 'zi', alts: ['ji'], row: 'ざ', step: 'dakuon' }, { h: 'ず', r: 'zu', row: 'ざ', step: 'dakuon' }, { h: 'ぜ', r: 'ze', row: 'ざ', step: 'dakuon' }, { h: 'ぞ', r: 'zo', row: 'ざ', step: 'dakuon' },
  // だ行 (ぢ・づ 除外)
  { h: 'だ', r: 'da', row: 'だ', step: 'dakuon' }, { h: 'で', r: 'de', row: 'だ', step: 'dakuon' }, { h: 'ど', r: 'do', row: 'だ', step: 'dakuon' },
  // ば行
  { h: 'ば', r: 'ba', row: 'ば', step: 'dakuon' }, { h: 'び', r: 'bi', row: 'ば', step: 'dakuon' }, { h: 'ぶ', r: 'bu', row: 'ば', step: 'dakuon' }, { h: 'べ', r: 'be', row: 'ば', step: 'dakuon' }, { h: 'ぼ', r: 'bo', row: 'ば', step: 'dakuon' },
  // ぱ行 (半濁音)
  { h: 'ぱ', r: 'pa', row: 'ぱ', step: 'dakuon' }, { h: 'ぴ', r: 'pi', row: 'ぱ', step: 'dakuon' }, { h: 'ぷ', r: 'pu', row: 'ぱ', step: 'dakuon' }, { h: 'ぺ', r: 'pe', row: 'ぱ', step: 'dakuon' }, { h: 'ぽ', r: 'po', row: 'ぱ', step: 'dakuon' },

  // ----- 拗音 (youon) -----  ぢゃ系は除外
  // きゃ行
  { h: 'きゃ', r: 'kya', row: 'きゃ', step: 'youon' }, { h: 'きゅ', r: 'kyu', row: 'きゃ', step: 'youon' }, { h: 'きょ', r: 'kyo', row: 'きゃ', step: 'youon' },
  // しゃ行
  { h: 'しゃ', r: 'sya', alts: ['sha'], row: 'しゃ', step: 'youon' }, { h: 'しゅ', r: 'syu', alts: ['shu'], row: 'しゃ', step: 'youon' }, { h: 'しょ', r: 'syo', alts: ['sho'], row: 'しゃ', step: 'youon' },
  // ちゃ行
  { h: 'ちゃ', r: 'tya', alts: ['cha'], row: 'ちゃ', step: 'youon' }, { h: 'ちゅ', r: 'tyu', alts: ['chu'], row: 'ちゃ', step: 'youon' }, { h: 'ちょ', r: 'tyo', alts: ['cho'], row: 'ちゃ', step: 'youon' },
  // にゃ行
  { h: 'にゃ', r: 'nya', row: 'にゃ', step: 'youon' }, { h: 'にゅ', r: 'nyu', row: 'にゃ', step: 'youon' }, { h: 'にょ', r: 'nyo', row: 'にゃ', step: 'youon' },
  // ひゃ行
  { h: 'ひゃ', r: 'hya', row: 'ひゃ', step: 'youon' }, { h: 'ひゅ', r: 'hyu', row: 'ひゃ', step: 'youon' }, { h: 'ひょ', r: 'hyo', row: 'ひゃ', step: 'youon' },
  // みゃ行
  { h: 'みゃ', r: 'mya', row: 'みゃ', step: 'youon' }, { h: 'みゅ', r: 'myu', row: 'みゃ', step: 'youon' }, { h: 'みょ', r: 'myo', row: 'みゃ', step: 'youon' },
  // りゃ行
  { h: 'りゃ', r: 'rya', row: 'りゃ', step: 'youon' }, { h: 'りゅ', r: 'ryu', row: 'りゃ', step: 'youon' }, { h: 'りょ', r: 'ryo', row: 'りゃ', step: 'youon' },
  // ぎゃ行
  { h: 'ぎゃ', r: 'gya', row: 'ぎゃ', step: 'youon' }, { h: 'ぎゅ', r: 'gyu', row: 'ぎゃ', step: 'youon' }, { h: 'ぎょ', r: 'gyo', row: 'ぎゃ', step: 'youon' },
  // じゃ行
  { h: 'じゃ', r: 'zya', alts: ['ja'], row: 'じゃ', step: 'youon' }, { h: 'じゅ', r: 'zyu', alts: ['ju'], row: 'じゃ', step: 'youon' }, { h: 'じょ', r: 'zyo', alts: ['jo'], row: 'じゃ', step: 'youon' },
  // びゃ行
  { h: 'びゃ', r: 'bya', row: 'びゃ', step: 'youon' }, { h: 'びゅ', r: 'byu', row: 'びゃ', step: 'youon' }, { h: 'びょ', r: 'byo', row: 'びゃ', step: 'youon' },
  // ぴゃ行
  { h: 'ぴゃ', r: 'pya', row: 'ぴゃ', step: 'youon' }, { h: 'ぴゅ', r: 'pyu', row: 'ぴゃ', step: 'youon' }, { h: 'ぴょ', r: 'pyo', row: 'ぴゃ', step: 'youon' },
];

// 出題ステップの識別子
export const STEPS = Object.freeze({
  seion: 'seion',
  dakuon: 'dakuon',
  youon: 'youon',
});

// 行ラベル（F4 行別練習の選択肢順）
// 清音 → 濁音/半濁音 → 拗音 の順に並べる。
export const rows = [
  // 清音
  'あ', 'か', 'さ', 'た', 'な', 'は', 'ま', 'や', 'ら', 'わ',
  // 濁音・半濁音
  'が', 'ざ', 'だ', 'ば', 'ぱ',
  // 拗音
  'きゃ', 'しゃ', 'ちゃ', 'にゃ', 'ひゃ', 'みゃ', 'りゃ', 'ぎゃ', 'じゃ', 'びゃ', 'ぴゃ',
];
