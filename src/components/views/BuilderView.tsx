import { EmbeddedBuilder } from '@/components/builder/EmbeddedBuilder';
import { SavedWorkflow } from '@/hooks/useWorkflows';

interface BuilderViewProps {
  userFolderId: string | null;
  workflow?: SavedWorkflow | null;
  flowUrl?: string | null;
  onClose: () => void;
  onSync?: (workflowId: string, langflowFlowId: string) => Promise<boolean>;
}

export function BuilderView({ 
  userFolderId, 
  workflow, 
  flowUrl,
  onClose, 
  onSync 
}: BuilderViewProps) {
  const handleSync = async () => {
    if (workflow && workflow.langflow_flow_id && onSync) {
      await onSync(workflow.id, workflow.langflow_flow_id);
    }
  };

  return (
    <div className="h-full">
      <EmbeddedBuilder
        folderId={userFolderId}
        flowId={workflow?.langflow_flow_id}
        flowUrl={flowUrl}
        onClose={onClose}
        onSync={workflow?.langflow_flow_id ? handleSync : undefined}
      />
    </div>
  );
}
