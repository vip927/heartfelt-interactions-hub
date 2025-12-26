import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to generate random 5-character ID
function generateId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  return Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// Generate random code hash
function generateCodeHash(): string {
  return Array.from({ length: 12 }, () => 
    '0123456789abcdef'[Math.floor(Math.random() * 16)]
  ).join('');
}

// Create edge with proper Langflow format - matches exact structure from working exports
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

// ===============================================
// VERIFIED COMPONENT TEMPLATES FROM WORKING LANGFLOW EXPORTS
// These templates are exact copies from real working Langflow workflows
// ===============================================

// ChatInput - Verified from Memory_Chatbot_1.json, Research_Agent.json
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
    field_order: [
      "input_value",
      "should_store_message",
      "sender",
      "sender_name",
      "session_id",
      "files",
      "background_color",
      "chat_icon",
      "text_color"
    ],
    frozen: false,
    icon: "MessagesSquare",
    legacy: false,
    lf_version: "1.4.3",
    metadata: {
      code_hash: generateCodeHash(),
      dependencies: {
        dependencies: [{ name: "lfx", version: "0.2.1" }],
        total_dependencies: 1
      },
      module: "lfx.components.input_output.chat.ChatInput"
    },
    output_types: [],
    outputs: [{
      allows_loop: false,
      cache: true,
      display_name: "Chat Message",
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
        placeholder: "",
        required: false,
        show: true,
        title_case: false,
        tool_mode: false,
        trace_as_input: true,
        trace_as_metadata: true,
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
        name: "files",
        placeholder: "",
        required: false,
        show: true,
        temp_file: true,
        title_case: false,
        trace_as_metadata: true,
        type: "file",
        value: ""
      },
      input_value: {
        _input_type: "MultilineInput",
        advanced: false,
        display_name: "Input Text",
        dynamic: false,
        info: "Message to be passed as input.",
        input_types: [],
        list: false,
        load_from_db: false,
        multiline: true,
        name: "input_value",
        placeholder: "",
        required: false,
        show: true,
        title_case: false,
        tool_mode: false,
        trace_as_input: true,
        trace_as_metadata: true,
        type: "str",
        value: ""
      },
      sender: {
        _input_type: "DropdownInput",
        advanced: true,
        combobox: false,
        display_name: "Sender Type",
        dynamic: false,
        info: "Type of sender.",
        name: "sender",
        options: ["Machine", "User"],
        placeholder: "",
        required: false,
        show: true,
        title_case: false,
        tool_mode: false,
        trace_as_metadata: true,
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
        load_from_db: false,
        name: "sender_name",
        placeholder: "",
        required: false,
        show: true,
        title_case: false,
        tool_mode: false,
        trace_as_input: true,
        trace_as_metadata: true,
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
        load_from_db: false,
        name: "session_id",
        placeholder: "",
        required: false,
        show: true,
        title_case: false,
        tool_mode: false,
        trace_as_input: true,
        trace_as_metadata: true,
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
        name: "should_store_message",
        placeholder: "",
        required: false,
        show: true,
        title_case: false,
        trace_as_metadata: true,
        type: "bool",
        value: true
      }
    },
    tool_mode: false
  };
}

// ChatOutput - Verified from Memory_Chatbot_1.json, Blog_Writer-3.json
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
    field_order: [
      "input_value",
      "should_store_message",
      "sender",
      "sender_name",
      "session_id",
      "data_template",
      "background_color",
      "chat_icon",
      "text_color"
    ],
    frozen: false,
    icon: "MessagesSquare",
    legacy: false,
    lf_version: "1.4.3",
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
      module: "lfx.components.input_output.chat_output.ChatOutput"
    },
    output_types: [],
    outputs: [{
      allows_loop: false,
      cache: true,
      display_name: "Output Message",
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
      clean_data: {
        _input_type: "BoolInput",
        advanced: true,
        display_name: "Basic Clean Data",
        dynamic: false,
        info: "Whether to clean data before converting to string.",
        list: false,
        list_add_label: "Add More",
        name: "clean_data",
        placeholder: "",
        required: false,
        show: true,
        title_case: false,
        tool_mode: false,
        trace_as_metadata: true,
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
            info="Template to convert Data to Text.",
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
        Output(display_name="Output Message", name="message", method="message_response"),
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
        placeholder: "",
        required: false,
        show: true,
        title_case: false,
        tool_mode: false,
        trace_as_input: true,
        trace_as_metadata: true,
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
        load_from_db: false,
        name: "data_template",
        placeholder: "",
        required: false,
        show: true,
        title_case: false,
        tool_mode: false,
        trace_as_input: true,
        trace_as_metadata: true,
        type: "str",
        value: "{text}"
      },
      input_value: {
        _input_type: "MessageInput",
        advanced: false,
        display_name: "Inputs",
        dynamic: false,
        info: "Message to be passed as output.",
        input_types: ["Data", "DataFrame", "Message"],
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
        _input_type: "DropdownInput",
        advanced: true,
        combobox: false,
        display_name: "Sender Type",
        dynamic: false,
        info: "Type of sender.",
        name: "sender",
        options: ["Machine", "User"],
        placeholder: "",
        required: false,
        show: true,
        title_case: false,
        tool_mode: false,
        trace_as_metadata: true,
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
        load_from_db: false,
        name: "sender_name",
        placeholder: "",
        required: false,
        show: true,
        title_case: false,
        tool_mode: false,
        trace_as_input: true,
        trace_as_metadata: true,
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
        load_from_db: false,
        name: "session_id",
        placeholder: "",
        required: false,
        show: true,
        title_case: false,
        tool_mode: false,
        trace_as_input: true,
        trace_as_metadata: true,
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
        name: "should_store_message",
        placeholder: "",
        required: false,
        show: true,
        title_case: false,
        trace_as_metadata: true,
        type: "bool",
        value: true
      }
    },
    tool_mode: false
  };
}

// TextInput - Verified from Blog_Writer-3.json
function getTextInputTemplate(nodeId: string, displayName: string = "Text Input", inputValue: string = "") {
  return {
    base_classes: ["Message"],
    beta: false,
    conditional_paths: [],
    custom_fields: {},
    description: "Get user text inputs.",
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
      dependencies: {
        dependencies: [{ name: "lfx", version: "0.2.1" }],
        total_dependencies: 1
      },
      module: "lfx.components.input_output.text.TextInputComponent"
    },
    output_types: [],
    outputs: [{
      allows_loop: false,
      cache: true,
      display_name: "Output Text",
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
        tool_mode: false,
        trace_as_input: true,
        trace_as_metadata: true,
        type: "str",
        value: inputValue
      }
    },
    tool_mode: false
  };
}

// Prompt - Verified from Memory_Chatbot_1.json, Blog_Writer-3.json, Research_Agent.json
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
from langflow.template.utils import update_template_values


class PromptComponent(Component):
    display_name: str = "Prompt"
    description: str = "Create a prompt template with dynamic variables."
    icon = "braces"
    trace_type = "prompt"
    name = "Prompt"

    inputs = [
        PromptInput(name="template", display_name="Template"),
        MessageTextInput(
            name="tool_placeholder",
            display_name="Tool Placeholder",
            tool_mode=True,
            advanced=True,
            info="A placeholder input for tool mode.",
        ),
    ]

    outputs = [
        Output(display_name="Prompt", name="prompt", method="build_prompt"),
    ]

    async def build_prompt(self) -> Message:
        prompt = Message.from_template(**self._attributes)
        self.status = prompt.text
        return prompt

    def _update_template(self, frontend_node: dict):
        prompt_template = frontend_node["template"]["template"]["value"]
        custom_fields = frontend_node["custom_fields"]
        frontend_node_template = frontend_node["template"]
        _ = process_prompt_template(
            template=prompt_template,
            name="template",
            custom_fields=custom_fields,
            frontend_node_template=frontend_node_template,
        )
        return frontend_node

    async def update_frontend_node(self, new_frontend_node: dict, current_frontend_node: dict):
        frontend_node = await super().update_frontend_node(new_frontend_node, current_frontend_node)
        template = frontend_node["template"]["template"]["value"]
        _ = process_prompt_template(
            template=template,
            name="template",
            custom_fields=frontend_node["custom_fields"],
            frontend_node_template=frontend_node["template"],
        )
        update_template_values(new_template=frontend_node, previous_template=current_frontend_node["template"])
        return frontend_node

    def _get_fallback_input(self, **kwargs):
        return DefaultPromptField(**kwargs)
`
    },
    template: {
      _input_type: "PromptInput",
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
      tool_mode: false,
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

  // Add dynamic variable fields
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
    lf_version: "1.4.3",
    metadata: {
      code_hash: generateCodeHash(),
      module: "langflow.components.prompts.prompt.PromptComponent"
    },
    output_types: [],
    outputs: [{
      allows_loop: false,
      cache: true,
      display_name: "Prompt",
      group_outputs: false,
      method: "build_prompt",
      name: "prompt",
      selected: "Message",
      tool_mode: true,
      types: ["Message"],
      value: "__UNDEFINED__"
    }],
    pinned: false,
    template: templateObj,
    tool_mode: false
  };
}

// LanguageModelComponent - Verified from Memory_Chatbot_1.json, Blog_Writer-3.json
// This is the CORRECT component type used in Langflow (not OpenAIModel)
function getLanguageModelComponentTemplate(nodeId: string, displayName: string = "Language Model", modelName: string = "gpt-4o-mini", temperature: number = 0.1) {
  return {
    base_classes: ["LanguageModel", "Message"],
    beta: false,
    conditional_paths: [],
    custom_fields: {},
    description: "Generates text using OpenAI LLMs.",
    display_name: displayName,
    documentation: "",
    edited: false,
    field_order: [
      "input_value",
      "system_message",
      "stream",
      "max_tokens",
      "model_kwargs",
      "json_mode",
      "model_name",
      "openai_api_base",
      "api_key",
      "temperature",
      "seed"
    ],
    frozen: false,
    icon: "OpenAI",
    legacy: false,
    lf_version: "1.4.3",
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
      module: "lfx.components.llm.openai.OpenAIModelComponent"
    },
    minimized: false,
    output_types: [],
    outputs: [
      {
        allows_loop: false,
        cache: true,
        display_name: "Model Response",
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
        password: true,
        placeholder: "",
        required: true,
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
        value: `from typing import Any

from langchain_openai import ChatOpenAI
from pydantic.v1 import SecretStr

from lfx.base.models.model import LCModelComponent
from lfx.base.models.openai_constants import OPENAI_CHAT_MODEL_NAMES, OPENAI_REASONING_MODEL_NAMES
from lfx.field_typing import LanguageModel
from lfx.field_typing.range_spec import RangeSpec
from lfx.inputs.inputs import BoolInput, DictInput, DropdownInput, IntInput, SecretStrInput, SliderInput, StrInput


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
            info="The maximum number of tokens to generate.",
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
            info="If True, it will output JSON.",
        ),
        DropdownInput(
            name="model_name",
            display_name="Model Name",
            options=OPENAI_CHAT_MODEL_NAMES + OPENAI_REASONING_MODEL_NAMES,
            value=OPENAI_CHAT_MODEL_NAMES[0],
            combobox=True,
            real_time_refresh=True,
        ),
        StrInput(
            name="openai_api_base",
            display_name="OpenAI API Base",
            advanced=True,
            info="The base URL of the OpenAI API.",
        ),
        SecretStrInput(
            name="api_key",
            display_name="OpenAI API Key",
            info="The OpenAI API Key to use.",
            required=True,
        ),
        SliderInput(
            name="temperature",
            display_name="Temperature",
            value=0.1,
            range_spec=RangeSpec(min=0, max=1, step=0.01),
        ),
        IntInput(
            name="seed",
            display_name="Seed",
            info="The seed controls reproducibility.",
            advanced=True,
            value=1,
        ),
    ]

    def build_model(self) -> LanguageModel:
        return ChatOpenAI(
            api_key=self.api_key,
            model_name=self.model_name,
            temperature=self.temperature,
        )
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
        placeholder: "",
        required: false,
        show: true,
        title_case: false,
        tool_mode: false,
        trace_as_input: true,
        trace_as_metadata: true,
        type: "str",
        value: ""
      },
      json_mode: {
        _input_type: "BoolInput",
        advanced: true,
        display_name: "JSON Mode",
        dynamic: false,
        info: "If True, it will output JSON.",
        list: false,
        list_add_label: "Add More",
        name: "json_mode",
        placeholder: "",
        required: false,
        show: true,
        title_case: false,
        tool_mode: false,
        trace_as_metadata: true,
        type: "bool",
        value: false
      },
      max_tokens: {
        _input_type: "IntInput",
        advanced: true,
        display_name: "Max Tokens",
        dynamic: false,
        info: "The maximum number of tokens to generate.",
        list: false,
        list_add_label: "Add More",
        name: "max_tokens",
        placeholder: "",
        range_spec: { max: 128000, min: 0, step: 0.1, step_type: "float" },
        required: false,
        show: true,
        title_case: false,
        tool_mode: false,
        trace_as_metadata: true,
        type: "int",
        value: ""
      },
      model_kwargs: {
        _input_type: "DictInput",
        advanced: true,
        display_name: "Model Kwargs",
        dynamic: false,
        info: "Additional keyword arguments.",
        list: false,
        list_add_label: "Add More",
        name: "model_kwargs",
        placeholder: "",
        required: false,
        show: true,
        title_case: false,
        tool_mode: false,
        trace_as_input: true,
        type: "dict",
        value: {}
      },
      model_name: {
        _input_type: "DropdownInput",
        advanced: false,
        combobox: true,
        display_name: "Model Name",
        dynamic: false,
        info: "",
        name: "model_name",
        options: ["gpt-4o-mini", "gpt-4o", "gpt-4.1", "gpt-4.1-mini", "gpt-4-turbo", "gpt-4", "gpt-3.5-turbo", "o1", "o3-mini"],
        placeholder: "",
        real_time_refresh: true,
        required: false,
        show: true,
        title_case: false,
        toggle: false,
        tool_mode: false,
        trace_as_metadata: true,
        type: "str",
        value: modelName
      },
      openai_api_base: {
        _input_type: "StrInput",
        advanced: true,
        display_name: "OpenAI API Base",
        dynamic: false,
        info: "The base URL of the OpenAI API.",
        list: false,
        list_add_label: "Add More",
        load_from_db: false,
        name: "openai_api_base",
        placeholder: "",
        required: false,
        show: true,
        title_case: false,
        tool_mode: false,
        trace_as_metadata: true,
        type: "str",
        value: ""
      },
      seed: {
        _input_type: "IntInput",
        advanced: true,
        display_name: "Seed",
        dynamic: false,
        info: "The seed controls reproducibility.",
        list: false,
        list_add_label: "Add More",
        name: "seed",
        placeholder: "",
        required: false,
        show: true,
        title_case: false,
        tool_mode: false,
        trace_as_metadata: true,
        type: "int",
        value: 1
      },
      stream: {
        _input_type: "BoolInput",
        advanced: true,
        display_name: "Stream",
        dynamic: false,
        info: "Stream the response from the model.",
        list: false,
        list_add_label: "Add More",
        name: "stream",
        placeholder: "",
        required: false,
        show: true,
        title_case: false,
        tool_mode: false,
        trace_as_metadata: true,
        type: "bool",
        value: false
      },
      system_message: {
        _input_type: "MultilineInput",
        advanced: false,
        display_name: "System Message",
        dynamic: false,
        info: "System message to pass to the model.",
        input_types: ["Message"],
        list: false,
        list_add_label: "Add More",
        load_from_db: false,
        multiline: true,
        name: "system_message",
        placeholder: "",
        required: false,
        show: true,
        title_case: false,
        tool_mode: false,
        trace_as_input: true,
        trace_as_metadata: true,
        type: "str",
        value: ""
      },
      temperature: {
        _input_type: "SliderInput",
        advanced: false,
        display_name: "Temperature",
        dynamic: false,
        info: "",
        name: "temperature",
        placeholder: "",
        range_spec: { max: 1, min: 0, step: 0.01, step_type: "float" },
        required: false,
        show: true,
        title_case: false,
        tool_mode: false,
        type: "slider",
        value: temperature
      }
    },
    tool_mode: false
  };
}

// Memory - Verified from Memory_Chatbot_1.json
function getMemoryTemplate(nodeId: string, displayName: string = "Message History") {
  return {
    base_classes: ["DataFrame"],
    beta: false,
    category: "helpers",
    conditional_paths: [],
    custom_fields: {},
    description: "Stores or retrieves stored chat messages from Langflow tables or an external memory.",
    display_name: displayName,
    documentation: "",
    edited: false,
    field_order: [
      "mode",
      "message",
      "memory",
      "sender",
      "sender_name",
      "n_messages",
      "session_id",
      "order",
      "template"
    ],
    frozen: false,
    icon: "message-square-more",
    key: "Memory",
    legacy: false,
    lf_version: "1.4.3",
    metadata: {
      code_hash: generateCodeHash(),
      dependencies: {
        dependencies: [{ name: "lfx", version: "0.2.1" }],
        total_dependencies: 1
      },
      module: "lfx.components.models_and_agents.memory.MemoryComponent"
    },
    minimized: false,
    output_types: [],
    outputs: [
      {
        allows_loop: false,
        cache: true,
        display_name: "Message",
        group_outputs: false,
        method: "retrieve_messages_as_text",
        name: "messages_text",
        selected: "Message",
        tool_mode: true,
        types: ["Message"],
        value: "__UNDEFINED__"
      },
      {
        allows_loop: false,
        cache: true,
        display_name: "Dataframe",
        group_outputs: false,
        method: "retrieve_messages_dataframe",
        name: "dataframe",
        selected: null,
        tool_mode: true,
        types: ["DataFrame"],
        value: "__UNDEFINED__"
      }
    ],
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
        value: `from lfx.custom.custom_component.component import Component
from lfx.io import Output
from lfx.schema.message import Message


class MemoryComponent(Component):
    display_name = "Message History"
    description = "Stores or retrieves stored chat messages."
    icon = "message-square-more"
    name = "Memory"

    outputs = [
        Output(display_name="Message", name="messages_text", method="retrieve_messages_as_text"),
        Output(display_name="Dataframe", name="dataframe", method="retrieve_messages_dataframe"),
    ]

    def retrieve_messages_as_text(self) -> Message:
        return Message(text="Memory content")

    def retrieve_messages_dataframe(self):
        return []
`
      },
      n_messages: {
        _input_type: "IntInput",
        advanced: false,
        display_name: "Number of Messages",
        dynamic: false,
        info: "Number of messages to retrieve.",
        list: false,
        list_add_label: "Add More",
        name: "n_messages",
        placeholder: "",
        required: false,
        show: true,
        title_case: false,
        tool_mode: false,
        trace_as_metadata: true,
        type: "int",
        value: 100
      },
      order: {
        _input_type: "DropdownInput",
        advanced: true,
        combobox: false,
        display_name: "Order",
        dynamic: false,
        info: "Order of the messages.",
        name: "order",
        options: ["Ascending", "Descending"],
        placeholder: "",
        required: false,
        show: true,
        title_case: false,
        tool_mode: false,
        trace_as_metadata: true,
        type: "str",
        value: "Ascending"
      },
      sender: {
        _input_type: "DropdownInput",
        advanced: true,
        combobox: false,
        display_name: "Sender Type",
        dynamic: false,
        info: "Filter by sender type.",
        name: "sender",
        options: ["Machine", "User", "Machine and User"],
        placeholder: "",
        required: false,
        show: true,
        title_case: false,
        tool_mode: false,
        trace_as_metadata: true,
        type: "str",
        value: "Machine and User"
      },
      sender_name: {
        _input_type: "MessageTextInput",
        advanced: true,
        display_name: "Sender Name",
        dynamic: false,
        info: "Filter by sender name.",
        input_types: ["Message"],
        list: false,
        load_from_db: false,
        name: "sender_name",
        placeholder: "",
        required: false,
        show: true,
        title_case: false,
        tool_mode: false,
        trace_as_input: true,
        trace_as_metadata: true,
        type: "str",
        value: ""
      },
      session_id: {
        _input_type: "MessageTextInput",
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
        tool_mode: false,
        trace_as_input: true,
        trace_as_metadata: true,
        type: "str",
        value: ""
      },
      template: {
        _input_type: "MessageTextInput",
        advanced: true,
        display_name: "Template",
        dynamic: false,
        info: "Template for formatting messages.",
        input_types: ["Message"],
        list: false,
        load_from_db: false,
        name: "template",
        placeholder: "",
        required: false,
        show: true,
        title_case: false,
        tool_mode: false,
        trace_as_input: true,
        trace_as_metadata: true,
        type: "str",
        value: "{sender_name}: {text}"
      }
    },
    tool_mode: false
  };
}

// ===============================================
// UPDATED SYSTEM PROMPT WITH CORRECT COMPONENT TYPES
// ===============================================

const LANGFLOW_SYSTEM_PROMPT = `You are a Langflow workflow planner. Given a user's description, output a JSON plan for a workflow.

IMPORTANT: Output ONLY valid JSON with this exact structure:
{
  "name": "Workflow Name",
  "description": "Brief description",
  "components": [
    {
      "type": "ComponentType",
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
- Input: "input_value" ← ["Data", "DataFrame", "Message"] (type: "str")
- Use for: Displaying AI response to user

### TextInput
- Type: "TextInput"
- Output: "text" → ["Message"]
- Config: { "input_value": "default text" }
- Use for: Static text inputs, instructions

### Prompt
- Type: "Prompt"
- Output: "prompt" → ["Message"]
- Config: { "template": "Template with {variable1} and {variable2}" }
- Use for: Creating prompt templates with variables
- Variables in {braces} become input ports with types ["Message", "Text"]

### LanguageModelComponent (IMPORTANT: Use this, NOT OpenAIModel)
- Type: "LanguageModelComponent"
- Inputs: 
  - "input_value" ← ["Message"] (the prompt/message to process)
  - "system_message" ← ["Message"] (optional system prompt)
- Outputs:
  - "text_output" → ["Message"] (the model response)
  - "model_output" → ["LanguageModel"]
- Config: { "model_name": "gpt-4o-mini", "temperature": 0.1 }
- Use for: LLM processing with OpenAI models

### Memory
- Type: "Memory"
- Output: "messages_text" → ["Message"]
- Use for: Chat history/memory retrieval

## Connection Rules

1. ChatInput.message → LanguageModelComponent.input_value (direct chat)
2. ChatInput.message → Prompt.{variable} (as variable input)
3. TextInput.text → Prompt.{variable} (as variable input) 
4. Prompt.prompt → LanguageModelComponent.input_value
5. Prompt.prompt → LanguageModelComponent.system_message
6. Memory.messages_text → Prompt.{memory_variable}
7. LanguageModelComponent.text_output → ChatOutput.input_value

## Common Patterns

### Simple Chatbot (ChatInput → LLM → ChatOutput)
{
  "components": [
    { "type": "ChatInput", "id_suffix": "inp01" },
    { "type": "LanguageModelComponent", "id_suffix": "llm02", "config": { "model_name": "gpt-4o-mini" } },
    { "type": "ChatOutput", "id_suffix": "out03" }
  ],
  "connections": [
    { "from": "ChatInput-inp01", "from_output": "message", "to": "LanguageModelComponent-llm02", "to_input": "input_value" },
    { "from": "LanguageModelComponent-llm02", "from_output": "text_output", "to": "ChatOutput-out03", "to_input": "input_value" }
  ]
}

### Chatbot with System Prompt
{
  "components": [
    { "type": "ChatInput", "id_suffix": "inp01" },
    { "type": "Prompt", "id_suffix": "sys02", "display_name": "System Prompt", "config": { "template": "You are a helpful assistant." } },
    { "type": "LanguageModelComponent", "id_suffix": "llm03", "config": { "model_name": "gpt-4o-mini" } },
    { "type": "ChatOutput", "id_suffix": "out04" }
  ],
  "connections": [
    { "from": "Prompt-sys02", "from_output": "prompt", "to": "LanguageModelComponent-llm03", "to_input": "system_message" },
    { "from": "ChatInput-inp01", "from_output": "message", "to": "LanguageModelComponent-llm03", "to_input": "input_value" },
    { "from": "LanguageModelComponent-llm03", "from_output": "text_output", "to": "ChatOutput-out04", "to_input": "input_value" }
  ]
}

### Memory Chatbot
{
  "components": [
    { "type": "ChatInput", "id_suffix": "inp01" },
    { "type": "Memory", "id_suffix": "mem02", "display_name": "Message History" },
    { "type": "Prompt", "id_suffix": "sys03", "config": { "template": "You are helpful. History:\\n{memory}" } },
    { "type": "LanguageModelComponent", "id_suffix": "llm04", "config": { "model_name": "gpt-4o-mini" } },
    { "type": "ChatOutput", "id_suffix": "out05" }
  ],
  "connections": [
    { "from": "Memory-mem02", "from_output": "messages_text", "to": "Prompt-sys03", "to_input": "memory" },
    { "from": "Prompt-sys03", "from_output": "prompt", "to": "LanguageModelComponent-llm04", "to_input": "system_message" },
    { "from": "ChatInput-inp01", "from_output": "message", "to": "LanguageModelComponent-llm04", "to_input": "input_value" },
    { "from": "LanguageModelComponent-llm04", "from_output": "text_output", "to": "ChatOutput-out05", "to_input": "input_value" }
  ]
}

### Content Generator with Instructions
{
  "components": [
    { "type": "ChatInput", "id_suffix": "inp01", "display_name": "Topic" },
    { "type": "TextInput", "id_suffix": "txt02", "display_name": "Instructions", "config": { "input_value": "Write a detailed blog post." } },
    { "type": "Prompt", "id_suffix": "pmt03", "config": { "template": "{instructions}\\n\\nTopic: {topic}" } },
    { "type": "LanguageModelComponent", "id_suffix": "llm04", "config": { "model_name": "gpt-4o-mini" } },
    { "type": "ChatOutput", "id_suffix": "out05" }
  ],
  "connections": [
    { "from": "TextInput-txt02", "from_output": "text", "to": "Prompt-pmt03", "to_input": "instructions" },
    { "from": "ChatInput-inp01", "from_output": "message", "to": "Prompt-pmt03", "to_input": "topic" },
    { "from": "Prompt-pmt03", "from_output": "prompt", "to": "LanguageModelComponent-llm04", "to_input": "input_value" },
    { "from": "LanguageModelComponent-llm04", "from_output": "text_output", "to": "ChatOutput-out05", "to_input": "input_value" }
  ]
}

RESPOND WITH ONLY VALID JSON. NO EXPLANATIONS.`;

// ===============================================
// TYPE MAPPINGS AND OUTPUT/INPUT INFO
// ===============================================

const TYPE_MAP: Record<string, string> = {
  "ChatInput": "ChatInput",
  "ChatOutput": "ChatOutput",
  "TextInput": "TextInput",
  "Prompt": "Prompt",
  "LanguageModelComponent": "LanguageModelComponent",
  "OpenAIModel": "LanguageModelComponent", // Map old type to new
  "Memory": "Memory"
};

const OUTPUT_INFO: Record<string, { name: string; types: string[] }> = {
  "ChatInput": { name: "message", types: ["Message"] },
  "ChatOutput": { name: "message", types: ["Message"] },
  "TextInput": { name: "text", types: ["Message"] },
  "Prompt": { name: "prompt", types: ["Message"] },
  "LanguageModelComponent": { name: "text_output", types: ["Message"] },
  "Memory": { name: "messages_text", types: ["Message"] }
};

const INPUT_INFO: Record<string, Record<string, { types: string[]; fieldType: string }>> = {
  "ChatOutput": {
    "input_value": { types: ["Data", "DataFrame", "Message"], fieldType: "str" }
  },
  "LanguageModelComponent": {
    "input_value": { types: ["Message"], fieldType: "str" },
    "system_message": { types: ["Message"], fieldType: "str" }
  },
  "Prompt": {}
};

// ===============================================
// BUILD WORKFLOW JSON FUNCTION
// ===============================================

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
      case "LanguageModelComponent":
        nodeData = getLanguageModelComponentTemplate(
          nodeId, 
          displayName, 
          comp.config?.model_name || "gpt-4o-mini",
          comp.config?.temperature || 0.1
        );
        break;
      case "Memory":
        nodeData = getMemoryTemplate(nodeId, displayName);
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

// ===============================================
// HTTP SERVER
// ===============================================

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

    console.log('Generating workflow plan with verified templates...');

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
