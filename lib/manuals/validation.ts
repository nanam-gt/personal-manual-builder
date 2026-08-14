import { z } from "zod";

const nullableText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : null));

export const manualInputSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: nullableText(2000),
  categoryId: nullableText(64),
  coverImageObjectKey: nullableText(512),
  memo: nullableText(4000),
});

export const manualStepInputSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: nullableText(3000),
  warning: nullableText(2000),
  displayOrder: z.number().int().min(1),
});

export const stepImageInputSchema = z.object({
  imageObjectKey: z.string().trim().min(1).max(512),
  imageAlt: nullableText(240),
  width: z.number().int().positive().nullable().optional().default(null),
  height: z.number().int().positive().nullable().optional().default(null),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  displayOrder: z.union([z.literal(1), z.literal(2)]),
});

export type ManualInput = z.infer<typeof manualInputSchema>;
export type ManualStepInput = z.infer<typeof manualStepInputSchema>;
export type StepImageInput = z.infer<typeof stepImageInputSchema>;
