import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { WorkflowsView } from '@/components/views/WorkflowsView';
import { CreateView } from '@/components/views/CreateView';
import { useWorkflowGenerator } from '@/hooks/useWorkflowGenerator';
import { useWorkflows } from '@/hooks/useWorkflows';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

type ViewType = 'home' | 'workflows' | 'create';

const Index = () => {
  const { messages, isLoading, workflowState, sendMessage, clearChat } = useWorkflowGenerator();
  const { workflows, isLoading: isLoadingWorkflows, saveWorkflow, deleteWorkflow, importToLangflow, refreshWorkflows } = useWorkflows();
  const { user, loading, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [isDark, setIsDark] = useState(false);
  const [activeView, setActiveView] = useState<ViewType>('workflows');
  const [templatePrompt, setTemplatePrompt] = useState<string | undefined>();

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

  // Auto-save workflow when generated and import to builder
  useEffect(() => {
    if (workflowState.workflow && workflowState.isValid) {
      const workflowName = (workflowState.workflow as any).name || 'Untitled Workflow';
      const description = workflowState.explanation?.overview || '';
      
      // Open builder window immediately (prevents popup blocker)
      const builderWindow = window.open('about:blank', '_blank');
      
      // Save workflow and import to builder
      saveWorkflow(workflowName, description, workflowState.workflow, workflowState.explanation)
        .then(async (saved) => {
          if (saved) {
            // Import and get the flow URL
            const flowUrl = await importToLangflow(workflowState.workflow!);
            
            if (flowUrl && builderWindow) {
              // Navigate to the imported flow
              builderWindow.location.href = flowUrl;
              
              toast({
                title: 'Workflow created!',
                description: 'Opening in visual builder...',
              });
            } else if (builderWindow) {
              // Fallback: close the blank window if import failed
              builderWindow.close();
            }
            
            // Refresh workflows list
            refreshWorkflows();
          } else if (builderWindow) {
            builderWindow.close();
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
          ) : (
            <WorkflowsView
              workflows={workflows}
              isLoading={isLoadingWorkflows}
              onDelete={deleteWorkflow}
              onImportToBuilder={importToLangflow}
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
