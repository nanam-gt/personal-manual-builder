# アーキテクチャ設計

## 技術
- Next.js
- React
- TypeScript
- Cloudflare Workers
- OpenNext Cloudflare Adapter
- Cloudflare D1
- Cloudflare R2
- GitHub

## ファイル生成候補
PowerPoint：
- PptxGenJS

Word：
- docx

導入前にCloudflare Workersとの互換性を確認する。
Workers上で難しい場合はブラウザ側生成など代替方式を検討する。

## 論理構成
```text
ブラウザ
  ├ 管理画面
  ├ PowerPointプレビュー
  └ Wordプレビュー
       ↓
Next.js on Cloudflare Workers
  ├ 認証
  ├ D1
  ├ R2
  ├ PowerPoint生成
  └ Word生成
```

## 保存場所
D1：
- 管理者
- カテゴリ
- マニュアル
- 手順
- 写真情報
- 注釈情報

R2：
- 表紙写真
- 手順写真

GitHub：
- コード
- マイグレーション
- テスト
- 設計資料

生成した`.pptx` / `.docx`は原則恒久保存しない。
