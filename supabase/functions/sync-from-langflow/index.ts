import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { flowId } = await req.json();

    if (!flowId) {
      return new Response(
        JSON.stringify({ error: 'Missing flowId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching flow from Langflow: ${flowId}`);

    // Fetch the latest flow data from Langflow
    const response = await fetch(`${LANGFLOW_URL}/api/v1/flows/${flowId}`, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Langflow API error:', errorText);
      
      if (response.status === 404) {
        return new Response(
          JSON.stringify({ error: 'Flow not found in Langflow' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: `Langflow API error: ${response.status}`, details: errorText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const flowData = await response.json();
    
    console.log(`Successfully fetched flow: ${flowData.name}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        workflow: {
          name: flowData.name,
          description: flowData.description,
          data: flowData.data,
          updated_at: flowData.updated_at,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error syncing from Langflow:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
