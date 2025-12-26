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

// Cache for Langflow components (refreshed per request if API available)
interface LangflowComponentsCache {
  components: Record<string, Record<string, any>>;
  timestamp: number;
  available: string[];
}

let componentsCache: LangflowComponentsCache | null = null;

// Fetch all components from Langflow API
async function fetchLangflowComponents(langflowUrl: string, apiKey: string): Promise<LangflowComponentsCache | null> {
  try {
    // Normalize URL - remove trailing slash
    const baseUrl = langflowUrl.replace(/\/$/, '');
    console.log(`Fetching components from Langflow: ${baseUrl}/api/v1/all`);
    
    const response = await fetch(`${baseUrl}/api/v1/all`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.error(`Langflow API error: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    console.log('Successfully fetched Langflow components');
    
    // Extract available component names for the system prompt
    const available: string[] = [];
    const components: Record<string, Record<string, any>> = {};
    
    for (const [category, categoryComponents] of Object.entries(data)) {
      if (typeof categoryComponents === 'object' && categoryComponents !== null) {
        components[category] = categoryComponents as Record<string, any>;
        for (const componentName of Object.keys(categoryComponents as object)) {
          available.push(componentName);
        }
      }
    }
    
    console.log(`Found ${available.length} components in ${Object.keys(components).length} categories`);
    
    return {
      components,
      timestamp: Date.now(),
      available
    };
  } catch (error) {
    console.error('Failed to fetch Langflow components:', error);
    return null;
  }
}

// Find a component template by name across all categories
function findComponentTemplate(cache: LangflowComponentsCache, componentName: string): any | null {
  for (const [category, categoryComponents] of Object.entries(cache.components)) {
    if (categoryComponents[componentName]) {
      return categoryComponents[componentName];
    }
  }
  return null;
}

// Build a node from Langflow component template
function buildNodeFromTemplate(
  template: any, 
  nodeId: string, 
  displayName: string, 
  componentType: string,
  config: Record<string, any> = {}
): any {
  // Deep clone the template to avoid mutation
  const nodeData = JSON.parse(JSON.stringify(template));
  
  // Update display name if provided
  if (displayName) {
    nodeData.display_name = displayName;
  }
  
  // Apply config values to template fields
  if (nodeData.template && config) {
    for (const [key, value] of Object.entries(config)) {
      if (nodeData.template[key]) {
        nodeData.template[key].value = value;
      }
    }
  }
  
  return nodeData;
}

// Extract output info from component template
function extractOutputInfo(template: any): { name: string; types: string[] } | null {
  if (template.outputs && template.outputs.length > 0) {
    const output = template.outputs[0];
    return {
      name: output.name,
      types: output.types || [output.selected] || ['Message']
    };
  }
  return null;
}

// Extract input info from component template
function extractInputInfo(template: any): Record<string, { types: string[]; fieldType: string }> {
  const inputs: Record<string, { types: string[]; fieldType: string }> = {};
  
  if (template.template) {
    for (const [key, field] of Object.entries(template.template)) {
      if (typeof field === 'object' && field !== null && key !== '_type' && key !== 'code') {
        const f = field as any;
        inputs[key] = {
          types: f.input_types || ['Message'],
          fieldType: f.type || 'str'
        };
      }
    }
  }
  
  return inputs;
}

// Generate dynamic system prompt based on available components
function generateSystemPrompt(cache: LangflowComponentsCache | null): string {
  // Group components by category for better organization
  let componentsList = '';
  
  if (cache) {
    const categoryDescriptions: Record<string, string[]> = {};
    
    for (const [category, categoryComponents] of Object.entries(cache.components)) {
      const componentNames = Object.keys(categoryComponents);
      if (componentNames.length > 0) {
        categoryDescriptions[category] = componentNames.slice(0, 20); // Limit per category
      }
    }
    
    for (const [category, components] of Object.entries(categoryDescriptions)) {
      componentsList += `\n### ${category}\n- ${components.join('\n- ')}\n`;
    }
  }

  return `You are a Langflow workflow planner. Given a user's description, output a JSON plan for a workflow.

IMPORTANT: Output ONLY valid JSON with this exact structure:
{
  "name": "Workflow Name",
  "description": "Brief description",
  "components": [
    {
      "type": "ComponentTypeName",
      "id_suffix": "unique_5char",
      "display_name": "Optional custom display name",
      "config": { /* component-specific config */ }
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

## Available Components from Langflow Instance
${componentsList || 'Using default components: ChatInput, ChatOutput, TextInput, Prompt, OpenAIModel'}

## Common Components & Their Typical Outputs/Inputs

### ChatInput
- Output: "message" → ["Message"]
- Use for: Getting user input from playground

### ChatOutput  
- Input: "input_value" ← ["Message"]
- Use for: Displaying AI response to user

### TextInput
- Output: "text" → ["Message"]
- Config: { "input_value": "default text" }
- Use for: Static text inputs

### Prompt
- Output: "prompt" → ["Message"]
- Config: { "template": "Template with {variable1}" }
- Variables in {braces} become input ports

### OpenAIModel / AzureChatOpenAI / AnthropicModel / GroqModel
- Inputs: "input_value" ← ["Message"], "system_message" ← ["Message"]
- Output: "text_output" → ["Message"]
- Config: { "model_name": "gpt-4o-mini", "temperature": 0.1 }

## Connection Rules

1. ChatInput.message → Model.input_value (direct chat)
2. ChatInput.message → Prompt (as variable input)
3. TextInput.text → Prompt (as variable input) 
4. Prompt.prompt → Model.input_value
5. Model.text_output → ChatOutput.input_value

## Example

User: "Create a blog writer chatbot"
{
  "name": "Blog Writer",
  "description": "A chatbot that writes blog posts",
  "components": [
    { "type": "ChatInput", "id_suffix": "inp01", "display_name": "User Topic" },
    { "type": "TextInput", "id_suffix": "txt02", "display_name": "Instructions", "config": { "input_value": "Write a detailed blog post." } },
    { "type": "Prompt", "id_suffix": "pmt03", "config": { "template": "Instructions: {instructions}\\n\\nTopic: {topic}\\n\\nWrite the blog post:" } },
    { "type": "OpenAIModel", "id_suffix": "llm04", "config": { "model_name": "gpt-4o-mini" } },
    { "type": "ChatOutput", "id_suffix": "out05", "display_name": "Blog Output" }
  ],
  "connections": [
    { "from": "TextInput-txt02", "from_output": "text", "to": "Prompt-pmt03", "to_input": "instructions" },
    { "from": "ChatInput-inp01", "from_output": "message", "to": "Prompt-pmt03", "to_input": "topic" },
    { "from": "Prompt-pmt03", "from_output": "prompt", "to": "OpenAIModel-llm04", "to_input": "input_value" },
    { "from": "OpenAIModel-llm04", "from_output": "text_output", "to": "ChatOutput-out05", "to_input": "input_value" }
  ]
}

RESPOND WITH ONLY VALID JSON. NO EXPLANATIONS.`;
}

// Fallback templates when Langflow API is not available
function getFallbackTemplate(componentType: string, nodeId: string, displayName: string, config: Record<string, any> = {}): any | null {
  switch (componentType) {
    case "ChatInput":
      return {
        base_classes: ["Message"],
        description: "Get chat inputs from the Playground.",
        display_name: displayName || "Chat Input",
        outputs: [{ name: "message", types: ["Message"], display_name: "Message" }],
        template: {
          _type: "Component",
          input_value: { type: "str", value: "", display_name: "Input Text" }
        }
      };
    case "ChatOutput":
      return {
        base_classes: ["Message"],
        description: "Display chat outputs in the Playground.",
        display_name: displayName || "Chat Output",
        outputs: [{ name: "message", types: ["Message"], display_name: "Message" }],
        template: {
          _type: "Component",
          input_value: { type: "str", value: "", display_name: "Text", input_types: ["Message"] }
        }
      };
    case "TextInput":
      return {
        base_classes: ["Message"],
        description: "Get text inputs from the user.",
        display_name: displayName || "Text Input",
        outputs: [{ name: "text", types: ["Message"], display_name: "Text" }],
        template: {
          _type: "Component",
          input_value: { type: "str", value: config.input_value || "", display_name: "Text" }
        }
      };
    case "Prompt":
      return {
        base_classes: ["Message"],
        description: "Create a prompt template with dynamic variables.",
        display_name: displayName || "Prompt",
        outputs: [{ name: "prompt", types: ["Message"], display_name: "Prompt" }],
        template: {
          _type: "Component",
          template: { type: "str", value: config.template || "", display_name: "Template" }
        }
      };
    case "OpenAIModel":
      return {
        base_classes: ["Message"],
        description: "Generates text using OpenAI LLMs.",
        display_name: displayName || "OpenAI",
        outputs: [{ name: "text_output", types: ["Message"], display_name: "Text" }],
        template: {
          _type: "Component",
          input_value: { type: "str", value: "", display_name: "Input", input_types: ["Message"] },
          system_message: { type: "str", value: "", display_name: "System Message", input_types: ["Message"] },
          model_name: { type: "str", value: config.model_name || "gpt-4o-mini", display_name: "Model Name" },
          temperature: { type: "float", value: config.temperature || 0.1, display_name: "Temperature" }
        }
      };
    default:
      return null;
  }
}

// Map component type to Langflow template type
function getTemplateType(componentType: string, cache: LangflowComponentsCache | null): string {
  if (cache) {
    // Find the category for this component
    for (const [category, categoryComponents] of Object.entries(cache.components)) {
      if (categoryComponents[componentType]) {
        // Return the proper template type from the component
        const comp = categoryComponents[componentType];
        return comp.template?._type === "Component" ? componentType : componentType;
      }
    }
  }
  
  // Fallback mappings
  const fallbackTypes: Record<string, string> = {
    "ChatInput": "ChatInput",
    "ChatOutput": "ChatOutput", 
    "TextInput": "TextInput",
    "Prompt": "Prompt",
    "OpenAIModel": "OpenAIModel"
  };
  
  return fallbackTypes[componentType] || componentType;
}

// Build complete workflow JSON from plan
function buildWorkflowJson(plan: any, cache: LangflowComponentsCache | null): any {
  const nodes: any[] = [];
  const edges: any[] = [];
  const promptVariables: Record<string, string[]> = {};
  
  // Track output/input info for edge creation
  const componentOutputs: Record<string, { name: string; types: string[] }> = {};
  const componentInputs: Record<string, Record<string, { types: string[]; fieldType: string }>> = {};
  
  let xPos = 100;
  const xSpacing = 400;
  const yBase = 200;
  
  for (let i = 0; i < (plan.components || []).length; i++) {
    const comp = plan.components[i];
    const nodeId = `${comp.type}-${comp.id_suffix || generateId()}`;
    const displayName = comp.display_name || comp.type;
    const templateType = getTemplateType(comp.type, cache);
    
    let nodeData: any = null;
    
    // Try to get template from Langflow API cache first
    if (cache) {
      const template = findComponentTemplate(cache, comp.type);
      if (template) {
        nodeData = buildNodeFromTemplate(template, nodeId, displayName, comp.type, comp.config || {});
        
        // Extract output/input info from live template
        const outputInfo = extractOutputInfo(template);
        if (outputInfo) {
          componentOutputs[nodeId] = outputInfo;
        }
        componentInputs[nodeId] = extractInputInfo(template);
        
        console.log(`Using live template for ${comp.type}`);
      }
    }
    
    // Fallback to hardcoded templates
    if (!nodeData) {
      nodeData = getFallbackTemplate(comp.type, nodeId, displayName, comp.config || {});
      if (nodeData) {
        console.log(`Using fallback template for ${comp.type}`);
        
        // Set fallback output/input info
        const fallbackOutputs: Record<string, { name: string; types: string[] }> = {
          "ChatInput": { name: "message", types: ["Message"] },
          "ChatOutput": { name: "message", types: ["Message"] },
          "TextInput": { name: "text", types: ["Message"] },
          "Prompt": { name: "prompt", types: ["Message"] },
          "OpenAIModel": { name: "text_output", types: ["Message"] }
        };
        
        const fallbackInputs: Record<string, Record<string, { types: string[]; fieldType: string }>> = {
          "ChatOutput": { "input_value": { types: ["Message"], fieldType: "str" } },
          "OpenAIModel": { 
            "input_value": { types: ["Message"], fieldType: "str" },
            "system_message": { types: ["Message"], fieldType: "str" }
          },
          "Prompt": {}
        };
        
        if (fallbackOutputs[comp.type]) {
          componentOutputs[nodeId] = fallbackOutputs[comp.type];
        }
        if (fallbackInputs[comp.type]) {
          componentInputs[nodeId] = fallbackInputs[comp.type];
        }
      } else {
        console.log(`Unknown component type: ${comp.type}`);
        continue;
      }
    }
    
    // Handle Prompt template variables
    if (comp.type === "Prompt" && comp.config?.template) {
      const template = comp.config.template;
      const varRegex = /\{(\w+)\}/g;
      const vars: string[] = [];
      let m;
      while ((m = varRegex.exec(template)) !== null) {
        if (!vars.includes(m[1])) vars.push(m[1]);
      }
      promptVariables[nodeId] = vars;
      
      // Add variable inputs to the component
      if (!componentInputs[nodeId]) componentInputs[nodeId] = {};
      for (const v of vars) {
        componentInputs[nodeId][v] = { types: ["Message", "Text"], fieldType: "str" };
      }
    }
    
    const node = {
      data: {
        description: nodeData.description,
        display_name: nodeData.display_name,
        id: nodeId,
        node: nodeData,
        selected_output: nodeData.outputs?.[0]?.name,
        type: templateType
      },
      dragging: false,
      height: 300,
      id: nodeId,
      measured: { height: 300, width: 320 },
      position: { x: xPos, y: yBase + (i % 2) * 200 },
      positionAbsolute: { x: xPos, y: yBase + (i % 2) * 200 },
      selected: false,
      type: "genericNode",
      width: 320
    };
    
    nodes.push(node);
    xPos += xSpacing;
  }
  
  // Create edges based on connections
  for (const conn of plan.connections || []) {
    const sourceId = conn.from;
    const targetId = conn.to;
    
    const sourceOutput = componentOutputs[sourceId];
    let targetInput = componentInputs[targetId]?.[conn.to_input];
    
    // Handle Prompt variable inputs
    if (!targetInput && targetId.startsWith("Prompt-")) {
      targetInput = { types: ["Message", "Text"], fieldType: "str" };
    }
    
    if (sourceOutput && targetInput) {
      const sourceType = sourceId.split('-')[0];
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
    } else {
      console.log(`Could not create edge: ${sourceId} -> ${targetId} (${conn.to_input})`);
    }
  }
  
  console.log(`Successfully built workflow with ${nodes.length} nodes and ${edges.length} edges`);
  
  return {
    id: crypto.randomUUID(),
    data: {
      edges,
      nodes,
      viewport: { x: 0, y: 0, zoom: 0.8 }
    },
    description: plan.description || "",
    endpoint_name: null,
    is_component: false,
    name: plan.name || "Generated Workflow"
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    const langflowUrl = Deno.env.get('LANGFLOW_URL');
    const langflowApiKey = Deno.env.get('LANGFLOW_API_KEY');
    
    if (!anthropicApiKey) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }

    // Try to fetch components from Langflow API
    let cache: LangflowComponentsCache | null = null;
    if (langflowUrl && langflowApiKey) {
      console.log('Fetching components from Langflow instance...');
      cache = await fetchLangflowComponents(langflowUrl, langflowApiKey);
      
      if (cache) {
        console.log(`Loaded ${cache.available.length} components from Langflow`);
      } else {
        console.log('Failed to fetch from Langflow, using fallback templates');
      }
    } else {
      console.log('Langflow credentials not configured, using fallback templates');
    }

    // Generate dynamic system prompt based on available components
    const systemPrompt = generateSystemPrompt(cache);
    
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
        system: systemPrompt,
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
      
      // Build workflow with Langflow API cache
      workflow = buildWorkflowJson(plan, cache);
      isValid = true;
    } catch (e) {
      console.error('Failed to parse/build workflow:', e);
    }

    return new Response(JSON.stringify({ 
      content: generatedContent,
      workflow,
      isValid,
      langflowConnected: cache !== null,
      availableComponents: cache?.available.length || 0
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
