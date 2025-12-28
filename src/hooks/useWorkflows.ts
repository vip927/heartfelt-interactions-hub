import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useLangflowSync } from '@/hooks/useLangflowSync';
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
  langflow_flow_id: string | null;
  created_at: string;
  updated_at: string;
}

export function useWorkflows() {
  const [workflows, setWorkflows] = useState<SavedWorkflow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userFolderId, setUserFolderId] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const { provisionFolder, importToLangflow, syncFromLangflow, getUserFolderId } = useLangflowSync();

  // Provision folder on login/mount (non-blocking - builder works without it)
  useEffect(() => {
    const initializeUserFolder = async () => {
      if (!user) return;
      
      // First check if user already has a folder
      const existingFolderId = await getUserFolderId(user.id);
      if (existingFolderId) {
        setUserFolderId(existingFolderId);
        return;
      }
      
      // Try to provision one, but don't block if it fails
      try {
        const username = user.user_metadata?.username;
        const folderId = await provisionFolder(user.id, username);
        if (folderId) {
          setUserFolderId(folderId);
        }
      } catch (error) {
        // Folder provisioning failed - builder will still work without folder isolation
        console.warn('Folder provisioning failed, continuing without folder isolation:', error);
      }
    };

    initializeUserFolder();
  }, [user, provisionFolder, getUserFolderId]);

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
        langflow_flow_id: item.langflow_flow_id,
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
    explanation?: WorkflowExplanation | null,
    langflowFlowId?: string | null
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
          langflow_flow_id: langflowFlowId || null,
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
        langflow_flow_id: data.langflow_flow_id,
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

  const updateWorkflow = useCallback(async (
    id: string,
    updates: {
      name?: string;
      description?: string;
      workflow_json?: object;
      explanation?: WorkflowExplanation | null;
      langflow_flow_id?: string | null;
    }
  ): Promise<boolean> => {
    try {
      const updateData: Record<string, unknown> = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.workflow_json !== undefined) updateData.workflow_json = updates.workflow_json as unknown as Json;
      if (updates.explanation !== undefined) updateData.explanation = updates.explanation as unknown as Json;
      if (updates.langflow_flow_id !== undefined) updateData.langflow_flow_id = updates.langflow_flow_id;

      const { error } = await supabase
        .from('workflows')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      setWorkflows(prev => prev.map(w => 
        w.id === id 
          ? { ...w, ...updates, updated_at: new Date().toISOString() } 
          : w
      ));

      return true;
    } catch (error) {
      console.error('Error updating workflow:', error);
      toast({
        title: 'Error updating workflow',
        description: 'Failed to update the workflow',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast]);

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

  const importWorkflowToLangflow = useCallback(async (workflowJson: object): Promise<{ flowUrl: string; flowId: string } | null> => {
    return importToLangflow(workflowJson, userFolderId);
  }, [importToLangflow, userFolderId]);

  const syncWorkflowFromLangflow = useCallback(async (workflowId: string, langflowFlowId: string): Promise<boolean> => {
    const syncResult = await syncFromLangflow(langflowFlowId);
    
    if (!syncResult) return false;

    const success = await updateWorkflow(workflowId, {
      name: syncResult.name,
      description: syncResult.description,
      workflow_json: syncResult.data,
    });

    if (success) {
      toast({
        title: 'Workflow synced!',
        description: 'Latest changes from the builder have been saved',
      });
    }

    return success;
  }, [syncFromLangflow, updateWorkflow, toast]);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  return {
    workflows,
    isLoading,
    userFolderId,
    saveWorkflow,
    updateWorkflow,
    deleteWorkflow,
    importToLangflow: importWorkflowToLangflow,
    syncFromLangflow: syncWorkflowFromLangflow,
    refreshWorkflows: fetchWorkflows,
  };
}
