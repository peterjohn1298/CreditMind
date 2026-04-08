import { CheckCircle, XCircle, Clock, Loader } from "lucide-react";
import type { AgentStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function AgentProgress({ agents }: { agents: AgentStatus[] }) {
  return (
    <div className="space-y-2">
      {agents.map((agent, i) => (
        <div key={i} className="flex items-center gap-3">
          <StatusIcon status={agent.status} />
          <div className="flex-1">
            <p className={cn("text-sm font-medium",
              agent.status === "complete" ? "text-primary" :
              agent.status === "running"  ? "text-accent"  :
              agent.status === "error"    ? "text-danger"  : "text-muted"
            )}>
              {agent.name}
            </p>
          </div>
          {agent.duration && (
            <span className="text-muted text-xs font-mono">{agent.duration}</span>
          )}
        </div>
      ))}
    </div>
  );
}

function StatusIcon({ status }: { status: AgentStatus["status"] }) {
  if (status === "complete") return <CheckCircle size={16} className="text-success shrink-0" />;
  if (status === "error")    return <XCircle size={16} className="text-danger shrink-0" />;
  if (status === "running")  return (
    <Loader size={16} className="text-accent shrink-0 animate-spin" />
  );
  return <Clock size={16} className="text-muted shrink-0" />;
}
