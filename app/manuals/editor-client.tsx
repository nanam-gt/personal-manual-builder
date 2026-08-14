"use client";

import {
  ArrowDown,
  ArrowUp,
  Copy,
  FileImage,
  Download,
  FileText,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { downloadBlob } from "@/lib/export/download";
import { createWordBlob } from "@/lib/export/docx";
import { createOfficeFileName } from "@/lib/export/file-name";
import { createPowerPointBlob } from "@/lib/export/pptx";
import {
  createEmptyManual,
  createEmptyStep,
  loadManual,
  readFileAsDataUrl,
  upsertManual,
  type StoredManual,
  type StoredStep,
  type StoredStepImage,
} from "./local-store";

type ManualEditorProps = {
  manualId?: string;
};

const moveItem = <T,>(items: T[], index: number, direction: -1 | 1) => {
  const next = [...items];
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= next.length) {
    return next;
  }

  [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
  return next;
};

export default function EditorClient({ manualId }: ManualEditorProps) {
  const router = useRouter();
  const [manual, setManual] = useState<StoredManual>(() => createEmptyManual());
  const [previewMode, setPreviewMode] = useState<"ppt" | "word">("ppt");
  const [previewStepIndex, setPreviewStepIndex] = useState(0);
  const [mobilePane, setMobilePane] = useState<"edit" | "preview">("edit");

  useEffect(() => {
    if (!manualId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setManual(createEmptyManual());
      return;
    }

    void loadManual(manualId).then((found) => {
      if (found) {
        setManual(found);
      }
    });
  }, [manualId]);

  const selectedStep = useMemo(
    () => manual.steps[previewStepIndex - 1],
    [manual.steps, previewStepIndex]
  );

  const updateManual = (patch: Partial<StoredManual>) => {
    setManual((current) => ({ ...current, ...patch }));
  };

  const updateStep = (stepId: string, patch: Partial<StoredStep>) => {
    setManual((current) => ({
      ...current,
      steps: current.steps.map((step) =>
        step.id === stepId ? { ...step, ...patch } : step
      ),
    }));
  };

  const save = async () => {
    await upsertManual(manual);
    router.push("/manuals");
  };

  return (
    <main className="editor-shell">
      <header className="editor-header">
        <div>
          <p className="eyebrow">{manualId ? "Edit" : "New"}</p>
          <h1>{manualId ? "マニュアル編集" : "新規マニュアル"}</h1>
        </div>
        <div className="topbar-actions">
          <Link href="/manuals">一覧へ戻る</Link>
          <button
            type="button"
            onClick={() =>
              downloadBlob(
                createPowerPointBlob(manual),
                createOfficeFileName(manual.title, "pptx")
              )
            }
          >
            <Download aria-hidden="true" size={17} />
            PowerPoint
          </button>
          <button
            type="button"
            onClick={async () =>
              downloadBlob(
                await createWordBlob(manual),
                createOfficeFileName(manual.title, "docx")
              )
            }
          >
            <FileText aria-hidden="true" size={17} />
            Word
          </button>
          <button type="button" onClick={save}>
            <Save aria-hidden="true" size={17} />
            保存
          </button>
        </div>
      </header>

      <div className="mobile-tabs" aria-label="表示切替">
        <button type="button" onClick={() => setMobilePane("edit")}>
          編集
        </button>
        <button type="button" onClick={() => setMobilePane("preview")}>
          プレビュー
        </button>
      </div>

      <div className="editor-grid">
        <section
          className={`edit-pane ${mobilePane === "preview" ? "mobile-hidden" : ""}`}
          aria-label="編集"
        >
          <div className="form-section">
            <h2>基本情報</h2>
            <label>
              タイトル
              <input
                value={manual.title}
                onChange={(event) => updateManual({ title: event.target.value })}
              />
            </label>
            <label>
              説明
              <textarea
                value={manual.description}
                onChange={(event) =>
                  updateManual({ description: event.target.value })
                }
              />
            </label>
            <label>
              カテゴリ
              <input
                value={manual.category}
                onChange={(event) => updateManual({ category: event.target.value })}
              />
            </label>
            <label>
              メモ
              <textarea
                value={manual.memo}
                onChange={(event) => updateManual({ memo: event.target.value })}
              />
            </label>
          </div>

          <div className="section-heading">
            <h2>手順</h2>
            <button
              type="button"
              onClick={() =>
                updateManual({ steps: [...manual.steps, createEmptyStep()] })
              }
            >
              <Plus aria-hidden="true" size={17} />
              追加
            </button>
          </div>

          {manual.steps.map((step, index) => (
            <article className="step-panel" key={step.id}>
              <div className="step-title-row">
                <span>STEP {index + 1}</span>
                <div className="icon-actions">
                  <button
                    type="button"
                    aria-label="複製"
                    onClick={() => {
                      const copy = {
                        ...step,
                        id: crypto.randomUUID(),
                        title: `${step.title} コピー`,
                        images: step.images.map((image) => ({
                          ...image,
                          id: crypto.randomUUID(),
                        })),
                      };
                      updateManual({
                        steps: [
                          ...manual.steps.slice(0, index + 1),
                          copy,
                          ...manual.steps.slice(index + 1),
                        ],
                      });
                    }}
                  >
                    <Copy size={16} />
                  </button>
                  <button
                    type="button"
                    aria-label="上へ"
                    onClick={() => updateManual({ steps: moveItem(manual.steps, index, -1) })}
                  >
                    <ArrowUp size={16} />
                  </button>
                  <button
                    type="button"
                    aria-label="下へ"
                    onClick={() => updateManual({ steps: moveItem(manual.steps, index, 1) })}
                  >
                    <ArrowDown size={16} />
                  </button>
                  <button
                    type="button"
                    aria-label="削除"
                    onClick={() =>
                      updateManual({
                        steps:
                          manual.steps.length > 1
                            ? manual.steps.filter((item) => item.id !== step.id)
                            : manual.steps,
                      })
                    }
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <label>
                タイトル
                <input
                  value={step.title}
                  onChange={(event) =>
                    updateStep(step.id, { title: event.target.value })
                  }
                />
              </label>
              <label>
                説明
                <textarea
                  value={step.description}
                  onChange={(event) =>
                    updateStep(step.id, { description: event.target.value })
                  }
                />
              </label>
              <label>
                注意点
                <textarea
                  value={step.warning}
                  onChange={(event) =>
                    updateStep(step.id, { warning: event.target.value })
                  }
                />
              </label>
              <div className="image-slots">
                {[1, 2].map((slot) => {
                  const image = step.images.find(
                    (item) => item.displayOrder === slot
                  );

                  return (
                    <div className="image-slot" key={slot}>
                      {image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={image.dataUrl} alt={image.name} />
                      ) : (
                        <FileImage aria-hidden="true" size={24} />
                      )}
                      <span>写真{slot}</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={async (event) => {
                          const file = event.target.files?.[0];
                          if (!file) {
                            return;
                          }

                          const dataUrl = await readFileAsDataUrl(file);
                          updateStep(step.id, {
                            images: [
                              ...step.images.filter(
                                (item) => item.displayOrder !== slot
                              ),
                              {
                                id: image?.id ?? crypto.randomUUID(),
                                name: file.name,
                                dataUrl,
                                displayOrder: slot as 1 | 2,
                              },
                            ].sort((a, b) => a.displayOrder - b.displayOrder),
                          });
                        }}
                      />
                      {image ? (
                        <button
                          type="button"
                          onClick={() =>
                            updateStep(step.id, {
                              images: step.images.filter(
                                (item) => item.displayOrder !== slot
                              ),
                            })
                          }
                        >
                          削除
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </section>

        <aside
          className={`preview-pane ${mobilePane === "edit" ? "mobile-hidden" : ""}`}
          aria-label="プレビュー"
        >
          <div className="preview-tabs">
            <button type="button" onClick={() => setPreviewMode("ppt")}>
              PowerPoint
            </button>
            <button type="button" onClick={() => setPreviewMode("word")}>
              Word
            </button>
          </div>
          {previewMode === "ppt" ? (
            <PowerPointPreview
              manual={manual}
              previewStepIndex={previewStepIndex}
              selectedStep={selectedStep}
              onSelectStep={setPreviewStepIndex}
            />
          ) : (
            <WordPreview manual={manual} />
          )}
        </aside>
      </div>
    </main>
  );
}

type PowerPointPreviewProps = {
  manual: StoredManual;
  previewStepIndex: number;
  selectedStep: StoredStep | undefined;
  onSelectStep: (index: number) => void;
};

function PowerPointPreview({
  manual,
  previewStepIndex,
  selectedStep,
  onSelectStep,
}: PowerPointPreviewProps) {
  return (
    <div className="ppt-preview-shell">
      <div className="slide-strip" aria-label="スライド">
        <button
          type="button"
          className={previewStepIndex === 0 ? "active" : ""}
          onClick={() => onSelectStep(0)}
        >
          表紙
        </button>
        {manual.steps.map((step, index) => (
          <button
            type="button"
            className={previewStepIndex === index + 1 ? "active" : ""}
            key={step.id}
            onClick={() => onSelectStep(index + 1)}
          >
            STEP {index + 1}
          </button>
        ))}
      </div>

      {previewStepIndex === 0 ? (
        <div className="slide-preview cover-slide">
          <p>Manual</p>
          <h2>{manual.title}</h2>
          {manual.description ? <p>{manual.description}</p> : null}
          <div className="cover-meta">
            <span>{manual.category || "未分類"}</span>
            <span>{new Date(manual.updatedAt).toLocaleDateString("ja-JP")}</span>
          </div>
        </div>
      ) : (
        <div
          className={`slide-preview image-count-${selectedStep?.images.length ?? 0}`}
        >
          <div className="slide-heading">
            <p>STEP {previewStepIndex}</p>
            <h2>{selectedStep?.title || "無題の手順"}</h2>
          </div>
          <SlideImages images={selectedStep?.images ?? []} />
          {selectedStep?.description ? <p>{selectedStep.description}</p> : null}
          {selectedStep?.warning ? (
            <strong className="warning-box">{selectedStep.warning}</strong>
          ) : null}
        </div>
      )}
    </div>
  );
}

function SlideImages({ images }: { images: StoredStepImage[] }) {
  if (images.length === 0) {
    return <div className="text-layout-note">写真なしの文章中心レイアウト</div>;
  }

  return (
    <div className={`preview-image-grid image-count-${images.length}`}>
      {images.map((image) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image.dataUrl} alt={image.name} key={image.id} />
      ))}
    </div>
  );
}

function WordPreview({ manual }: { manual: StoredManual }) {
  return (
    <div className="word-preview">
      <section className="word-cover">
        <h2>{manual.title}</h2>
        {manual.description ? <p>{manual.description}</p> : null}
        <span>{manual.category || "未分類"}</span>
      </section>
      {manual.steps.map((step, index) => (
        <section key={step.id}>
          <h3>
            STEP {index + 1} {step.title}
          </h3>
          {step.description ? <p>{step.description}</p> : null}
          <div className={`word-image-stack image-count-${step.images.length}`}>
            {step.images.map((image) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image.dataUrl} alt={image.name} key={image.id} />
            ))}
          </div>
          {step.warning ? <strong className="warning-box">{step.warning}</strong> : null}
        </section>
      ))}
    </div>
  );
}
