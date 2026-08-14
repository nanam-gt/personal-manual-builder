# Cloudflare分離設定

## 新リソース例
- Worker: `personal-manual-builder`
- D1: `personal-manual-builder-db`
- R2: `personal-manual-builder-images`

既存施設アプリのリソースを共有しない。

## バインディング例
- D1: `DB`
- R2: `MANUAL_IMAGES`

## 秘密情報
- SESSION_SECRET
- 初期管理者関連
- 認証用秘密値

`.dev.vars`等をGitへコミットしない。

## デプロイ
既存アプリのOpenNext / Wrangler構成を流用しつつ、name、D1 ID、R2 bucket nameを必ず新アプリ用に変更する。

## GitHub
新しいPrivateリポジトリを推奨。
既存アプリと自動デプロイ先を混在させない。
