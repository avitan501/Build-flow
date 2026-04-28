import { SimpleWireframePage } from "@/components/buildflow/wireframe";
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
        { label: "Audience", value: spec.audience.replaceAll("_", " "), status: spec.status },
        { label: "Flow", value: spec.flow, status: spec.status },
        { label: "Current status", value: spec.status, status: spec.status },
        { label: "Helper", value: spec.purpose, status: spec.status },
      ]}
    />
  );
}
