# 個人用マニュアル作成アプリ Codex開発資料

既存の「施設管理マニュアルWebアプリ」をベースに、個人用のPowerPoint / Wordマニュアル作成アプリを開発するための資料一式です。

## 最初に読む順番
1. `00_CODEX_START_HERE.md`
2. `01_PRODUCT_SPEC.md`
3. `02_MIGRATION_FROM_EXISTING_APP.md`
4. `03_ARCHITECTURE.md`
5. `04_DATA_MODEL.md`
6. `05_SCREEN_SPEC.md`
7. `06_EXPORT_SPEC.md`
8. `07_IMAGE_ANNOTATION_SPEC.md`
9. `08_DEVELOPMENT_PLAN.md`

補助資料：
- `09_CLOUDFLARE_SETUP.md`
- `10_SECURITY.md`
- `11_TEST_PLAN.md`
- `12_ACCEPTANCE_CRITERIA.md`
- `13_CODEX_PROMPTS.md`
- `14_DECISIONS.md`

## 目的
Web上で写真と文章を入力し、完成したマニュアルを `.pptx` と `.docx` でダウンロードする。

## 最重要方針
- 既存の施設管理マニュアルアプリを直接壊さない
- 新しいGitHubリポジトリとして分離
- Cloudflare Worker / D1 / R2も別にする
- 管理画面UIは既存アプリを最大限流用
- 1手順につき写真0〜2枚
- PowerPointは1手順1スライド
- 編集画面でPowerPoint / Wordプレビュー
- 簡易画像注釈はShould機能
