"use client";

import pptxgen from "pptxgenjs";
import type { StoredManual, StoredStep } from "@/app/manuals/local-store";

const OFFICE_FONT = "Meiryo";
const COLORS = {
  text: "17211F",
  muted: "66716F",
  accent: "0F766E",
  accentDark: "0B5F59",
  panel: "EEF5F4",
  line: "D9E0DE",
  warning: "9A3412",
  warningBg: "FFF7ED",
};

const textStyle = {
  fontFace: OFFICE_FONT,
  color: COLORS.text,
  breakLine: false,
  fit: "shrink" as const,
};

function addLabel(slide: pptxgen.Slide, text: string, x: number, y: number, w: number) {
  slide.addText(text, {
    ...textStyle,
    x,
    y,
    w,
    h: 0.28,
    fontSize: 10,
    bold: true,
    color: COLORS.accent,
    margin: 0,
  });
}

function addBodyText(
  slide: pptxgen.Slide,
  text: string,
  x: number,
  y: number,
  w: number,
  h: number,
  fontSize = 14
) {
  slide.addText(text || "", {
    ...textStyle,
    x,
    y,
    w,
    h,
    fontSize,
    margin: 0.08,
    valign: "top",
    breakLine: false,
  });
}

function addCoverSlide(pptx: pptxgen, manual: StoredManual) {
  const slide = pptx.addSlide();
  slide.background = { color: "FFFFFF" };
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 13.333,
    h: 7.5,
    fill: { color: "F6F7F9" },
    line: { color: "F6F7F9" },
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.7,
    y: 0.65,
    w: 0.12,
    h: 5.8,
    fill: { color: COLORS.accent },
    line: { color: COLORS.accent },
  });
  addLabel(slide, "Manual", 1.0, 1.1, 2.2);
  slide.addText(manual.title || "無題のマニュアル", {
    ...textStyle,
    x: 1.0,
    y: 1.75,
    w: 10.8,
    h: 1.1,
    fontSize: 30,
    bold: true,
    margin: 0,
    fit: "shrink",
  });
  addBodyText(slide, manual.description, 1.0, 3.05, 9.8, 0.85, 15);
  slide.addText(
    [manual.category || "未分類", new Date(manual.updatedAt).toLocaleDateString("ja-JP")].join(
      " / "
    ),
    {
      ...textStyle,
      x: 1.0,
      y: 5.85,
      w: 9,
      h: 0.35,
      fontSize: 11,
      color: COLORS.muted,
      margin: 0,
    }
  );
}

function addStepSlide(pptx: pptxgen, step: StoredStep, stepIndex: number) {
  const slide = pptx.addSlide();
  slide.background = { color: "FFFFFF" };
  addLabel(slide, `STEP ${stepIndex}`, 0.7, 0.55, 1.6);
  slide.addText(step.title || "手順タイトル", {
    ...textStyle,
    x: 0.7,
    y: 0.9,
    w: 11.4,
    h: 0.58,
    fontSize: 24,
    bold: true,
    margin: 0,
    fit: "shrink",
  });

  const images = step.images.slice(0, 2);
  if (images.length === 0) {
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.75,
      y: 1.85,
      w: 11.75,
      h: 3.45,
      fill: { color: COLORS.panel },
      line: { color: COLORS.line },
    });
    addBodyText(slide, step.description, 1.05, 2.15, 11.1, 2.9, 17);
  } else if (images.length === 1) {
    slide.addImage({
      data: images[0].dataUrl,
      x: 0.75,
      y: 1.75,
      w: 11.85,
      h: 3.35,
      sizing: { type: "contain", x: 0.75, y: 1.75, w: 11.85, h: 3.35 },
    });
  } else {
    images.forEach((image, index) => {
      const x = index === 0 ? 0.75 : 6.75;
      slide.addImage({
        data: image.dataUrl,
        x,
        y: 1.75,
        w: 5.65,
        h: 3.35,
        sizing: { type: "contain", x, y: 1.75, w: 5.65, h: 3.35 },
      });
    });
  }

  if (images.length > 0) {
    addBodyText(slide, step.description, 0.75, 5.3, step.warning ? 8.7 : 11.7, 0.75, 12);
  }

  if (step.warning) {
    slide.addText(`注意: ${step.warning}`, {
      ...textStyle,
      x: 9.55,
      y: 5.25,
      w: 2.9,
      h: 0.85,
      fontSize: 11,
      bold: true,
      color: COLORS.warning,
      margin: 0.08,
      fill: { color: COLORS.warningBg },
      line: { color: "FED7AA" },
      fit: "shrink",
    });
  }
}

export async function createPowerPointBlob(manual: StoredManual): Promise<Blob> {
  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "Personal Manual Builder";
  pptx.company = "Personal Manual Builder";
  pptx.subject = manual.description || manual.title;
  pptx.title = manual.title || "Personal Manual Builder";
  pptx.theme = {
    headFontFace: OFFICE_FONT,
    bodyFontFace: OFFICE_FONT,
  };

  addCoverSlide(pptx, manual);
  manual.steps.forEach((step, index) => addStepSlide(pptx, step, index + 1));

  return (await pptx.write({ outputType: "blob", compression: true })) as Blob;
}
