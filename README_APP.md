# personal-manual-builder

個人用のマニュアル作成Webアプリです。写真と文章で手順を作り、PowerPoint (`.pptx`) と Word (`.docx`) に出力することを目的にしています。

## Phase 1 scope

- Next.js / React / TypeScript のアプリ基盤
- Cloudflare Workers / OpenNext 用設定
- 新アプリ専用 Worker 名: `personal-manual-builder`
- 新アプリ専用 D1 名: `personal-manual-builder-db`
- 新アプリ専用 R2 名: `personal-manual-builder-images`
- 秘密情報をコミットしない `.env.example` / `.gitignore`

## Local commands

```bash
npm install
npm run dev
npm run typecheck
npm run build
```

Cloudflare デプロイ前に、`wrangler.toml` の `database_id` を新規 D1 の ID に置き換えてください。
