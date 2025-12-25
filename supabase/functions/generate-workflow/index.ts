import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to generate random 5-character ID
function generateId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// Create edge with proper Langflow format
function createEdge(
  sourceNodeId: string,
  sourceType: string,
  sourceOutputName: string,
  sourceOutputTypes: string[],
  targetNodeId: string,
  targetFieldName: string,
  targetInputTypes: string[],
  targetType: string = "str"
) {
  const sourceHandle = {
    dataType: sourceType,
    id: sourceNodeId,
    name: sourceOutputName,
    output_types: sourceOutputTypes
  };
  
  const targetHandle = {
    fieldName: targetFieldName,
    id: targetNodeId,
    inputTypes: targetInputTypes,
    type: targetType
  };
  
  // Encode handles with œ instead of quotes for Langflow compatibility
  const encodeHandle = (obj: object) => JSON.stringify(obj).replace(/"/g, 'œ');
  
  return {
    animated: false,
    className: "",
    data: { sourceHandle, targetHandle },
    id: `reactflow__edge-${sourceNodeId}${encodeHandle(sourceHandle)}-${targetNodeId}${encodeHandle(targetHandle)}`,
    selected: false,
    source: sourceNodeId,
    sourceHandle: encodeHandle(sourceHandle),
    target: targetNodeId,
    targetHandle: encodeHandle(targetHandle)
  };
}

// Simplified system prompt focused on workflow planning
const LANGFLOW_SYSTEM_PROMPT = `You are a Langflow workflow planner. Given a user's description, you will output a JSON plan for a workflow.

IMPORTANT: Output ONLY valid JSON with this exact structure:
{
  "name": "Workflow Name",
  "description": "Brief description",
  "components": [
    {
      "type": "ChatInput" | "ChatOutput" | "Agent" | "Prompt" | "LanguageModel" | "SearchAPI" | "Calculator" | "URL" | "TavilySearch" | "TextInput",
      "id_suffix": "unique_5char",
      "config": {
        // Component-specific configuration
      }
    }
  ],
  "connections": [
    {
      "from": "ComponentType-suffix",
      "from_output": "output_name",
      "to": "ComponentType-suffix",
      "to_input": "input_field_name"
    }
  ]
}

## Available Components

### ChatInput
- Output: "message" → ["Message"]
- Config: { "input_value": "default text" }

### ChatOutput  
- Input: "input_value" ← ["Data", "DataFrame", "Message"]
- Output: "message" → ["Message"]

### Agent
- Inputs: 
  - "input_value" ← ["Message"]
  - "tools" ← ["Tool"] (can have multiple tool connections)
- Output: "response" → ["Message"]
- Config: { "system_prompt": "Agent instructions", "model_name": "gpt-4o-mini" }

### Prompt
- Output: "prompt" → ["Message"]
- Config: { "template": "Template text with {variables}", "variables": {"var1": "value1"} }

### LanguageModel (LanguageModelComponent)
- Inputs:
  - "input_value" ← ["Message"]  
  - "system_message" ← ["Message"]
- Output: "text_output" → ["Message"]
- Config: { "provider": "OpenAI", "model_name": "gpt-4o-mini" }

### SearchAPI (SearchComponent)
- Output: "component_as_tool" → ["Tool"]
- Config: { "engine": "google" | "bing" | "duckduckgo" }

### Calculator (CalculatorComponent)
- Output: "component_as_tool" → ["Tool"]

### URL
- Output: "component_as_tool" → ["Tool"]
- Config: { "urls": ["https://example.com"] }

### TavilySearch (TavilySearchComponent)
- Output: "component_as_tool" → ["Tool"]
- Config: { "max_results": 5 }

## Connection Rules

1. ChatInput.message → Agent.input_value OR Prompt variables OR LanguageModel.input_value
2. Agent.response → ChatOutput.input_value OR another Agent.input_value  
3. Tool components (SearchAPI, Calculator, URL, TavilySearch) → Agent.tools
4. Prompt.prompt → LanguageModel.input_value OR LanguageModel.system_message
5. LanguageModel.text_output → ChatOutput.input_value

## Common Workflow Patterns

### Simple Chatbot (3 components)
ChatInput → LanguageModel → ChatOutput

### Agent with Search (4 components)
ChatInput → Agent ← SearchAPI
Agent → ChatOutput

### Multi-Agent Chain
ChatInput → Agent1 → Agent2 → Agent3 → ChatOutput
(each agent can have tools connected)

### Prompt-based Generation
ChatInput → Prompt → LanguageModel → ChatOutput

## Example Output

For "Build a chatbot that searches the web":
{
  "name": "Web Search Chatbot",
  "description": "A chatbot that searches the web and provides answers",
  "components": [
    { "type": "ChatInput", "id_suffix": "abc12", "config": {} },
    { "type": "SearchAPI", "id_suffix": "def34", "config": { "engine": "google" } },
    { "type": "Agent", "id_suffix": "ghi56", "config": { "system_prompt": "You are a helpful assistant that searches the web to answer questions.", "model_name": "gpt-4o-mini" } },
    { "type": "ChatOutput", "id_suffix": "jkl78", "config": {} }
  ],
  "connections": [
    { "from": "ChatInput-abc12", "from_output": "message", "to": "Agent-ghi56", "to_input": "input_value" },
    { "from": "SearchAPI-def34", "from_output": "component_as_tool", "to": "Agent-ghi56", "to_input": "tools" },
    { "from": "Agent-ghi56", "from_output": "response", "to": "ChatOutput-jkl78", "to_input": "input_value" }
  ]
}

RESPOND WITH ONLY VALID JSON. NO EXPLANATIONS.`;

// Component templates (simplified but valid structures)
const COMPONENT_TEMPLATES: Record<string, any> = {
  ChatInput: {
    base_classes: ["Message"],
    description: "Get chat inputs from the Playground.",
    display_name: "Chat Input",
    icon: "MessagesSquare",
    lf_version: "1.2.0",
    outputs: [{
      cache: true,
      display_name: "Chat Message",
      method: "message_response",
      name: "message",
      selected: "Message",
      types: ["Message"],
      value: "__UNDEFINED__"
    }],
    template: {
      _type: "Component",
      input_value: {
        _input_type: "MultilineInput",
        display_name: "Input Text",
        type: "str",
        value: ""
      },
      sender: {
        _input_type: "DropdownInput",
        display_name: "Sender Type",
        options: ["Machine", "User"],
        type: "str",
        value: "User"
      },
      sender_name: {
        _input_type: "MessageTextInput",
        display_name: "Sender Name",
        type: "str",
        value: "User"
      }
    }
  },
  
  ChatOutput: {
    base_classes: ["Message"],
    description: "Display a chat message in the Playground.",
    display_name: "Chat Output",
    icon: "MessagesSquare",
    lf_version: "1.2.0",
    outputs: [{
      cache: true,
      display_name: "Output Message",
      method: "message_response",
      name: "message",
      selected: "Message",
      types: ["Message"],
      value: "__UNDEFINED__"
    }],
    template: {
      _type: "Component",
      input_value: {
        _input_type: "MessageInput",
        display_name: "Inputs",
        input_types: ["Data", "DataFrame", "Message"],
        required: true,
        type: "str",
        value: ""
      },
      sender: {
        _input_type: "DropdownInput",
        display_name: "Sender Type",
        options: ["Machine", "User"],
        type: "str",
        value: "Machine"
      },
      sender_name: {
        _input_type: "MessageTextInput",
        display_name: "Sender Name",
        type: "str",
        value: "AI"
      }
    }
  },
  
  Agent: {
    base_classes: ["Message"],
    description: "Define an AI agent with tools and instructions.",
    display_name: "Agent",
    icon: "bot",
    lf_version: "1.2.0",
    outputs: [{
      cache: true,
      display_name: "Response",
      method: "run_agent",
      name: "response",
      selected: "Message",
      types: ["Message"],
      value: "__UNDEFINED__"
    }],
    template: {
      _type: "Component",
      input_value: {
        _input_type: "MessageInput",
        display_name: "Input",
        input_types: ["Message"],
        type: "str",
        value: ""
      },
      system_prompt: {
        _input_type: "MultilineInput",
        display_name: "Agent Instructions",
        type: "str",
        value: "You are a helpful assistant."
      },
      tools: {
        _input_type: "HandleInput",
        display_name: "Tools",
        input_types: ["Tool"],
        is_list: true,
        type: "other",
        value: []
      },
      model_name: {
        _input_type: "DropdownInput",
        display_name: "Model Name",
        options: ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo"],
        type: "str",
        value: "gpt-4o-mini"
      },
      api_key: {
        _input_type: "SecretStrInput",
        display_name: "OpenAI API Key",
        password: true,
        type: "str",
        value: ""
      }
    }
  },
  
  SearchComponent: {
    base_classes: ["Data", "DataFrame", "Message"],
    description: "Call the SearchApi API with result limiting",
    display_name: "Search API",
    icon: "SearchAPI",
    lf_version: "1.2.0",
    outputs: [{
      cache: true,
      display_name: "Toolset",
      method: "to_toolkit",
      name: "component_as_tool",
      selected: "Tool",
      tool_mode: true,
      types: ["Tool"],
      value: "__UNDEFINED__"
    }],
    template: {
      _type: "Component",
      engine: {
        _input_type: "DropdownInput",
        display_name: "Engine",
        options: ["google", "bing", "duckduckgo"],
        type: "str",
        value: "google"
      },
      api_key: {
        _input_type: "SecretStrInput",
        display_name: "SearchAPI API Key",
        password: true,
        required: true,
        type: "str",
        value: ""
      },
      input_value: {
        _input_type: "MultilineInput",
        display_name: "Input",
        tool_mode: true,
        type: "str",
        value: ""
      },
      max_results: {
        _input_type: "IntInput",
        display_name: "Max Results",
        type: "int",
        value: 5
      }
    }
  },
  
  CalculatorComponent: {
    base_classes: ["Data"],
    description: "Perform basic arithmetic operations on a given expression.",
    display_name: "Calculator",
    icon: "calculator",
    lf_version: "1.2.0",
    outputs: [{
      cache: true,
      display_name: "Toolset",
      method: "to_toolkit",
      name: "component_as_tool",
      selected: "Tool",
      tool_mode: true,
      types: ["Tool"],
      value: "__UNDEFINED__"
    }],
    template: {
      _type: "Component",
      expression: {
        _input_type: "MessageTextInput",
        display_name: "Expression",
        tool_mode: true,
        type: "str",
        value: ""
      }
    }
  },
  
  URL: {
    base_classes: ["Data", "DataFrame", "Message"],
    description: "Load and retrieve data from specified URLs.",
    display_name: "URL",
    icon: "layout-template",
    lf_version: "1.2.0",
    outputs: [{
      cache: true,
      display_name: "Toolset",
      method: "to_toolkit",
      name: "component_as_tool",
      selected: "Tool",
      tool_mode: true,
      types: ["Tool"],
      value: "__UNDEFINED__"
    }],
    template: {
      _type: "Component",
      urls: {
        _input_type: "MessageTextInput",
        display_name: "URLs",
        is_list: true,
        tool_mode: true,
        type: "str",
        value: ""
      }
    }
  },
  
  LanguageModelComponent: {
    base_classes: ["LanguageModel", "Message"],
    description: "Creates a language model from one of the available providers.",
    display_name: "Language Model",
    icon: "brain",
    lf_version: "1.2.0",
    outputs: [{
      cache: true,
      display_name: "Text",
      method: "text_response",
      name: "text_output",
      selected: "Message",
      types: ["Message"],
      value: "__UNDEFINED__"
    }, {
      cache: true,
      display_name: "Language Model",
      method: "build_model",
      name: "model_output",
      selected: "LanguageModel",
      types: ["LanguageModel"],
      value: "__UNDEFINED__"
    }],
    template: {
      _type: "Component",
      provider: {
        _input_type: "DropdownInput",
        display_name: "Provider",
        options: ["OpenAI", "Anthropic", "Google Generative AI"],
        type: "str",
        value: "OpenAI"
      },
      model_name: {
        _input_type: "DropdownInput",
        display_name: "Model Name",
        type: "str",
        value: "gpt-4o-mini"
      },
      api_key: {
        _input_type: "SecretStrInput",
        display_name: "API Key",
        password: true,
        type: "str",
        value: ""
      },
      input_value: {
        _input_type: "MessageInput",
        display_name: "Input",
        input_types: ["Message"],
        type: "str",
        value: ""
      },
      system_message: {
        _input_type: "MessageInput",
        display_name: "System Message",
        input_types: ["Message"],
        type: "str",
        value: ""
      },
      temperature: {
        _input_type: "FloatInput",
        display_name: "Temperature",
        type: "float",
        value: 0.1
      }
    }
  },
  
  Prompt: {
    base_classes: ["Message"],
    description: "Create a prompt template with dynamic variables.",
    display_name: "Prompt",
    icon: "braces",
    lf_version: "1.4.2",
    outputs: [{
      cache: true,
      display_name: "Prompt",
      method: "build_prompt",
      name: "prompt",
      selected: "Message",
      types: ["Message"],
      value: "__UNDEFINED__"
    }],
    template: {
      _type: "Component",
      template: {
        _input_type: "PromptInput",
        display_name: "Template",
        type: "prompt",
        value: ""
      }
    }
  },
  
  TavilySearchComponent: {
    base_classes: ["Data"],
    description: "Search the web using Tavily AI search engine.",
    display_name: "Tavily Search",
    icon: "TavilyIcon",
    lf_version: "1.2.0",
    outputs: [{
      cache: true,
      display_name: "Toolset",
      method: "to_toolkit",
      name: "component_as_tool",
      selected: "Tool",
      tool_mode: true,
      types: ["Tool"],
      value: "__UNDEFINED__"
    }],
    template: {
      _type: "Component",
      api_key: {
        _input_type: "SecretStrInput",
        display_name: "Tavily API Key",
        password: true,
        required: true,
        type: "str",
        value: ""
      },
      query: {
        _input_type: "MessageTextInput",
        display_name: "Search Query",
        tool_mode: true,
        type: "str",
        value: ""
      },
      max_results: {
        _input_type: "IntInput",
        display_name: "Max Results",
        type: "int",
        value: 5
      }
    }
  }
};

// Type mapping for component types
const TYPE_MAP: Record<string, string> = {
  "ChatInput": "ChatInput",
  "ChatOutput": "ChatOutput",
  "Agent": "Agent",
  "SearchAPI": "SearchComponent",
  "Calculator": "CalculatorComponent",
  "URL": "URL",
  "LanguageModel": "LanguageModelComponent",
  "Prompt": "Prompt",
  "TavilySearch": "TavilySearchComponent"
};

// Output info for creating edges
const OUTPUT_INFO: Record<string, { name: string; types: string[] }> = {
  "ChatInput": { name: "message", types: ["Message"] },
  "ChatOutput": { name: "message", types: ["Message"] },
  "Agent": { name: "response", types: ["Message"] },
  "SearchComponent": { name: "component_as_tool", types: ["Tool"] },
  "CalculatorComponent": { name: "component_as_tool", types: ["Tool"] },
  "URL": { name: "component_as_tool", types: ["Tool"] },
  "LanguageModelComponent": { name: "text_output", types: ["Message"] },
  "Prompt": { name: "prompt", types: ["Message"] },
  "TavilySearchComponent": { name: "component_as_tool", types: ["Tool"] }
};

// Input info for creating edges
const INPUT_INFO: Record<string, Record<string, { types: string[]; fieldType: string }>> = {
  "ChatOutput": {
    "input_value": { types: ["Data", "DataFrame", "Message"], fieldType: "str" }
  },
  "Agent": {
    "input_value": { types: ["Message"], fieldType: "str" },
    "tools": { types: ["Tool"], fieldType: "other" }
  },
  "LanguageModelComponent": {
    "input_value": { types: ["Message"], fieldType: "str" },
    "system_message": { types: ["Message"], fieldType: "str" }
  }
};

function buildWorkflowJson(plan: any) {
  const nodes: any[] = [];
  const edges: any[] = [];
  
  let xPos = 200;
  const yBase = 300;
  const xSpacing = 450;
  
  // Create nodes
  for (let i = 0; i < plan.components.length; i++) {
    const comp = plan.components[i];
    const templateType = TYPE_MAP[comp.type] || comp.type;
    const template = COMPONENT_TEMPLATES[templateType];
    
    if (!template) {
      console.log(`Unknown component type: ${comp.type}`);
      continue;
    }
    
    const nodeId = `${templateType}-${comp.id_suffix}`;
    
    // Deep clone template and apply config
    const nodeTemplate = JSON.parse(JSON.stringify(template.template));
    if (comp.config) {
      for (const [key, value] of Object.entries(comp.config)) {
        if (nodeTemplate[key]) {
          nodeTemplate[key].value = value;
        }
      }
    }
    
    const node = {
      data: {
        description: template.description,
        display_name: template.display_name,
        id: nodeId,
        node: {
          base_classes: template.base_classes,
          beta: false,
          conditional_paths: [],
          custom_fields: {},
          description: template.description,
          display_name: template.display_name,
          documentation: "",
          edited: false,
          frozen: false,
          icon: template.icon,
          legacy: false,
          lf_version: template.lf_version,
          metadata: {},
          output_types: [],
          outputs: template.outputs,
          pinned: false,
          template: nodeTemplate
        },
        type: templateType
      },
      dragging: false,
      height: 300,
      id: nodeId,
      measured: { height: 300, width: 320 },
      position: { x: xPos, y: yBase + (i % 3) * 150 },
      selected: false,
      type: "genericNode",
      width: 320
    };
    
    nodes.push(node);
    xPos += xSpacing;
  }
  
  // Create edges
  for (const conn of plan.connections) {
    const sourceId = conn.from;
    const targetId = conn.to;
    const sourceType = sourceId.split('-')[0];
    const targetType = targetId.split('-')[0];
    
    const sourceOutput = OUTPUT_INFO[sourceType];
    const targetInput = INPUT_INFO[targetType]?.[conn.to_input];
    
    if (sourceOutput && targetInput) {
      edges.push(createEdge(
        sourceId,
        sourceType,
        conn.from_output || sourceOutput.name,
        sourceOutput.types,
        targetId,
        conn.to_input,
        targetInput.types,
        targetInput.fieldType
      ));
    }
  }
  
  return {
    id: crypto.randomUUID(),
    data: {
      edges,
      nodes,
      viewport: { x: 0, y: 0, zoom: 0.8 }
    },
    name: plan.name || "Generated Workflow",
    description: plan.description || "",
    is_component: false
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    
    if (!anthropicApiKey) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }

    console.log('Generating workflow plan...');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
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
      
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedContent = data.content[0]?.text || '';
    
    console.log('Claude response:', generatedContent.slice(0, 500));
    
    // Parse the plan
    let plan;
    let workflow = null;
    let isValid = false;
    
    try {
      let cleanContent = generatedContent.trim();
      if (cleanContent.startsWith('```json')) cleanContent = cleanContent.slice(7);
      else if (cleanContent.startsWith('```')) cleanContent = cleanContent.slice(3);
      if (cleanContent.endsWith('```')) cleanContent = cleanContent.slice(0, -3);
      cleanContent = cleanContent.trim();
      
      plan = JSON.parse(cleanContent);
      console.log('Parsed plan:', JSON.stringify(plan).slice(0, 500));
      
      // Build the actual workflow JSON
      workflow = buildWorkflowJson(plan);
      isValid = true;
      console.log('Successfully built workflow with', workflow.data.nodes.length, 'nodes and', workflow.data.edges.length, 'edges');
    } catch (e) {
      console.error('Failed to parse/build workflow:', e);
    }

    return new Response(JSON.stringify({ 
      content: generatedContent,
      workflow,
      isValid
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
