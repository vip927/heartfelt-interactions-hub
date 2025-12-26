import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import type { Json } from '@/integrations/supabase/types';

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

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  return {
    workflows,
    isLoading,
    saveWorkflow,
    deleteWorkflow,
    refreshWorkflows: fetchWorkflows,
  };
}
