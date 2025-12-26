# Langflow Workflow Generator

An AI-powered chat application that generates valid Langflow workflow JSON configurations from natural language descriptions. Built with React, TypeScript, and Supabase Edge Functions.

## 🎯 What This Project Does

This application allows users to describe AI workflows in plain English and automatically generates production-ready Langflow JSON that can be directly imported into [Langflow](https://langflow.org/). 

### Key Features

- **Natural Language to Workflow**: Describe your desired AI workflow in plain English
- **Valid Langflow JSON Output**: Generates properly structured JSON compatible with Langflow 1.4.3+
- **Explanation Guide**: Provides detailed explanations of each component, data flow, and expected outputs
- **User Authentication**: Secure login/signup system using Supabase Auth
- **Real-time Chat Interface**: Interactive chat UI for iterating on workflow designs
- **Copy-to-Clipboard**: One-click copy of generated JSON for easy import

---

## 📁 Project Structure

```
├── src/
│   ├── components/
│   │   ├── ui/                    # Shadcn UI components
│   │   ├── ChatInterface.tsx      # Main chat component
│   │   ├── ExplanationPanel.tsx   # Workflow explanation display
│   │   ├── JsonOutputPanel.tsx    # JSON output with tabs
│   │   └── NavLink.tsx            # Navigation component
│   ├── hooks/
│   │   ├── useAuth.ts             # Authentication hook
│   │   ├── useWorkflowGenerator.ts # Workflow generation logic
│   │   ├── use-toast.ts           # Toast notifications
│   │   └── use-mobile.tsx         # Mobile detection
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts          # Supabase client (auto-generated)
│   │       └── types.ts           # Database types (auto-generated)
│   ├── pages/
│   │   ├── Index.tsx              # Main application page
│   │   ├── Auth.tsx               # Login/Signup page
│   │   └── NotFound.tsx           # 404 page
│   ├── lib/
│   │   └── utils.ts               # Utility functions
│   ├── App.tsx                    # Root component with routing
│   ├── main.tsx                   # Application entry point
│   └── index.css                  # Global styles & design tokens
├── supabase/
│   ├── functions/
│   │   └── generate-workflow/
│   │       └── index.ts           # Edge function for AI generation
│   ├── migrations/                # Database migrations
│   └── config.toml                # Supabase configuration
├── public/                        # Static assets
├── .env                           # Environment variables
├── tailwind.config.ts             # Tailwind configuration
├── vite.config.ts                 # Vite configuration
└── package.json                   # Dependencies
```

---

## 🔧 Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS, Shadcn UI |
| State Management | TanStack React Query |
| Routing | React Router v6 |
| Backend | Supabase Edge Functions (Deno) |
| Database | PostgreSQL (via Supabase) |
| Authentication | Supabase Auth |
| AI | Anthropic Claude API |

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
│  ┌───────────────┐  ┌──────────────────┐  ┌──────────────────┐ │
│  │ ChatInterface │  │ JsonOutputPanel  │  │ ExplanationPanel │ │
│  └───────┬───────┘  └────────▲─────────┘  └────────▲─────────┘ │
│          │                   │                      │           │
│          ▼                   │                      │           │
│  ┌───────────────────────────┴──────────────────────┘           │
│  │              useWorkflowGenerator Hook                       │
│  └───────────────────────────┬──────────────────────────────────┘
│                              │                                   │
└──────────────────────────────┼───────────────────────────────────┘
                               │ HTTPS
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Supabase Edge Function                        │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                  generate-workflow/index.ts                 │ │
│  │  • Component templates (ChatInput, ChatOutput, LLM, etc.)  │ │
│  │  • Edge creation logic                                      │ │
│  │  • Claude API integration                                   │ │
│  │  • Explanation generation                                   │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Anthropic Claude API                          │
│              (Generates workflow plans from prompts)             │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Local Development Setup

### Prerequisites

- Node.js 18+ (install via [nvm](https://github.com/nvm-sh/nvm))
- npm or bun
- Git
- Supabase CLI (for local backend development)

### Step 1: Clone the Repository

```bash
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
```

### Step 2: Install Dependencies

```bash
npm install
# or
bun install
```

### Step 3: Environment Variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_PROJECT_ID="your-supabase-project-id"
VITE_SUPABASE_PUBLISHABLE_KEY="your-supabase-anon-key"
VITE_SUPABASE_URL="https://your-project-id.supabase.co"
```

### Step 4: Run the Development Server

```bash
npm run dev
# or
bun dev
```

The app will be available at `http://localhost:8080`

---

## 🗄️ Database Setup

### Tables

The project uses a `profiles` table to store user information:

```sql
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  username TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);
```

### Database Functions

```sql
-- Auto-update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username)
  VALUES (new.id, new.raw_user_meta_data ->> 'username');
  RETURN new;
END;
$$;
```

---

## 🔐 Required Secrets (Edge Functions)

The edge function requires these secrets to be configured in Supabase:

| Secret Name | Description |
|-------------|-------------|
| `ANTHROPIC_API_KEY` | Your Anthropic API key for Claude |
| `LANGFLOW_API_KEY` | (Optional) Langflow API key if using hosted Langflow |
| `LANGFLOW_URL` | (Optional) Langflow instance URL |

### Setting Secrets in Supabase

```bash
# Using Supabase CLI
supabase secrets set ANTHROPIC_API_KEY=sk-ant-xxxxx
```

Or via the Supabase Dashboard: Project Settings → Edge Functions → Secrets

---

## ☁️ Self-Hosting Guide

### Option 1: Self-Host with Supabase (Recommended)

This is the easiest path as the project is built around Supabase.

#### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your project URL and anon key

#### 2. Run Database Migrations

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref YOUR_PROJECT_REF

# Run migrations
supabase db push
```

#### 3. Deploy Edge Functions

```bash
supabase functions deploy generate-workflow
```

#### 4. Set Secrets

```bash
supabase secrets set ANTHROPIC_API_KEY=your-key-here
```

#### 5. Deploy Frontend

You can deploy the frontend to any static hosting:

```bash
npm run build
# Upload the 'dist' folder to your hosting provider
```

**Recommended hosting options:**
- Vercel
- Netlify
- Cloudflare Pages
- AWS S3 + CloudFront

---

### Option 2: Fully Self-Hosted (No Supabase Cloud)

If you want to run everything on your own infrastructure:

#### 1. Self-Host Supabase

Follow the [Supabase Self-Hosting Guide](https://supabase.com/docs/guides/self-hosting):

```bash
# Clone Supabase
git clone --depth 1 https://github.com/supabase/supabase

# Navigate to docker directory
cd supabase/docker

# Copy example env
cp .env.example .env

# Start Supabase
docker compose up -d
```

#### 2. Configure Your Self-Hosted Instance

Update your `.env` file:

```env
VITE_SUPABASE_URL="http://localhost:8000"  # Or your self-hosted URL
VITE_SUPABASE_PUBLISHABLE_KEY="your-self-hosted-anon-key"
```

#### 3. Deploy Edge Functions to Deno Deploy

Edge functions can be deployed to [Deno Deploy](https://deno.com/deploy):

1. Create an account at deno.com/deploy
2. Connect your GitHub repository
3. Configure the entry point as `supabase/functions/generate-workflow/index.ts`
4. Set environment variables in Deno Deploy dashboard

#### 4. Alternative: Run Edge Functions Locally

For development or small-scale deployment:

```bash
# Install Deno
curl -fsSL https://deno.land/x/install/install.sh | sh

# Run the function locally
deno run --allow-net --allow-env supabase/functions/generate-workflow/index.ts
```

---

### Option 3: Replace Supabase Entirely

If you want to use a different backend:

#### 1. Replace Authentication

Replace Supabase Auth with:
- **Auth0**: Update `useAuth.ts` to use Auth0 SDK
- **Firebase Auth**: Use Firebase Authentication
- **Custom JWT**: Implement your own JWT-based auth

#### 2. Replace Database

Replace Supabase PostgreSQL with:
- **PlanetScale**: MySQL-compatible serverless database
- **MongoDB Atlas**: Document database
- **Railway PostgreSQL**: Managed PostgreSQL

Update `src/integrations/supabase/client.ts` to use your chosen database client.

#### 3. Replace Edge Functions

Convert the edge function to:
- **Vercel Serverless Functions**: Node.js based
- **AWS Lambda**: With API Gateway
- **Cloudflare Workers**: Edge-based
- **Express.js API**: Traditional Node.js server

Example conversion to Express.js:

```javascript
// server.js
const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
app.use(express.json());

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

app.post('/api/generate-workflow', async (req, res) => {
  const { messages } = req.body;
  
  // Your generation logic here
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8192,
    messages: messages,
  });
  
  res.json({ workflow: response.content });
});

app.listen(3000);
```

---

## 📚 API Reference

### Generate Workflow Endpoint

**POST** `/functions/v1/generate-workflow`

#### Request

```json
{
  "messages": [
    {
      "role": "user",
      "content": "Create a simple chatbot that uses OpenAI GPT-4"
    }
  ]
}
```

#### Response

```json
{
  "content": "...",
  "workflow": {
    "name": "Simple GPT-4 Chatbot",
    "description": "...",
    "components": [...],
    "connections": [...]
  },
  "isValid": true,
  "explanation": {
    "overview": "This workflow creates a basic chatbot...",
    "components": [
      {
        "name": "Chat Input",
        "type": "ChatInput",
        "purpose": "Receives user messages",
        "configuration": "Default configuration"
      }
    ],
    "dataFlow": "User message → LLM → Chat Output",
    "expectedOutput": "AI-generated responses to user queries"
  }
}
```

---

## 🔄 Supported Langflow Components

The generator supports these Langflow component types:

| Component | Type | Description |
|-----------|------|-------------|
| Chat Input | `ChatInput` | Receives user input |
| Chat Output | `ChatOutput` | Displays AI responses |
| OpenAI | `OpenAIModel` | OpenAI GPT models |
| Anthropic | `AnthropicModel` | Claude models |
| Groq | `GroqModel` | Groq LLM |
| Prompt | `Prompt` | Prompt templates |
| Memory | `Memory` | Conversation memory |
| Text Output | `TextOutput` | Text display |
| API Request | `APIRequest` | External API calls |
| Conditional Router | `ConditionalRouter` | Flow control |
| File Component | `FileComponent` | File handling |

---

## 🛠️ Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type checking
npm run typecheck

# Linting
npm run lint

# Deploy edge functions (if using Supabase CLI)
supabase functions deploy generate-workflow
```

---

## 🐛 Troubleshooting

### Common Issues

**1. Edge function returns 500 error**
- Check that `ANTHROPIC_API_KEY` is set correctly
- View function logs: `supabase functions logs generate-workflow`

**2. Authentication not working**
- Ensure Supabase URL and anon key are correct in `.env`
- Check that email confirmation is disabled for development

**3. Generated JSON is invalid**
- The AI occasionally produces malformed JSON
- Try regenerating with a clearer description
- Check the raw response in the JSON panel

**4. CORS errors**
- Ensure the edge function includes proper CORS headers
- Check that the Supabase URL matches your frontend origin

---

## 📝 License

MIT License - See LICENSE file for details.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/my-feature`
5. Submit a pull request

---

## 📞 Support

- Create an issue on GitHub for bugs or feature requests
- Check the [Langflow Documentation](https://docs.langflow.org/) for Langflow-specific questions
- Review [Supabase Documentation](https://supabase.com/docs) for backend questions
