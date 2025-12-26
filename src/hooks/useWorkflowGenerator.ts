import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

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

interface WorkflowState {
  workflow: object | null;
  rawContent: string;
  isValid: boolean;
  explanation: WorkflowExplanation | null;
}

export function useWorkflowGenerator() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [workflowState, setWorkflowState] = useState<WorkflowState>({
    workflow: null,
    rawContent: '',
    isValid: false,
    explanation: null,
  });
  const { toast } = useToast();

  const sendMessage = useCallback(async (content: string) => {
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-workflow`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: [...messages, userMessage].map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
      }

      const data = await response.json();
      
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.isValid 
          ? "I've generated a Langflow workflow based on your description. You can see the JSON in the output panel on the right. Copy it and import it directly into Langflow!"
          : "I've generated a response, but please review the JSON format. You may need to make some adjustments before importing to Langflow.",
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setWorkflowState({
        workflow: data.workflow,
        rawContent: data.content,
        isValid: data.isValid,
        explanation: data.explanation || null,
      });

      if (data.isValid) {
        toast({
          title: "Workflow Generated!",
          description: "Your Langflow JSON is ready to use.",
        });
      }
    } catch (error) {
      console.error('Error generating workflow:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      toast({
        title: "Generation Failed",
        description: errorMessage,
        variant: "destructive",
      });

      const errorAssistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${errorMessage}. Please try again.`,
      };
      setMessages((prev) => [...prev, errorAssistantMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, toast]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setWorkflowState({
      workflow: null,
      rawContent: '',
      isValid: false,
      explanation: null,
    });
  }, []);

  return {
    messages,
    isLoading,
    workflowState,
    sendMessage,
    clearChat,
  };
}
