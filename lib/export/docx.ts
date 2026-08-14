"use client";

import {
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import type { StoredManual, StoredStep, StoredStepImage } from "@/app/manuals/local-store";

const OFFICE_FONT = "Meiryo";

const text = (value: string, fallback = "") => value.trim() || fallback;

const run = (
  value: string,
  options: { bold?: boolean; color?: string; size?: number } = {}
) =>
  new TextRun({
    text: value,
    font: OFFICE_FONT,
    ...options,
  });

const paragraph = (value: string) =>
  new Paragraph({
    children: [run(value)],
    spacing: { after: 180 },
  });

const warningParagraph = (value: string) =>
  new Paragraph({
    children: [
      run(`注意: ${value}`, {
        bold: true,
        color: "9A3412",
      }),
    ],
    spacing: { before: 120, after: 240 },
  });

const imageParagraph = (image: StoredStepImage) =>
  new Paragraph({
    children: [
      new ImageRun({
        data: image.dataUrl,
        transformation: {
          width: 520,
          height: 292,
        },
        altText: {
          title: image.name,
          description: image.name,
          name: image.name,
        },
      }),
    ],
    spacing: { before: 120, after: 120 },
  });

const stepChildren = (step: StoredStep, index: number) => [
  new Paragraph({
    children: [
      run(`STEP ${index + 1} ${text(step.title, "無題の手順")}`, {
        bold: true,
        size: 28,
      }),
    ],
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 260, after: 140 },
  }),
  ...(step.description ? [paragraph(step.description)] : []),
  ...step.images.map(imageParagraph),
  ...(step.warning ? [warningParagraph(step.warning)] : []),
];

export async function createWordBlob(manual: StoredManual): Promise<Blob> {
  const doc = new Document({
    title: manual.title,
    description: manual.description,
    creator: "Personal Manual Builder",
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1134,
              right: 1134,
              bottom: 1134,
              left: 1134,
            },
          },
        },
        children: [
          new Paragraph({
            children: [
              run(text(manual.title, "無題のマニュアル"), {
                bold: true,
                size: 36,
              }),
            ],
            heading: HeadingLevel.TITLE,
            spacing: { after: 240 },
          }),
          ...(manual.description ? [paragraph(manual.description)] : []),
          paragraph(`カテゴリ: ${manual.category || "未分類"}`),
          paragraph(`最終更新: ${new Date(manual.updatedAt).toLocaleDateString("ja-JP")}`),
          ...manual.steps.flatMap(stepChildren),
        ],
      },
    ],
  });

  return Packer.toBlob(doc);
}
