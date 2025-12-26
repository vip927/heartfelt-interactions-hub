import { RotateCcw, Moon, Sun, Workflow, LogOut, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChatInterface } from '@/components/ChatInterface';
import { JsonOutputPanel } from '@/components/JsonOutputPanel';
import { useWorkflowGenerator } from '@/hooks/useWorkflowGenerator';
import { useWorkflows } from '@/hooks/useWorkflows';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const { messages, isLoading, workflowState, sendMessage, clearChat } = useWorkflowGenerator();
  const { workflows, isLoading: isLoadingWorkflows, saveWorkflow, deleteWorkflow, importToLangflow, refreshWorkflows } = useWorkflows();
  const { user, loading, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(false);

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

  // Auto-save workflow when generated and import to Langflow
  useEffect(() => {
    if (workflowState.workflow && workflowState.isValid) {
      const workflowName = (workflowState.workflow as any).name || 'Untitled Workflow';
      const description = workflowState.explanation?.overview || '';
      
      // Open Langflow window immediately (prevents popup blocker)
      const langflowWindow = window.open('about:blank', '_blank');
      
      // Save workflow and import to Langflow
      saveWorkflow(workflowName, description, workflowState.workflow, workflowState.explanation)
        .then(async (saved) => {
          if (saved) {
            // Import to Langflow and get the flow URL
            const flowUrl = await importToLangflow(workflowState.workflow!);
            
            if (flowUrl && langflowWindow) {
              // Navigate to the imported flow
              langflowWindow.location.href = flowUrl;
              
              toast({
                title: 'Workflow imported!',
                description: 'Opening in Langflow visual builder...',
              });
            } else if (langflowWindow) {
              // Fallback: close the blank window if import failed
              langflowWindow.close();
            }
            
            // Refresh workflows list
            refreshWorkflows();
          } else if (langflowWindow) {
            langflowWindow.close();
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
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-langflow-purple to-langflow-blue flex items-center justify-center">
            <Workflow className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Langflow Generator</h1>
            <p className="text-xs text-muted-foreground">AI-powered workflow builder</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground hidden sm:block">
            {user.email}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={clearChat}
            className="gap-2"
            disabled={messages.length === 0}
          >
            <RotateCcw className="w-4 h-4" />
            Clear
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={toggleTheme}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleSignOut}
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Panel */}
        <div className="w-1/2 border-r border-border bg-card">
          <ChatInterface
            messages={messages}
            onSendMessage={sendMessage}
            isLoading={isLoading}
          />
        </div>

        {/* JSON Output Panel */}
        <div className="w-1/2 bg-background">
          <JsonOutputPanel
            workflow={workflowState.workflow}
            rawContent={workflowState.rawContent}
            isValid={workflowState.isValid}
            explanation={workflowState.explanation}
            savedWorkflows={workflows}
            isLoadingWorkflows={isLoadingWorkflows}
            onDeleteWorkflow={deleteWorkflow}
            onImportToLangflow={importToLangflow}
          />
        </div>
      </div>
    </div>
  );
};

export default Index;
