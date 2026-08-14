import {
  ArrowDown,
  ArrowUp,
  Copy,
  FileImage,
  Plus,
  Trash2,
} from "lucide-react";
import Link from "next/link";

type ManualEditorProps = {
  mode: "new" | "edit";
};

const steps = [
  {
    title: "商品一覧を開く",
    description: "管理画面から商品設定を開きます。",
    warning: "編集権限のあるアカウントで操作します。",
    images: 1,
  },
  {
    title: "商品情報を入力する",
    description: "商品名、価格、カテゴリを入力します。",
    warning: "",
    images: 2,
  },
];

export default function ManualEditor({ mode }: ManualEditorProps) {
  return (
    <main className="editor-shell">
      <header className="editor-header">
        <div>
          <p className="eyebrow">{mode === "new" ? "New" : "Edit"}</p>
          <h1>{mode === "new" ? "新規マニュアル" : "マニュアル編集"}</h1>
        </div>
        <Link href="/manuals">一覧へ戻る</Link>
      </header>

      <div className="mobile-tabs" aria-label="表示切替">
        <button type="button">編集</button>
        <button type="button">プレビュー</button>
      </div>

      <div className="editor-grid">
        <section className="edit-pane" aria-label="編集">
          <div className="form-section">
            <h2>基本情報</h2>
            <label>
              タイトル
              <input defaultValue="Airレジの商品登録方法" />
            </label>
            <label>
              説明
              <textarea defaultValue="新しい商品を登録するための手順です。" />
            </label>
            <label>
              カテゴリ
              <input defaultValue="店舗運用" />
            </label>
            <label>
              メモ
              <textarea placeholder="内部メモ" />
            </label>
          </div>

          <div className="section-heading">
            <h2>手順</h2>
            <button type="button">
              <Plus aria-hidden="true" size={17} />
              追加
            </button>
          </div>

          {steps.map((step, index) => (
            <article className="step-panel" key={step.title}>
              <div className="step-title-row">
                <span>STEP {index + 1}</span>
                <div className="icon-actions">
                  <button type="button" aria-label="複製">
                    <Copy size={16} />
                  </button>
                  <button type="button" aria-label="上へ">
                    <ArrowUp size={16} />
                  </button>
                  <button type="button" aria-label="下へ">
                    <ArrowDown size={16} />
                  </button>
                  <button type="button" aria-label="削除">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <label>
                タイトル
                <input defaultValue={step.title} />
              </label>
              <label>
                説明
                <textarea defaultValue={step.description} />
              </label>
              <label>
                注意点
                <textarea defaultValue={step.warning} />
              </label>
              <div className="image-slots">
                {[0, 1].map((slot) => (
                  <div className="image-slot" key={slot}>
                    <FileImage aria-hidden="true" size={24} />
                    <span>写真{slot + 1}</span>
                    <button type="button">
                      {slot < step.images ? "差し替え" : "登録"}
                    </button>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </section>

        <aside className="preview-pane" aria-label="プレビュー">
          <div className="preview-tabs">
            <button type="button">PowerPoint</button>
            <button type="button">Word</button>
          </div>
          <div className="slide-preview">
            <p>STEP 1</p>
            <h2>商品一覧を開く</h2>
            <div className="preview-image">写真</div>
            <p>管理画面から商品設定を開きます。</p>
            <strong>編集権限のあるアカウントで操作します。</strong>
          </div>
        </aside>
      </div>
    </main>
  );
}
