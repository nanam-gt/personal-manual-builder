"use client";

import pptxgen from "pptxgenjs";
import type {
  StoredManual,
  StoredStep,
  StoredStepImage,
} from "@/app/manuals/local-store";

const OFFICE_FONT = "Meiryo";
const COLORS = {
  text: "17211F",
  muted: "66716F",
  accent: "0F766E",
  accentDark: "0B5F59",
  panel: "EEF5F4",
  line: "D9E0DE",
  descriptionBg: "F1FAF7",
  descriptionBorder: "8BC5B8",
  warning: "9A3412",
  warningBg: "FFF7ED",
  warningBorder: "FDBA74",
};

const textStyle = {
  fontFace: OFFICE_FONT,
  color: COLORS.text,
  breakLine: false,
  fit: "shrink" as const,
};
const RECT_SHAPE = "rect" as const;

type ImageSize = {
  width: number;
  height: number;
};

type ImageBox = {
  x: number;
  y: number;
  w: number;
  h: number;
};

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

function fitImageToBox(size: ImageSize, box: ImageBox): ImageBox {
  const imageRatio = size.width / size.height;
  const boxRatio = box.w / box.h;

  if (imageRatio > boxRatio) {
    return {
      x: box.x,
      y: box.y,
      w: box.w,
      h: box.w / imageRatio,
    };
  }

  return {
    x: box.x,
    y: box.y,
    w: box.h * imageRatio,
    h: box.h,
  };
}

async function addContainedImage(
  slide: pptxgen.Slide,
  image: StoredStepImage,
  box: ImageBox
) {
  const fitted = fitImageToBox(await getImageSize(image.dataUrl), box);
  slide.addImage({
    data: image.dataUrl,
    ...fitted,
  });
}

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

function addDescriptionPanel(slide: pptxgen.Slide, text: string) {
  slide.addShape(RECT_SHAPE, {
    x: 8.72,
    y: 1.72,
    w: 3.65,
    h: 2.35,
    fill: { color: COLORS.descriptionBg },
    line: { color: COLORS.descriptionBorder, width: 1.1 },
  });
  slide.addText("説明", {
    ...textStyle,
    x: 9.02,
    y: 1.98,
    w: 3.1,
    h: 0.28,
    fontSize: 11,
    bold: true,
    color: COLORS.accentDark,
    margin: 0,
  });
  slide.addText(text || "説明は未入力です。", {
    ...textStyle,
    x: 9.02,
    y: 2.38,
    w: 3.08,
    h: 1.38,
    fontSize: 12,
    color: COLORS.text,
    margin: 0,
    valign: "top",
    breakLine: false,
    fit: "shrink",
  });
}

function addWarningPanel(slide: pptxgen.Slide, warning: string) {
  slide.addShape(RECT_SHAPE, {
    x: 8.72,
    y: 4.3,
    w: 3.65,
    h: 1.55,
    fill: { color: COLORS.warningBg },
    line: { color: COLORS.warningBorder, width: 1 },
  });
  slide.addText("注意", {
    ...textStyle,
    x: 9.02,
    y: 4.55,
    w: 3.1,
    h: 0.28,
    fontSize: 11.5,
    bold: true,
    color: COLORS.warning,
    margin: 0,
  });
  slide.addText(warning, {
    ...textStyle,
    x: 9.02,
    y: 4.94,
    w: 3.08,
    h: 0.68,
    fontSize: 11.5,
    bold: true,
    color: COLORS.warning,
    margin: 0,
    valign: "top",
    breakLine: false,
    fit: "shrink",
  });
}

function addCoverSlide(pptx: pptxgen, manual: StoredManual) {
  const slide = pptx.addSlide();
  slide.background = { color: "FFFFFF" };
  slide.addShape(RECT_SHAPE, {
    x: 0,
    y: 0,
    w: 13.333,
    h: 7.5,
    fill: { color: "F6F7F9" },
    line: { color: "F6F7F9" },
  });
  slide.addShape(RECT_SHAPE, {
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

async function addStepSlide(pptx: pptxgen, step: StoredStep, stepIndex: number) {
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
    slide.addShape(RECT_SHAPE, {
      x: 0.75,
      y: 1.75,
      w: 7.55,
      h: 4.95,
      fill: { color: COLORS.panel },
      line: { color: COLORS.line },
    });
    slide.addText("写真なし", {
      ...textStyle,
      x: 0.75,
      y: 3.75,
      w: 7.55,
      h: 0.5,
      fontSize: 16,
      color: COLORS.muted,
      align: "center",
      margin: 0,
    });
  } else if (images.length === 1) {
    await addContainedImage(slide, images[0], {
      x: 0.75,
      y: 1.75,
      w: 7.55,
      h: 4.95,
    });
  } else {
    await Promise.all(images.map((image, index) => {
      const x = index === 0 ? 0.75 : 4.65;
      return addContainedImage(slide, image, {
        x,
        y: 1.75,
        w: 3.65,
        h: 4.95,
      });
    }));
  }

  addDescriptionPanel(slide, step.description);
  if (step.warning.trim()) {
    addWarningPanel(slide, step.warning);
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
  for (const [index, step] of manual.steps.entries()) {
    await addStepSlide(pptx, step, index + 1);
  }

  return (await pptx.write({ outputType: "blob", compression: true })) as Blob;
}
