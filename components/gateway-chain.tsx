import { INFRASTRUCTURE } from "@/lib/gateway-config";
import type { HealthStatus } from "@/lib/types";

const nodes = [
  { label: "Vercel", detail: "Authenticated server function" },
  { label: "zrok", detail: "homepilot-ai.shares.zrok.io" },
  { label: "Nginx", detail: INFRASTRUCTURE.nginxLoopback },
  { label: "CLIProxyAPI", detail: INFRASTRUCTURE.cliProxyLoopback },
  { label: "Upstream AI", detail: "Configured account and model" }
];

export function GatewayChain({ status }: { status: HealthStatus }) {
  return <div className="gateway-chain">{nodes.map((node, index) => <div className="chain-fragment" key={node.label}>
    <div className={`chain-node chain-${status}`}><span className="chain-index">{index + 1}</span><span><strong>{node.label}</strong><small>{node.detail}</small></span></div>
    {index < nodes.length - 1 ? <span className="chain-arrow">→</span> : null}
  </div>)}</div>;
}
