import { BookOpen, ArrowRight, Lightbulb, Layers, Zap } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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

interface ExplanationPanelProps {
  explanation: WorkflowExplanation | null;
}

export function ExplanationPanel({ explanation }: ExplanationPanelProps) {
  if (!explanation) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
          <BookOpen className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          No Explanation Yet
        </h3>
        <p className="text-muted-foreground text-sm max-w-xs">
          Generate a workflow to see a detailed explanation of how it works.
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* Overview Section */}
        <Card className="border-langflow-purple/20 bg-langflow-purple/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="w-4 h-4 text-langflow-purple" />
              Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground/80">{explanation.overview}</p>
          </CardContent>
        </Card>

        {/* Components Section */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers className="w-4 h-4 text-langflow-blue" />
              Components ({explanation.components.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {explanation.components.map((comp, index) => (
              <div 
                key={index} 
                className="p-3 rounded-lg bg-secondary/50 border border-border"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm text-foreground">{comp.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {comp.type}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-1">
                  <span className="font-medium">Purpose:</span> {comp.purpose}
                </p>
                {comp.configuration && comp.configuration !== "Default configuration" && (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">Config:</span> {comp.configuration}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Data Flow Section */}
        <Card className="border-langflow-green/20 bg-langflow-green/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ArrowRight className="w-4 h-4 text-langflow-green" />
              Data Flow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground/80 font-mono">{explanation.dataFlow}</p>
          </CardContent>
        </Card>

        {/* Expected Output Section */}
        <Card className="border-langflow-orange/20 bg-langflow-orange/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="w-4 h-4 text-langflow-orange" />
              Expected Output
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground/80">{explanation.expectedOutput}</p>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
