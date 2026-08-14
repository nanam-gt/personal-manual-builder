import type {
  StoredManual,
  StoredStep,
  StoredStepImage,
} from "@/app/manuals/local-store";

type ManualRow = {
  id: string;
  title: string;
  description: string | null;
  category_id: string | null;
  category_name: string | null;
  cover_image_object_key: string | null;
  memo: string | null;
  created_at: string;
  updated_at: string;
};

type StepRow = {
  id: string;
  manual_id: string;
  title: string;
  description: string | null;
  warning: string | null;
  display_order: number;
};

type ImageRow = {
  id: string;
  manual_step_id: string;
  image_object_key: string;
  image_alt: string | null;
  mime_type: string;
  display_order: 1 | 2;
};

const toNullable = (value: string) => {
  const trimmed = value.trim();
  return trimmed || null;
};

const toDataUrl = async (bucket: R2Bucket, key: string, mimeType: string) => {
  const object = await bucket.get(key);
  if (!object) {
    return "";
  }

  const bytes = new Uint8Array(await object.arrayBuffer());
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return `data:${mimeType};base64,${btoa(binary)}`;
};

const parseDataUrl = (dataUrl: string) => {
  const match = dataUrl.match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/);
  if (!match) {
    return null;
  }

  const mimeType = match[1];
  const extension =
    mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  const binary = atob(match[2]);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));

  return {
    bytes,
    extension,
    mimeType,
  };
};

async function ensureCategory(db: D1Database, name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    return null;
  }

  const existing = await db
    .prepare("SELECT id FROM categories WHERE name = ?")
    .bind(trimmed)
    .first<{ id: string }>();

  if (existing) {
    return existing.id;
  }

  const id = crypto.randomUUID();
  await db
    .prepare("INSERT INTO categories (id, name) VALUES (?, ?)")
    .bind(id, trimmed)
    .run();
  return id;
}

export async function listStoredManuals(
  db: D1Database,
  bucket: R2Bucket
): Promise<StoredManual[]> {
  const manuals = await db
    .prepare(
      `
      SELECT
        manuals.*,
        categories.name AS category_name
      FROM manuals
      LEFT JOIN categories ON categories.id = manuals.category_id
      WHERE manuals.deleted_at IS NULL
      ORDER BY manuals.updated_at DESC
      `
    )
    .all<ManualRow>();

  return Promise.all(
    manuals.results.map((manual) => getStoredManual(db, bucket, manual.id))
  ).then((items) => items.filter(Boolean) as StoredManual[]);
}

export async function getStoredManual(
  db: D1Database,
  bucket: R2Bucket,
  manualId: string
): Promise<StoredManual | null> {
  const manual = await db
    .prepare(
      `
      SELECT
        manuals.*,
        categories.name AS category_name
      FROM manuals
      LEFT JOIN categories ON categories.id = manuals.category_id
      WHERE manuals.id = ? AND manuals.deleted_at IS NULL
      `
    )
    .bind(manualId)
    .first<ManualRow>();

  if (!manual) {
    return null;
  }

  const steps = await db
    .prepare(
      `
      SELECT *
      FROM manual_steps
      WHERE manual_id = ? AND deleted_at IS NULL
      ORDER BY display_order ASC
      `
    )
    .bind(manualId)
    .all<StepRow>();

  const images = await db
    .prepare(
      `
      SELECT step_images.*
      FROM step_images
      INNER JOIN manual_steps ON manual_steps.id = step_images.manual_step_id
      WHERE manual_steps.manual_id = ?
        AND manual_steps.deleted_at IS NULL
      ORDER BY manual_steps.display_order ASC, step_images.display_order ASC
      `
    )
    .bind(manualId)
    .all<ImageRow>();

  const imagesByStep = new Map<string, StoredStepImage[]>();
  for (const image of images.results) {
    const dataUrl = await toDataUrl(bucket, image.image_object_key, image.mime_type);
    const item: StoredStepImage = {
      id: image.id,
      name: image.image_alt || `写真${image.display_order}`,
      dataUrl,
      displayOrder: image.display_order,
    };
    imagesByStep.set(image.manual_step_id, [
      ...(imagesByStep.get(image.manual_step_id) ?? []),
      item,
    ]);
  }

  return {
    id: manual.id,
    title: manual.title,
    description: manual.description ?? "",
    category: manual.category_name ?? "",
    coverImageDataUrl: "",
    memo: manual.memo ?? "",
    createdAt: manual.created_at,
    updatedAt: manual.updated_at,
    steps: steps.results.map<StoredStep>((step) => ({
      id: step.id,
      title: step.title,
      description: step.description ?? "",
      warning: step.warning ?? "",
      images: imagesByStep.get(step.id) ?? [],
    })),
  };
}

export async function saveStoredManual(
  db: D1Database,
  bucket: R2Bucket,
  manual: StoredManual
) {
  const timestamp = new Date().toISOString();
  const categoryId = await ensureCategory(db, manual.category);

  await db
    .prepare(
      `
      INSERT INTO manuals (
        id,
        title,
        description,
        category_id,
        cover_image_object_key,
        memo,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        description = excluded.description,
        category_id = excluded.category_id,
        memo = excluded.memo,
        updated_at = excluded.updated_at,
        deleted_at = NULL
      `
    )
    .bind(
      manual.id,
      manual.title.trim() || "無題のマニュアル",
      toNullable(manual.description),
      categoryId,
      null,
      toNullable(manual.memo),
      manual.createdAt || timestamp,
      timestamp
    )
    .run();

  await db
    .prepare("UPDATE manual_steps SET deleted_at = ? WHERE manual_id = ?")
    .bind(timestamp, manual.id)
    .run();

  for (const [index, step] of manual.steps.entries()) {
    await db
      .prepare(
        `
        INSERT INTO manual_steps (
          id,
          manual_id,
          title,
          description,
          warning,
          display_order,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          title = excluded.title,
          description = excluded.description,
          warning = excluded.warning,
          display_order = excluded.display_order,
          updated_at = excluded.updated_at,
          deleted_at = NULL
        `
      )
      .bind(
        step.id,
        manual.id,
        step.title.trim() || "無題の手順",
        toNullable(step.description),
        toNullable(step.warning),
        index + 1,
        timestamp,
        timestamp
      )
      .run();

    await db.prepare("DELETE FROM step_images WHERE manual_step_id = ?").bind(step.id).run();

    for (const image of step.images.slice(0, 2)) {
      const parsed = parseDataUrl(image.dataUrl);
      if (!parsed) {
        continue;
      }

      const objectKey = `manuals/${manual.id}/steps/${step.id}/${image.id}.${parsed.extension}`;
      await bucket.put(objectKey, parsed.bytes, {
        httpMetadata: {
          contentType: parsed.mimeType,
        },
      });
      await db
        .prepare(
          `
          INSERT INTO step_images (
            id,
            manual_step_id,
            image_object_key,
            image_alt,
            mime_type,
            display_order,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `
        )
        .bind(
          image.id,
          step.id,
          objectKey,
          image.name,
          parsed.mimeType,
          image.displayOrder,
          timestamp,
          timestamp
        )
        .run();
    }
  }

  return getStoredManual(db, bucket, manual.id);
}

export async function deleteStoredManual(db: D1Database, manualId: string) {
  await db
    .prepare("UPDATE manuals SET deleted_at = ?, updated_at = ? WHERE id = ?")
    .bind(new Date().toISOString(), new Date().toISOString(), manualId)
    .run();
}
