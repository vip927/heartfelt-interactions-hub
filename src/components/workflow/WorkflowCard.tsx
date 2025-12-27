import { MoreVertical, Trash2, ExternalLink, Eye, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface WorkflowCardProps {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
  langflowFlowId?: string | null;
  onView: () => void;
  onOpen: () => void;
  onSync?: () => void;
  onDelete: () => void;
  isImporting?: boolean;
  isSyncing?: boolean;
}

const CARD_COLORS = [
  'from-primary to-brand-accent',
  'from-brand-secondary to-pink-500',
  'from-blue-500 to-cyan-400',
  'from-orange-500 to-yellow-400',
  'from-green-500 to-emerald-400',
];

export function WorkflowCard({ 
  id,
  name, 
  description, 
  createdAt,
  langflowFlowId,
  onView, 
  onOpen,
  onSync,
  onDelete,
  isImporting,
  isSyncing,
}: WorkflowCardProps) {
  // Generate consistent color based on id
  const colorIndex = id.charCodeAt(0) % CARD_COLORS.length;
  const gradientClass = CARD_COLORS[colorIndex];

  return (
    <div className="group relative bg-card rounded-xl border border-border hover:border-primary/50 hover:shadow-lg transition-all duration-200 overflow-hidden">
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className={cn(
            "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0",
            gradientClass
          )}>
            <svg 
              className="w-6 h-6 text-white" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
            >
              <path d="M4 6h16M4 12h16M4 18h8" />
            </svg>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-foreground truncate">
                {name}
              </h3>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onView}>
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onOpen} disabled={isImporting}>
                    {isImporting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <ExternalLink className="w-4 h-4 mr-2" />
                    )}
                    Open in Builder
                  </DropdownMenuItem>
                  {langflowFlowId && onSync && (
                    <DropdownMenuItem onClick={onSync} disabled={isSyncing}>
                      {isSyncing ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4 mr-2" />
                      )}
                      Sync Changes
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={onDelete}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            <p className="text-xs text-muted-foreground mt-1">
              Edited {format(new Date(createdAt), 'MM-dd HH:mm')}
            </p>
          </div>
        </div>

        {description && (
          <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
