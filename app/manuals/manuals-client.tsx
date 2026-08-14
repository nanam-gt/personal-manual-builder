"use client";

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
import { useEffect, useMemo, useState } from "react";
import {
  deleteManual,
  duplicateManual,
  loadManuals,
  type StoredManual,
} from "./local-store";

export default function ManualsClient() {
  const [manuals, setManuals] = useState<StoredManual[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setManuals(loadManuals());
  }, []);

  const categories = useMemo(
    () => Array.from(new Set(manuals.map((manual) => manual.category).filter(Boolean))),
    [manuals]
  );

  const filteredManuals = manuals.filter((manual) => {
    const keyword = `${manual.title} ${manual.description}`.toLowerCase();
    const matchesQuery = keyword.includes(query.toLowerCase());
    const matchesCategory = !category || manual.category === category;
    return matchesQuery && matchesCategory;
  });

  const refresh = () => setManuals(loadManuals());

  return (
    <>
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
          <input
            type="search"
            placeholder="タイトルや説明で検索"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <select
          aria-label="カテゴリ"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          <option value="">すべてのカテゴリ</option>
          {categories.map((item) => (
            <option key={item}>{item}</option>
          ))}
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
            {filteredManuals.map((manual) => (
              <tr key={manual.id}>
                <td>
                  <strong>{manual.title}</strong>
                  <span>{manual.description || "説明なし"}</span>
                </td>
                <td>{manual.category || "-"}</td>
                <td>{manual.steps.length}</td>
                <td>
                  {manual.steps.reduce(
                    (total, step) => total + step.images.length,
                    0
                  )}
                </td>
                <td>{new Date(manual.updatedAt).toLocaleDateString("ja-JP")}</td>
                <td>
                  <div className="icon-actions">
                    <Link href={`/manuals/${manual.id}/edit`} aria-label="編集">
                      <Pencil size={17} />
                    </Link>
                    <button
                      type="button"
                      aria-label="複製"
                      onClick={() => {
                        duplicateManual(manual.id);
                        refresh();
                      }}
                    >
                      <Copy size={17} />
                    </button>
                    <button type="button" aria-label="PowerPoint" disabled>
                      <Download size={17} />
                    </button>
                    <button type="button" aria-label="Word" disabled>
                      <FileText size={17} />
                    </button>
                    <button
                      type="button"
                      aria-label="削除"
                      onClick={() => {
                        deleteManual(manual.id);
                        refresh();
                      }}
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
