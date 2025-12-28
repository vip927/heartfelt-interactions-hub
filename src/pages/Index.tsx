import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { WorkflowsView } from '@/components/views/WorkflowsView';
import { CreateView } from '@/components/views/CreateView';
import { BuilderView } from '@/components/views/BuilderView';
import { useWorkflowGenerator } from '@/hooks/useWorkflowGenerator';
import { useWorkflows, SavedWorkflow } from '@/hooks/useWorkflows';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

type ViewType = 'home' | 'workflows' | 'create' | 'builder';

const Index = () => {
  const { messages, isLoading, workflowState, sendMessage, clearChat } = useWorkflowGenerator();
  const { workflows, isLoading: isLoadingWorkflows, userFolderId, saveWorkflow, deleteWorkflow, importToLangflow, syncFromLangflow, refreshWorkflows } = useWorkflows();
  const { user, loading, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [isDark, setIsDark] = useState(false);
  const [activeView, setActiveView] = useState<ViewType>('workflows');
  const [templatePrompt, setTemplatePrompt] = useState<string | undefined>();
  const [activeBuilderWorkflow, setActiveBuilderWorkflow] = useState<SavedWorkflow | null>(null);
  const [activeBuilderFlowUrl, setActiveBuilderFlowUrl] = useState<string | null>(null);

  useEffect(() => {
    // Check system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDark(prefersDark);
    if (prefersDark) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // Auto-save workflow when generated and open embedded builder
  useEffect(() => {
    if (workflowState.workflow && workflowState.isValid) {
      const workflowName = (workflowState.workflow as any).name || 'Untitled Workflow';
      const description = workflowState.explanation?.overview || '';
      
      // Save workflow and import to builder
      saveWorkflow(workflowName, description, workflowState.workflow, workflowState.explanation)
        .then(async (saved) => {
          if (saved) {
            // Import and get the flow URL and ID
            const result = await importToLangflow(workflowState.workflow!);
            
            if (result) {
              // Open embedded builder with the imported flow
              setActiveBuilderWorkflow(saved);
              setActiveBuilderFlowUrl(result.flowUrl);
              setActiveView('builder');
              
              toast({
                title: 'Workflow created!',
                description: 'Opening in visual builder...',
              });
            }
            
            // Refresh workflows list
            refreshWorkflows();
          }
        });
    }
  }, [workflowState.workflow, workflowState.isValid]);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: 'Error signing out',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Signed out',
        description: 'You have been signed out successfully.',
      });
      navigate('/auth');
    }
  };

  const handleViewChange = (view: ViewType) => {
    if (view === 'create') {
      clearChat();
      setTemplatePrompt(undefined);
    }
    if (view !== 'builder') {
      setActiveBuilderWorkflow(null);
      setActiveBuilderFlowUrl(null);
    }
    setActiveView(view);
  };

  const handleCreateNew = () => {
    clearChat();
    setTemplatePrompt(undefined);
    setActiveView('create');
  };

  const handleUseTemplate = (prompt: string) => {
    clearChat();
    setTemplatePrompt(prompt);
    setActiveView('create');
  };

  const handleOpenInBuilder = async (workflow: SavedWorkflow) => {
    // Import the workflow to Langflow first if needed
    const result = await importToLangflow(workflow.workflow_json);
    
    if (result) {
      setActiveBuilderWorkflow(workflow);
      setActiveBuilderFlowUrl(result.flowUrl);
      setActiveView('builder');
    }
  };

  const handleOpenWorkspace = () => {
    // Open the user's workspace (all flows in their folder)
    setActiveBuilderWorkflow(null);
    setActiveBuilderFlowUrl(null);
    setActiveView('builder');
  };

  const handleCloseBuilder = () => {
    setActiveBuilderWorkflow(null);
    setActiveBuilderFlowUrl(null);
    setActiveView('workflows');
    refreshWorkflows(); // Refresh to get any updates from builder
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <div className="relative">
        <Sidebar 
          activeView={activeView}
          onViewChange={handleViewChange}
          onSignOut={handleSignOut}
          userEmail={user.email}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar 
          isDark={isDark}
          onToggleTheme={toggleTheme}
          userEmail={user.email}
        />
        
        <main className="flex-1 overflow-hidden bg-background">
          {activeView === 'create' ? (
            <CreateView
              messages={messages}
              onSendMessage={sendMessage}
              isLoading={isLoading}
              onBack={() => setActiveView('workflows')}
              initialPrompt={templatePrompt}
            />
          ) : activeView === 'builder' ? (
            <BuilderView
              userFolderId={userFolderId}
              workflow={activeBuilderWorkflow}
              flowUrl={activeBuilderFlowUrl}
              onClose={handleCloseBuilder}
              onSync={syncFromLangflow}
            />
          ) : (
            <WorkflowsView
              workflows={workflows}
              isLoading={isLoadingWorkflows}
              onDelete={deleteWorkflow}
              onOpenInBuilder={handleOpenInBuilder}
              onOpenWorkspace={handleOpenWorkspace}
              onSyncFromBuilder={syncFromLangflow}
              onCreateNew={handleCreateNew}
              onUseTemplate={handleUseTemplate}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default Index;
