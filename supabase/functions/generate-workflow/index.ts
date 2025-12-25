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

// Generate random code hash
function generateCodeHash(): string {
  return Array.from({ length: 12 }, () => 
    '0123456789abcdef'[Math.floor(Math.random() * 16)]
  ).join('');
}

// System prompt for Claude to generate workflow plans
const LANGFLOW_SYSTEM_PROMPT = `You are a Langflow workflow planner. Given a user's description, output a JSON plan for a workflow.

IMPORTANT: Output ONLY valid JSON with this exact structure:
{
  "name": "Workflow Name",
  "description": "Brief description",
  "components": [
    {
      "type": "ChatInput" | "ChatOutput" | "Prompt" | "OpenAIModel" | "TextInput",
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

## Available Components & Their Outputs/Inputs

### ChatInput
- Type: "ChatInput"
- Output: "message" → ["Message"]
- Use for: Getting user input from playground

### ChatOutput  
- Type: "ChatOutput"
- Input: "input_value" ← ["Message"]
- Use for: Displaying AI response to user

### TextInput
- Type: "TextInput"
- Output: "text" → ["Message"]
- Config: { "input_value": "default text" }
- Use for: Static text inputs, instructions, etc.

### Prompt
- Type: "Prompt"
- Output: "prompt" → ["Message"]
- Config: { "template": "Template with {variable1} and {variable2}" }
- Use for: Creating prompt templates with variables
- Variables in {braces} become input ports

### OpenAIModel
- Type: "OpenAIModel"
- Inputs: 
  - "input_value" ← ["Message"] (the prompt/message to process)
  - "system_message" ← ["Message"] (optional system prompt)
- Output: "text_output" → ["Message"]
- Config: { "model_name": "gpt-4o-mini", "temperature": 0.1 }
- Use for: LLM processing

## Connection Rules

1. ChatInput.message → OpenAIModel.input_value (direct chat)
2. ChatInput.message → Prompt (as variable input)
3. TextInput.text → Prompt (as variable input) 
4. Prompt.prompt → OpenAIModel.input_value
5. OpenAIModel.text_output → ChatOutput.input_value

## Common Patterns

### Simple Chatbot
ChatInput → OpenAIModel → ChatOutput
connections: [
  { from: "ChatInput-xxx", from_output: "message", to: "OpenAIModel-yyy", to_input: "input_value" },
  { from: "OpenAIModel-yyy", from_output: "text_output", to: "ChatOutput-zzz", to_input: "input_value" }
]

### Prompt-based Generation
TextInput (instructions) → Prompt ← ChatInput (topic)
Prompt → OpenAIModel → ChatOutput
connections: [
  { from: "TextInput-aaa", from_output: "text", to: "Prompt-bbb", to_input: "instructions" },
  { from: "ChatInput-ccc", from_output: "message", to: "Prompt-bbb", to_input: "topic" },
  { from: "Prompt-bbb", from_output: "prompt", to: "OpenAIModel-ddd", to_input: "input_value" },
  { from: "OpenAIModel-ddd", from_output: "text_output", to: "ChatOutput-eee", to_input: "input_value" }
]

For Prompt variables: the variable names in {braces} in the template become the to_input names for connections.

## Example

User: "Create a blog writer chatbot"
{
  "name": "Blog Writer",
  "description": "A chatbot that writes blog posts based on user topics",
  "components": [
    { "type": "ChatInput", "id_suffix": "inp01", "display_name": "User Topic" },
    { "type": "TextInput", "id_suffix": "txt02", "display_name": "Writing Instructions", "config": { "input_value": "Write a detailed, engaging blog post with introduction, main points, and conclusion." } },
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

// Full component templates matching Langflow's actual format
function getChatInputTemplate(nodeId: string, displayName: string = "Chat Input") {
  return {
    base_classes: ["Message"],
    beta: false,
    conditional_paths: [],
    custom_fields: {},
    description: "Get chat inputs from the Playground.",
    display_name: displayName,
    documentation: "",
    edited: false,
    field_order: ["input_value", "should_store_message", "sender", "sender_name", "session_id", "files"],
    frozen: false,
    icon: "MessagesSquare",
    legacy: false,
    lf_version: "1.4.2",
    metadata: {
      code_hash: generateCodeHash(),
      module: "langflow.components.inputs.ChatInput"
    },
    output_types: [],
    outputs: [{
      allows_loop: false,
      cache: true,
      display_name: "Message",
      group_outputs: false,
      method: "message_response",
      name: "message",
      selected: "Message",
      tool_mode: true,
      types: ["Message"],
      value: "__UNDEFINED__"
    }],
    pinned: false,
    template: {
      _type: "Component",
      code: {
        advanced: true,
        dynamic: true,
        fileTypes: [],
        file_path: "",
        info: "",
        list: false,
        load_from_db: false,
        multiline: true,
        name: "code",
        password: false,
        placeholder: "",
        required: true,
        show: true,
        title_case: false,
        type: "code",
        value: "from langflow.base.io.chat import ChatComponent\nfrom langflow.io import DropdownInput, MessageTextInput, Output\nfrom langflow.schema.message import Message\n\nclass ChatInput(ChatComponent):\n    display_name = \"Chat Input\"\n    description = \"Get chat inputs from the Playground.\"\n    icon = \"MessagesSquare\"\n    name = \"ChatInput\"\n\n    inputs = [\n        MessageTextInput(name=\"input_value\", display_name=\"Text\", info=\"Message text.\"),\n        DropdownInput(name=\"sender\", display_name=\"Sender Type\", options=[\"Machine\", \"User\"], value=\"User\"),\n        MessageTextInput(name=\"sender_name\", display_name=\"Sender Name\", value=\"User\"),\n    ]\n    outputs = [Output(display_name=\"Message\", name=\"message\", method=\"message_response\")]\n\n    def message_response(self) -> Message:\n        return Message(text=self.input_value, sender=self.sender, sender_name=self.sender_name)"
      },
      files: {
        advanced: true,
        display_name: "Files",
        dynamic: false,
        fileTypes: ["txt", "md", "mdx", "csv", "json", "yaml", "yml", "xml", "html", "pdf", "docx", "py", "sh", "sql", "js", "ts", "tsx"],
        file_path: "",
        info: "Files to be sent with the message.",
        list: true,
        load_from_db: false,
        name: "files",
        placeholder: "",
        required: false,
        show: true,
        title_case: false,
        type: "file",
        value: ""
      },
      input_value: {
        advanced: false,
        display_name: "Text",
        dynamic: false,
        info: "Message to be passed as input.",
        input_types: ["Message"],
        list: false,
        load_from_db: false,
        multiline: true,
        name: "input_value",
        placeholder: "Type something...",
        required: false,
        show: true,
        title_case: false,
        trace_as_input: true,
        trace_as_metadata: true,
        type: "str",
        value: ""
      },
      sender: {
        advanced: true,
        display_name: "Sender Type",
        dynamic: false,
        info: "Type of sender.",
        name: "sender",
        options: ["Machine", "User"],
        placeholder: "",
        required: false,
        show: true,
        title_case: false,
        trace_as_metadata: true,
        type: "str",
        value: "User"
      },
      sender_name: {
        advanced: true,
        display_name: "Sender Name",
        dynamic: false,
        info: "Name of the sender.",
        input_types: ["Message"],
        list: false,
        load_from_db: false,
        name: "sender_name",
        placeholder: "",
        required: false,
        show: true,
        title_case: false,
        trace_as_input: true,
        trace_as_metadata: true,
        type: "str",
        value: "User"
      },
      session_id: {
        advanced: true,
        display_name: "Session ID",
        dynamic: false,
        info: "The session ID of the chat.",
        input_types: ["Message"],
        list: false,
        load_from_db: false,
        name: "session_id",
        placeholder: "",
        required: false,
        show: true,
        title_case: false,
        trace_as_input: true,
        trace_as_metadata: true,
        type: "str",
        value: ""
      },
      should_store_message: {
        advanced: true,
        display_name: "Store Messages",
        dynamic: false,
        info: "Store the message in the history.",
        list: false,
        name: "should_store_message",
        placeholder: "",
        required: false,
        show: true,
        title_case: false,
        trace_as_metadata: true,
        type: "bool",
        value: true
      }
    }
  };
}

function getChatOutputTemplate(nodeId: string, displayName: string = "Chat Output") {
  return {
    base_classes: ["Message"],
    beta: false,
    conditional_paths: [],
    custom_fields: {},
    description: "Display a chat message in the Playground.",
    display_name: displayName,
    documentation: "",
    edited: false,
    field_order: ["input_value", "should_store_message", "sender", "sender_name", "session_id", "data_template"],
    frozen: false,
    icon: "MessagesSquare",
    legacy: false,
    lf_version: "1.4.2",
    metadata: {
      code_hash: generateCodeHash(),
      module: "langflow.components.outputs.ChatOutput"
    },
    output_types: [],
    outputs: [{
      allows_loop: false,
      cache: true,
      display_name: "Message",
      group_outputs: false,
      method: "message_response",
      name: "message",
      selected: "Message",
      tool_mode: true,
      types: ["Message"],
      value: "__UNDEFINED__"
    }],
    pinned: false,
    template: {
      _type: "Component",
      code: {
        advanced: true,
        dynamic: true,
        fileTypes: [],
        file_path: "",
        info: "",
        list: false,
        load_from_db: false,
        multiline: true,
        name: "code",
        password: false,
        placeholder: "",
        required: true,
        show: true,
        title_case: false,
        type: "code",
        value: "from langflow.base.io.chat import ChatComponent\nfrom langflow.io import DropdownInput, MessageTextInput, HandleInput, Output\nfrom langflow.schema.message import Message\n\nclass ChatOutput(ChatComponent):\n    display_name = \"Chat Output\"\n    description = \"Display a chat message in the Playground.\"\n    icon = \"MessagesSquare\"\n    name = \"ChatOutput\"\n\n    inputs = [\n        HandleInput(name=\"input_value\", display_name=\"Text\", input_types=[\"Message\"], required=True),\n        DropdownInput(name=\"sender\", display_name=\"Sender Type\", options=[\"Machine\", \"User\"], value=\"Machine\"),\n        MessageTextInput(name=\"sender_name\", display_name=\"Sender Name\", value=\"AI\"),\n    ]\n    outputs = [Output(display_name=\"Message\", name=\"message\", method=\"message_response\")]\n\n    def message_response(self) -> Message:\n        return Message(text=self.input_value.text if hasattr(self.input_value, 'text') else str(self.input_value))"
      },
      data_template: {
        advanced: true,
        display_name: "Data Template",
        dynamic: false,
        info: "Template to convert Data to Text.",
        input_types: ["Message"],
        list: false,
        load_from_db: false,
        name: "data_template",
        placeholder: "",
        required: false,
        show: true,
        title_case: false,
        trace_as_input: true,
        trace_as_metadata: true,
        type: "str",
        value: "{text}"
      },
      input_value: {
        advanced: false,
        display_name: "Text",
        dynamic: false,
        info: "Message to be passed as output.",
        input_types: ["Message"],
        list: false,
        load_from_db: false,
        name: "input_value",
        placeholder: "",
        required: true,
        show: true,
        title_case: false,
        trace_as_input: true,
        trace_as_metadata: true,
        type: "str",
        value: ""
      },
      sender: {
        advanced: true,
        display_name: "Sender Type",
        dynamic: false,
        info: "Type of sender.",
        name: "sender",
        options: ["Machine", "User"],
        placeholder: "",
        required: false,
        show: true,
        title_case: false,
        trace_as_metadata: true,
        type: "str",
        value: "Machine"
      },
      sender_name: {
        advanced: true,
        display_name: "Sender Name",
        dynamic: false,
        info: "Name of the sender.",
        input_types: ["Message"],
        list: false,
        load_from_db: false,
        name: "sender_name",
        placeholder: "",
        required: false,
        show: true,
        title_case: false,
        trace_as_input: true,
        trace_as_metadata: true,
        type: "str",
        value: "AI"
      },
      session_id: {
        advanced: true,
        display_name: "Session ID",
        dynamic: false,
        info: "The session ID of the chat.",
        input_types: ["Message"],
        list: false,
        load_from_db: false,
        name: "session_id",
        placeholder: "",
        required: false,
        show: true,
        title_case: false,
        trace_as_input: true,
        trace_as_metadata: true,
        type: "str",
        value: ""
      },
      should_store_message: {
        advanced: true,
        display_name: "Store Messages",
        dynamic: false,
        info: "Store the message in the history.",
        list: false,
        name: "should_store_message",
        placeholder: "",
        required: false,
        show: true,
        title_case: false,
        trace_as_metadata: true,
        type: "bool",
        value: true
      }
    }
  };
}

function getTextInputTemplate(nodeId: string, displayName: string = "Text Input", inputValue: string = "") {
  return {
    base_classes: ["Message"],
    beta: false,
    conditional_paths: [],
    custom_fields: {},
    description: "Get text inputs from the Playground.",
    display_name: displayName,
    documentation: "",
    edited: false,
    field_order: ["input_value"],
    frozen: false,
    icon: "type",
    legacy: false,
    lf_version: "1.4.2",
    metadata: {
      code_hash: generateCodeHash(),
      module: "langflow.components.inputs.TextInputComponent"
    },
    output_types: [],
    outputs: [{
      allows_loop: false,
      cache: true,
      display_name: "Text",
      group_outputs: false,
      method: "text_response",
      name: "text",
      selected: "Message",
      tool_mode: true,
      types: ["Message"],
      value: "__UNDEFINED__"
    }],
    pinned: false,
    template: {
      _type: "Component",
      code: {
        advanced: true,
        dynamic: true,
        fileTypes: [],
        file_path: "",
        info: "",
        list: false,
        load_from_db: false,
        multiline: true,
        name: "code",
        password: false,
        placeholder: "",
        required: true,
        show: true,
        title_case: false,
        type: "code",
        value: "from langflow.base.io.text import TextComponent\nfrom langflow.io import MultilineInput, Output\nfrom langflow.schema.message import Message\n\nclass TextInputComponent(TextComponent):\n    display_name = \"Text Input\"\n    description = \"Get text inputs from the Playground.\"\n    icon = \"type\"\n    name = \"TextInput\"\n\n    inputs = [MultilineInput(name=\"input_value\", display_name=\"Text\", info=\"Text to be passed as input.\")]\n    outputs = [Output(display_name=\"Text\", name=\"text\", method=\"text_response\")]\n\n    def text_response(self) -> Message:\n        return Message(text=self.input_value)"
      },
      input_value: {
        _input_type: "MultilineInput",
        advanced: false,
        display_name: "Text",
        dynamic: false,
        info: "Text to be passed as input.",
        input_types: ["Message"],
        list: false,
        load_from_db: false,
        multiline: true,
        name: "input_value",
        placeholder: "",
        required: false,
        show: true,
        title_case: false,
        trace_as_input: true,
        trace_as_metadata: true,
        type: "str",
        value: inputValue
      }
    }
  };
}

function getPromptTemplate(nodeId: string, displayName: string = "Prompt", template: string = "") {
  // Extract variables from template (e.g., {topic} -> topic)
  const variableRegex = /\{(\w+)\}/g;
  const variables: string[] = [];
  let match;
  while ((match = variableRegex.exec(template)) !== null) {
    if (!variables.includes(match[1])) {
      variables.push(match[1]);
    }
  }

  const templateObj: any = {
    _type: "Component",
    code: {
      advanced: true,
      dynamic: true,
      fileTypes: [],
      file_path: "",
      info: "",
      list: false,
      load_from_db: false,
      multiline: true,
      name: "code",
      password: false,
      placeholder: "",
      required: true,
      show: true,
      title_case: false,
      type: "code",
      value: "from langflow.base.prompts.api_utils import process_prompt_template\nfrom langflow.custom.custom_component.component import Component\nfrom langflow.inputs.inputs import DefaultPromptField\nfrom langflow.io import MessageTextInput, Output, PromptInput\nfrom langflow.schema.message import Message\n\nclass PromptComponent(Component):\n    display_name = \"Prompt\"\n    description = \"Create a prompt template with dynamic variables.\"\n    icon = \"braces\"\n    name = \"Prompt\"\n\n    inputs = [PromptInput(name=\"template\", display_name=\"Template\")]\n    outputs = [Output(display_name=\"Prompt\", name=\"prompt\", method=\"build_prompt\")]\n\n    async def build_prompt(self) -> Message:\n        prompt = Message.from_template(**self._attributes)\n        self.status = prompt.text\n        return prompt"
    },
    template: {
      advanced: false,
      display_name: "Template",
      dynamic: false,
      info: "",
      list: false,
      load_from_db: false,
      name: "template",
      placeholder: "",
      required: false,
      show: true,
      title_case: false,
      trace_as_input: true,
      type: "prompt",
      value: template
    },
    tool_placeholder: {
      _input_type: "MessageTextInput",
      advanced: true,
      display_name: "Tool Placeholder",
      dynamic: false,
      info: "A placeholder input for tool mode.",
      input_types: ["Message"],
      list: false,
      load_from_db: false,
      name: "tool_placeholder",
      placeholder: "",
      required: false,
      show: true,
      title_case: false,
      tool_mode: true,
      trace_as_input: true,
      trace_as_metadata: true,
      type: "str",
      value: ""
    }
  };

  // Add variable fields
  for (const varName of variables) {
    templateObj[varName] = {
      advanced: false,
      display_name: varName,
      dynamic: false,
      field_type: "str",
      fileTypes: [],
      file_path: "",
      info: "",
      input_types: ["Message", "Text"],
      list: false,
      load_from_db: false,
      multiline: true,
      name: varName,
      password: false,
      placeholder: "",
      required: false,
      show: true,
      title_case: false,
      type: "str",
      value: ""
    };
  }

  return {
    base_classes: ["Message"],
    beta: false,
    conditional_paths: [],
    custom_fields: {
      template: variables
    },
    description: "Create a prompt template with dynamic variables.",
    display_name: displayName,
    documentation: "",
    edited: false,
    field_order: ["template"],
    frozen: false,
    icon: "braces",
    legacy: false,
    lf_version: "1.4.2",
    metadata: {
      code_hash: generateCodeHash(),
      module: "langflow.components.prompts.PromptComponent"
    },
    output_types: [],
    outputs: [{
      allows_loop: false,
      cache: true,
      display_name: "Prompt Message",
      group_outputs: false,
      method: "build_prompt",
      name: "prompt",
      selected: "Message",
      tool_mode: true,
      types: ["Message"],
      value: "__UNDEFINED__"
    }],
    pinned: false,
    template: templateObj
  };
}

function getOpenAIModelTemplate(nodeId: string, displayName: string = "OpenAI", modelName: string = "gpt-4o-mini", temperature: number = 0.1) {
  return {
    base_classes: ["LanguageModel", "Message"],
    beta: false,
    conditional_paths: [],
    custom_fields: {},
    description: "Generates text using OpenAI LLMs.",
    display_name: displayName,
    documentation: "",
    edited: false,
    field_order: ["input_value", "system_message", "stream", "max_tokens", "model_kwargs", "json_mode", "output_schema", "model_name", "openai_api_base", "api_key", "temperature", "seed"],
    frozen: false,
    icon: "OpenAI",
    legacy: false,
    lf_version: "1.4.2",
    metadata: {
      code_hash: generateCodeHash(),
      module: "langflow.components.models.OpenAIModel"
    },
    output_types: [],
    outputs: [
      {
        allows_loop: false,
        cache: true,
        display_name: "Text",
        group_outputs: false,
        method: "text_response",
        name: "text_output",
        selected: "Message",
        tool_mode: true,
        types: ["Message"],
        value: "__UNDEFINED__"
      },
      {
        allows_loop: false,
        cache: true,
        display_name: "Language Model",
        group_outputs: false,
        method: "build_model",
        name: "model_output",
        selected: "LanguageModel",
        types: ["LanguageModel"],
        value: "__UNDEFINED__"
      }
    ],
    pinned: false,
    template: {
      _type: "Component",
      api_key: {
        advanced: false,
        display_name: "OpenAI API Key",
        dynamic: false,
        info: "The OpenAI API Key.",
        input_types: ["Message"],
        list: false,
        load_from_db: true,
        name: "api_key",
        password: true,
        placeholder: "",
        required: false,
        show: true,
        title_case: false,
        type: "str",
        value: ""
      },
      code: {
        advanced: true,
        dynamic: true,
        fileTypes: [],
        file_path: "",
        info: "",
        list: false,
        load_from_db: false,
        multiline: true,
        name: "code",
        password: false,
        placeholder: "",
        required: true,
        show: true,
        title_case: false,
        type: "code",
        value: "from langflow.base.models.model import LCModelComponent\nfrom langflow.field_typing import LanguageModel\nfrom langflow.inputs import MessageInput, SecretStrInput, FloatInput, StrInput, DropdownInput\nfrom langflow.io import Output\nfrom langflow.schema.message import Message\n\nclass OpenAIModelComponent(LCModelComponent):\n    display_name = \"OpenAI\"\n    description = \"Generates text using OpenAI LLMs.\"\n    icon = \"OpenAI\"\n    name = \"OpenAIModel\"\n\n    inputs = [\n        MessageInput(name=\"input_value\", display_name=\"Input\"),\n        MessageInput(name=\"system_message\", display_name=\"System Message\", advanced=True),\n        DropdownInput(name=\"model_name\", display_name=\"Model Name\", options=[\"gpt-4o-mini\", \"gpt-4o\", \"gpt-4-turbo\", \"gpt-3.5-turbo\"], value=\"gpt-4o-mini\"),\n        SecretStrInput(name=\"api_key\", display_name=\"OpenAI API Key\"),\n        FloatInput(name=\"temperature\", display_name=\"Temperature\", value=0.1),\n    ]\n    outputs = [\n        Output(display_name=\"Text\", name=\"text_output\", method=\"text_response\"),\n        Output(display_name=\"Language Model\", name=\"model_output\", method=\"build_model\"),\n    ]"
      },
      input_value: {
        advanced: false,
        display_name: "Input",
        dynamic: false,
        info: "The input to the model.",
        input_types: ["Message"],
        list: false,
        load_from_db: false,
        name: "input_value",
        placeholder: "",
        required: false,
        show: true,
        title_case: false,
        trace_as_input: true,
        trace_as_metadata: true,
        type: "str",
        value: ""
      },
      json_mode: {
        advanced: true,
        display_name: "JSON Mode",
        dynamic: false,
        info: "If True, outputs will be JSON formatted.",
        list: false,
        name: "json_mode",
        placeholder: "",
        required: false,
        show: true,
        title_case: false,
        trace_as_metadata: true,
        type: "bool",
        value: false
      },
      max_tokens: {
        advanced: true,
        display_name: "Max Tokens",
        dynamic: false,
        info: "The maximum number of tokens to generate.",
        list: false,
        name: "max_tokens",
        placeholder: "",
        required: false,
        show: true,
        title_case: false,
        trace_as_metadata: true,
        type: "int",
        value: null
      },
      model_kwargs: {
        advanced: true,
        display_name: "Model Kwargs",
        dynamic: false,
        info: "Additional keyword arguments.",
        list: false,
        load_from_db: false,
        name: "model_kwargs",
        placeholder: "",
        required: false,
        show: true,
        title_case: false,
        type: "dict",
        value: {}
      },
      model_name: {
        advanced: false,
        display_name: "Model Name",
        dynamic: false,
        info: "The name of the model.",
        name: "model_name",
        options: ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"],
        placeholder: "",
        required: false,
        show: true,
        title_case: false,
        trace_as_metadata: true,
        type: "str",
        value: modelName
      },
      openai_api_base: {
        advanced: true,
        display_name: "OpenAI API Base",
        dynamic: false,
        info: "Base URL for OpenAI API.",
        input_types: ["Message"],
        list: false,
        load_from_db: false,
        name: "openai_api_base",
        placeholder: "",
        required: false,
        show: true,
        title_case: false,
        trace_as_input: true,
        trace_as_metadata: true,
        type: "str",
        value: ""
      },
      output_schema: {
        advanced: true,
        display_name: "Schema",
        dynamic: false,
        info: "Output schema for structured output.",
        list: true,
        name: "output_schema",
        placeholder: "",
        required: false,
        show: true,
        title_case: false,
        type: "table",
        value: []
      },
      seed: {
        advanced: true,
        display_name: "Seed",
        dynamic: false,
        info: "Random seed for reproducibility.",
        list: false,
        name: "seed",
        placeholder: "",
        required: false,
        show: true,
        title_case: false,
        trace_as_metadata: true,
        type: "int",
        value: 1
      },
      stream: {
        advanced: true,
        display_name: "Stream",
        dynamic: false,
        info: "Stream the response.",
        list: false,
        name: "stream",
        placeholder: "",
        required: false,
        show: true,
        title_case: false,
        trace_as_metadata: true,
        type: "bool",
        value: false
      },
      system_message: {
        advanced: false,
        display_name: "System Message",
        dynamic: false,
        info: "System message for the model.",
        input_types: ["Message"],
        list: false,
        load_from_db: false,
        name: "system_message",
        placeholder: "",
        required: false,
        show: true,
        title_case: false,
        trace_as_input: true,
        trace_as_metadata: true,
        type: "str",
        value: ""
      },
      temperature: {
        advanced: false,
        display_name: "Temperature",
        dynamic: false,
        info: "Controls randomness. Lower is more deterministic.",
        list: false,
        name: "temperature",
        placeholder: "",
        required: false,
        show: true,
        title_case: false,
        trace_as_metadata: true,
        type: "float",
        value: temperature
      }
    }
  };
}

// Type to template type mapping
const TYPE_MAP: Record<string, string> = {
  "ChatInput": "ChatInput",
  "ChatOutput": "ChatOutput",
  "TextInput": "TextInput",
  "Prompt": "Prompt",
  "OpenAIModel": "OpenAIModel"
};

// Output info for creating edges
const OUTPUT_INFO: Record<string, { name: string; types: string[] }> = {
  "ChatInput": { name: "message", types: ["Message"] },
  "ChatOutput": { name: "message", types: ["Message"] },
  "TextInput": { name: "text", types: ["Message"] },
  "Prompt": { name: "prompt", types: ["Message"] },
  "OpenAIModel": { name: "text_output", types: ["Message"] }
};

// Input info for creating edges
const INPUT_INFO: Record<string, Record<string, { types: string[]; fieldType: string }>> = {
  "ChatOutput": {
    "input_value": { types: ["Message"], fieldType: "str" }
  },
  "OpenAIModel": {
    "input_value": { types: ["Message"], fieldType: "str" },
    "system_message": { types: ["Message"], fieldType: "str" }
  },
  "Prompt": {
    // Dynamic - will be filled based on template variables
  }
};

function buildWorkflowJson(plan: any) {
  const nodes: any[] = [];
  const edges: any[] = [];
  
  let xPos = 100;
  const yBase = 200;
  const xSpacing = 400;
  
  // Track prompt variable inputs for edge creation
  const promptVariables: Record<string, string[]> = {};
  
  // Create nodes
  for (let i = 0; i < plan.components.length; i++) {
    const comp = plan.components[i];
    const templateType = TYPE_MAP[comp.type] || comp.type;
    const nodeId = `${templateType}-${comp.id_suffix}`;
    const displayName = comp.display_name || templateType.replace(/([A-Z])/g, ' $1').trim();
    
    let nodeData: any;
    
    switch (templateType) {
      case "ChatInput":
        nodeData = getChatInputTemplate(nodeId, displayName);
        break;
      case "ChatOutput":
        nodeData = getChatOutputTemplate(nodeId, displayName);
        break;
      case "TextInput":
        nodeData = getTextInputTemplate(nodeId, displayName, comp.config?.input_value || "");
        break;
      case "Prompt":
        const template = comp.config?.template || "";
        nodeData = getPromptTemplate(nodeId, displayName, template);
        // Store variables for edge creation
        const varRegex = /\{(\w+)\}/g;
        const vars: string[] = [];
        let m;
        while ((m = varRegex.exec(template)) !== null) {
          if (!vars.includes(m[1])) vars.push(m[1]);
        }
        promptVariables[nodeId] = vars;
        break;
      case "OpenAIModel":
        nodeData = getOpenAIModelTemplate(
          nodeId, 
          displayName, 
          comp.config?.model_name || "gpt-4o-mini",
          comp.config?.temperature || 0.1
        );
        break;
      default:
        console.log(`Unknown component type: ${comp.type}`);
        continue;
    }
    
    const node = {
      data: {
        description: nodeData.description,
        display_name: nodeData.display_name,
        id: nodeId,
        node: nodeData,
        selected_output: nodeData.outputs[0]?.name,
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
  
  // Create edges
  for (const conn of plan.connections || []) {
    const sourceId = conn.from;
    const targetId = conn.to;
    const sourceType = sourceId.split('-')[0];
    const targetType = targetId.split('-')[0];
    
    const sourceOutput = OUTPUT_INFO[sourceType];
    
    // Handle Prompt variable inputs specially
    let targetInput;
    if (targetType === "Prompt") {
      // Check if this is a variable input
      const varName = conn.to_input;
      targetInput = { types: ["Message", "Text"], fieldType: "str" };
    } else {
      targetInput = INPUT_INFO[targetType]?.[conn.to_input];
    }
    
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
    } else {
      console.log(`Could not create edge: ${sourceId} -> ${targetId} (${conn.to_input})`);
    }
  }
  
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
