"use client";

export type StoredStepImage = {
  id: string;
  name: string;
  dataUrl: string;
  displayOrder: 1 | 2;
};

export type StoredStep = {
  id: string;
  title: string;
  description: string;
  warning: string;
  images: StoredStepImage[];
};

export type StoredManual = {
  id: string;
  title: string;
  description: string;
  category: string;
  coverImageDataUrl: string;
  memo: string;
  steps: StoredStep[];
  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY = "personal-manual-builder.manuals";

const createId = () => crypto.randomUUID();

const seedManuals = (): StoredManual[] => [
  {
    id: "sample",
    title: "Airレジの商品登録方法",
    description: "新しい商品を登録するための手順です。",
    category: "店舗運用",
    coverImageDataUrl: "",
    memo: "",
    createdAt: "2026-08-14T00:00:00.000Z",
    updatedAt: "2026-08-14T00:00:00.000Z",
    steps: [
      {
        id: createId(),
        title: "商品一覧を開く",
        description: "管理画面から商品設定を開きます。",
        warning: "編集権限のあるアカウントで操作します。",
        images: [],
      },
      {
        id: createId(),
        title: "商品情報を入力する",
        description: "商品名、価格、カテゴリを入力します。",
        warning: "",
        images: [],
      },
    ],
  },
];

export const createEmptyManual = (): StoredManual => {
  const timestamp = new Date().toISOString();

  return {
    id: createId(),
    title: "新しいマニュアル",
    description: "",
    category: "",
    coverImageDataUrl: "",
    memo: "",
    steps: [createEmptyStep()],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
};

export const createEmptyStep = (): StoredStep => ({
  id: createId(),
  title: "新しい手順",
  description: "",
  warning: "",
  images: [],
});

export function loadManuals(): StoredManual[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seeded = seedManuals();
    saveManuals(seeded);
    return seeded;
  }

  try {
    return JSON.parse(raw) as StoredManual[];
  } catch {
    const seeded = seedManuals();
    saveManuals(seeded);
    return seeded;
  }
}

export function saveManuals(manuals: StoredManual[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(manuals));
}

export function upsertManual(manual: StoredManual) {
  const manuals = loadManuals();
  const index = manuals.findIndex((item) => item.id === manual.id);
  const nextManual = { ...manual, updatedAt: new Date().toISOString() };

  if (index >= 0) {
    manuals[index] = nextManual;
  } else {
    manuals.unshift(nextManual);
  }

  saveManuals(manuals);
}

export function duplicateManual(manualId: string) {
  const manuals = loadManuals();
  const source = manuals.find((manual) => manual.id === manualId);
  if (!source) {
    return;
  }

  const timestamp = new Date().toISOString();
  const copy: StoredManual = {
    ...source,
    id: createId(),
    title: `${source.title} コピー`,
    createdAt: timestamp,
    updatedAt: timestamp,
    steps: source.steps.map((step) => ({
      ...step,
      id: createId(),
      images: step.images.map((image) => ({ ...image, id: createId() })),
    })),
  };

  saveManuals([copy, ...manuals]);
}

export function deleteManual(manualId: string) {
  saveManuals(loadManuals().filter((manual) => manual.id !== manualId));
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
