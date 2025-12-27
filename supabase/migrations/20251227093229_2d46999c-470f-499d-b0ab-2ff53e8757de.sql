-- Add langflow_folder_id to profiles table for user workspace isolation
ALTER TABLE public.profiles ADD COLUMN langflow_folder_id text;

-- Add langflow_flow_id to workflows table for tracking the Langflow flow reference
ALTER TABLE public.workflows ADD COLUMN langflow_flow_id text;