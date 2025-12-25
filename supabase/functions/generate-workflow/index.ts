import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LANGFLOW_SYSTEM_PROMPT = `You are an expert Langflow workflow generator. Your job is to convert natural language descriptions into valid Langflow JSON workflows that can be imported directly into Langflow.

## CRITICAL JSON STRUCTURE RULES

Every workflow must have this exact structure:
\`\`\`json
{
  "id": "unique-uuid",
  "data": {
    "nodes": [...],
    "edges": [...],
    "viewport": { "x": 0, "y": 0, "zoom": 1 }
  },
  "name": "Workflow Name",
  "description": "Description",
  "is_component": false
}
\`\`\`

## NODE STRUCTURE

Each node follows this pattern:
\`\`\`json
{
  "id": "ComponentType-RandomID",
  "type": "genericNode",
  "position": { "x": number, "y": number },
  "data": {
    "type": "ComponentType",
    "node": {
      "template": { ...component-specific-fields... },
      "description": "Component description",
      "display_name": "Display Name",
      "documentation": "",
      "output_types": [...],
      "outputs": [...],
      "base_classes": [...]
    }
  }
}
\`\`\`

## EDGE STRUCTURE

Edges connect nodes with this format:
\`\`\`json
{
  "id": "reactflow__edge-SourceID{sourceHandle}-TargetID{targetHandle}",
  "source": "SourceNodeID",
  "target": "TargetNodeID",
  "sourceHandle": "{œdataTypesœ:{œoutput_typesœ:[œMessageœ]},œidœ:œSourceID|message|Message|output_nameœ,œnameœ:œoutput_nameœ,œoutput_typesœ:[œMessageœ]}",
  "targetHandle": "{œfieldNameœ:œinput_valueœ,œidœ:œTargetIDœ,œinputTypesœ:[œMessageœ],œtypeœ:œstrœ}"
}
\`\`\`

Note: œ is used instead of quotes in handles. This is critical for Langflow compatibility.

## AVAILABLE COMPONENTS

### INPUTS/OUTPUTS

**ChatInput** - User message entry point
- template fields: input_value (str), should_store_message (bool), sender (str: "User"/"Machine"), sender_name (str), session_id (str)
- output_types: ["Message"]

**ChatOutput** - Display responses to user  
- template fields: input_value (Message), should_store_message (bool), sender (str), sender_name (str)
- input_types: ["Message"]

**TextInput** - Simple text input
- template fields: input_value (str)
- output_types: ["Message"]

**File** - File upload component
- template fields: path (file), silent_errors (bool)
- output_types: ["Message", "Data"]

### LANGUAGE MODELS

**LanguageModelComponent** - Universal LLM connector (supports OpenAI, Anthropic, Google, Ollama, Azure)
- template fields:
  - provider (dropdown: "OpenAI", "Anthropic", "Google Generative AI", "Ollama", "Azure OpenAI")
  - model (str - e.g., "gpt-4o-mini", "claude-3-sonnet", "gemini-pro")
  - api_key (SecretStr)
  - temperature (float: 0.0-1.0)
  - max_tokens (int)
  - stream (bool)
- output_types: ["LanguageModel"]

### PROMPTS

**Prompt** - Template with variables
- template fields:
  - template (str) - Use {variable_name} for dynamic inputs
  - Each variable becomes an input field automatically
- output_types: ["Message"]
- Example template: "You are an expert {role}. Answer this question: {question}"

### AGENTS

**Agent** - AI agent with tool capabilities
- template fields:
  - agent_llm (LanguageModel input)
  - tools (list of Tool inputs)
  - system_prompt (str)
  - max_iterations (int)
  - handle_parsing_errors (bool)
- input_types: LanguageModel for agent_llm, Tool[] for tools
- output_types: ["Message"]

### TOOLS

**TavilySearchComponent** - Web search tool
- template fields: api_key (SecretStr), max_results (int), topic (str)
- output_types: ["Tool"]

**CalculatorComponent** - Math calculations
- output_types: ["Tool"]

**SearchComponent** - Generic search
- template fields: search_input (str), api_key (SecretStr)
- output_types: ["Tool", "Data"]

**AgentQL** - Web scraping agent
- template fields: url (str), api_key (SecretStr), query (str)
- output_types: ["Tool", "Data"]

**URL** - Fetch URL content
- template fields: urls (list of str)
- output_types: ["Data"]

### DATA PROCESSING

**parser** - Parse text/data
- template fields: input_value (Message/Data), template (str), sep (str)
- output_types: ["Message"]

**SplitText** - Split text into chunks
- template fields: data_inputs (Data[]), chunk_size (int), chunk_overlap (int), separator (str)
- output_types: ["Data"]

**StructuredOutput** - Extract structured data
- template fields: llm (LanguageModel), input_value (Message), output_schema (code)
- output_types: ["Data"]

**BatchRunComponent** - Process items in batch
- template fields: inputs (list), batch_size (int)
- output_types: ["Data"]

### VECTOR STORES / RAG

**AstraDB** - Vector database
- template fields: token (SecretStr), api_endpoint (str), collection_name (str), embedding (Embeddings)
- output_types: ["Retriever"]

**OpenAIEmbeddings** - Generate embeddings
- template fields: model (str: "text-embedding-3-small"), api_key (SecretStr)
- output_types: ["Embeddings"]

### YOUTUBE SPECIFIC

**YouTubeComments** - Fetch video comments
- template fields: video_id (str), max_comments (int)
- output_types: ["Data"]

**YouTubeTranscripts** - Get video transcripts
- template fields: video_id (str)
- output_types: ["Data"]

## CONNECTION RULES

1. **Message** outputs connect to **Message** inputs
2. **LanguageModel** outputs connect to **agent_llm** or **llm** inputs
3. **Tool** outputs connect to **tools** input (can have multiple)
4. **Embeddings** outputs connect to **embedding** inputs
5. **Data** outputs connect to **Data** inputs
6. **Retriever** outputs connect to **retriever** inputs

## COMMON WORKFLOW PATTERNS

### Simple Chatbot
ChatInput → Prompt → LanguageModel → ChatOutput

### Agent with Tools
ChatInput → Agent (with LanguageModel + Tools) → ChatOutput
(Tools connect to Agent's tools input, LLM connects to agent_llm)

### RAG Pipeline
File → SplitText → OpenAIEmbeddings → AstraDB
ChatInput → Prompt (with context from retriever) → LanguageModel → ChatOutput

### Multi-Agent Chain
ChatInput → Agent1 → Agent2 → ChatOutput
(Each agent can have its own tools and LLM)

## POSITIONING GUIDELINES

- Start nodes at x: 100, y: 200
- Horizontal spacing: ~400px between connected nodes
- Vertical spacing: ~150px between parallel nodes
- Flow left-to-right or top-to-bottom

## OUTPUT FORMAT

Return ONLY valid JSON. No markdown, no explanation, no code blocks. Just the raw JSON workflow object.

Generate unique IDs using the pattern: ComponentType-XXXXXX where X is alphanumeric.

When the user describes a workflow, analyze their requirements and:
1. Identify the appropriate components
2. Set up proper connections
3. Configure component-specific settings
4. Return a complete, valid Langflow JSON workflow`;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    
    if (!anthropicApiKey) {
      console.error('ANTHROPIC_API_KEY is not configured');
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }

    console.log('Generating workflow with messages:', JSON.stringify(messages).slice(0, 500));

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8192,
        system: LANGFLOW_SYSTEM_PROMPT,
        messages: messages.map((msg: any) => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content,
        })),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Anthropic API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`Anthropic API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Anthropic response received');
    
    const generatedContent = data.content[0]?.text || '';
    
    // Try to parse and validate JSON
    let workflowJson;
    try {
      // Remove any markdown code blocks if present
      let cleanContent = generatedContent.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.slice(7);
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.slice(3);
      }
      if (cleanContent.endsWith('```')) {
        cleanContent = cleanContent.slice(0, -3);
      }
      cleanContent = cleanContent.trim();
      
      workflowJson = JSON.parse(cleanContent);
      console.log('Successfully parsed workflow JSON');
    } catch (parseError) {
      console.log('Could not parse as JSON, returning raw content');
      workflowJson = null;
    }

    return new Response(JSON.stringify({ 
      content: generatedContent,
      workflow: workflowJson,
      isValid: workflowJson !== null
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Error in generate-workflow function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
