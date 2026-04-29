import { ClientWireframePage } from "@/components/buildflow/client-wireframe-page";

const hrefMap = {
  "/dashboard": "/demo/client-flow",
  "/projects": "/demo/client-flow/project",
  "/projects/new": "/demo/client-flow/project",
  "/upload": "/demo/client-flow/upload",
  "/materials": "/demo/client-flow/materials",
  "/quotes": "/demo/client-flow/quote",
  "/orders": "/demo/client-flow/orders",
  "/orders/demo": "/demo/client-flow/orders",
};

export default function DemoClientFlowMaterialsPage() {
  return <ClientWireframePage pageKey="materials" hrefMap={hrefMap} audienceLabel="Public Demo Client Flow" modeLabel="Demo mode · no login" />;
}
