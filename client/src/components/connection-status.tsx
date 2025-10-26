import { cn } from "@/lib/utils";

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

interface ConnectionStatusProps {
  status: ConnectionStatus;
  className?: string;
}

export function ConnectionStatus({ status, className }: ConnectionStatusProps) {
  const statusConfig = {
    connected: {
      color: "text-status-online",
      label: "CONNECTED",
      icon: "fa-solid fa-circle",
    },
    connecting: {
      color: "text-status-away",
      label: "CONNECTING",
      icon: "fa-solid fa-circle",
    },
    disconnected: {
      color: "text-status-offline",
      label: "DISCONNECTED",
      icon: "fa-solid fa-circle",
    },
    error: {
      color: "text-status-busy",
      label: "ERROR",
      icon: "fa-solid fa-triangle-exclamation",
    },
  };

  const config = statusConfig[status];

  return (
    <div
      className={cn(
        "flex items-center gap-2 text-xs font-mono tracking-wider",
        className,
      )}
      data-testid="status-connection"
    >
      <i
        className={cn(
          "text-xs",
          config.icon,
          config.color,
          status === "connected" && "animate-pulse-glow",
        )}
        aria-label={`Connection status: ${config.label}`}
      />
      <span className="text-muted-foreground">{config.label}</span>
    </div>
  );
}
