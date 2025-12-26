import { useState } from 'react';
import { Copy, Download, Check, FileJson, AlertCircle, CheckCircle2, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { ExplanationPanel } from '@/components/ExplanationPanel';

interface WorkflowExplanation {
  overview: string;
  components: Array<{
    name: string;
    type: string;
    purpose: string;
    configuration: string;
  }>;
  dataFlow: string;
  expectedOutput: string;
}

interface JsonOutputPanelProps {
  workflow: object | null;
  rawContent: string;
  isValid: boolean;
  explanation?: WorkflowExplanation | null;
}

export function JsonOutputPanel({ workflow, rawContent, isValid, explanation }: JsonOutputPanelProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const displayContent = workflow ? JSON.stringify(workflow, null, 2) : rawContent;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(displayContent);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Workflow JSON copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleDownload = () => {
    const blob = new Blob([displayContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = workflow && 'name' in workflow 
      ? `${(workflow as any).name.replace(/\s+/g, '_')}.json`
      : 'langflow_workflow.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Downloaded!",
      description: "Workflow JSON saved to file",
    });
  };

  if (!displayContent) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
          <FileJson className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          No Workflow Yet
        </h3>
        <p className="text-muted-foreground text-sm max-w-xs">
          Describe what you want to build in the chat, and your generated Langflow JSON will appear here.
        </p>
      </div>
    );
  }

  return (
    <Tabs defaultValue="json" className="flex flex-col h-full">
      {/* Header with Tabs */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <TabsList className="bg-secondary/50">
          <TabsTrigger value="json" className="gap-2">
            <FileJson className="w-4 h-4" />
            JSON
          </TabsTrigger>
          <TabsTrigger value="guide" className="gap-2">
            <BookOpen className="w-4 h-4" />
            Guide
          </TabsTrigger>
        </TabsList>
        <div className="flex items-center gap-2">
          {isValid ? (
            <span className="flex items-center gap-1 text-xs text-langflow-green bg-langflow-green/10 px-2 py-0.5 rounded-full">
              <CheckCircle2 className="w-3 h-3" />
              Valid
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
              <AlertCircle className="w-3 h-3" />
              Check format
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="gap-2"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Download
          </Button>
        </div>
      </div>

      {/* Tab Content */}
      <TabsContent value="json" className="flex-1 mt-0 overflow-hidden">
        <ScrollArea className="h-full">
          <pre className="p-4 text-sm font-mono overflow-x-auto">
            <code className="text-foreground">
              {highlightJson(displayContent)}
            </code>
          </pre>
        </ScrollArea>
      </TabsContent>

      <TabsContent value="guide" className="flex-1 mt-0 overflow-hidden">
        <ExplanationPanel explanation={explanation || null} />
      </TabsContent>
    </Tabs>
  );
}

// Simple JSON syntax highlighting
function highlightJson(json: string): React.ReactNode {
  if (!json) return null;
  
  const lines = json.split('\n');
  
  return lines.map((line, i) => {
    // Highlight keys
    const highlightedLine = line
      .replace(/"([^"]+)":/g, '<span class="text-langflow-purple">"$1"</span>:')
      .replace(/: "([^"]*)"(,?)$/g, ': <span class="text-langflow-green">"$1"</span>$2')
      .replace(/: (\d+)(,?)$/g, ': <span class="text-langflow-blue">$1</span>$2')
      .replace(/: (true|false)(,?)$/g, ': <span class="text-langflow-orange">$1</span>$2')
      .replace(/: (null)(,?)$/g, ': <span class="text-muted-foreground">$1</span>$2');
    
    return (
      <div key={i} dangerouslySetInnerHTML={{ __html: highlightedLine }} />
    );
  });
}
