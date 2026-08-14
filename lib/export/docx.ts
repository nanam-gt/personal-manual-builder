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
const IMAGE_MAX_WIDTH = 520;
const IMAGE_MAX_HEIGHT = 360;

type ImageSize = {
  width: number;
  height: number;
};

const text = (value: string, fallback = "") => value.trim() || fallback;

function getImageSize(dataUrl: string): Promise<ImageSize> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () =>
      resolve({
        width: image.naturalWidth || image.width,
        height: image.naturalHeight || image.height,
      });
    image.onerror = () => resolve({ width: 16, height: 9 });
    image.src = dataUrl;
  });
}

function fitImageSize(size: ImageSize) {
  const imageRatio = size.width / size.height;
  const boxRatio = IMAGE_MAX_WIDTH / IMAGE_MAX_HEIGHT;

  if (imageRatio > boxRatio) {
    return {
      width: IMAGE_MAX_WIDTH,
      height: Math.round(IMAGE_MAX_WIDTH / imageRatio),
    };
  }

  return {
    width: Math.round(IMAGE_MAX_HEIGHT * imageRatio),
    height: IMAGE_MAX_HEIGHT,
  };
}

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

const imageParagraph = async (image: StoredStepImage) => {
  const transformation = fitImageSize(await getImageSize(image.dataUrl));

  return new Paragraph({
    children: [
      new ImageRun({
        data: image.dataUrl,
        transformation,
        altText: {
          title: image.name,
          description: image.name,
          name: image.name,
        },
      }),
    ],
    spacing: { before: 160, after: 180 },
  });
};

const stepSpacer = () =>
  new Paragraph({
    children: [],
    spacing: { before: 120, after: 420 },
  });

async function stepChildren(step: StoredStep, index: number) {
  return [
    new Paragraph({
      children: [
        run(`STEP ${index + 1} ${text(step.title, "無題の手順")}`, {
          bold: true,
          size: 28,
        }),
      ],
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 420, after: 180 },
    }),
    ...(step.description ? [paragraph(step.description)] : []),
    ...(await Promise.all(step.images.map(imageParagraph))),
    ...(step.warning ? [warningParagraph(step.warning)] : []),
    stepSpacer(),
  ];
}

export async function createWordBlob(manual: StoredManual): Promise<Blob> {
  const steps = await Promise.all(manual.steps.map(stepChildren));
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
          ...steps.flat(),
        ],
      },
    ],
  });

  return Packer.toBlob(doc);
}
