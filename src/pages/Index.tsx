import { RotateCcw, Moon, Sun, Workflow } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatInterface } from '@/components/ChatInterface';
import { JsonOutputPanel } from '@/components/JsonOutputPanel';
import { useWorkflowGenerator } from '@/hooks/useWorkflowGenerator';
import { useState, useEffect } from 'react';

const Index = () => {
  const { messages, isLoading, workflowState, sendMessage, clearChat } = useWorkflowGenerator();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDark(prefersDark);
    if (prefersDark) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

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
          />
        </div>
      </div>
    </div>
  );
};

export default Index;
