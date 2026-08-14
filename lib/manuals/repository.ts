import {
  manualInputSchema,
  manualStepInputSchema,
  stepImageInputSchema,
  type ManualInput,
  type ManualStepInput,
  type StepImageInput,
} from "./validation";
import type { ManualDetail, ManualSummary, ManualStep, StepImage } from "./types";

type ManualSummaryRow = {
  id: string;
  title: string;
  description: string | null;
  category_id: string | null;
  category_name: string | null;
  cover_image_object_key: string | null;
  memo: string | null;
  step_count: number;
  image_count: number;
  created_at: string;
  updated_at: string;
};

type ManualStepRow = {
  id: string;
  manual_id: string;
  title: string;
  description: string | null;
  warning: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
};

type StepImageRow = {
  id: string;
  manual_step_id: string;
  image_object_key: string;
  image_alt: string | null;
  width: number | null;
  height: number | null;
  mime_type: string;
  display_order: 1 | 2;
  created_at: string;
  updated_at: string;
};

const now = () => new Date().toISOString();

const toManualSummary = (row: ManualSummaryRow): ManualSummary => ({
  id: row.id,
  title: row.title,
  description: row.description,
  categoryId: row.category_id,
  categoryName: row.category_name,
  coverImageObjectKey: row.cover_image_object_key,
  memo: row.memo,
  stepCount: row.step_count,
  imageCount: row.image_count,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toStepImage = (row: StepImageRow): StepImage => ({
  id: row.id,
  manualStepId: row.manual_step_id,
  imageObjectKey: row.image_object_key,
  imageAlt: row.image_alt,
  width: row.width,
  height: row.height,
  mimeType: row.mime_type,
  displayOrder: row.display_order,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toManualStep = (row: ManualStepRow, images: StepImage[]): ManualStep => ({
  id: row.id,
  manualId: row.manual_id,
  title: row.title,
  description: row.description,
  warning: row.warning,
  displayOrder: row.display_order,
  images,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export async function listManuals(db: D1Database): Promise<ManualSummary[]> {
  const result = await db
    .prepare(
      `
      SELECT
        manuals.id,
        manuals.title,
        manuals.description,
        manuals.category_id,
        categories.name AS category_name,
        manuals.cover_image_object_key,
        manuals.memo,
        manuals.created_at,
        manuals.updated_at,
        COUNT(DISTINCT manual_steps.id) AS step_count,
        COUNT(step_images.id) AS image_count
      FROM manuals
      LEFT JOIN categories ON categories.id = manuals.category_id
      LEFT JOIN manual_steps
        ON manual_steps.manual_id = manuals.id
       AND manual_steps.deleted_at IS NULL
      LEFT JOIN step_images ON step_images.manual_step_id = manual_steps.id
      WHERE manuals.deleted_at IS NULL
      GROUP BY manuals.id
      ORDER BY manuals.updated_at DESC
      `
    )
    .all<ManualSummaryRow>();

  return result.results.map(toManualSummary);
}

export async function getManual(
  db: D1Database,
  manualId: string
): Promise<ManualDetail | null> {
  const manual = await db
    .prepare(
      `
      SELECT
        manuals.id,
        manuals.title,
        manuals.description,
        manuals.category_id,
        categories.name AS category_name,
        manuals.cover_image_object_key,
        manuals.memo,
        manuals.created_at,
        manuals.updated_at,
        COUNT(DISTINCT manual_steps.id) AS step_count,
        COUNT(step_images.id) AS image_count
      FROM manuals
      LEFT JOIN categories ON categories.id = manuals.category_id
      LEFT JOIN manual_steps
        ON manual_steps.manual_id = manuals.id
       AND manual_steps.deleted_at IS NULL
      LEFT JOIN step_images ON step_images.manual_step_id = manual_steps.id
      WHERE manuals.id = ? AND manuals.deleted_at IS NULL
      GROUP BY manuals.id
      `
    )
    .bind(manualId)
    .first<ManualSummaryRow>();

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
    .all<ManualStepRow>();

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
    .all<StepImageRow>();

  const imagesByStep = new Map<string, StepImage[]>();
  for (const image of images.results.map(toStepImage)) {
    imagesByStep.set(image.manualStepId, [
      ...(imagesByStep.get(image.manualStepId) ?? []),
      image,
    ]);
  }

  return {
    ...toManualSummary(manual),
    steps: steps.results.map((step) =>
      toManualStep(step, imagesByStep.get(step.id) ?? [])
    ),
  };
}

export async function createManual(
  db: D1Database,
  input: ManualInput
): Promise<string> {
  const manual = manualInputSchema.parse(input);
  const id = crypto.randomUUID();
  const timestamp = now();

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
      `
    )
    .bind(
      id,
      manual.title,
      manual.description,
      manual.categoryId,
      manual.coverImageObjectKey,
      manual.memo,
      timestamp,
      timestamp
    )
    .run();

  return id;
}

export async function updateManual(
  db: D1Database,
  manualId: string,
  input: ManualInput
) {
  const manual = manualInputSchema.parse(input);

  await db
    .prepare(
      `
      UPDATE manuals
      SET
        title = ?,
        description = ?,
        category_id = ?,
        cover_image_object_key = ?,
        memo = ?,
        updated_at = ?
      WHERE id = ? AND deleted_at IS NULL
      `
    )
    .bind(
      manual.title,
      manual.description,
      manual.categoryId,
      manual.coverImageObjectKey,
      manual.memo,
      now(),
      manualId
    )
    .run();
}

export async function upsertManualStep(
  db: D1Database,
  manualId: string,
  stepId: string | null,
  input: ManualStepInput
): Promise<string> {
  const step = manualStepInputSchema.parse(input);
  const id = stepId ?? crypto.randomUUID();
  const timestamp = now();

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
      id,
      manualId,
      step.title,
      step.description,
      step.warning,
      step.displayOrder,
      timestamp,
      timestamp
    )
    .run();

  await touchManual(db, manualId);
  return id;
}

export async function upsertStepImage(
  db: D1Database,
  stepId: string,
  input: StepImageInput
): Promise<string> {
  const image = stepImageInputSchema.parse(input);
  const existing = await db
    .prepare(
      "SELECT id FROM step_images WHERE manual_step_id = ? AND display_order = ?"
    )
    .bind(stepId, image.displayOrder)
    .first<{ id: string }>();
  const id = existing?.id ?? crypto.randomUUID();
  const timestamp = now();

  await db
    .prepare(
      `
      INSERT INTO step_images (
        id,
        manual_step_id,
        image_object_key,
        image_alt,
        width,
        height,
        mime_type,
        display_order,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(manual_step_id, display_order) DO UPDATE SET
        image_object_key = excluded.image_object_key,
        image_alt = excluded.image_alt,
        width = excluded.width,
        height = excluded.height,
        mime_type = excluded.mime_type,
        updated_at = excluded.updated_at
      `
    )
    .bind(
      id,
      stepId,
      image.imageObjectKey,
      image.imageAlt,
      image.width,
      image.height,
      image.mimeType,
      image.displayOrder,
      timestamp,
      timestamp
    )
    .run();

  const step = await db
    .prepare("SELECT manual_id FROM manual_steps WHERE id = ?")
    .bind(stepId)
    .first<{ manual_id: string }>();

  if (step) {
    await touchManual(db, step.manual_id);
  }

  return id;
}

export async function softDeleteManual(db: D1Database, manualId: string) {
  await db
    .prepare("UPDATE manuals SET deleted_at = ?, updated_at = ? WHERE id = ?")
    .bind(now(), now(), manualId)
    .run();
}

export async function softDeleteManualStep(db: D1Database, stepId: string) {
  const step = await db
    .prepare("SELECT manual_id FROM manual_steps WHERE id = ?")
    .bind(stepId)
    .first<{ manual_id: string }>();

  await db
    .prepare(
      "UPDATE manual_steps SET deleted_at = ?, updated_at = ? WHERE id = ?"
    )
    .bind(now(), now(), stepId)
    .run();

  if (step) {
    await touchManual(db, step.manual_id);
  }
}

export async function deleteStepImage(
  db: D1Database,
  stepId: string,
  displayOrder: 1 | 2
) {
  await db
    .prepare("DELETE FROM step_images WHERE manual_step_id = ? AND display_order = ?")
    .bind(stepId, displayOrder)
    .run();

  const step = await db
    .prepare("SELECT manual_id FROM manual_steps WHERE id = ?")
    .bind(stepId)
    .first<{ manual_id: string }>();

  if (step) {
    await touchManual(db, step.manual_id);
  }
}

async function touchManual(db: D1Database, manualId: string) {
  await db
    .prepare("UPDATE manuals SET updated_at = ? WHERE id = ? AND deleted_at IS NULL")
    .bind(now(), manualId)
    .run();
}
