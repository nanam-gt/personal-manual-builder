import {
  Copy,
  Download,
  FilePlus2,
  FileText,
  Pencil,
  Search,
  Trash2,
} from "lucide-react";
import Link from "next/link";

const manuals = [
  {
    id: "sample",
    title: "Airレジの商品登録方法",
    description: "写真付きの手順をPowerPointとWordにまとめるサンプルです。",
    category: "店舗運用",
    steps: 3,
    images: 4,
    updatedAt: "2026-08-14",
  },
];

export default function ManualsPage() {
  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Personal Manual Builder</p>
          <h1>マニュアル一覧</h1>
        </div>
        <div className="topbar-actions">
          <Link href="/logout">ログアウト</Link>
          <Link className="primary-action" href="/manuals/new">
            <FilePlus2 aria-hidden="true" size={18} />
            新規作成
          </Link>
        </div>
      </header>

      <section className="toolbar" aria-label="検索と絞り込み">
        <label className="search-box">
          <Search aria-hidden="true" size={18} />
          <input type="search" placeholder="タイトルや説明で検索" />
        </label>
        <select aria-label="カテゴリ">
          <option>すべてのカテゴリ</option>
          <option>店舗運用</option>
          <option>バックオフィス</option>
        </select>
      </section>

      <section className="table-wrap" aria-label="マニュアル">
        <table>
          <thead>
            <tr>
              <th>タイトル</th>
              <th>カテゴリ</th>
              <th>手順</th>
              <th>写真</th>
              <th>最終更新</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {manuals.map((manual) => (
              <tr key={manual.id}>
                <td>
                  <strong>{manual.title}</strong>
                  <span>{manual.description}</span>
                </td>
                <td>{manual.category}</td>
                <td>{manual.steps}</td>
                <td>{manual.images}</td>
                <td>{manual.updatedAt}</td>
                <td>
                  <div className="icon-actions">
                    <Link href={`/manuals/${manual.id}/edit`} aria-label="編集">
                      <Pencil size={17} />
                    </Link>
                    <button type="button" aria-label="複製">
                      <Copy size={17} />
                    </button>
                    <button type="button" aria-label="PowerPoint">
                      <Download size={17} />
                    </button>
                    <button type="button" aria-label="Word">
                      <FileText size={17} />
                    </button>
                    <button type="button" aria-label="削除">
                      <Trash2 size={17} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
