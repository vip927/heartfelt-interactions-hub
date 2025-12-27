import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LANGFLOW_URL = Deno.env.get('LANGFLOW_URL') || 'http://143.110.254.19:7860';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's token
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user ID from the request
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

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error fetching profile:', profileError);
      throw new Error('Failed to fetch user profile');
    }

    // If user already has a folder, return it
    if (profile?.langflow_folder_id) {
      console.log(`User already has folder: ${profile.langflow_folder_id}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          folderId: profile.langflow_folder_id,
          isNew: false 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a new folder in Langflow
    const folderName = username || `user-${userId.substring(0, 8)}`;
    
    console.log(`Creating new Langflow folder: ${folderName}`);

    const createFolderResponse = await fetch(`${LANGFLOW_URL}/api/v1/folders/`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: folderName,
        description: `Workspace for ${folderName}`,
        components_list: [],
        flows_list: [],
      }),
    });

    if (!createFolderResponse.ok) {
      const errorText = await createFolderResponse.text();
      console.error('Langflow folder creation error:', errorText);
      throw new Error(`Failed to create Langflow folder: ${createFolderResponse.status}`);
    }

    const folderResult = await createFolderResponse.json();
    const folderId = folderResult.id;

    console.log(`Created Langflow folder with ID: ${folderId}`);

    // Save folder ID to user's profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ langflow_folder_id: folderId })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error updating profile with folder ID:', updateError);
      // Don't throw - folder was created successfully
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        folderId: folderId,
        isNew: true 
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
