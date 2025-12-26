import { useState } from 'react';
import { 
  Home, 
  Workflow, 
  Plus, 
  Settings, 
  Key,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SidebarProps {
  activeView: 'home' | 'workflows' | 'create';
  onViewChange: (view: 'home' | 'workflows' | 'create') => void;
  onSignOut: () => void;
  userEmail?: string;
}

const NAV_ITEMS = [
  { id: 'create' as const, label: 'Create Agent', icon: Plus, primary: true },
  { id: 'home' as const, label: 'Home', icon: Home },
  { id: 'workflows' as const, label: 'Workflow', icon: Workflow },
];

export function Sidebar({ activeView, onViewChange, onSignOut, userEmail }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside 
      className={cn(
        "flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border">
        <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-5 h-5 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-base font-bold text-sidebar-foreground truncate">FlowAI</h1>
            <p className="text-xs text-sidebar-foreground/60 truncate">Agent Builder</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <Button
            key={item.id}
            variant="ghost"
            onClick={() => onViewChange(item.id)}
            className={cn(
              "w-full justify-start gap-3 h-10 px-3 font-medium transition-all",
              collapsed && "justify-center px-0",
              item.primary 
                ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground" 
                : activeView === item.id
                  ? "bg-sidebar-accent text-sidebar-foreground"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
            )}
          >
            <item.icon className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </Button>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-2 py-3 border-t border-sidebar-border space-y-1">
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start gap-3 h-10 px-3 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
            collapsed && "justify-center px-0"
          )}
        >
          <Key className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span className="truncate">API Key</span>}
        </Button>
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start gap-3 h-10 px-3 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
            collapsed && "justify-center px-0"
          )}
        >
          <Settings className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span className="truncate">Settings</span>}
        </Button>
        <Button
          variant="ghost"
          onClick={onSignOut}
          className={cn(
            "w-full justify-start gap-3 h-10 px-3 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
            collapsed && "justify-center px-0"
          )}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span className="truncate">Sign Out</span>}
        </Button>
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute top-1/2 -right-3 transform -translate-y-1/2 w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
      >
        {collapsed ? (
          <ChevronRight className="w-3 h-3" />
        ) : (
          <ChevronLeft className="w-3 h-3" />
        )}
      </button>
    </aside>
  );
}
