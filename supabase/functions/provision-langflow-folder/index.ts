import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LANGFLOW_URL = Deno.env.get('LANGFLOW_URL') || 'http://143.110.254.19:7860';
const LANGFLOW_API_KEY = Deno.env.get('LANGFLOW_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Edge Functions are usually protected by JWT verification, but we also keep a basic header check here
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, username } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Missing userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Provisioning Langflow folder for user: ${userId}`);

    // Check if user already has a folder ID in their profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('langflow_folder_id')
      .eq('user_id', userId)
      .single();

    // PGRST116 = no rows
    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error fetching profile:', profileError);
      throw new Error('Failed to fetch user profile');
    }

    if (profile?.langflow_folder_id) {
      console.log(`User already has folder: ${profile.langflow_folder_id}`);
      return new Response(
        JSON.stringify({
          success: true,
          folderId: profile.langflow_folder_id,
          isNew: false,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const folderName = username || `user-${userId.substring(0, 8)}`;
    console.log(`Creating new Langflow folder: ${folderName}`);

    const headers: Record<string, string> = {
      accept: 'application/json',
      'Content-Type': 'application/json',
    };
    if (LANGFLOW_API_KEY) {
      headers['x-api-key'] = LANGFLOW_API_KEY;
    }

    // Some Langflow deployments accept POST on /api/v1/folders (no trailing slash) but reject /api/v1/folders/
    const endpointsToTry = [`${LANGFLOW_URL}/api/v1/folders/`, `${LANGFLOW_URL}/api/v1/folders`];

    let createFolderResponse: Response | null = null;
    let lastErrorText: string | null = null;

    for (const endpoint of endpointsToTry) {
      console.log(`Attempting folder create via: ${endpoint}`);

      const resp = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: folderName,
          description: `Workspace for ${folderName}`,
          components_list: [],
          flows_list: [],
        }),
      });

      if (resp.ok) {
        createFolderResponse = resp;
        break;
      }

      lastErrorText = await resp.text().catch(() => null);
      console.error(`Langflow folder creation failed (${resp.status}) at ${endpoint}:`, lastErrorText);

      // If it's anything other than method mismatch, don't keep retrying endpoints
      if (resp.status !== 405) {
        createFolderResponse = resp;
        break;
      }
    }

    if (!createFolderResponse) {
      throw new Error('Failed to reach Langflow folder endpoint');
    }

    if (!createFolderResponse.ok) {
      throw new Error(`Failed to create Langflow folder: ${createFolderResponse.status}`);
    }

    const folderResult = await createFolderResponse.json();
    const folderId = folderResult.id;

    console.log(`Created Langflow folder with ID: ${folderId}`);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ langflow_folder_id: folderId })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error updating profile with folder ID:', updateError);
      // Folder was created successfully, so we don't fail the whole request.
    }

    return new Response(
      JSON.stringify({
        success: true,
        folderId,
        isNew: true,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error provisioning Langflow folder:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
