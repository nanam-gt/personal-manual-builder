export type Category = {
  id: string;
  name: string;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type ManualSummary = {
  id: string;
  title: string;
  description: string | null;
  categoryId: string | null;
  categoryName: string | null;
  coverImageObjectKey: string | null;
  memo: string | null;
  stepCount: number;
  imageCount: number;
  createdAt: string;
  updatedAt: string;
};

export type StepImage = {
  id: string;
  manualStepId: string;
  imageObjectKey: string;
  imageAlt: string | null;
  width: number | null;
  height: number | null;
  mimeType: string;
  displayOrder: 1 | 2;
  createdAt: string;
  updatedAt: string;
};

export type ManualStep = {
  id: string;
  manualId: string;
  title: string;
  description: string | null;
  warning: string | null;
  displayOrder: number;
  images: StepImage[];
  createdAt: string;
  updatedAt: string;
};

export type ManualDetail = ManualSummary & {
  steps: ManualStep[];
};
