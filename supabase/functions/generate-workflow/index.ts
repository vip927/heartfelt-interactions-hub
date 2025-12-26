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
// CORE COMPONENT TEMPLATES
// ===============================================

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
    metadata: { code_hash: generateCodeHash(), module: "lfx.components.input_output.chat.ChatInput" },
    output_types: [],
    outputs: [{
      allows_loop: false, cache: true, display_name: "Chat Message",
      method: "message_response", name: "message", selected: "Message",
      tool_mode: true, types: ["Message"], value: "__UNDEFINED__"
    }],
    pinned: false,
    template: {
      _type: "Component",
      code: { advanced: true, dynamic: true, type: "code", value: "" },
      input_value: {
        _input_type: "MultilineInput", advanced: false, display_name: "Input Text",
        input_types: [], list: false, name: "input_value", type: "str", value: ""
      },
      sender: {
        _input_type: "DropdownInput", advanced: true, display_name: "Sender Type",
        options: ["Machine", "User"], type: "str", value: "User"
      },
      sender_name: {
        _input_type: "MessageTextInput", advanced: true, display_name: "Sender Name",
        input_types: ["Message"], type: "str", value: "User"
      },
      session_id: {
        _input_type: "MessageTextInput", advanced: true, display_name: "Session ID",
        input_types: ["Message"], type: "str", value: ""
      },
      should_store_message: {
        _input_type: "BoolInput", advanced: true, display_name: "Store Messages",
        type: "bool", value: true
      }
    },
    tool_mode: false
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
    field_order: ["input_value", "should_store_message", "sender", "sender_name", "session_id"],
    frozen: false,
    icon: "MessagesSquare",
    legacy: false,
    metadata: { code_hash: generateCodeHash(), module: "lfx.components.input_output.chat_output.ChatOutput" },
    output_types: [],
    outputs: [{
      allows_loop: false, cache: true, display_name: "Output Message",
      method: "message_response", name: "message", selected: "Message",
      tool_mode: true, types: ["Message"], value: "__UNDEFINED__"
    }],
    pinned: false,
    template: {
      _type: "Component",
      code: { advanced: true, dynamic: true, type: "code", value: "" },
      input_value: {
        _input_type: "HandleInput", advanced: false, display_name: "Inputs",
        input_types: ["Data", "DataFrame", "Message"], list: true, name: "input_value", type: "str"
      },
      sender: {
        _input_type: "DropdownInput", advanced: true, display_name: "Sender Type",
        options: ["Machine", "User"], type: "str", value: "Machine"
      },
      sender_name: {
        _input_type: "MessageTextInput", advanced: true, display_name: "Sender Name",
        input_types: ["Message"], type: "str", value: "AI"
      },
      session_id: {
        _input_type: "MessageTextInput", advanced: true, display_name: "Session ID",
        input_types: ["Message"], type: "str", value: ""
      },
      should_store_message: {
        _input_type: "BoolInput", advanced: true, display_name: "Store Messages",
        type: "bool", value: true
      }
    },
    tool_mode: false
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
    metadata: { code_hash: generateCodeHash(), module: "lfx.components.input_output.text_input.TextInputComponent" },
    output_types: [],
    outputs: [{
      allows_loop: false, cache: true, display_name: "Text",
      method: "text_response", name: "text", selected: "Message",
      tool_mode: true, types: ["Message"], value: "__UNDEFINED__"
    }],
    pinned: false,
    template: {
      _type: "Component",
      code: { advanced: true, dynamic: true, type: "code", value: "" },
      input_value: {
        _input_type: "MultilineInput", advanced: false, display_name: "Text",
        input_types: [], list: false, multiline: true, name: "input_value", type: "str", value: inputValue
      }
    },
    tool_mode: false
  };
}

function getPromptTemplate(nodeId: string, displayName: string = "Prompt", templateStr: string = "") {
  const varRegex = /\{(\w+)\}/g;
  const variables: string[] = [];
  let m;
  while ((m = varRegex.exec(templateStr)) !== null) {
    if (!variables.includes(m[1])) variables.push(m[1]);
  }
  
  const template: any = {
    _type: "Component",
    code: { advanced: true, dynamic: true, type: "code", value: "" },
    template: {
      _input_type: "PromptInput", advanced: false, display_name: "Template",
      list: false, name: "template", type: "prompt", value: templateStr
    }
  };
  
  for (const v of variables) {
    template[v] = {
      _input_type: "MessageTextInput", advanced: false, display_name: v,
      dynamic: false, input_types: ["Message", "Text"], list: false,
      name: v, type: "str", value: ""
    };
  }
  
  return {
    base_classes: ["Message"],
    beta: false,
    conditional_paths: [],
    custom_fields: { template: variables },
    description: "Create a prompt template with dynamic variables.",
    display_name: displayName,
    documentation: "",
    edited: false,
    field_order: ["template", ...variables],
    frozen: false,
    icon: "prompts",
    legacy: false,
    metadata: { code_hash: generateCodeHash(), module: "lfx.components.prompt.Prompt" },
    output_types: [],
    outputs: [{
      allows_loop: false, cache: true, display_name: "Prompt Message",
      method: "build_prompt", name: "prompt", selected: "Message",
      tool_mode: true, types: ["Message"], value: "__UNDEFINED__"
    }],
    pinned: false,
    template,
    tool_mode: false
  };
}

function getLanguageModelComponentTemplate(nodeId: string, displayName: string = "Language Model", modelName: string = "gpt-4o-mini", temperature: number = 0.1) {
  return {
    base_classes: ["Message", "LanguageModel"],
    beta: false,
    conditional_paths: [],
    custom_fields: {},
    description: "Generate text using OpenAI LLMs with tool-calling capabilities.",
    display_name: displayName,
    documentation: "",
    edited: false,
    field_order: ["model_name", "openai_api_key", "temperature", "input_value", "system_message"],
    frozen: false,
    icon: "OpenAI",
    legacy: false,
    metadata: { code_hash: generateCodeHash(), module: "lfx.components.models.openai.OpenAIModelComponent" },
    output_types: [],
    outputs: [
      { allows_loop: false, cache: true, display_name: "Text", method: "text_response", name: "text_output", selected: "Message", tool_mode: true, types: ["Message"], value: "__UNDEFINED__" },
      { allows_loop: false, cache: true, display_name: "Model", method: "build_model", name: "model_output", selected: "LanguageModel", tool_mode: true, types: ["LanguageModel"], value: "__UNDEFINED__" }
    ],
    pinned: false,
    template: {
      _type: "Component",
      code: { advanced: true, dynamic: true, type: "code", value: "" },
      input_value: {
        _input_type: "HandleInput", advanced: false, display_name: "Input",
        input_types: ["Message"], list: false, name: "input_value", type: "str"
      },
      model_name: {
        _input_type: "DropdownInput", advanced: false, display_name: "Model Name",
        options: ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo", "o1", "o1-mini", "o1-preview"],
        type: "str", value: modelName
      },
      openai_api_key: {
        _input_type: "SecretStrInput", advanced: false, display_name: "OpenAI API Key",
        password: true, type: "str", value: ""
      },
      system_message: {
        _input_type: "HandleInput", advanced: true, display_name: "System Message",
        input_types: ["Message"], list: false, name: "system_message", type: "str"
      },
      temperature: {
        _input_type: "FloatInput", advanced: true, display_name: "Temperature",
        name: "temperature", type: "float", value: temperature
      }
    },
    tool_mode: false
  };
}

function getMemoryTemplate(nodeId: string, displayName: string = "Memory") {
  return {
    base_classes: ["Data", "Message"],
    beta: false,
    conditional_paths: [],
    custom_fields: {},
    description: "Retrieves stored chat messages from Langflow tables or external memory.",
    display_name: displayName,
    documentation: "",
    edited: false,
    field_order: ["session_id", "n_messages", "order", "template"],
    frozen: false,
    icon: "History",
    legacy: false,
    metadata: { code_hash: generateCodeHash(), module: "lfx.components.memory.Memory" },
    output_types: [],
    outputs: [
      { allows_loop: false, cache: true, display_name: "Data", method: "retrieve_messages", name: "messages", selected: "Data", tool_mode: true, types: ["Data"], value: "__UNDEFINED__" },
      { allows_loop: false, cache: true, display_name: "Text", method: "retrieve_messages_as_text", name: "messages_text", selected: "Message", tool_mode: true, types: ["Message"], value: "__UNDEFINED__" }
    ],
    pinned: false,
    template: {
      _type: "Component",
      code: { advanced: true, dynamic: true, type: "code", value: "" },
      n_messages: {
        _input_type: "IntInput", advanced: true, display_name: "Number of Messages",
        name: "n_messages", type: "int", value: 100
      },
      order: {
        _input_type: "DropdownInput", advanced: true, display_name: "Order",
        options: ["Ascending", "Descending"], type: "str", value: "Ascending"
      },
      session_id: {
        _input_type: "MessageTextInput", advanced: false, display_name: "Session ID",
        input_types: ["Message"], name: "session_id", type: "str", value: ""
      },
      template: {
        _input_type: "PromptInput", advanced: true, display_name: "Template",
        name: "template", type: "prompt", value: "{sender_name}: {text}"
      }
    },
    tool_mode: false
  };
}

function getURLComponentTemplate(nodeId: string, displayName: string = "URL", urls: string[] = []) {
  return {
    base_classes: ["DataFrame", "Message"],
    beta: false,
    conditional_paths: [],
    custom_fields: {},
    description: "Load data from a URL and convert to DataFrame.",
    display_name: displayName,
    documentation: "",
    edited: false,
    field_order: ["urls", "timeout"],
    frozen: false,
    icon: "Globe",
    legacy: false,
    metadata: { code_hash: generateCodeHash(), module: "lfx.components.data_source.url.URLComponent" },
    output_types: [],
    outputs: [
      { allows_loop: false, cache: true, display_name: "Page Results", method: "fetch_pages", name: "page_results", selected: "DataFrame", tool_mode: true, types: ["DataFrame"], value: "__UNDEFINED__" },
      { allows_loop: false, cache: true, display_name: "Raw Text", method: "fetch_text", name: "raw_results", selected: "Message", tool_mode: true, types: ["Message"], value: "__UNDEFINED__" }
    ],
    pinned: false,
    template: {
      _type: "Component",
      code: { advanced: true, dynamic: true, type: "code", value: "" },
      timeout: {
        _input_type: "IntInput", advanced: true, display_name: "Timeout",
        name: "timeout", type: "int", value: 10
      },
      urls: {
        _input_type: "MessageTextInput", advanced: false, display_name: "URLs",
        input_types: ["Message"], list: true, name: "urls", type: "str", value: urls.join("\n")
      }
    },
    tool_mode: false
  };
}

function getParserComponentTemplate(nodeId: string, displayName: string = "Parser") {
  return {
    base_classes: ["Message"],
    beta: false,
    conditional_paths: [],
    custom_fields: {},
    description: "Parse data into text using templates.",
    display_name: displayName,
    documentation: "",
    edited: false,
    field_order: ["input_data", "template", "sep"],
    frozen: false,
    icon: "FileText",
    legacy: false,
    metadata: { code_hash: generateCodeHash(), module: "lfx.components.processing.parser.ParserComponent" },
    output_types: [],
    outputs: [{
      allows_loop: false, cache: true, display_name: "Parsed Text",
      method: "parse", name: "parsed_text", selected: "Message",
      tool_mode: true, types: ["Message"], value: "__UNDEFINED__"
    }],
    pinned: false,
    template: {
      _type: "Component",
      code: { advanced: true, dynamic: true, type: "code", value: "" },
      input_data: {
        _input_type: "HandleInput", advanced: false, display_name: "Data",
        input_types: ["DataFrame", "Data"], name: "input_data", type: "other"
      },
      sep: {
        _input_type: "StrInput", advanced: true, display_name: "Separator",
        name: "sep", type: "str", value: "\n"
      },
      template: {
        _input_type: "PromptInput", advanced: false, display_name: "Template",
        name: "template", type: "prompt", value: "{text}"
      }
    },
    tool_mode: false
  };
}

function getFileComponentTemplate(nodeId: string, displayName: string = "File") {
  return {
    base_classes: ["DataFrame", "Message"],
    beta: false,
    conditional_paths: [],
    custom_fields: {},
    description: "Load and parse files including PDFs, documents, and more.",
    display_name: displayName,
    documentation: "",
    edited: false,
    field_order: ["path", "silent_errors"],
    frozen: false,
    icon: "File",
    legacy: false,
    metadata: { code_hash: generateCodeHash(), module: "lfx.components.data_source.file.FileComponent" },
    output_types: [],
    outputs: [
      { allows_loop: false, cache: true, display_name: "Message", method: "load_as_text", name: "message", selected: "Message", tool_mode: true, types: ["Message"], value: "__UNDEFINED__" },
      { allows_loop: false, cache: true, display_name: "DataFrame", method: "load_as_dataframe", name: "dataframe", selected: "DataFrame", tool_mode: true, types: ["DataFrame"], value: "__UNDEFINED__" }
    ],
    pinned: false,
    template: {
      _type: "Component",
      code: { advanced: true, dynamic: true, type: "code", value: "" },
      path: {
        _input_type: "FileInput", advanced: false, display_name: "File",
        fileTypes: ["pdf", "docx", "txt", "md", "json", "csv", "xlsx", "pptx", "jpg", "jpeg", "png"],
        name: "path", type: "file"
      },
      silent_errors: {
        _input_type: "BoolInput", advanced: true, display_name: "Silent Errors",
        name: "silent_errors", type: "bool", value: false
      }
    },
    tool_mode: false
  };
}

// ===============================================
// WEB3/SOLANA COMPONENT TEMPLATES
// ===============================================

function getSolanaTxFetcherTemplate(nodeId: string, displayName: string = "Helius TX Fetcher") {
  return {
    base_classes: ["Data"],
    beta: false,
    conditional_paths: [],
    custom_fields: {},
    description: "Fetches Solana transactions from Helius API for a wallet address.",
    display_name: displayName,
    documentation: "",
    edited: false,
    field_order: ["wallet", "api_key"],
    frozen: false,
    icon: "Download",
    legacy: false,
    metadata: { code_hash: generateCodeHash(), module: "custom_components.helius_tx_fetcher" },
    output_types: [],
    outputs: [{
      allows_loop: false, cache: true, display_name: "TX Data",
      method: "run", name: "txs", selected: "Data",
      tool_mode: true, types: ["Data"], value: "__UNDEFINED__"
    }],
    pinned: false,
    template: {
      _type: "Component",
      code: { advanced: true, dynamic: true, type: "code", value: `import requests
from langflow.custom import Component
from langflow.io import MessageTextInput, Output
from langflow.schema import Data

class SolanaTxFetcher(Component):
    display_name = "Helius TX Fetcher"
    name = "SolanaTxFetcher"
    icon = "Download"

    inputs = [
        MessageTextInput(name="wallet", display_name="Wallet Address", required=True),
        MessageTextInput(name="api_key", display_name="Helius API Key", required=True),
    ]

    outputs = [
        Output(display_name="TX Data", name="txs", method="run")
    ]

    def run(self) -> Data:
        url = (
            f"https://api.helius.xyz/v0/addresses/{self.wallet}/transactions"
            f"?api-key={self.api_key}&limit=40&includeEvents=true"
        )
        try:
            r = requests.get(url, timeout=10)
            txs = r.json()
        except Exception as e:
            return Data(value={"error": str(e)})
        return Data(value={"txs": txs})` },
      wallet: {
        _input_type: "MessageTextInput", advanced: false, display_name: "Wallet Address",
        input_types: ["Message"], name: "wallet", required: true, type: "str", value: ""
      },
      api_key: {
        _input_type: "MessageTextInput", advanced: false, display_name: "Helius API Key",
        input_types: ["Message"], name: "api_key", required: true, type: "str", value: ""
      }
    },
    tool_mode: false
  };
}

function getTxParserTemplate(nodeId: string, displayName: string = "Smart Transaction Parser") {
  return {
    base_classes: ["Data"],
    beta: false,
    conditional_paths: [],
    custom_fields: {},
    description: "Parses Solana transactions with smart swap detection (Jupiter/Raydium/Orca).",
    display_name: displayName,
    documentation: "",
    edited: false,
    field_order: ["txs", "wallet"],
    frozen: false,
    icon: "Activity",
    legacy: false,
    metadata: { code_hash: generateCodeHash(), module: "custom_components.smart_transaction_parser" },
    output_types: [],
    outputs: [{
      allows_loop: false, cache: true, display_name: "Parsed",
      method: "run", name: "parsed", selected: "Data",
      tool_mode: true, types: ["Data"], value: "__UNDEFINED__"
    }],
    pinned: false,
    template: {
      _type: "Component",
      code: { advanced: true, dynamic: true, type: "code", value: "" },
      txs: {
        _input_type: "DataInput", advanced: false, display_name: "TXs",
        input_types: ["Data"], name: "txs", required: true, type: "other", value: ""
      },
      wallet: {
        _input_type: "MessageTextInput", advanced: false, display_name: "Wallet Address",
        input_types: ["Message"], name: "wallet", required: true, type: "str", value: ""
      }
    },
    tool_mode: false
  };
}

function getSolanaBalanceFetcherTemplate(nodeId: string, displayName: string = "Solana Token Balance Fetcher") {
  return {
    base_classes: ["Data"],
    beta: false,
    conditional_paths: [],
    custom_fields: {},
    description: "Fetches SPL token balances from Helius and returns clean amounts.",
    display_name: displayName,
    documentation: "",
    edited: false,
    field_order: ["wallet", "helius_api_key"],
    frozen: false,
    icon: "Wallet",
    legacy: false,
    metadata: { code_hash: generateCodeHash(), module: "custom_components.solana_token_balance_fetcher" },
    output_types: [],
    outputs: [{
      allows_loop: false, cache: true, display_name: "Token Balances",
      method: "get_balances", name: "balances", selected: "Data",
      tool_mode: true, types: ["Data"], value: "__UNDEFINED__"
    }],
    pinned: false,
    template: {
      _type: "Component",
      code: { advanced: true, dynamic: true, type: "code", value: "" },
      wallet: {
        _input_type: "MessageTextInput", advanced: false, display_name: "Wallet Address",
        input_types: ["Message"], name: "wallet", required: true, type: "str", value: ""
      },
      helius_api_key: {
        _input_type: "MessageTextInput", advanced: false, display_name: "Helius API Key",
        input_types: ["Message"], name: "helius_api_key", required: true, type: "str", value: ""
      }
    },
    tool_mode: false
  };
}

function getHeliusMetadataLiteTemplate(nodeId: string, displayName: string = "Metadata Processor") {
  return {
    base_classes: ["Data"],
    beta: false,
    conditional_paths: [],
    custom_fields: {},
    description: "Fetch metadata for mints using Helius v0 and merge with balances.",
    display_name: displayName,
    documentation: "",
    edited: false,
    field_order: ["balances", "api_key"],
    frozen: false,
    icon: "database",
    legacy: false,
    metadata: { code_hash: generateCodeHash(), module: "custom_components.metadata_processor" },
    output_types: [],
    outputs: [{
      allows_loop: false, cache: true, display_name: "Metadata",
      method: "run", name: "metadata", selected: "Data",
      tool_mode: true, types: ["Data"], value: "__UNDEFINED__"
    }],
    pinned: false,
    template: {
      _type: "Component",
      code: { advanced: true, dynamic: true, type: "code", value: "" },
      balances: {
        _input_type: "DataInput", advanced: false, display_name: "Balances",
        input_types: ["Data"], name: "balances", required: true, type: "other", value: ""
      },
      api_key: {
        _input_type: "MessageTextInput", advanced: false, display_name: "Helius API Key",
        input_types: ["Message"], name: "api_key", required: true, type: "str", value: ""
      }
    },
    tool_mode: false
  };
}

function getJupiterPriceFetcherTemplate(nodeId: string, displayName: string = "Jupiter Price Fetcher") {
  return {
    base_classes: ["Data"],
    beta: false,
    conditional_paths: [],
    custom_fields: {},
    description: "Fetches USD prices from Jupiter API for tokens.",
    display_name: displayName,
    documentation: "",
    edited: false,
    field_order: ["tokens"],
    frozen: false,
    icon: "DollarSign",
    legacy: false,
    metadata: { code_hash: generateCodeHash(), module: "custom_components.jupiter_price_fetcher" },
    output_types: [],
    outputs: [{
      allows_loop: false, cache: true, display_name: "Priced",
      method: "run", name: "priced", selected: "Data",
      tool_mode: true, types: ["Data"], value: "__UNDEFINED__"
    }],
    pinned: false,
    template: {
      _type: "Component",
      code: { advanced: true, dynamic: true, type: "code", value: "" },
      tokens: {
        _input_type: "DataInput", advanced: false, display_name: "Tokens",
        input_types: ["Data"], name: "tokens", required: true, type: "other", value: ""
      }
    },
    tool_mode: false
  };
}

function getDataToTextTemplate(nodeId: string, displayName: string = "Data → Text") {
  return {
    base_classes: ["Message"],
    beta: false,
    conditional_paths: [],
    custom_fields: {},
    description: "Converts Data (list/dict) into plain text for Output nodes.",
    display_name: displayName,
    documentation: "",
    edited: false,
    field_order: ["data"],
    frozen: false,
    icon: "type",
    legacy: false,
    metadata: { code_hash: generateCodeHash(), module: "custom_components.data__text" },
    output_types: [],
    outputs: [{
      allows_loop: false, cache: true, display_name: "Message",
      method: "convert", name: "text", selected: "Message",
      tool_mode: true, types: ["Message"], value: "__UNDEFINED__"
    }],
    pinned: false,
    template: {
      _type: "Component",
      code: { advanced: true, dynamic: true, type: "code", value: `from langflow.custom import Component
from langflow.io import DataInput, Output
from langflow.schema.message import Message

class DataToText(Component):
    display_name = "Data → Text"
    description = "Converts Data (list/dict) into plain text for Output nodes."
    icon = "type"
    name = "DataToText"

    inputs = [
        DataInput(name="data", display_name="Data Input", info="Data object from filter")
    ]

    outputs = [
        Output(display_name="Message", name="text", method="convert")
    ]

    def convert(self) -> Message:
        formatted = str(self.data)
        return Message(text=formatted)` },
      data: {
        _input_type: "DataInput", advanced: false, display_name: "Data Input",
        input_types: ["Data"], name: "data", required: false, type: "other", value: ""
      }
    },
    tool_mode: false
  };
}

// ===============================================
// STANDARD LANGFLOW COMPONENT TEMPLATES
// ===============================================

function getWebSearchTemplate(nodeId: string, displayName: string = "Web Search") {
  return {
    base_classes: ["DataFrame"],
    beta: false,
    conditional_paths: [],
    custom_fields: {},
    description: "Search the web, news, or RSS feeds using DuckDuckGo/Google News.",
    display_name: displayName,
    documentation: "",
    edited: false,
    field_order: ["search_mode", "query", "timeout"],
    frozen: false,
    icon: "search",
    legacy: false,
    metadata: { code_hash: generateCodeHash(), module: "lfx.components.data_source.web_search.WebSearchComponent" },
    output_types: [],
    outputs: [{
      allows_loop: false, cache: true, display_name: "Results",
      method: "perform_search", name: "results", selected: "DataFrame",
      tool_mode: true, types: ["DataFrame"], value: "__UNDEFINED__"
    }],
    pinned: false,
    template: {
      _type: "Component",
      code: { advanced: true, dynamic: true, type: "code", value: "" },
      search_mode: {
        _input_type: "TabInput", advanced: false, display_name: "Search Mode",
        options: ["Web", "News", "RSS"], name: "search_mode", type: "str", value: "Web"
      },
      query: {
        _input_type: "MessageTextInput", advanced: false, display_name: "Search Query",
        input_types: ["Message"], name: "query", required: true, type: "str", value: ""
      },
      timeout: {
        _input_type: "IntInput", advanced: true, display_name: "Timeout",
        name: "timeout", type: "int", value: 5
      }
    },
    tool_mode: false
  };
}

function getAPIRequestTemplate(nodeId: string, displayName: string = "API Request") {
  return {
    base_classes: ["Data"],
    beta: false,
    conditional_paths: [],
    custom_fields: {},
    description: "Make HTTP requests to external APIs.",
    display_name: displayName,
    documentation: "",
    edited: false,
    field_order: ["method", "urls", "headers", "body", "timeout"],
    frozen: false,
    icon: "Globe",
    legacy: false,
    metadata: { code_hash: generateCodeHash(), module: "lfx.components.data_source.api_request.APIRequestComponent" },
    output_types: [],
    outputs: [{
      allows_loop: false, cache: true, display_name: "Data",
      method: "make_request", name: "data", selected: "Data",
      tool_mode: true, types: ["Data"], value: "__UNDEFINED__"
    }],
    pinned: false,
    template: {
      _type: "Component",
      code: { advanced: true, dynamic: true, type: "code", value: "" },
      method: {
        _input_type: "DropdownInput", advanced: false, display_name: "Method",
        options: ["GET", "POST", "PUT", "PATCH", "DELETE"], name: "method", type: "str", value: "GET"
      },
      urls: {
        _input_type: "MessageTextInput", advanced: false, display_name: "URLs",
        input_types: ["Message"], list: true, name: "urls", required: true, type: "str", value: ""
      },
      headers: {
        _input_type: "DictInput", advanced: true, display_name: "Headers",
        name: "headers", type: "dict", value: {}
      },
      body: {
        _input_type: "DictInput", advanced: true, display_name: "Body",
        name: "body", type: "dict", value: {}
      },
      timeout: {
        _input_type: "IntInput", advanced: true, display_name: "Timeout",
        name: "timeout", type: "int", value: 30
      }
    },
    tool_mode: false
  };
}

function getDirectoryTemplate(nodeId: string, displayName: string = "Directory") {
  return {
    base_classes: ["Data"],
    beta: false,
    conditional_paths: [],
    custom_fields: {},
    description: "Load files from a local directory recursively.",
    display_name: displayName,
    documentation: "",
    edited: false,
    field_order: ["path", "types", "depth", "load_hidden", "recursive", "silent_errors", "use_multithreading"],
    frozen: false,
    icon: "Folder",
    legacy: false,
    metadata: { code_hash: generateCodeHash(), module: "lfx.components.data_source.directory.DirectoryComponent" },
    output_types: [],
    outputs: [{
      allows_loop: false, cache: true, display_name: "Data",
      method: "load", name: "data", selected: "Data",
      tool_mode: true, types: ["Data"], value: "__UNDEFINED__"
    }],
    pinned: false,
    template: {
      _type: "Component",
      code: { advanced: true, dynamic: true, type: "code", value: "" },
      path: {
        _input_type: "MessageTextInput", advanced: false, display_name: "Path",
        input_types: ["Message"], name: "path", required: true, type: "str", value: ""
      },
      types: {
        _input_type: "MessageTextInput", advanced: true, display_name: "File Types",
        input_types: [], list: true, name: "types", type: "str", value: "txt,md,json"
      },
      depth: {
        _input_type: "IntInput", advanced: true, display_name: "Depth",
        name: "depth", type: "int", value: 1
      },
      recursive: {
        _input_type: "BoolInput", advanced: true, display_name: "Recursive",
        name: "recursive", type: "bool", value: true
      },
      use_multithreading: {
        _input_type: "BoolInput", advanced: true, display_name: "Use Multithreading",
        name: "use_multithreading", type: "bool", value: true
      }
    },
    tool_mode: false
  };
}

function getSaveToFileTemplate(nodeId: string, displayName: string = "Save to File") {
  return {
    base_classes: ["Message"],
    beta: false,
    conditional_paths: [],
    custom_fields: {},
    description: "Save input data to a file (Local, AWS S3, or Google Drive).",
    display_name: displayName,
    documentation: "",
    edited: false,
    field_order: ["storage_type", "input_value", "file_name", "file_format", "append_mode"],
    frozen: false,
    icon: "Save",
    legacy: false,
    metadata: { code_hash: generateCodeHash(), module: "lfx.components.output.save_to_file.SaveToFileComponent" },
    output_types: [],
    outputs: [{
      allows_loop: false, cache: true, display_name: "Message",
      method: "save", name: "message", selected: "Message",
      tool_mode: true, types: ["Message"], value: "__UNDEFINED__"
    }],
    pinned: false,
    template: {
      _type: "Component",
      code: { advanced: true, dynamic: true, type: "code", value: "" },
      storage_type: {
        _input_type: "TabInput", advanced: false, display_name: "Storage",
        options: ["Local", "AWS S3", "Google Drive"], name: "storage_type", type: "str", value: "Local"
      },
      input_value: {
        _input_type: "HandleInput", advanced: false, display_name: "Input",
        input_types: ["Data", "DataFrame", "Message"], name: "input_value", type: "str"
      },
      file_name: {
        _input_type: "MessageTextInput", advanced: false, display_name: "File Name",
        input_types: ["Message"], name: "file_name", required: true, type: "str", value: "output"
      },
      file_format: {
        _input_type: "DropdownInput", advanced: false, display_name: "File Format",
        options: ["txt", "json", "csv", "md", "yaml", "xml", "html"], name: "file_format", type: "str", value: "txt"
      },
      append_mode: {
        _input_type: "BoolInput", advanced: false, display_name: "Append",
        name: "append_mode", type: "bool", value: false
      }
    },
    tool_mode: false
  };
}

function getSplitTextTemplate(nodeId: string, displayName: string = "Split Text") {
  return {
    base_classes: ["Data"],
    beta: false,
    conditional_paths: [],
    custom_fields: {},
    description: "Split text into chunks for processing (essential for RAG pipelines).",
    display_name: displayName,
    documentation: "",
    edited: false,
    field_order: ["data_inputs", "chunk_size", "chunk_overlap", "separator"],
    frozen: false,
    icon: "Scissors",
    legacy: false,
    metadata: { code_hash: generateCodeHash(), module: "lfx.components.processing.split_text.SplitTextComponent" },
    output_types: [],
    outputs: [{
      allows_loop: false, cache: true, display_name: "Chunks",
      method: "split", name: "chunks", selected: "Data",
      tool_mode: true, types: ["Data"], value: "__UNDEFINED__"
    }],
    pinned: false,
    template: {
      _type: "Component",
      code: { advanced: true, dynamic: true, type: "code", value: "" },
      data_inputs: {
        _input_type: "HandleInput", advanced: false, display_name: "Data Inputs",
        input_types: ["Data", "Message"], list: true, name: "data_inputs", type: "other"
      },
      chunk_size: {
        _input_type: "IntInput", advanced: false, display_name: "Chunk Size",
        name: "chunk_size", type: "int", value: 1000
      },
      chunk_overlap: {
        _input_type: "IntInput", advanced: false, display_name: "Chunk Overlap",
        name: "chunk_overlap", type: "int", value: 200
      },
      separator: {
        _input_type: "MessageTextInput", advanced: true, display_name: "Separator",
        input_types: [], name: "separator", type: "str", value: ""
      }
    },
    tool_mode: false
  };
}

function getStructuredOutputTemplate(nodeId: string, displayName: string = "Structured Output") {
  return {
    base_classes: ["Data"],
    beta: false,
    conditional_paths: [],
    custom_fields: {},
    description: "Extract structured data from LLM output using schema definitions.",
    display_name: displayName,
    documentation: "",
    edited: false,
    field_order: ["llm", "input_value", "schema_name", "output_schema"],
    frozen: false,
    icon: "Braces",
    legacy: false,
    metadata: { code_hash: generateCodeHash(), module: "lfx.components.llm_operations.structured_output.StructuredOutputComponent" },
    output_types: [],
    outputs: [{
      allows_loop: false, cache: true, display_name: "Structured Data",
      method: "process", name: "structured_data", selected: "Data",
      tool_mode: true, types: ["Data"], value: "__UNDEFINED__"
    }],
    pinned: false,
    template: {
      _type: "Component",
      code: { advanced: true, dynamic: true, type: "code", value: "" },
      llm: {
        _input_type: "HandleInput", advanced: false, display_name: "Language Model",
        input_types: ["LanguageModel"], name: "llm", type: "other"
      },
      input_value: {
        _input_type: "HandleInput", advanced: false, display_name: "Input",
        input_types: ["Message"], name: "input_value", type: "str"
      },
      schema_name: {
        _input_type: "MessageTextInput", advanced: false, display_name: "Schema Name",
        input_types: [], name: "schema_name", type: "str", value: "ExtractedData"
      },
      output_schema: {
        _input_type: "TableInput", advanced: false, display_name: "Output Schema",
        name: "output_schema", type: "table", value: []
      }
    },
    tool_mode: false
  };
}

function getSmartRouterTemplate(nodeId: string, displayName: string = "Smart Router") {
  return {
    base_classes: ["Message"],
    beta: false,
    conditional_paths: [],
    custom_fields: {},
    description: "LLM-powered conditional routing with dynamic output ports.",
    display_name: displayName,
    documentation: "",
    edited: false,
    field_order: ["llm", "message", "categories", "enable_else_output"],
    frozen: false,
    icon: "route",
    legacy: false,
    metadata: { code_hash: generateCodeHash(), module: "lfx.components.llm_operations.llm_conditional_router.SmartRouterComponent" },
    output_types: [],
    outputs: [
      { allows_loop: false, cache: true, display_name: "Positive", method: "process_case", name: "category_1_result", selected: "Message", tool_mode: true, types: ["Message"], value: "__UNDEFINED__" },
      { allows_loop: false, cache: true, display_name: "Negative", method: "process_case", name: "category_2_result", selected: "Message", tool_mode: true, types: ["Message"], value: "__UNDEFINED__" }
    ],
    pinned: false,
    template: {
      _type: "Component",
      code: { advanced: true, dynamic: true, type: "code", value: "" },
      llm: {
        _input_type: "HandleInput", advanced: false, display_name: "Language Model",
        input_types: ["LanguageModel"], name: "llm", type: "other"
      },
      message: {
        _input_type: "HandleInput", advanced: false, display_name: "Message",
        input_types: ["Message"], name: "message", type: "str"
      },
      categories: {
        _input_type: "TableInput", advanced: false, display_name: "Categories",
        name: "categories", type: "table", value: [
          { name: "Positive", description: "Positive sentiment or confirmation" },
          { name: "Negative", description: "Negative sentiment or rejection" }
        ]
      },
      enable_else_output: {
        _input_type: "BoolInput", advanced: true, display_name: "Enable Else Output",
        name: "enable_else_output", type: "bool", value: false
      }
    },
    tool_mode: false
  };
}

function getPythonREPLTemplate(nodeId: string, displayName: string = "Python REPL") {
  return {
    base_classes: ["Data", "Message"],
    beta: false,
    conditional_paths: [],
    custom_fields: {},
    description: "Execute Python code with input data and return results.",
    display_name: displayName,
    documentation: "",
    edited: false,
    field_order: ["code", "inputs"],
    frozen: false,
    icon: "Code",
    legacy: false,
    metadata: { code_hash: generateCodeHash(), module: "lfx.components.tools.python_repl.PythonREPLComponent" },
    output_types: [],
    outputs: [
      { allows_loop: false, cache: true, display_name: "Data", method: "execute", name: "data", selected: "Data", tool_mode: true, types: ["Data"], value: "__UNDEFINED__" },
      { allows_loop: false, cache: true, display_name: "Message", method: "execute_text", name: "message", selected: "Message", tool_mode: true, types: ["Message"], value: "__UNDEFINED__" }
    ],
    pinned: false,
    template: {
      _type: "Component",
      code: { advanced: false, dynamic: true, type: "code", value: "" },
      inputs: {
        _input_type: "HandleInput", advanced: false, display_name: "Inputs",
        input_types: ["Data", "Message"], list: true, name: "inputs", type: "other"
      }
    },
    tool_mode: false
  };
}

function getDataFrameOperationsTemplate(nodeId: string, displayName: string = "DataFrame Operations") {
  return {
    base_classes: ["DataFrame"],
    beta: false,
    conditional_paths: [],
    custom_fields: {},
    description: "Perform operations on DataFrames: filter, select, drop, merge, and more.",
    display_name: displayName,
    documentation: "",
    edited: false,
    field_order: ["df", "operation", "columns", "filter_query", "sort_by"],
    frozen: false,
    icon: "Table",
    legacy: false,
    metadata: { code_hash: generateCodeHash(), module: "lfx.components.processing.dataframe_operations.DataFrameOperationsComponent" },
    output_types: [],
    outputs: [{
      allows_loop: false, cache: true, display_name: "DataFrame",
      method: "process", name: "output", selected: "DataFrame",
      tool_mode: true, types: ["DataFrame"], value: "__UNDEFINED__"
    }],
    pinned: false,
    template: {
      _type: "Component",
      code: { advanced: true, dynamic: true, type: "code", value: "" },
      df: {
        _input_type: "HandleInput", advanced: false, display_name: "DataFrame",
        input_types: ["DataFrame"], name: "df", type: "other"
      },
      operation: {
        _input_type: "DropdownInput", advanced: false, display_name: "Operation",
        options: ["Select Columns", "Drop Columns", "Filter Rows", "Sort", "Head", "Tail", "Merge"],
        name: "operation", type: "str", value: "Select Columns"
      },
      columns: {
        _input_type: "MessageTextInput", advanced: false, display_name: "Columns",
        input_types: [], list: true, name: "columns", type: "str", value: ""
      },
      filter_query: {
        _input_type: "MessageTextInput", advanced: true, display_name: "Filter Query",
        input_types: [], name: "filter_query", type: "str", value: ""
      },
      sort_by: {
        _input_type: "MessageTextInput", advanced: true, display_name: "Sort By",
        input_types: [], name: "sort_by", type: "str", value: ""
      }
    },
    tool_mode: false
  };
}

function getMCPToolsTemplate(nodeId: string, displayName: string = "MCP Tools") {
  return {
    base_classes: ["Tool"],
    beta: true,
    conditional_paths: [],
    custom_fields: {},
    description: "Connect to MCP servers and use their tools.",
    display_name: displayName,
    documentation: "",
    edited: false,
    field_order: ["server_command", "server_args", "env_vars"],
    frozen: false,
    icon: "Plug",
    legacy: false,
    metadata: { code_hash: generateCodeHash(), module: "lfx.components.tools.mcp.MCPToolsComponent" },
    output_types: [],
    outputs: [{
      allows_loop: false, cache: true, display_name: "Tools",
      method: "get_tools", name: "tools", selected: "Tool",
      tool_mode: true, types: ["Tool"], value: "__UNDEFINED__"
    }],
    pinned: false,
    template: {
      _type: "Component",
      code: { advanced: true, dynamic: true, type: "code", value: "" },
      server_command: {
        _input_type: "MessageTextInput", advanced: false, display_name: "Server Command",
        input_types: [], name: "server_command", required: true, type: "str", value: "npx"
      },
      server_args: {
        _input_type: "MessageTextInput", advanced: false, display_name: "Server Arguments",
        input_types: [], list: true, name: "server_args", type: "str", value: ""
      },
      env_vars: {
        _input_type: "DictInput", advanced: true, display_name: "Environment Variables",
        name: "env_vars", type: "dict", value: {}
      }
    },
    tool_mode: false
  };
}

// ===============================================
// UPDATED SYSTEM PROMPT WITH ALL COMPONENTS
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

### CORE COMPONENTS

**ChatInput**
- Type: "ChatInput"
- Output: "message" → ["Message"]
- Use for: Getting user input from playground

**ChatOutput**
- Type: "ChatOutput"
- Input: "input_value" ← ["Data", "DataFrame", "Message"]
- Use for: Displaying AI response to user

**TextInput**
- Type: "TextInput"
- Output: "text" → ["Message"]
- Config: { "input_value": "default text" }

**Prompt**
- Type: "Prompt"
- Output: "prompt" → ["Message"]
- Config: { "template": "Template with {variable1} and {variable2}" }
- Variables in {braces} become input ports

**LanguageModelComponent**
- Type: "LanguageModelComponent"
- Inputs: "input_value" ← ["Message"], "system_message" ← ["Message"]
- Outputs: "text_output" → ["Message"], "model_output" → ["LanguageModel"]
- Config: { "model_name": "gpt-4o-mini", "temperature": 0.1 }

**Memory**
- Type: "Memory"
- Output: "messages_text" → ["Message"]

**FileComponent**
- Type: "FileComponent"
- Outputs: "message" → ["Message"], "dataframe" → ["DataFrame"]
- Use for: PDFs, documents, images with OCR

### DATA PROCESSING COMPONENTS

**ParserComponent**
- Type: "ParserComponent"
- Input: "input_data" ← ["DataFrame", "Data"]
- Output: "parsed_text" → ["Message"]

**SplitText**
- Type: "SplitText"
- Input: "data_inputs" ← ["Data", "Message"]
- Output: "chunks" → ["Data"]
- Config: { "chunk_size": 1000, "chunk_overlap": 200 }
- Use for: RAG pipelines, text chunking

**DataFrameOperations**
- Type: "DataFrameOperations"
- Input: "df" ← ["DataFrame"]
- Output: "output" → ["DataFrame"]
- Config: { "operation": "Select Columns" }

**DataToText**
- Type: "DataToText"
- Input: "data" ← ["Data"]
- Output: "text" → ["Message"]
- Use for: Converting Data objects to Message text

### WEB & API COMPONENTS

**URLComponent**
- Type: "URLComponent"
- Outputs: "page_results" → ["DataFrame"], "raw_results" → ["Message"]
- Config: { "urls": ["https://example.com"] }

**WebSearchComponent**
- Type: "WebSearchComponent"
- Output: "results" → ["DataFrame"]
- Config: { "search_mode": "Web", "query": "search term" }
- Modes: "Web" (DuckDuckGo), "News" (Google News), "RSS"

**APIRequest**
- Type: "APIRequest"
- Output: "data" → ["Data"]
- Config: { "method": "GET", "urls": ["https://api.example.com"] }

### FILE & STORAGE COMPONENTS

**Directory**
- Type: "Directory"
- Output: "data" → ["Data"]
- Config: { "path": "/path/to/folder", "recursive": true }

**SaveToFile**
- Type: "SaveToFile"
- Input: "input_value" ← ["Data", "DataFrame", "Message"]
- Output: "message" → ["Message"]
- Config: { "storage_type": "Local", "file_name": "output", "file_format": "txt" }

### LLM OPERATIONS

**StructuredOutput**
- Type: "StructuredOutput"
- Inputs: "llm" ← ["LanguageModel"], "input_value" ← ["Message"]
- Output: "structured_data" → ["Data"]
- Use for: Extracting structured data from LLM output

**SmartRouter**
- Type: "SmartRouter"
- Inputs: "llm" ← ["LanguageModel"], "message" ← ["Message"]
- Outputs: "category_1_result" → ["Message"], "category_2_result" → ["Message"]
- Use for: LLM-powered conditional routing

### CODE & TOOLS

**PythonREPL**
- Type: "PythonREPL"
- Input: "inputs" ← ["Data", "Message"]
- Outputs: "data" → ["Data"], "message" → ["Message"]
- Use for: Custom Python code execution

**MCPTools**
- Type: "MCPTools"
- Output: "tools" → ["Tool"]
- Use for: MCP protocol integrations

### WEB3/SOLANA COMPONENTS

**SolanaTxFetcher**
- Type: "SolanaTxFetcher"
- Output: "txs" → ["Data"]
- Config: { "wallet": "address", "api_key": "helius_key" }
- Use for: Fetching Solana transactions from Helius

**TxParser**
- Type: "TxParser"
- Inputs: "txs" ← ["Data"], "wallet" (string)
- Output: "parsed" → ["Data"]
- Use for: Parsing transactions with swap detection

**SolanaBalanceFetcher**
- Type: "SolanaBalanceFetcher"
- Output: "balances" → ["Data"]
- Config: { "wallet": "address", "helius_api_key": "key" }
- Use for: Fetching SPL token balances

**HeliusMetadataLite**
- Type: "HeliusMetadataLite"
- Inputs: "balances" ← ["Data"], "api_key" (string)
- Output: "metadata" → ["Data"]
- Use for: Token metadata enrichment

**JupiterPriceFetcher**
- Type: "JupiterPriceFetcher"
- Input: "tokens" ← ["Data"]
- Output: "priced" → ["Data"]
- Use for: Getting USD prices from Jupiter

## Connection Rules

1. ChatInput.message → LanguageModelComponent.input_value (direct chat)
2. ChatInput.message → Prompt.{variable} (as variable input)
3. Prompt.prompt → LanguageModelComponent.input_value
4. Memory.messages_text → Prompt.{memory_variable}
5. LanguageModelComponent.text_output → ChatOutput.input_value
6. URLComponent.page_results → ParserComponent.input_data
7. ParserComponent.parsed_text → Prompt.{content_variable}
8. FileComponent.message → Prompt.{document_variable}
9. WebSearchComponent.results → ParserComponent.input_data
10. SplitText.chunks → (Vector Store or other processing)
11. Data outputs → DataToText.data → ChatOutput.input_value
12. LanguageModelComponent.model_output → StructuredOutput.llm
13. LanguageModelComponent.model_output → SmartRouter.llm

### Web3/Solana Pipeline Connections
14. SolanaTxFetcher.txs → TxParser.txs
15. TxParser.parsed → DataToText.data
16. SolanaBalanceFetcher.balances → HeliusMetadataLite.balances
17. HeliusMetadataLite.metadata → JupiterPriceFetcher.tokens
18. JupiterPriceFetcher.priced → DataToText.data

## Example Workflows

### Simple Chatbot
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

### Web Search Pipeline
{
  "components": [
    { "type": "ChatInput", "id_suffix": "inp01" },
    { "type": "WebSearchComponent", "id_suffix": "web02" },
    { "type": "ParserComponent", "id_suffix": "prs03" },
    { "type": "Prompt", "id_suffix": "pmt04", "config": { "template": "Based on these search results:\\n{results}\\n\\nAnswer: {question}" } },
    { "type": "LanguageModelComponent", "id_suffix": "llm05" },
    { "type": "ChatOutput", "id_suffix": "out06" }
  ],
  "connections": [
    { "from": "ChatInput-inp01", "from_output": "message", "to": "WebSearchComponent-web02", "to_input": "query" },
    { "from": "WebSearchComponent-web02", "from_output": "results", "to": "ParserComponent-prs03", "to_input": "input_data" },
    { "from": "ParserComponent-prs03", "from_output": "parsed_text", "to": "Prompt-pmt04", "to_input": "results" },
    { "from": "ChatInput-inp01", "from_output": "message", "to": "Prompt-pmt04", "to_input": "question" },
    { "from": "Prompt-pmt04", "from_output": "prompt", "to": "LanguageModelComponent-llm05", "to_input": "input_value" },
    { "from": "LanguageModelComponent-llm05", "from_output": "text_output", "to": "ChatOutput-out06", "to_input": "input_value" }
  ]
}

### Solana Wallet Analyzer
{
  "components": [
    { "type": "TextInput", "id_suffix": "wal01", "display_name": "Wallet Address" },
    { "type": "TextInput", "id_suffix": "key02", "display_name": "Helius API Key" },
    { "type": "SolanaTxFetcher", "id_suffix": "txf03" },
    { "type": "TxParser", "id_suffix": "prs04" },
    { "type": "DataToText", "id_suffix": "d2t05" },
    { "type": "Prompt", "id_suffix": "pmt06", "config": { "template": "Analyze this Solana wallet activity:\\n{data}\\n\\nProvide insights on trading patterns and portfolio." } },
    { "type": "LanguageModelComponent", "id_suffix": "llm07" },
    { "type": "ChatOutput", "id_suffix": "out08" }
  ],
  "connections": [
    { "from": "TextInput-wal01", "from_output": "text", "to": "SolanaTxFetcher-txf03", "to_input": "wallet" },
    { "from": "TextInput-key02", "from_output": "text", "to": "SolanaTxFetcher-txf03", "to_input": "api_key" },
    { "from": "SolanaTxFetcher-txf03", "from_output": "txs", "to": "TxParser-prs04", "to_input": "txs" },
    { "from": "TextInput-wal01", "from_output": "text", "to": "TxParser-prs04", "to_input": "wallet" },
    { "from": "TxParser-prs04", "from_output": "parsed", "to": "DataToText-d2t05", "to_input": "data" },
    { "from": "DataToText-d2t05", "from_output": "text", "to": "Prompt-pmt06", "to_input": "data" },
    { "from": "Prompt-pmt06", "from_output": "prompt", "to": "LanguageModelComponent-llm07", "to_input": "input_value" },
    { "from": "LanguageModelComponent-llm07", "from_output": "text_output", "to": "ChatOutput-out08", "to_input": "input_value" }
  ]
}

### Token Portfolio Tracker
{
  "components": [
    { "type": "TextInput", "id_suffix": "wal01", "display_name": "Wallet Address" },
    { "type": "TextInput", "id_suffix": "key02", "display_name": "Helius API Key" },
    { "type": "SolanaBalanceFetcher", "id_suffix": "bal03" },
    { "type": "HeliusMetadataLite", "id_suffix": "met04" },
    { "type": "JupiterPriceFetcher", "id_suffix": "jup05" },
    { "type": "DataToText", "id_suffix": "d2t06" },
    { "type": "Prompt", "id_suffix": "pmt07", "config": { "template": "Here is the token portfolio with USD values:\\n{portfolio}\\n\\nProvide a summary and investment recommendations." } },
    { "type": "LanguageModelComponent", "id_suffix": "llm08" },
    { "type": "ChatOutput", "id_suffix": "out09" }
  ],
  "connections": [
    { "from": "TextInput-wal01", "from_output": "text", "to": "SolanaBalanceFetcher-bal03", "to_input": "wallet" },
    { "from": "TextInput-key02", "from_output": "text", "to": "SolanaBalanceFetcher-bal03", "to_input": "helius_api_key" },
    { "from": "SolanaBalanceFetcher-bal03", "from_output": "balances", "to": "HeliusMetadataLite-met04", "to_input": "balances" },
    { "from": "TextInput-key02", "from_output": "text", "to": "HeliusMetadataLite-met04", "to_input": "api_key" },
    { "from": "HeliusMetadataLite-met04", "from_output": "metadata", "to": "JupiterPriceFetcher-jup05", "to_input": "tokens" },
    { "from": "JupiterPriceFetcher-jup05", "from_output": "priced", "to": "DataToText-d2t06", "to_input": "data" },
    { "from": "DataToText-d2t06", "from_output": "text", "to": "Prompt-pmt07", "to_input": "portfolio" },
    { "from": "Prompt-pmt07", "from_output": "prompt", "to": "LanguageModelComponent-llm08", "to_input": "input_value" },
    { "from": "LanguageModelComponent-llm08", "from_output": "text_output", "to": "ChatOutput-out09", "to_input": "input_value" }
  ]
}

RESPOND WITH ONLY VALID JSON. NO EXPLANATIONS.`;

// ===============================================
// TYPE MAPPINGS AND OUTPUT/INPUT INFO
// ===============================================

const TYPE_MAP: Record<string, string> = {
  // Core
  "ChatInput": "ChatInput",
  "ChatOutput": "ChatOutput",
  "TextInput": "TextInput",
  "Prompt": "Prompt",
  "LanguageModelComponent": "LanguageModelComponent",
  "OpenAIModel": "LanguageModelComponent",
  "Memory": "Memory",
  // Data
  "URLComponent": "URLComponent",
  "ParserComponent": "ParserComponent",
  "FileComponent": "FileComponent",
  "File": "FileComponent",
  "SplitText": "SplitText",
  "DataFrameOperations": "DataFrameOperations",
  "DataToText": "DataToText",
  // Web & API
  "WebSearchComponent": "WebSearchComponent",
  "WebSearch": "WebSearchComponent",
  "APIRequest": "APIRequest",
  // File & Storage
  "Directory": "Directory",
  "SaveToFile": "SaveToFile",
  // LLM Operations
  "StructuredOutput": "StructuredOutput",
  "SmartRouter": "SmartRouter",
  // Code & Tools
  "PythonREPL": "PythonREPL",
  "MCPTools": "MCPTools",
  // Web3/Solana
  "SolanaTxFetcher": "SolanaTxFetcher",
  "TxParser": "TxParser",
  "SolanaBalanceFetcher": "SolanaBalanceFetcher",
  "HeliusMetadataLite": "HeliusMetadataLite",
  "JupiterPriceFetcher": "JupiterPriceFetcher"
};

const OUTPUT_INFO: Record<string, { name: string; types: string[] }> = {
  // Core
  "ChatInput": { name: "message", types: ["Message"] },
  "ChatOutput": { name: "message", types: ["Message"] },
  "TextInput": { name: "text", types: ["Message"] },
  "Prompt": { name: "prompt", types: ["Message"] },
  "LanguageModelComponent": { name: "text_output", types: ["Message"] },
  "Memory": { name: "messages_text", types: ["Message"] },
  // Data
  "URLComponent": { name: "page_results", types: ["DataFrame"] },
  "ParserComponent": { name: "parsed_text", types: ["Message"] },
  "FileComponent": { name: "message", types: ["Message"] },
  "SplitText": { name: "chunks", types: ["Data"] },
  "DataFrameOperations": { name: "output", types: ["DataFrame"] },
  "DataToText": { name: "text", types: ["Message"] },
  // Web & API
  "WebSearchComponent": { name: "results", types: ["DataFrame"] },
  "APIRequest": { name: "data", types: ["Data"] },
  // File & Storage
  "Directory": { name: "data", types: ["Data"] },
  "SaveToFile": { name: "message", types: ["Message"] },
  // LLM Operations
  "StructuredOutput": { name: "structured_data", types: ["Data"] },
  "SmartRouter": { name: "category_1_result", types: ["Message"] },
  // Code & Tools
  "PythonREPL": { name: "data", types: ["Data"] },
  "MCPTools": { name: "tools", types: ["Tool"] },
  // Web3/Solana
  "SolanaTxFetcher": { name: "txs", types: ["Data"] },
  "TxParser": { name: "parsed", types: ["Data"] },
  "SolanaBalanceFetcher": { name: "balances", types: ["Data"] },
  "HeliusMetadataLite": { name: "metadata", types: ["Data"] },
  "JupiterPriceFetcher": { name: "priced", types: ["Data"] }
};

const INPUT_INFO: Record<string, Record<string, { types: string[]; fieldType: string }>> = {
  "ChatOutput": {
    "input_value": { types: ["Data", "DataFrame", "Message"], fieldType: "str" }
  },
  "LanguageModelComponent": {
    "input_value": { types: ["Message"], fieldType: "str" },
    "system_message": { types: ["Message"], fieldType: "str" }
  },
  "Prompt": {},
  "ParserComponent": {
    "input_data": { types: ["DataFrame", "Data"], fieldType: "other" }
  },
  "FileComponent": {},
  "SplitText": {
    "data_inputs": { types: ["Data", "Message"], fieldType: "other" }
  },
  "DataFrameOperations": {
    "df": { types: ["DataFrame"], fieldType: "other" }
  },
  "DataToText": {
    "data": { types: ["Data"], fieldType: "other" }
  },
  "WebSearchComponent": {
    "query": { types: ["Message"], fieldType: "str" }
  },
  "SaveToFile": {
    "input_value": { types: ["Data", "DataFrame", "Message"], fieldType: "str" }
  },
  "StructuredOutput": {
    "llm": { types: ["LanguageModel"], fieldType: "other" },
    "input_value": { types: ["Message"], fieldType: "str" }
  },
  "SmartRouter": {
    "llm": { types: ["LanguageModel"], fieldType: "other" },
    "message": { types: ["Message"], fieldType: "str" }
  },
  "PythonREPL": {
    "inputs": { types: ["Data", "Message"], fieldType: "other" }
  },
  // Web3/Solana
  "SolanaTxFetcher": {
    "wallet": { types: ["Message"], fieldType: "str" },
    "api_key": { types: ["Message"], fieldType: "str" }
  },
  "TxParser": {
    "txs": { types: ["Data"], fieldType: "other" },
    "wallet": { types: ["Message"], fieldType: "str" }
  },
  "SolanaBalanceFetcher": {
    "wallet": { types: ["Message"], fieldType: "str" },
    "helius_api_key": { types: ["Message"], fieldType: "str" }
  },
  "HeliusMetadataLite": {
    "balances": { types: ["Data"], fieldType: "other" },
    "api_key": { types: ["Message"], fieldType: "str" }
  },
  "JupiterPriceFetcher": {
    "tokens": { types: ["Data"], fieldType: "other" }
  }
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
      case "URLComponent":
        nodeData = getURLComponentTemplate(nodeId, displayName, comp.config?.urls || []);
        break;
      case "ParserComponent":
        nodeData = getParserComponentTemplate(nodeId, displayName);
        break;
      case "FileComponent":
        nodeData = getFileComponentTemplate(nodeId, displayName);
        break;
      // Web3/Solana
      case "SolanaTxFetcher":
        nodeData = getSolanaTxFetcherTemplate(nodeId, displayName);
        break;
      case "TxParser":
        nodeData = getTxParserTemplate(nodeId, displayName);
        break;
      case "SolanaBalanceFetcher":
        nodeData = getSolanaBalanceFetcherTemplate(nodeId, displayName);
        break;
      case "HeliusMetadataLite":
        nodeData = getHeliusMetadataLiteTemplate(nodeId, displayName);
        break;
      case "JupiterPriceFetcher":
        nodeData = getJupiterPriceFetcherTemplate(nodeId, displayName);
        break;
      case "DataToText":
        nodeData = getDataToTextTemplate(nodeId, displayName);
        break;
      // Standard components
      case "WebSearchComponent":
        nodeData = getWebSearchTemplate(nodeId, displayName);
        break;
      case "APIRequest":
        nodeData = getAPIRequestTemplate(nodeId, displayName);
        break;
      case "Directory":
        nodeData = getDirectoryTemplate(nodeId, displayName);
        break;
      case "SaveToFile":
        nodeData = getSaveToFileTemplate(nodeId, displayName);
        break;
      case "SplitText":
        nodeData = getSplitTextTemplate(nodeId, displayName);
        break;
      case "StructuredOutput":
        nodeData = getStructuredOutputTemplate(nodeId, displayName);
        break;
      case "SmartRouter":
        nodeData = getSmartRouterTemplate(nodeId, displayName);
        break;
      case "PythonREPL":
        nodeData = getPythonREPLTemplate(nodeId, displayName);
        break;
      case "DataFrameOperations":
        nodeData = getDataFrameOperationsTemplate(nodeId, displayName);
        break;
      case "MCPTools":
        nodeData = getMCPToolsTemplate(nodeId, displayName);
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
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
