import { SimpleWireframePage, audienceLabel, flowLabel } from "@/components/buildflow/wireframe";
import { getBuildflowWireframeData } from "@/lib/buildflow-wireframe";

export function WireframePageByKey({ pageKey }: { pageKey: string }) {
  const { specMap } = getBuildflowWireframeData();
  const spec = specMap.get(pageKey);

  if (!spec) {
    throw new Error(`Unknown wireframe page key: ${pageKey}`);
  }

  return (
    <SimpleWireframePage
      spec={spec}
      detailCards={[
        { label: "Who this page is for", value: audienceLabel(spec.audience), status: spec.status },
        { label: "Area", value: flowLabel(spec.flow), status: spec.status },
        { label: "Current status", value: spec.status, status: spec.status },
        { label: "Why it exists", value: spec.purpose, status: spec.status },
      ]}
    />
  );
}
