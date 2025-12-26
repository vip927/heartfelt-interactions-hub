import { useState } from 'react';
import { Workflow, Trash2, ExternalLink, Eye, Calendar, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { SavedWorkflow } from '@/hooks/useWorkflows';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface MyWorkflowsPanelProps {
  workflows: SavedWorkflow[];
  isLoading: boolean;
  onDelete: (id: string) => void;
  onImportToLangflow: (workflowJson: object) => Promise<string | null>;
}

export function MyWorkflowsPanel({ workflows, isLoading, onDelete, onImportToLangflow }: MyWorkflowsPanelProps) {
  const [selectedWorkflow, setSelectedWorkflow] = useState<SavedWorkflow | null>(null);
  const [workflowToDelete, setWorkflowToDelete] = useState<SavedWorkflow | null>(null);
  const [importingId, setImportingId] = useState<string | null>(null);
  const { toast } = useToast();

  const openInLangflow = async (workflow: SavedWorkflow) => {
    setImportingId(workflow.id);
    try {
      const flowUrl = await onImportToLangflow(workflow.workflow_json);
      if (flowUrl) {
        window.open(flowUrl, '_blank');
        toast({
          title: 'Workflow imported!',
          description: 'Opening in Langflow visual builder...',
        });
      }
    } finally {
      setImportingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (workflows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
          <Workflow className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          No Workflows Yet
        </h3>
        <p className="text-muted-foreground text-sm max-w-xs">
          Generate your first workflow using the chat, and it will be saved here automatically.
        </p>
      </div>
    );
  }

  return (
    <>
      <ScrollArea className="h-full">
        <div className="p-4 space-y-3">
          {workflows.map((workflow) => (
            <div
              key={workflow.id}
              className="group p-4 rounded-xl border border-border bg-card hover:border-primary/50 transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-foreground truncate">
                    {workflow.name}
                  </h4>
                  {workflow.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {workflow.description}
                    </p>
                  )}
                  <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(workflow.created_at), 'MMM d, yyyy')}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedWorkflow(workflow)}
                    title="View JSON"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openInLangflow(workflow)}
                    title="Open in Langflow"
                    disabled={importingId === workflow.id}
                  >
                    {importingId === workflow.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ExternalLink className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setWorkflowToDelete(workflow)}
                    className="text-destructive hover:text-destructive"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* View Workflow Dialog */}
      <Dialog open={!!selectedWorkflow} onOpenChange={() => setSelectedWorkflow(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{selectedWorkflow?.name}</DialogTitle>
            <DialogDescription>
              {selectedWorkflow?.description || 'No description'}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[500px] mt-4">
            <pre className="p-4 bg-secondary rounded-lg text-sm font-mono overflow-x-auto">
              {selectedWorkflow && JSON.stringify(selectedWorkflow.workflow_json, null, 2)}
            </pre>
          </ScrollArea>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                if (selectedWorkflow) {
                  navigator.clipboard.writeText(
                    JSON.stringify(selectedWorkflow.workflow_json, null, 2)
                  );
                }
              }}
            >
              Copy JSON
            </Button>
            <Button
              onClick={() => {
                if (selectedWorkflow) {
                  openInLangflow(selectedWorkflow);
                }
              }}
              className="gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Open in Langflow
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!workflowToDelete} onOpenChange={() => setWorkflowToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workflow</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{workflowToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (workflowToDelete) {
                  onDelete(workflowToDelete.id);
                  setWorkflowToDelete(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
