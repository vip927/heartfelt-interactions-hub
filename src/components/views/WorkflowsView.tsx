import { useState } from 'react';
import { Search, Plus, MessageSquare, FileText, Globe, Bot } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { WorkflowCard } from '@/components/workflow/WorkflowCard';
import { WorkflowTemplateCard } from '@/components/workflow/WorkflowTemplateCard';
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
import { useToast } from '@/hooks/use-toast';

interface WorkflowsViewProps {
  workflows: SavedWorkflow[];
  isLoading: boolean;
  onDelete: (id: string) => void;
  onImportToBuilder: (workflowJson: object) => Promise<{ flowUrl: string; flowId: string } | null>;
  onSyncFromBuilder: (workflowId: string, langflowFlowId: string) => Promise<boolean>;
  onCreateNew: () => void;
  onUseTemplate: (prompt: string) => void;
}

const WORKFLOW_TEMPLATES = [
  {
    name: 'Chatbot Assistant',
    description: 'A conversational AI chatbot that can answer questions and help users.',
    icon: <MessageSquare className="w-6 h-6 text-white" />,
    gradient: 'from-primary to-brand-accent',
    prompt: 'Build a chatbot that can have natural conversations and answer user questions',
  },
  {
    name: 'Document Q&A',
    description: 'Upload documents and ask questions about their content using RAG.',
    icon: <FileText className="w-6 h-6 text-white" />,
    gradient: 'from-brand-secondary to-pink-500',
    prompt: 'Create a RAG pipeline that can process PDF documents and answer questions about them',
  },
  {
    name: 'Web Research Agent',
    description: 'An agent that can search the web and compile research on any topic.',
    icon: <Globe className="w-6 h-6 text-white" />,
    gradient: 'from-blue-500 to-cyan-400',
    prompt: 'Build a web research agent that can search the internet and summarize findings',
  },
  {
    name: 'Multi-Agent System',
    description: 'A team of AI agents that collaborate to complete complex tasks.',
    icon: <Bot className="w-6 h-6 text-white" />,
    gradient: 'from-orange-500 to-yellow-400',
    prompt: 'Create a multi-agent workflow with specialized agents working together',
  },
];

export function WorkflowsView({ 
  workflows, 
  isLoading, 
  onDelete, 
  onImportToBuilder,
  onSyncFromBuilder,
  onCreateNew,
  onUseTemplate
}: WorkflowsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWorkflow, setSelectedWorkflow] = useState<SavedWorkflow | null>(null);
  const [workflowToDelete, setWorkflowToDelete] = useState<SavedWorkflow | null>(null);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const { toast } = useToast();

  const filteredWorkflows = workflows.filter(w => 
    w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenInBuilder = async (workflow: SavedWorkflow) => {
    setImportingId(workflow.id);
    try {
      const result = await onImportToBuilder(workflow.workflow_json);
      if (result) {
        window.open(result.flowUrl, '_blank');
        toast({
          title: 'Workflow opened!',
          description: 'Opening in visual builder...',
        });
      }
    } finally {
      setImportingId(null);
    }
  };

  const handleSyncFromBuilder = async (workflow: SavedWorkflow) => {
    if (!workflow.langflow_flow_id) {
      toast({
        title: 'Cannot sync',
        description: 'This workflow has not been opened in the builder yet.',
        variant: 'destructive',
      });
      return;
    }

    setSyncingId(workflow.id);
    try {
      await onSyncFromBuilder(workflow.id, workflow.langflow_flow_id);
    } finally {
      setSyncingId(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Content Header */}
      <div className="px-8 pt-6 pb-4">
        <Tabs defaultValue="my-workflows" className="w-full">
          <div className="flex items-center justify-between mb-6">
            <TabsList className="bg-transparent p-0 h-auto gap-6">
              <TabsTrigger 
                value="templates" 
                className="px-0 pb-2 pt-0 h-auto bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none text-muted-foreground data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none font-medium"
              >
                Workflow Templates
              </TabsTrigger>
              <TabsTrigger 
                value="my-workflows" 
                className="px-0 pb-2 pt-0 h-auto bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none text-muted-foreground data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none font-medium"
              >
                My Workflows
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="templates" className="mt-0 flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {WORKFLOW_TEMPLATES.map((template, i) => (
                <WorkflowTemplateCard
                  key={i}
                  name={template.name}
                  description={template.description}
                  icon={template.icon}
                  gradient={template.gradient}
                  onClick={() => onUseTemplate(template.prompt)}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="my-workflows" className="mt-0 flex-1 flex flex-col">
            {/* Search and Create */}
            <div className="flex items-center gap-4 mb-6">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search Workflow"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-card border-border"
                />
              </div>
              <Button onClick={onCreateNew} className="gap-2">
                <Plus className="w-4 h-4" />
                Create Workflow
              </Button>
            </div>

            {/* Workflows Grid */}
            <ScrollArea className="flex-1">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredWorkflows.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
                    <FileText className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {searchQuery ? 'No workflows found' : 'No Workflows Yet'}
                  </h3>
                  <p className="text-muted-foreground text-sm max-w-xs">
                    {searchQuery 
                      ? 'Try adjusting your search query'
                      : 'Create your first workflow using the chat or choose a template to get started.'
                    }
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
                  {filteredWorkflows.map((workflow) => (
                    <WorkflowCard
                      key={workflow.id}
                      id={workflow.id}
                      name={workflow.name}
                      description={workflow.description}
                      createdAt={workflow.created_at}
                      langflowFlowId={workflow.langflow_flow_id}
                      onView={() => setSelectedWorkflow(workflow)}
                      onOpen={() => handleOpenInBuilder(workflow)}
                      onSync={() => handleSyncFromBuilder(workflow)}
                      onDelete={() => setWorkflowToDelete(workflow)}
                      isImporting={importingId === workflow.id}
                      isSyncing={syncingId === workflow.id}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>

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
                  toast({
                    title: 'Copied!',
                    description: 'Workflow JSON copied to clipboard',
                  });
                }
              }}
            >
              Copy JSON
            </Button>
            <Button
              onClick={() => {
                if (selectedWorkflow) {
                  handleOpenInBuilder(selectedWorkflow);
                }
              }}
              className="gap-2"
            >
              Open in Builder
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
    </div>
  );
}
