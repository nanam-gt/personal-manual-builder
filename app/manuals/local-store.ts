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

const createId = () => crypto.randomUUID();
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const SUPPORTED_IMAGE_TYPES = ["image/png", "image/jpeg"];

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

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error("ログイン状態を確認してください。");
  }
  return response.json() as Promise<T>;
}

export async function loadManuals(): Promise<StoredManual[]> {
  const response = await fetch("/api/manuals", { cache: "no-store" });
  const data = await parseJson<{ manuals: StoredManual[] }>(response);
  return data.manuals;
}

export async function loadManual(manualId: string): Promise<StoredManual | null> {
  const response = await fetch(`/api/manuals/${manualId}`, { cache: "no-store" });
  if (response.status === 404) {
    return null;
  }
  const data = await parseJson<{ manual: StoredManual }>(response);
  return data.manual;
}

export async function upsertManual(manual: StoredManual) {
  const response = await fetch("/api/manuals", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      ...manual,
      updatedAt: new Date().toISOString(),
    }),
  });
  const data = await parseJson<{ manual: StoredManual }>(response);
  return data.manual;
}

export async function duplicateManual(manualId: string) {
  const source = await loadManual(manualId);
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

  await upsertManual(copy);
}

export async function deleteManual(manualId: string) {
  await parseJson<{ ok: true }>(
    await fetch(`/api/manuals/${manualId}`, { method: "DELETE" })
  );
}

export function readFileAsDataUrl(file: File): Promise<string> {
  if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
    return Promise.reject(new Error("写真はPNGまたはJPEGを選択してください。"));
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return Promise.reject(new Error("写真は6MB以下にしてください。"));
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
