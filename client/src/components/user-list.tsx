import type { User } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface UserListProps {
  users: User[];
  currentUserId: string;
  className?: string;
}

function getUserColor(username: string): string {
  const colors = [
    "text-green-400",
    "text-cyan-400",
    "text-blue-400",
    "text-purple-400",
    "text-pink-400",
    "text-yellow-400",
  ];
  const hash = username.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

function getUserInitials(username: string): string {
  return username.slice(0, 2).toUpperCase();
}

export function UserList({ users, currentUserId, className }: UserListProps) {
  return (
    <Card className={cn("p-4 space-y-4", className)}>
      <div className="space-y-2">
        <h3 className="text-sm font-semibold font-mono tracking-wider uppercase text-foreground">
          <i className="fa-solid fa-users mr-2 text-primary" aria-hidden="true" />
          Active Users ({users.length})
        </h3>
        <Separator />
      </div>

      <div className="space-y-2" data-testid="list-users">
        {users.map((user) => {
          const isCurrentUser = user.id === currentUserId;
          const colorClass = getUserColor(user.username);

          return (
            <div
              key={user.id}
              className={cn(
                "flex items-center gap-3 p-2 rounded-md transition-colors",
                isCurrentUser && "bg-primary/10",
              )}
              data-testid={`user-item-${user.id}`}
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center font-mono font-bold text-xs relative",
                  "bg-card-foreground/10 border border-card-foreground/20",
                  colorClass,
                )}
              >
                {getUserInitials(user.username)}
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-status-online border border-card" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p
                    className={cn(
                      "font-mono text-sm font-medium truncate",
                      colorClass,
                    )}
                  >
                    {user.username}
                  </p>
                  {isCurrentUser && (
                    <span className="text-xs text-muted-foreground font-mono">
                      (YOU)
                    </span>
                  )}
                </div>
                {user.isAdmin && (
                  <p className="text-xs text-primary font-mono flex items-center gap-1 mt-0.5">
                    <i className="fa-solid fa-crown text-[10px]" aria-hidden="true" />
                    ADMIN
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
