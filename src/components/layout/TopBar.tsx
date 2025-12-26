import { Moon, Sun, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface TopBarProps {
  isDark: boolean;
  onToggleTheme: () => void;
  userEmail?: string;
}

export function TopBar({ isDark, onToggleTheme, userEmail }: TopBarProps) {
  const initials = userEmail 
    ? userEmail.split('@')[0].slice(0, 2).toUpperCase() 
    : 'U';

  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-6">
      <div />
      
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
        >
          Go Pro
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          className="relative"
        >
          <Bell className="w-4 h-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleTheme}
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>
        
        <Avatar className="w-8 h-8 border border-border">
          <AvatarFallback className="text-xs bg-secondary">
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
