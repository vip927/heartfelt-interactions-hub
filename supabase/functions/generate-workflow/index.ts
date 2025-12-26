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

// Updated ChatInput template matching latest Langflow schema with lfx imports
function getChatInputTemplate(nodeId: string, displayName: string = "Chat Input") {
  return {
    base_classes: ["Message"],
    beta: false,
    conditional_paths: [],
    custom_fields: {},
    description: "Get chat inputs from the Playground.",
    display_name: displayName,
    documentation: "https://docs.langflow.org/chat-input-and-output",
    edited: false,
    field_order: ["input_value", "should_store_message", "sender", "sender_name", "session_id", "context_id", "files"],
    frozen: false,
    icon: "MessagesSquare",
    legacy: false,
    metadata: {
      code_hash: generateCodeHash(),
      dependencies: {
        dependencies: [{ name: "lfx", version: "0.2.1" }],
        total_dependencies: 1
      },
      module: "custom_components.chat_input"
    },
    minimized: true,
    output_types: [],
    outputs: [{
      allows_loop: false,
      cache: true,
      display_name: "Chat Message",
      group_outputs: false,
      loop_types: null,
      method: "message_response",
      name: "message",
      options: null,
      required_inputs: null,
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
        value: `from lfx.base.data.utils import IMG_FILE_TYPES, TEXT_FILE_TYPES
from lfx.base.io.chat import ChatComponent
from lfx.inputs.inputs import BoolInput
from lfx.io import (
    DropdownInput,
    FileInput,
    MessageTextInput,
    MultilineInput,
    Output,
)
from lfx.schema.message import Message
from lfx.utils.constants import (
    MESSAGE_SENDER_AI,
    MESSAGE_SENDER_NAME_USER,
    MESSAGE_SENDER_USER,
)


class ChatInput(ChatComponent):
    display_name = "Chat Input"
    description = "Get chat inputs from the Playground."
    documentation: str = "https://docs.langflow.org/chat-input-and-output"
    icon = "MessagesSquare"
    name = "ChatInput"
    minimized = True

    inputs = [
        MultilineInput(
            name="input_value",
            display_name="Input Text",
            value="",
            info="Message to be passed as input.",
            input_types=[],
        ),
        BoolInput(
            name="should_store_message",
            display_name="Store Messages",
            info="Store the message in the history.",
            value=True,
            advanced=True,
        ),
        DropdownInput(
            name="sender",
            display_name="Sender Type",
            options=[MESSAGE_SENDER_AI, MESSAGE_SENDER_USER],
            value=MESSAGE_SENDER_USER,
            info="Type of sender.",
            advanced=True,
        ),
        MessageTextInput(
            name="sender_name",
            display_name="Sender Name",
            info="Name of the sender.",
            value=MESSAGE_SENDER_NAME_USER,
            advanced=True,
        ),
        MessageTextInput(
            name="session_id",
            display_name="Session ID",
            info="The session ID of the chat. If empty, the current session ID parameter will be used.",
            advanced=True,
        ),
        MessageTextInput(
            name="context_id",
            display_name="Context ID",
            info="The context ID of the chat. Adds an extra layer to the local memory.",
            value="",
            advanced=True,
        ),
        FileInput(
            name="files",
            display_name="Files",
            file_types=TEXT_FILE_TYPES + IMG_FILE_TYPES,
            info="Files to be sent with the message.",
            advanced=True,
            is_list=True,
            temp_file=True,
        ),
    ]
    outputs = [
        Output(display_name="Chat Message", name="message", method="message_response"),
    ]

    async def message_response(self) -> Message:
        files = self.files if self.files else []
        if files and not isinstance(files, list):
            files = [files]
        files = [f for f in files if f is not None and f != ""]

        session_id = self.session_id or self.graph.session_id or ""
        message = await Message.create(
            text=self.input_value,
            sender=self.sender,
            sender_name=self.sender_name,
            session_id=session_id,
            context_id=self.context_id,
            files=files,
        )
        if session_id and isinstance(message, Message) and self.should_store_message:
            stored_message = await self.send_message(message)
            self.message.value = stored_message
            message = stored_message

        self.status = message
        return message
`
      },
      context_id: {
        _input_type: "MessageTextInput",
        advanced: true,
        display_name: "Context ID",
        dynamic: false,
        info: "The context ID of the chat. Adds an extra layer to the local memory.",
        input_types: ["Message"],
        list: false,
        list_add_label: "Add More",
        load_from_db: false,
        name: "context_id",
        override_skip: false,
        placeholder: "",
        required: false,
        show: true,
        title_case: false,
        tool_mode: false,
        trace_as_input: true,
        trace_as_metadata: true,
        track_in_telemetry: false,
        type: "str",
        value: ""
      },
      files: {
        _input_type: "FileInput",
        advanced: true,
        display_name: "Files",
        dynamic: false,
        fileTypes: ["csv", "json", "pdf", "txt", "md", "mdx", "yaml", "yml", "xml", "html", "htm", "docx", "py", "sh", "sql", "js", "ts", "tsx", "jpg", "jpeg", "png", "bmp", "image"],
        file_path: "",
        info: "Files to be sent with the message.",
        list: true,
        list_add_label: "Add More",
        name: "files",
        override_skip: false,
        placeholder: "",
        required: false,
        show: true,
        temp_file: true,
        title_case: false,
        tool_mode: false,
        trace_as_metadata: true,
        track_in_telemetry: false,
        type: "file",
        value: ""
      },
      input_value: {
        _input_type: "MultilineInput",
        advanced: false,
        ai_enabled: false,
        copy_field: false,
        display_name: "Input Text",
        dynamic: false,
        info: "Message to be passed as input.",
        input_types: [],
        list: false,
        list_add_label: "Add More",
        load_from_db: false,
        multiline: true,
        name: "input_value",
        override_skip: false,
        placeholder: "",
        required: false,
        show: true,
        title_case: false,
        tool_mode: false,
        trace_as_input: true,
        trace_as_metadata: true,
        track_in_telemetry: false,
        type: "str",
        value: ""
      },
      sender: {
        _input_type: "DropdownInput",
        advanced: true,
        combobox: false,
        dialog_inputs: {},
        display_name: "Sender Type",
        dynamic: false,
        external_options: {},
        info: "Type of sender.",
        name: "sender",
        options: ["Machine", "User"],
        options_metadata: [],
        override_skip: false,
        placeholder: "",
        required: false,
        show: true,
        title_case: false,
        toggle: false,
        tool_mode: false,
        trace_as_metadata: true,
        track_in_telemetry: true,
        type: "str",
        value: "User"
      },
      sender_name: {
        _input_type: "MessageTextInput",
        advanced: true,
        display_name: "Sender Name",
        dynamic: false,
        info: "Name of the sender.",
        input_types: ["Message"],
        list: false,
        list_add_label: "Add More",
        load_from_db: false,
        name: "sender_name",
        override_skip: false,
        placeholder: "",
        required: false,
        show: true,
        title_case: false,
        tool_mode: false,
        trace_as_input: true,
        trace_as_metadata: true,
        track_in_telemetry: false,
        type: "str",
        value: "User"
      },
      session_id: {
        _input_type: "MessageTextInput",
        advanced: true,
        display_name: "Session ID",
        dynamic: false,
        info: "The session ID of the chat. If empty, the current session ID parameter will be used.",
        input_types: ["Message"],
        list: false,
        list_add_label: "Add More",
        load_from_db: false,
        name: "session_id",
        override_skip: false,
        placeholder: "",
        required: false,
        show: true,
        title_case: false,
        tool_mode: false,
        trace_as_input: true,
        trace_as_metadata: true,
        track_in_telemetry: false,
        type: "str",
        value: ""
      },
      should_store_message: {
        _input_type: "BoolInput",
        advanced: true,
        display_name: "Store Messages",
        dynamic: false,
        info: "Store the message in the history.",
        list: false,
        list_add_label: "Add More",
        name: "should_store_message",
        override_skip: false,
        placeholder: "",
        required: false,
        show: true,
        title_case: false,
        tool_mode: false,
        trace_as_metadata: true,
        track_in_telemetry: true,
        type: "bool",
        value: true
      }
    },
    tool_mode: false
  };
}

// Updated ChatOutput template matching latest Langflow schema
function getChatOutputTemplate(nodeId: string, displayName: string = "Chat Output") {
  return {
    base_classes: ["Message"],
    beta: false,
    conditional_paths: [],
    custom_fields: {},
    description: "Display a chat message in the Playground.",
    display_name: displayName,
    documentation: "https://docs.langflow.org/chat-input-and-output",
    edited: false,
    field_order: ["input_value", "should_store_message", "sender", "sender_name", "session_id", "context_id", "data_template", "clean_data"],
    frozen: false,
    icon: "MessagesSquare",
    legacy: false,
    metadata: {
      code_hash: generateCodeHash(),
      dependencies: {
        dependencies: [
          { name: "orjson", version: "3.10.15" },
          { name: "fastapi", version: "0.123.0" },
          { name: "lfx", version: "0.2.1" }
        ],
        total_dependencies: 3
      },
      module: "custom_components.chat_output"
    },
    minimized: true,
    output_types: [],
    outputs: [{
      allows_loop: false,
      cache: true,
      display_name: "Output Message",
      group_outputs: false,
      loop_types: null,
      method: "message_response",
      name: "message",
      options: null,
      required_inputs: null,
      selected: "Message",
      tool_mode: true,
      types: ["Message"],
      value: "__UNDEFINED__"
    }],
    pinned: false,
    template: {
      _type: "Component",
      clean_data: {
        _input_type: "BoolInput",
        advanced: true,
        display_name: "Basic Clean Data",
        dynamic: false,
        info: "Whether to clean data before converting to string.",
        list: false,
        list_add_label: "Add More",
        name: "clean_data",
        override_skip: false,
        placeholder: "",
        required: false,
        show: true,
        title_case: false,
        tool_mode: false,
        trace_as_metadata: true,
        track_in_telemetry: true,
        type: "bool",
        value: true
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
        value: `from collections.abc import Generator
from typing import Any

import orjson
from fastapi.encoders import jsonable_encoder

from lfx.base.io.chat import ChatComponent
from lfx.helpers.data import safe_convert
from lfx.inputs.inputs import BoolInput, DropdownInput, HandleInput, MessageTextInput
from lfx.schema.data import Data
from lfx.schema.dataframe import DataFrame
from lfx.schema.message import Message
from lfx.schema.properties import Source
from lfx.template.field.base import Output
from lfx.utils.constants import (
    MESSAGE_SENDER_AI,
    MESSAGE_SENDER_NAME_AI,
    MESSAGE_SENDER_USER,
)


class ChatOutput(ChatComponent):
    display_name = "Chat Output"
    description = "Display a chat message in the Playground."
    documentation: str = "https://docs.langflow.org/chat-input-and-output"
    icon = "MessagesSquare"
    name = "ChatOutput"
    minimized = True

    inputs = [
        HandleInput(
            name="input_value",
            display_name="Inputs",
            info="Message to be passed as output.",
            input_types=["Data", "DataFrame", "Message"],
            required=True,
        ),
        BoolInput(
            name="should_store_message",
            display_name="Store Messages",
            info="Store the message in the history.",
            value=True,
            advanced=True,
        ),
        DropdownInput(
            name="sender",
            display_name="Sender Type",
            options=[MESSAGE_SENDER_AI, MESSAGE_SENDER_USER],
            value=MESSAGE_SENDER_AI,
            advanced=True,
            info="Type of sender.",
        ),
        MessageTextInput(
            name="sender_name",
            display_name="Sender Name",
            info="Name of the sender.",
            value=MESSAGE_SENDER_NAME_AI,
            advanced=True,
        ),
        MessageTextInput(
            name="session_id",
            display_name="Session ID",
            info="The session ID of the chat. If empty, the current session ID parameter will be used.",
            advanced=True,
        ),
        MessageTextInput(
            name="context_id",
            display_name="Context ID",
            info="The context ID of the chat. Adds an extra layer to the local memory.",
            value="",
            advanced=True,
        ),
        MessageTextInput(
            name="data_template",
            display_name="Data Template",
            value="{text}",
            advanced=True,
            info="Template to convert Data to Text. If left empty, it will be dynamically set to the Data's text key.",
        ),
        BoolInput(
            name="clean_data",
            display_name="Basic Clean Data",
            value=True,
            advanced=True,
            info="Whether to clean data before converting to string.",
        ),
    ]
    outputs = [
        Output(
            display_name="Output Message",
            name="message",
            method="message_response",
        ),
    ]

    async def message_response(self) -> Message:
        text = self.convert_to_string()
        source, _, display_name, source_id = self.get_properties_from_source_component()

        if isinstance(self.input_value, Message) and not self.is_connected_to_chat_input():
            message = self.input_value
            message.text = text
            existing_session_id = message.session_id
        else:
            message = Message(text=text)
            existing_session_id = None

        message.sender = self.sender
        message.sender_name = self.sender_name
        message.session_id = (
            self.session_id or existing_session_id or (self.graph.session_id if hasattr(self, "graph") else None) or ""
        )
        message.context_id = self.context_id
        message.flow_id = self.graph.flow_id if hasattr(self, "graph") else None

        if message.session_id and self.should_store_message:
            stored_message = await self.send_message(message)
            self.message.value = stored_message
            message = stored_message

        self.status = message
        return message
`
      },
      context_id: {
        _input_type: "MessageTextInput",
        advanced: true,
        display_name: "Context ID",
        dynamic: false,
        info: "The context ID of the chat. Adds an extra layer to the local memory.",
        input_types: ["Message"],
        list: false,
        list_add_label: "Add More",
        load_from_db: false,
        name: "context_id",
        override_skip: false,
        placeholder: "",
        required: false,
        show: true,
        title_case: false,
        tool_mode: false,
        trace_as_input: true,
        trace_as_metadata: true,
        track_in_telemetry: false,
        type: "str",
        value: ""
      },
      data_template: {
        _input_type: "MessageTextInput",
        advanced: true,
        display_name: "Data Template",
        dynamic: false,
        info: "Template to convert Data to Text. If left empty, it will be dynamically set to the Data's text key.",
        input_types: ["Message"],
        list: false,
        list_add_label: "Add More",
        load_from_db: false,
        name: "data_template",
        override_skip: false,
        placeholder: "",
        required: false,
        show: true,
        title_case: false,
        tool_mode: false,
        trace_as_input: true,
        trace_as_metadata: true,
        track_in_telemetry: false,
        type: "str",
        value: "{text}"
      },
      input_value: {
        _input_type: "HandleInput",
        advanced: false,
        display_name: "Inputs",
        dynamic: false,
        info: "Message to be passed as output.",
        input_types: ["Data", "DataFrame", "Message"],
        list: false,
        list_add_label: "Add More",
        name: "input_value",
        override_skip: false,
        placeholder: "",
        required: true,
        show: true,
        title_case: false,
        trace_as_metadata: true,
        track_in_telemetry: false,
        type: "other",
        value: ""
      },
      sender: {
        _input_type: "DropdownInput",
        advanced: true,
        combobox: false,
        dialog_inputs: {},
        display_name: "Sender Type",
        dynamic: false,
        external_options: {},
        info: "Type of sender.",
        name: "sender",
        options: ["Machine", "User"],
        options_metadata: [],
        override_skip: false,
        placeholder: "",
        required: false,
        show: true,
        title_case: false,
        toggle: false,
        tool_mode: false,
        trace_as_metadata: true,
        track_in_telemetry: true,
        type: "str",
        value: "Machine"
      },
      sender_name: {
        _input_type: "MessageTextInput",
        advanced: true,
        display_name: "Sender Name",
        dynamic: false,
        info: "Name of the sender.",
        input_types: ["Message"],
        list: false,
        list_add_label: "Add More",
        load_from_db: false,
        name: "sender_name",
        override_skip: false,
        placeholder: "",
        required: false,
        show: true,
        title_case: false,
        tool_mode: false,
        trace_as_input: true,
        trace_as_metadata: true,
        track_in_telemetry: false,
        type: "str",
        value: "AI"
      },
      session_id: {
        _input_type: "MessageTextInput",
        advanced: true,
        display_name: "Session ID",
        dynamic: false,
        info: "The session ID of the chat. If empty, the current session ID parameter will be used.",
        input_types: ["Message"],
        list: false,
        list_add_label: "Add More",
        load_from_db: false,
        name: "session_id",
        override_skip: false,
        placeholder: "",
        required: false,
        show: true,
        title_case: false,
        tool_mode: false,
        trace_as_input: true,
        trace_as_metadata: true,
        track_in_telemetry: false,
        type: "str",
        value: ""
      },
      should_store_message: {
        _input_type: "BoolInput",
        advanced: true,
        display_name: "Store Messages",
        dynamic: false,
        info: "Store the message in the history.",
        list: false,
        list_add_label: "Add More",
        name: "should_store_message",
        override_skip: false,
        placeholder: "",
        required: false,
        show: true,
        title_case: false,
        tool_mode: false,
        trace_as_metadata: true,
        track_in_telemetry: true,
        type: "bool",
        value: true
      }
    },
    tool_mode: false
  };
}

// Updated TextInput template matching latest Langflow schema
function getTextInputTemplate(nodeId: string, displayName: string = "Text Input", inputValue: string = "") {
  return {
    base_classes: ["Message"],
    beta: false,
    conditional_paths: [],
    custom_fields: {},
    description: "Get user text inputs.",
    display_name: displayName,
    documentation: "https://docs.langflow.org/text-input-and-output",
    edited: false,
    field_order: ["input_value"],
    frozen: false,
    icon: "type",
    legacy: false,
    metadata: {
      code_hash: generateCodeHash(),
      dependencies: {
        dependencies: [{ name: "lfx", version: "0.2.1" }],
        total_dependencies: 1
      },
      module: "custom_components.text_input"
    },
    minimized: false,
    output_types: [],
    outputs: [{
      allows_loop: false,
      cache: true,
      display_name: "Output Text",
      group_outputs: false,
      loop_types: null,
      method: "text_response",
      name: "text",
      options: null,
      required_inputs: null,
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
        value: `from lfx.base.io.text import TextComponent
from lfx.io import MultilineInput, Output
from lfx.schema.message import Message


class TextInputComponent(TextComponent):
    display_name = "Text Input"
    description = "Get user text inputs."
    documentation: str = "https://docs.langflow.org/text-input-and-output"
    icon = "type"
    name = "TextInput"

    inputs = [
        MultilineInput(
            name="input_value",
            display_name="Text",
            info="Text to be passed as input.",
        ),
    ]
    outputs = [
        Output(display_name="Output Text", name="text", method="text_response"),
    ]

    def text_response(self) -> Message:
        return Message(
            text=self.input_value,
        )
`
      },
      input_value: {
        _input_type: "MultilineInput",
        advanced: false,
        ai_enabled: false,
        copy_field: false,
        display_name: "Text",
        dynamic: false,
        info: "Text to be passed as input.",
        input_types: ["Message"],
        list: false,
        list_add_label: "Add More",
        load_from_db: false,
        multiline: true,
        name: "input_value",
        override_skip: false,
        placeholder: "",
        required: false,
        show: true,
        title_case: false,
        tool_mode: false,
        trace_as_input: true,
        trace_as_metadata: true,
        track_in_telemetry: false,
        type: "str",
        value: inputValue
      }
    },
    tool_mode: false
  };
}

// Updated Prompt template (keeping original as it matches well)
function getPromptTemplate(nodeId: string, displayName: string = "Prompt", template: string = "") {
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
      value: `from langflow.base.prompts.api_utils import process_prompt_template
from langflow.custom.custom_component.component import Component
from langflow.inputs.inputs import DefaultPromptField
from langflow.io import MessageTextInput, Output, PromptInput
from langflow.schema.message import Message

class PromptComponent(Component):
    display_name = "Prompt"
    description = "Create a prompt template with dynamic variables."
    icon = "braces"
    name = "Prompt"

    inputs = [PromptInput(name="template", display_name="Template")]
    outputs = [Output(display_name="Prompt", name="prompt", method="build_prompt")]

    async def build_prompt(self) -> Message:
        prompt = Message.from_template(**self._attributes)
        self.status = prompt.text
        return prompt`
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

// Updated OpenAIModel template matching latest Langflow schema
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
    field_order: ["input_value", "system_message", "stream", "max_tokens", "model_kwargs", "json_mode", "model_name", "openai_api_base", "api_key", "temperature", "seed", "max_retries", "timeout"],
    frozen: false,
    icon: "OpenAI",
    legacy: false,
    metadata: {
      code_hash: generateCodeHash(),
      dependencies: {
        dependencies: [
          { name: "langchain_openai", version: "0.3.23" },
          { name: "pydantic", version: "2.11.10" },
          { name: "lfx", version: "0.2.1" },
          { name: "openai", version: "1.82.1" }
        ],
        total_dependencies: 4
      },
      keywords: ["model", "llm", "language model", "large language model"],
      module: "custom_components.openai"
    },
    minimized: false,
    output_types: [],
    outputs: [
      {
        allows_loop: false,
        cache: true,
        display_name: "Model Response",
        group_outputs: false,
        loop_types: null,
        method: "text_response",
        name: "text_output",
        options: null,
        required_inputs: null,
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
        loop_types: null,
        method: "build_model",
        name: "model_output",
        options: null,
        required_inputs: null,
        selected: "LanguageModel",
        tool_mode: true,
        types: ["LanguageModel"],
        value: "__UNDEFINED__"
      }
    ],
    pinned: false,
    template: {
      _type: "Component",
      api_key: {
        _input_type: "SecretStrInput",
        advanced: false,
        display_name: "OpenAI API Key",
        dynamic: false,
        info: "The OpenAI API Key to use for the OpenAI model.",
        input_types: [],
        load_from_db: false,
        name: "api_key",
        override_skip: false,
        password: true,
        placeholder: "",
        required: true,
        show: true,
        title_case: false,
        track_in_telemetry: false,
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
        value: `from typing import Any

from langchain_openai import ChatOpenAI
from pydantic.v1 import SecretStr

from lfx.base.models.model import LCModelComponent
from lfx.base.models.openai_constants import OPENAI_CHAT_MODEL_NAMES, OPENAI_REASONING_MODEL_NAMES
from lfx.field_typing import LanguageModel
from lfx.field_typing.range_spec import RangeSpec
from lfx.inputs.inputs import BoolInput, DictInput, DropdownInput, IntInput, SecretStrInput, SliderInput, StrInput
from lfx.log.logger import logger


class OpenAIModelComponent(LCModelComponent):
    display_name = "OpenAI"
    description = "Generates text using OpenAI LLMs."
    icon = "OpenAI"
    name = "OpenAIModel"

    inputs = [
        *LCModelComponent.get_base_inputs(),
        IntInput(
            name="max_tokens",
            display_name="Max Tokens",
            advanced=True,
            info="The maximum number of tokens to generate. Set to 0 for unlimited tokens.",
            range_spec=RangeSpec(min=0, max=128000),
        ),
        DictInput(
            name="model_kwargs",
            display_name="Model Kwargs",
            advanced=True,
            info="Additional keyword arguments to pass to the model.",
        ),
        BoolInput(
            name="json_mode",
            display_name="JSON Mode",
            advanced=True,
            info="If True, it will output JSON regardless of passing a schema.",
        ),
        DropdownInput(
            name="model_name",
            display_name="Model Name",
            advanced=False,
            options=OPENAI_CHAT_MODEL_NAMES + OPENAI_REASONING_MODEL_NAMES,
            value=OPENAI_CHAT_MODEL_NAMES[0],
            combobox=True,
            real_time_refresh=True,
        ),
        StrInput(
            name="openai_api_base",
            display_name="OpenAI API Base",
            advanced=True,
            info="The base URL of the OpenAI API. Defaults to https://api.openai.com/v1.",
        ),
        SecretStrInput(
            name="api_key",
            display_name="OpenAI API Key",
            info="The OpenAI API Key to use for the OpenAI model.",
            advanced=False,
            value="OPENAI_API_KEY",
            required=True,
        ),
        SliderInput(
            name="temperature",
            display_name="Temperature",
            value=0.1,
            range_spec=RangeSpec(min=0, max=1, step=0.01),
            show=True,
        ),
        IntInput(
            name="seed",
            display_name="Seed",
            info="The seed controls the reproducibility of the job.",
            advanced=True,
            value=1,
        ),
        IntInput(
            name="max_retries",
            display_name="Max Retries",
            info="The maximum number of retries to make when generating.",
            advanced=True,
            value=5,
        ),
        IntInput(
            name="timeout",
            display_name="Timeout",
            info="The timeout for requests to OpenAI completion API.",
            advanced=True,
            value=700,
        ),
    ]

    def build_model(self) -> LanguageModel:
        logger.debug(f"Executing request with model: {self.model_name}")
        api_key_value = None
        if self.api_key:
            if isinstance(self.api_key, SecretStr):
                api_key_value = self.api_key.get_secret_value()
            else:
                api_key_value = str(self.api_key)

        model_kwargs = self.model_kwargs or {}
        if "api_key" in model_kwargs:
            model_kwargs = dict(model_kwargs)
            del model_kwargs["api_key"]

        parameters = {
            "api_key": api_key_value,
            "model_name": self.model_name,
            "max_tokens": self.max_tokens or None,
            "model_kwargs": model_kwargs,
            "base_url": self.openai_api_base or "https://api.openai.com/v1",
            "max_retries": self.max_retries,
            "timeout": self.timeout,
        }

        if self.model_name not in OPENAI_REASONING_MODEL_NAMES:
            parameters["temperature"] = self.temperature if self.temperature is not None else 0.1
            parameters["seed"] = self.seed

        if isinstance(parameters.get("api_key"), SecretStr):
            parameters["api_key"] = parameters["api_key"].get_secret_value()
        output = ChatOpenAI(**parameters)
        if self.json_mode:
            output = output.bind(response_format={"type": "json_object"})

        return output
`
      },
      input_value: {
        _input_type: "MessageInput",
        advanced: false,
        display_name: "Input",
        dynamic: false,
        info: "",
        input_types: ["Message"],
        list: false,
        list_add_label: "Add More",
        load_from_db: false,
        name: "input_value",
        override_skip: false,
        placeholder: "",
        required: false,
        show: true,
        title_case: false,
        tool_mode: false,
        trace_as_input: true,
        trace_as_metadata: true,
        track_in_telemetry: false,
        type: "str",
        value: ""
      },
      json_mode: {
        _input_type: "BoolInput",
        advanced: true,
        display_name: "JSON Mode",
        dynamic: false,
        info: "If True, it will output JSON regardless of passing a schema.",
        list: false,
        list_add_label: "Add More",
        name: "json_mode",
        override_skip: false,
        placeholder: "",
        required: false,
        show: true,
        title_case: false,
        tool_mode: false,
        trace_as_metadata: true,
        track_in_telemetry: true,
        type: "bool",
        value: false
      },
      max_retries: {
        _input_type: "IntInput",
        advanced: true,
        display_name: "Max Retries",
        dynamic: false,
        info: "The maximum number of retries to make when generating.",
        list: false,
        list_add_label: "Add More",
        name: "max_retries",
        override_skip: false,
        placeholder: "",
        required: false,
        show: true,
        title_case: false,
        tool_mode: false,
        trace_as_metadata: true,
        track_in_telemetry: true,
        type: "int",
        value: 5
      },
      max_tokens: {
        _input_type: "IntInput",
        advanced: true,
        display_name: "Max Tokens",
        dynamic: false,
        info: "The maximum number of tokens to generate. Set to 0 for unlimited tokens.",
        list: false,
        list_add_label: "Add More",
        name: "max_tokens",
        override_skip: false,
        placeholder: "",
        range_spec: {
          max: 128000,
          min: 0,
          step: 0.1,
          step_type: "float"
        },
        required: false,
        show: true,
        title_case: false,
        tool_mode: false,
        trace_as_metadata: true,
        track_in_telemetry: true,
        type: "int",
        value: ""
      },
      model_kwargs: {
        _input_type: "DictInput",
        advanced: true,
        display_name: "Model Kwargs",
        dynamic: false,
        info: "Additional keyword arguments to pass to the model.",
        list: false,
        list_add_label: "Add More",
        name: "model_kwargs",
        override_skip: false,
        placeholder: "",
        required: false,
        show: true,
        title_case: false,
        tool_mode: false,
        trace_as_input: true,
        track_in_telemetry: false,
        type: "dict",
        value: {}
      },
      model_name: {
        _input_type: "DropdownInput",
        advanced: false,
        combobox: true,
        dialog_inputs: {},
        display_name: "Model Name",
        dynamic: false,
        external_options: {},
        info: "",
        name: "model_name",
        options: ["gpt-4o-mini", "gpt-4o", "gpt-4.1", "gpt-4.1-mini", "gpt-4.1-nano", "gpt-4-turbo", "gpt-4-turbo-preview", "gpt-4", "gpt-3.5-turbo", "gpt-5.1", "gpt-5", "gpt-5-mini", "gpt-5-nano", "gpt-5-chat-latest", "o1", "o3-mini", "o3", "o3-pro", "o4-mini", "o4-mini-high"],
        options_metadata: [],
        override_skip: false,
        placeholder: "",
        real_time_refresh: true,
        required: false,
        show: true,
        title_case: false,
        toggle: false,
        tool_mode: false,
        trace_as_metadata: true,
        track_in_telemetry: true,
        type: "str",
        value: modelName
      },
      openai_api_base: {
        _input_type: "StrInput",
        advanced: true,
        display_name: "OpenAI API Base",
        dynamic: false,
        info: "The base URL of the OpenAI API. Defaults to https://api.openai.com/v1. You can change this to use other APIs like JinaChat, LocalAI and Prem.",
        list: false,
        list_add_label: "Add More",
        load_from_db: false,
        name: "openai_api_base",
        override_skip: false,
        placeholder: "",
        required: false,
        show: true,
        title_case: false,
        tool_mode: false,
        trace_as_metadata: true,
        track_in_telemetry: false,
        type: "str",
        value: ""
      },
      seed: {
        _input_type: "IntInput",
        advanced: true,
        display_name: "Seed",
        dynamic: false,
        info: "The seed controls the reproducibility of the job.",
        list: false,
        list_add_label: "Add More",
        name: "seed",
        override_skip: false,
        placeholder: "",
        required: false,
        show: true,
        title_case: false,
        tool_mode: false,
        trace_as_metadata: true,
        track_in_telemetry: true,
        type: "int",
        value: 1
      },
      stream: {
        _input_type: "BoolInput",
        advanced: true,
        display_name: "Stream",
        dynamic: false,
        info: "Stream the response from the model. Streaming works only in Chat.",
        list: false,
        list_add_label: "Add More",
        name: "stream",
        override_skip: false,
        placeholder: "",
        required: false,
        show: true,
        title_case: false,
        tool_mode: false,
        trace_as_metadata: true,
        track_in_telemetry: true,
        type: "bool",
        value: false
      },
      system_message: {
        _input_type: "MultilineInput",
        advanced: false,
        ai_enabled: false,
        copy_field: false,
        display_name: "System Message",
        dynamic: false,
        info: "System message to pass to the model.",
        input_types: ["Message"],
        list: false,
        list_add_label: "Add More",
        load_from_db: false,
        multiline: true,
        name: "system_message",
        override_skip: false,
        placeholder: "",
        required: false,
        show: true,
        title_case: false,
        tool_mode: false,
        trace_as_input: true,
        trace_as_metadata: true,
        track_in_telemetry: false,
        type: "str",
        value: ""
      },
      temperature: {
        _input_type: "SliderInput",
        advanced: false,
        display_name: "Temperature",
        dynamic: false,
        info: "",
        max_label: "",
        max_label_icon: "",
        min_label: "",
        min_label_icon: "",
        name: "temperature",
        override_skip: false,
        placeholder: "",
        range_spec: {
          max: 1,
          min: 0,
          step: 0.01,
          step_type: "float"
        },
        required: false,
        show: true,
        slider_buttons: false,
        slider_buttons_options: [],
        slider_input: false,
        title_case: false,
        tool_mode: false,
        track_in_telemetry: false,
        type: "slider",
        value: temperature
      },
      timeout: {
        _input_type: "IntInput",
        advanced: true,
        display_name: "Timeout",
        dynamic: false,
        info: "The timeout for requests to OpenAI completion API.",
        list: false,
        list_add_label: "Add More",
        name: "timeout",
        override_skip: false,
        placeholder: "",
        required: false,
        show: true,
        title_case: false,
        tool_mode: false,
        trace_as_metadata: true,
        track_in_telemetry: true,
        type: "int",
        value: 700
      }
    },
    tool_mode: false
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

// Input info for creating edges - updated ChatOutput to match new schema
const INPUT_INFO: Record<string, Record<string, { types: string[]; fieldType: string }>> = {
  "ChatOutput": {
    "input_value": { types: ["Data", "DataFrame", "Message"], fieldType: "other" }
  },
  "OpenAIModel": {
    "input_value": { types: ["Message"], fieldType: "str" },
    "system_message": { types: ["Message"], fieldType: "str" }
  },
  "Prompt": {}
};

function buildWorkflowJson(plan: any) {
  const nodes: any[] = [];
  const edges: any[] = [];
  
  let xPos = 100;
  const yBase = 200;
  const xSpacing = 400;
  
  const promptVariables: Record<string, string[]> = {};
  
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
  
  for (const conn of plan.connections || []) {
    const sourceId = conn.from;
    const targetId = conn.to;
    const sourceType = sourceId.split('-')[0];
    const targetType = targetId.split('-')[0];
    
    const sourceOutput = OUTPUT_INFO[sourceType];
    
    let targetInput;
    if (targetType === "Prompt") {
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
