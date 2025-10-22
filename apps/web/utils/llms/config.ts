import { env } from "@/env";

export const supportsOllama = !!env.NEXT_PUBLIC_OLLAMA_MODEL;

export const DEFAULT_PROVIDER = "DEFAULT";

export const Provider = {
  OPEN_AI: "openai",
  ANTHROPIC: "anthropic",
  GOOGLE: "google",
  GROQ: "groq",
  OPENROUTER: "openrouter",
  AI_GATEWAY: "aigateway",
  ...(supportsOllama ? { OLLAMA: "ollama" } : {}),
};

export const Model = {
  GPT_4O: "gpt-4o",
  GPT_4O_MINI: "gpt-4o-mini",
  GPT_5: "gpt-5",
  // Anthropic models
  CLAUDE_3_7_SONNET_ANTHROPIC: "claude-3-7-sonnet-20250219",
  CLAUDE_4_SONNET_ANTHROPIC: "claude-sonnet-4-20250514",
  CLAUDE_4_5_SONNET_ANTHROPIC: "claude-sonnet-4-5-20250929",
  CLAUDE_4_5_HAIKU_ANTHROPIC: "claude-haiku-4-5-20251001",
  CLAUDE_4_OPUS_ANTHROPIC: "claude-opus-4-20250514",
  CLAUDE_4_1_OPUS_ANTHROPIC: "claude-opus-4-1-20250805",
  // Bedrock models
  CLAUDE_3_7_SONNET_BEDROCK: env.NEXT_PUBLIC_BEDROCK_SONNET_MODEL,
  CLAUDE_4_SONNET_BEDROCK: "us.anthropic.claude-sonnet-4-20250514-v1:0",
  // OpenRouter models
  CLAUDE_3_5_SONNET_OPENROUTER: "anthropic/claude-3.5-sonnet",
  CLAUDE_3_7_SONNET_OPENROUTER: "anthropic/claude-3.7-sonnet",
  CLAUDE_4_SONNET_OPENROUTER: "anthropic/claude-sonnet-4",
  CLAUDE_4_5_SONNET_OPENROUTER: "anthropic/claude-sonnet-4.5",
  CLAUDE_4_5_HAIKU_OPENROUTER: "anthropic/claude-haiku-4.5",
  CLAUDE_4_OPUS_OPENROUTER: "anthropic/claude-opus-4",
  CLAUDE_4_1_OPUS_OPENROUTER: "anthropic/claude-opus-4.1",
  // Google models
  GEMINI_1_5_PRO: "gemini-1.5-pro-latest",
  GEMINI_1_5_FLASH: "gemini-1.5-flash-latest",
  GEMINI_2_0_FLASH_LITE: "gemini-2.0-flash-lite",
  GEMINI_2_0_FLASH: "gemini-2.0-flash",
  GEMINI_2_5_PRO: "gemini-2.5-pro",
  GEMINI_2_0_FLASH_OPENROUTER: "google/gemini-2.0-flash",
  GEMINI_2_5_PRO_OPENROUTER: "google/gemini-2.5-pro",
  // Other models
  GROQ_LLAMA_3_3_70B: "llama-3.3-70b-versatile",
  KIMI_K2_OPENROUTER: "moonshotai/kimi-k2",
  ...(supportsOllama ? { OLLAMA: env.NEXT_PUBLIC_OLLAMA_MODEL } : {}),
};

export const providerOptions: { label: string; value: string }[] = [
  { label: "Default", value: DEFAULT_PROVIDER },
  { label: "Anthropic", value: Provider.ANTHROPIC },
  { label: "OpenAI", value: Provider.OPEN_AI },
  { label: "Google", value: Provider.GOOGLE },
  { label: "Groq", value: Provider.GROQ },
  { label: "OpenRouter", value: Provider.OPENROUTER },
  { label: "AI Gateway", value: Provider.AI_GATEWAY },
  ...(supportsOllama && Provider.OLLAMA
    ? [{ label: "Ollama", value: Provider.OLLAMA }]
    : []),
];
