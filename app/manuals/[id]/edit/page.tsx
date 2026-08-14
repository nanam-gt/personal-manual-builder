import EditorClient from "../../editor-client";

type EditManualPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditManualPage({ params }: EditManualPageProps) {
  const { id } = await params;
  return <EditorClient manualId={id} />;
}
