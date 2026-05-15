# 概要

ローマ字をカルタ感覚で楽しく覚えることができるアプリ

## 実際の画面

- ホーム画面
![ホーム](https://github.com/mutsumiyamaguchi/romaji-karuta/blob/main/image/%E3%82%B9%E3%82%AF%E3%83%AA%E3%83%BC%E3%83%B3%E3%82%B7%E3%83%A7%E3%83%83%E3%83%88%202026-05-07%2021.19.47.png)<br>
<br>

- ゲーム画面
![ゲーム画面](https://github.com/mutsumiyamaguchi/romaji-karuta/blob/main/image/%E3%82%B9%E3%82%AF%E3%83%AA%E3%83%BC%E3%83%B3%E3%82%B7%E3%83%A7%E3%83%83%E3%83%88%202026-05-07%2021.19.59.png)<br>
<br>

- 正解時
![正解時](https://github.com/mutsumiyamaguchi/romaji-karuta/blob/main/image/%E3%82%B9%E3%82%AF%E3%83%AA%E3%83%BC%E3%83%B3%E3%82%B7%E3%83%A7%E3%83%83%E3%83%88%202026-05-07%2021.20.20.png)<br>
<br>

- 不正解時
![不正解時](https://github.com/mutsumiyamaguchi/romaji-karuta/blob/main/image/%E3%82%B9%E3%82%AF%E3%83%AA%E3%83%BC%E3%83%B3%E3%82%B7%E3%83%A7%E3%83%83%E3%83%88%202026-05-07%2021.20.25.png)<br>
<br>

- 問題セット終了時
![問題セット終了](https://github.com/mutsumiyamaguchi/romaji-karuta/blob/main/image/%E3%82%B9%E3%82%AF%E3%83%AA%E3%83%BC%E3%83%B3%E3%82%B7%E3%83%A7%E3%83%83%E3%83%88%202026-05-07%2021.20.29.png)<br>

## 想定ユーザー

- 年少 〜 小学校低学年

## 工夫した点

- ひらがなを多用すること
- クリックだけで完結していること
- わかりやすいUI
- 間違った時には正解を表示する
- 問題セットが終わるごとに何問正解したかを表示することでモチベーション維持
- ポイントをつけることでモチベーションに繋げる

## 改善点

- 音をつけたらより楽しいかもしれない
- ポイント制度が蓄積になっている

---

## 開発セットアップ

### 必要なツール
- Node.js 20+
- `npx wrangler`（`devDependencies` で固定はしていないため `npx` 経由で都度実行）
- Cloudflare アカウント（D1 / Pages 利用）

### 通常の開発（フロントのみ）
```sh
npm install
npm run dev      # Vite 開発サーバー（http://localhost:5173/）
npm test         # Vitest 全テスト
npm run lint
npm run build
```

### Cloudflare D1 / Pages Functions セットアップ

API（`functions/api/`）と D1 を含めてローカル動作確認する手順。

1. **D1 データベースを作成**（初回のみ）
   ```sh
   npx wrangler d1 create romaji-karuta
   ```
   実行後に表示される `database_id` を `wrangler.toml` の `database_id = "PLACEHOLDER-..."` に貼り付ける。

2. **ローカル D1 にマイグレーション適用**
   ```sh
   npx wrangler d1 execute romaji-karuta --file=migrations/0001_init.sql --local
   ```

3. **本番 D1 にマイグレーション適用**
   ```sh
   npx wrangler d1 execute romaji-karuta --file=migrations/0001_init.sql --remote
   ```

4. **メンター PIN を設定**（初回のみ、SHA-256 ハッシュを直接書き込む）

   ハッシュは `PIN_SALT` と PIN を `<salt>:<pin>` で連結して SHA-256 を hex 化したもの。
   例として salt=`change-me` / pin=`0000` の場合、Node で次のように生成できる:
   ```sh
   node -e "import('crypto').then(c=>{const h=c.createHash('sha256').update('change-me:0000').digest('hex');console.log(h)})"
   ```
   生成したハッシュで mentor_config を更新する:
   ```sh
   npx wrangler d1 execute romaji-karuta --local --command "UPDATE mentor_config SET pin_hash='<生成したhex>' WHERE id=1;"
   npx wrangler d1 execute romaji-karuta --remote --command "UPDATE mentor_config SET pin_hash='<生成したhex>' WHERE id=1;"
   ```

5. **`PIN_SALT` を環境変数として登録**
   - ローカル: `.dev.vars` に `PIN_SALT="change-me"` を 1 行追加（`.gitignore` 済み）
   - 本番: Cloudflare ダッシュボードの Pages > Settings > Environment variables で `PIN_SALT` を Secret として登録

6. **ローカル起動（フロント + Functions + D1）**
   ```sh
   npx wrangler pages dev
   ```

### ディレクトリ構成（バックエンド側）

```
functions/
├── _lib/
│   ├── auth.js                     ← PIN ハッシュ + セッション Cookie
│   ├── http.js                     ← JSON ヘルパー
│   └── handlers/
│       ├── students.js
│       ├── points.js
│       ├── mistakes.js
│       └── mentor.js
└── api/
    ├── students.js                 ← GET / POST
    ├── students/
    │   ├── [id].js                 ← DELETE
    │   └── [id]/
    │       ├── points.js           ← GET / POST
    │       └── mistakes.js         ← GET / POST
    └── auth/
        └── mentor.js               ← POST（PIN 検証 + Set-Cookie）

migrations/
└── 0001_init.sql

tests/
├── helpers/d1Mock.js               ← D1 の最小モック
└── functions/                      ← 各エンドポイントのユニットテスト
```

