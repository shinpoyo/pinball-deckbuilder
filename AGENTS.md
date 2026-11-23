# AGENTS.md — 『弾む思いつき』開発メモ

## プロジェクト
深海物理ピンボール×デッキ構築ブラウザゲーム（Vanilla JS + Canvas 2D + Web Audio API、ビルド不要の静的ファイル構成）。
公開先： https://shinpoyo.com/pinball-deckbuilder/ （GitHub Pages、`main` 反映で自動公開）

### ファイル構成
- `index.html`：HTML 本体・メタタグ / OGP
- `assets/style.css`：スタイルシート
- `assets/game.js`：ゲーム本体（物理演算・Canvas 描画・Web Audio・UI 制御）
- `assets/img/`：ゲーム内画像（外部 WebP 25枚）、SVG ファビコン（`favicon.svg`）、OGP 画像（`ogp.jpg`）

※ 以前は単一 `index.html` に Base64 埋め込みしていたが、PR #1 で外部ファイル構成へ移行済み。今後は再び Base64 埋め込みに戻さないこと。

## 作業の入口
- `TASKS.md` を最初に読む。タスクは上から順に、止まらず全部実施する。
- 詳細な仕様は `tasks/*.md` にある。終わったタスクは `tasks/done/` へ移動する。

## 複数 AI / 協調運用のルール
- 複数の AI エージェントが同じリポジトリを操作する可能性があるため、作業開始前に必ず `git fetch origin` で最新の `origin/main` と開いている PR（`gh pr list`）を確認すること。
- `main` へ直接 push せず、最新の `origin/main` から作業用ブランチを作成し、Pull Request を立てて反映すること。
- ドキュメントや指示書をコミットする際は、必ず通常の UTF-8 テキスト（プレーン Markdown）として保存し、Base64 文字列のままコミットしないこと。

## 実装ルール
- 指示書に書かれていない仕様（物理定数、カード効果、ルール、セーブ形式）は変えない。
- 画像は `assets/img/` の外部ファイル（WebP 推奨）として管理し、`assets/game.js` の `ASSET_PATHS` から参照する。新しい画像が必要な場合は、まずしんぽよに相談すること（勝手に生成しない）。
- 実装後はローカル HTTP サーバーまたは公開版で動作確認（コンソールエラー・失敗リクエストがないこと）を行ってから PR を作成すること。
- 日本語でコメントを書くこと。変数名・関数名は英語のまま。