import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const BUILDER_URL = 'http://143.110.254.19:7860';

interface LangflowSyncResult {
  name: string;
  description: string;
  data: object;
  updated_at: string;
}

export function useLangflowSync() {
  const { toast } = useToast();

  const provisionFolder = useCallback(async (userId: string, username?: string): Promise<string | null> => {
    try {
      console.log('Provisioning Langflow folder for user:', userId);
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/provision-langflow-folder`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ userId, username }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to provision folder');
      }

      const data = await response.json();
      
      if (data.success && data.folderId) {
        console.log('Langflow folder provisioned:', data.folderId, 'isNew:', data.isNew);
        return data.folderId;
      }
      
      throw new Error('Folder provisioning succeeded but no folder ID returned');
    } catch (error) {
      console.error('Error provisioning Langflow folder:', error);
      return null;
    }
  }, []);

  const importToLangflow = useCallback(async (
    workflowJson: object, 
    folderId?: string | null
  ): Promise<{ flowUrl: string; flowId: string } | null> => {
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
            folderId: folderId || undefined,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to import workflow');
      }

      const data = await response.json();
      
      if (data.success && data.flowUrl && data.flowId) {
        return { flowUrl: data.flowUrl, flowId: data.flowId };
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

  const syncFromLangflow = useCallback(async (flowId: string): Promise<LangflowSyncResult | null> => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-from-langflow`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ flowId }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to sync from Langflow');
      }

      const data = await response.json();
      
      if (data.success && data.workflow) {
        return data.workflow;
      }
      
      throw new Error('Sync succeeded but no workflow data returned');
    } catch (error) {
      console.error('Error syncing from Langflow:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Sync failed',
        description: errorMessage,
        variant: 'destructive',
      });
      return null;
    }
  }, [toast]);

  const getUserFolderId = useCallback(async (userId: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('langflow_folder_id')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching user folder:', error);
        return null;
      }

      return data?.langflow_folder_id || null;
    } catch (error) {
      console.error('Error getting user folder ID:', error);
      return null;
    }
  }, []);

  return {
    provisionFolder,
    importToLangflow,
    syncFromLangflow,
    getUserFolderId,
  };
}
