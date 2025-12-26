import { cn } from '@/lib/utils';

interface WorkflowTemplateCardProps {
  name: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  onClick: () => void;
}

export function WorkflowTemplateCard({ 
  name, 
  description, 
  icon,
  gradient,
  onClick 
}: WorkflowTemplateCardProps) {
  return (
    <button 
      onClick={onClick}
      className="group relative bg-card rounded-xl border border-border hover:border-primary/50 hover:shadow-lg transition-all duration-200 overflow-hidden text-left p-5"
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={cn(
          "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0",
          gradient
        )}>
          {icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
            {name}
          </h3>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {description}
          </p>
        </div>
      </div>
    </button>
  );
}
