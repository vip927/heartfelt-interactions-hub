import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import type { Json } from '@/integrations/supabase/types';

const BUILDER_URL = 'http://143.110.254.19:7860';

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

export interface SavedWorkflow {
  id: string;
  name: string;
  description: string | null;
  workflow_json: object;
  explanation: WorkflowExplanation | null;
  created_at: string;
  updated_at: string;
}

export function useWorkflows() {
  const [workflows, setWorkflows] = useState<SavedWorkflow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchWorkflows = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('workflows')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const mappedData: SavedWorkflow[] = (data || []).map(item => ({
        id: item.id,
        name: item.name,
        description: item.description,
        workflow_json: item.workflow_json as unknown as object,
        explanation: item.explanation as unknown as WorkflowExplanation | null,
        created_at: item.created_at,
        updated_at: item.updated_at,
      }));
      
      setWorkflows(mappedData);
    } catch (error) {
      console.error('Error fetching workflows:', error);
      toast({
        title: 'Error loading workflows',
        description: 'Failed to load your saved workflows',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  const saveWorkflow = useCallback(async (
    name: string,
    description: string,
    workflowJson: object,
    explanation?: WorkflowExplanation | null
  ): Promise<SavedWorkflow | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('workflows')
        .insert({
          user_id: user.id,
          name,
          description,
          workflow_json: workflowJson as unknown as Json,
          explanation: explanation as unknown as Json,
        })
        .select()
        .single();

      if (error) throw error;

      const savedWorkflow: SavedWorkflow = {
        id: data.id,
        name: data.name,
        description: data.description,
        workflow_json: data.workflow_json as unknown as object,
        explanation: data.explanation as unknown as WorkflowExplanation | null,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
      
      setWorkflows(prev => [savedWorkflow, ...prev]);
      
      toast({
        title: 'Workflow saved!',
        description: `"${name}" has been saved to your workflows`,
      });

      return savedWorkflow;
    } catch (error) {
      console.error('Error saving workflow:', error);
      toast({
        title: 'Error saving workflow',
        description: 'Failed to save your workflow',
        variant: 'destructive',
      });
      return null;
    }
  }, [user, toast]);

  const deleteWorkflow = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('workflows')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setWorkflows(prev => prev.filter(w => w.id !== id));
      
      toast({
        title: 'Workflow deleted',
        description: 'The workflow has been removed',
      });
    } catch (error) {
      console.error('Error deleting workflow:', error);
      toast({
        title: 'Error deleting workflow',
        description: 'Failed to delete the workflow',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const importToLangflow = useCallback(async (workflowJson: object): Promise<string | null> => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-to-langflow`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            workflow: workflowJson,
            langflowUrl: BUILDER_URL,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to import workflow');
      }

      const data = await response.json();
      
      if (data.success && data.flowUrl) {
        return data.flowUrl;
      }
      
      throw new Error('Import succeeded but no flow URL returned');
    } catch (error) {
      console.error('Error importing workflow:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Import failed',
        description: errorMessage,
        variant: 'destructive',
      });
      return null;
    }
  }, [toast]);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  return {
    workflows,
    isLoading,
    saveWorkflow,
    deleteWorkflow,
    importToLangflow,
    refreshWorkflows: fetchWorkflows,
  };
}
