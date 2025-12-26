import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { workflow, langflowUrl } = await req.json();

    if (!workflow || !langflowUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing workflow or langflowUrl' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract workflow data - the flow data is typically in the workflow JSON
    const flowData = {
      name: workflow.name || 'Imported Workflow',
      description: workflow.description || 'Imported from Langflow Generator',
      data: workflow.data || workflow,
      is_component: false,
      webhook: false,
    };

    // Call Langflow API to create the flow
    const response = await fetch(`${langflowUrl}/api/v1/flows/`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(flowData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Langflow API error:', errorText);
      return new Response(
        JSON.stringify({ error: `Langflow API error: ${response.status}`, details: errorText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await response.json();
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        flowId: result.id,
        flowUrl: `${langflowUrl}/flow/${result.id}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error importing to Langflow:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
