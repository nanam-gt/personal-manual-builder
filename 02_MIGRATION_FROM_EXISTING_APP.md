# 既存アプリからの複製・移行方針

## 絶対条件
既存の施設管理マニュアルアプリを直接改変しない。

## 新アプリ名
`personal-manual-builder`

## 新GitHubリポジトリ
既存リポジトリからコピーまたはFork後、新しいPrivateリポジトリとして管理する。

## 新Cloudflareリソース
- Worker: `personal-manual-builder`
- D1: `personal-manual-builder-db`
- R2: `personal-manual-builder-images`

## 流用するもの
- Next.js / React / TypeScript
- Cloudflare Workers / OpenNext
- D1接続 / R2接続
- 認証 / セッション
- 管理画面レイアウト
- マニュアル一覧
- マニュアル編集UI
- 手順カードUI
- 手順追加 / 並べ替え
- 写真アップロード
- 入力バリデーション
- レスポンシブUI
- GitHub / Cloudflareデプロイ構成

## 削除するもの
- 一般スタッフ向け画面
- 公開マニュアル一覧
- エリア
- タイミング
- エリア詳細
- 所要時間
- 完了基準
- 使用道具
- QR共有
- 公開ブック
- Web閲覧用導線

## 変更するもの
- アプリタイトル
- 説明文
- 写真1枚→最大2枚
- PDF中心→PowerPoint / Word出力

## データ
既存施設データはコピーせず、新しい空のD1から開始する。
既存R2も共有しない。
