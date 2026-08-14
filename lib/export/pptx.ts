"use client";

import { zipSync, strToU8 } from "fflate";
import type { StoredManual, StoredStep, StoredStepImage } from "@/app/manuals/local-store";

const SLIDE_W = 12192000;
const SLIDE_H = 6858000;
const OFFICE_FONT = "Meiryo";

type ZipFiles = Record<string, Uint8Array>;

type PreparedImage = {
  id: string;
  extension: "png" | "jpg";
  contentType: "image/png" | "image/jpeg";
  data: Uint8Array;
};

const xml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const textRun = (text: string, size = 2200, bold = false) => `
  <a:r>
    <a:rPr lang="ja-JP" sz="${size}"${bold ? ' b="1"' : ""}>
      <a:latin typeface="${OFFICE_FONT}"/>
      <a:ea typeface="${OFFICE_FONT}"/>
      <a:cs typeface="${OFFICE_FONT}"/>
    </a:rPr>
    <a:t>${xml(text)}</a:t>
  </a:r>`;

const shape = (
  id: number,
  name: string,
  x: number,
  y: number,
  cx: number,
  cy: number,
  lines: string[],
  size = 2200,
  bold = false
) => `
  <p:sp>
    <p:nvSpPr>
      <p:cNvPr id="${id}" name="${xml(name)}"/>
      <p:cNvSpPr txBox="1"/>
      <p:nvPr/>
    </p:nvSpPr>
    <p:spPr>
      <a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>
      <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
      <a:noFill/>
      <a:ln><a:noFill/></a:ln>
    </p:spPr>
    <p:txBody>
      <a:bodyPr wrap="square"/>
      <a:lstStyle/>
      ${lines
        .filter(Boolean)
        .map((line) => `<a:p>${textRun(line, size, bold)}</a:p>`)
        .join("")}
    </p:txBody>
  </p:sp>`;

const imageShape = (
  id: number,
  relId: string,
  name: string,
  x: number,
  y: number,
  cx: number,
  cy: number
) => `
  <p:pic>
    <p:nvPicPr>
      <p:cNvPr id="${id}" name="${xml(name)}"/>
      <p:cNvPicPr/>
      <p:nvPr/>
    </p:nvPicPr>
    <p:blipFill>
      <a:blip r:embed="${relId}"/>
      <a:stretch><a:fillRect/></a:stretch>
    </p:blipFill>
    <p:spPr>
      <a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>
      <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
    </p:spPr>
  </p:pic>`;

const slideXml = (content: string) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm>
      </p:grpSpPr>
      ${content}
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>`;

const slideRels = (images: PreparedImage[]) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
  ${images.map((image, index) => {
    const rel = index + 2;
    return `<Relationship Id="rId${rel}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${image.id}.${image.extension}"/>`;
  }).join("")}
</Relationships>`;

function dataUrlToImage(image: StoredStepImage): PreparedImage | null {
  const match = image.dataUrl.match(/^data:(image\/(?:png|jpeg));base64,(.+)$/);
  if (!match) {
    return null;
  }

  const contentType = match[1] as "image/png" | "image/jpeg";
  const extension = contentType === "image/png" ? "png" : "jpg";
  const binary = atob(match[2]);
  const data = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    data[index] = binary.charCodeAt(index);
  }

  return {
    id: image.id,
    extension,
    contentType,
    data,
  };
}

function coverSlide(manual: StoredManual) {
  return slideXml(`
    ${shape(2, "Manual", 700000, 900000, 1500000, 400000, ["Manual"], 1800, true)}
    ${shape(3, "Title", 700000, 1650000, 9800000, 1000000, [manual.title], 3600, true)}
    ${shape(4, "Description", 700000, 2900000, 9000000, 900000, [manual.description], 2000)}
    ${shape(5, "Meta", 700000, 5200000, 9000000, 500000, [
      manual.category || "未分類",
      new Date(manual.updatedAt).toLocaleDateString("ja-JP"),
    ], 1600)}
  `);
}

function stepSlide(step: StoredStep, stepIndex: number) {
  const images = step.images.map(dataUrlToImage).filter(Boolean) as PreparedImage[];
  const imageShapes =
    images.length === 1
      ? imageShape(5, "rId2", "Photo 1", 650000, 1900000, 10900000, 2900000)
      : images
          .slice(0, 2)
          .map((image, index) =>
            imageShape(
              5 + index,
              `rId${index + 2}`,
              `Photo ${index + 1}`,
              index === 0 ? 650000 : 6250000,
              1900000,
              5300000,
              2900000
            )
          )
          .join("");

  const noImageText =
    images.length === 0
      ? shape(5, "Body", 700000, 2100000, 10100000, 2200000, [step.description], 2300)
      : "";

  return {
    images,
    xml: slideXml(`
      ${shape(2, "Step", 650000, 520000, 1600000, 350000, [`STEP ${stepIndex}`], 1800, true)}
      ${shape(3, "Title", 650000, 900000, 10300000, 650000, [step.title], 3000, true)}
      ${images.length === 0 ? noImageText : imageShapes}
      ${images.length > 0 ? shape(8, "Description", 700000, 5050000, 7900000, 620000, [step.description], 1700) : ""}
      ${step.warning ? shape(9, "Warning", 8800000, 4980000, 2600000, 700000, [`注意: ${step.warning}`], 1500, true) : ""}
    `),
  };
}

function contentTypes(slideCount: number, images: PreparedImage[]) {
  const hasPng = images.some((image) => image.contentType === "image/png");
  const hasJpeg = images.some((image) => image.contentType === "image/jpeg");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  ${hasPng ? '<Default Extension="png" ContentType="image/png"/>' : ""}
  ${hasJpeg ? '<Default Extension="jpg" ContentType="image/jpeg"/>' : ""}
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
  <Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
  <Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
  ${Array.from({ length: slideCount }, (_, index) => `<Override PartName="/ppt/slides/slide${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join("")}
</Types>`;
}

export function createPowerPointBlob(manual: StoredManual): Blob {
  const files: ZipFiles = {};
  const allImages: PreparedImage[] = [];
  const slideFiles: string[] = [coverSlide(manual)];
  const imagesBySlide: PreparedImage[][] = [[]];

  manual.steps.forEach((step, index) => {
    const slide = stepSlide(step, index + 1);
    slideFiles.push(slide.xml);
    imagesBySlide.push(slide.images);
    allImages.push(...slide.images);
  });

  files["[Content_Types].xml"] = strToU8(contentTypes(slideFiles.length, allImages));
  files["_rels/.rels"] = strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`);
  files["docProps/app.xml"] = strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">
  <Application>Personal Manual Builder</Application>
  <Slides>${slideFiles.length}</Slides>
</Properties>`);
  files["docProps/core.xml"] = strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:dcterms="http://purl.org/dc/terms/"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>${xml(manual.title)}</dc:title>
  <dc:creator>Personal Manual Builder</dc:creator>
  <dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created>
</cp:coreProperties>`);

  files["ppt/presentation.xml"] = strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>
  <p:sldIdLst>
    ${slideFiles.map((_, index) => `<p:sldId id="${256 + index}" r:id="rId${index + 2}"/>`).join("")}
  </p:sldIdLst>
  <p:sldSz cx="${SLIDE_W}" cy="${SLIDE_H}" type="wide"/>
  <p:notesSz cx="6858000" cy="9144000"/>
</p:presentation>`);
  files["ppt/_rels/presentation.xml.rels"] = strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>
  ${slideFiles.map((_, index) => `<Relationship Id="rId${index + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${index + 1}.xml"/>`).join("")}
</Relationships>`);

  files["ppt/slideMasters/slideMaster1.xml"] = strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld>
  <p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst>
  <p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles>
</p:sldMaster>`);
  files["ppt/slideMasters/_rels/slideMaster1.xml.rels"] = strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>
</Relationships>`);
  files["ppt/slideLayouts/slideLayout1.xml"] = strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank">
  <p:cSld name="Blank"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld>
</p:sldLayout>`);
  files["ppt/slideLayouts/_rels/slideLayout1.xml.rels"] = strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`);
  files["ppt/theme/theme1.xml"] = strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Personal Manual Builder">
  <a:themeElements><a:clrScheme name="Office"><a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1><a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="17211F"/></a:dk2><a:lt2><a:srgbClr val="F6F7F9"/></a:lt2><a:accent1><a:srgbClr val="0F766E"/></a:accent1><a:accent2><a:srgbClr val="B42318"/></a:accent2><a:accent3><a:srgbClr val="66716F"/></a:accent3><a:accent4><a:srgbClr val="D9E0DE"/></a:accent4><a:accent5><a:srgbClr val="EEF5F4"/></a:accent5><a:accent6><a:srgbClr val="FFFFFF"/></a:accent6><a:hlink><a:srgbClr val="0F766E"/></a:hlink><a:folHlink><a:srgbClr val="0B5F59"/></a:folHlink></a:clrScheme><a:fontScheme name="Office"><a:majorFont><a:latin typeface="${OFFICE_FONT}"/><a:ea typeface="${OFFICE_FONT}"/><a:cs typeface="${OFFICE_FONT}"/></a:majorFont><a:minorFont><a:latin typeface="${OFFICE_FONT}"/><a:ea typeface="${OFFICE_FONT}"/><a:cs typeface="${OFFICE_FONT}"/></a:minorFont></a:fontScheme><a:fmtScheme name="Office"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements>
</a:theme>`);

  slideFiles.forEach((slide, index) => {
    files[`ppt/slides/slide${index + 1}.xml`] = strToU8(slide);
    files[`ppt/slides/_rels/slide${index + 1}.xml.rels`] = strToU8(
      slideRels(imagesBySlide[index])
    );

    for (const image of imagesBySlide[index]) {
      files[`ppt/media/${image.id}.${image.extension}`] = image.data;
    }
  });

  return new Blob([zipSync(files)], {
    type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  });
}
