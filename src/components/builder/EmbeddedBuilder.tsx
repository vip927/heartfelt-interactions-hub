import { useState, useEffect } from 'react';
import { Loader2, ExternalLink, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const BUILDER_URL = 'http://143.110.254.19:7860';

interface EmbeddedBuilderProps {
  folderId: string | null;
  flowId?: string | null;
  flowUrl?: string | null;
  onClose?: () => void;
  onSync?: () => void;
}

export function EmbeddedBuilder({ 
  folderId, 
  flowId, 
  flowUrl,
  onClose, 
  onSync 
}: EmbeddedBuilderProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [iframeKey, setIframeKey] = useState(0);

  // Construct the URL to show
  // If we have a specific flowUrl, use that
  // Otherwise, show the folder view for the user's workspace
  const getBuilderUrl = () => {
    if (flowUrl) {
      return flowUrl;
    }
    if (flowId) {
      return `${BUILDER_URL}/flow/${flowId}`;
    }
    if (folderId) {
      return `${BUILDER_URL}/all?folder_id=${folderId}`;
    }
    return `${BUILDER_URL}/all`;
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setIframeKey(prev => prev + 1);
  };

  const handleOpenExternal = () => {
    window.open(getBuilderUrl(), '_blank');
  };

  useEffect(() => {
    // Reset loading state when URL changes
    setIsLoading(true);
  }, [flowId, flowUrl, folderId]);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Builder Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Visual Builder
          </div>
          {flowId && (
            <span className="text-xs text-muted-foreground">
              Flow: {flowId.substring(0, 8)}...
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            className="gap-1.5"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          {onSync && flowId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onSync}
              className="gap-1.5"
            >
              Sync Changes
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleOpenExternal}
            className="gap-1.5"
          >
            <ExternalLink className="w-4 h-4" />
            Open External
          </Button>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Iframe Container */}
      <div className="relative flex-1">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading visual builder...</p>
            </div>
          </div>
        )}
        
        <iframe
          key={iframeKey}
          src={getBuilderUrl()}
          className="w-full h-full border-0"
          onLoad={() => setIsLoading(false)}
          allow="clipboard-read; clipboard-write"
          title="Langflow Visual Builder"
        />
      </div>
    </div>
  );
}

