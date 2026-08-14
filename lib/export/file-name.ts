export function createOfficeFileName(title: string, extension: "pptx" | "docx") {
  const date = new Date().toISOString().slice(0, 10);
  const safeTitle = title
    .trim()
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 80);

  return `${safeTitle || "manual"}_${date}.${extension}`;
}
