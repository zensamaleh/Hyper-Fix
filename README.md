# HyperFix

[hyperfix.chat](https://hyperfix.chat)

**HyperFix** is the open-source interface for AI chat.

[![Chat with this repo](https://hyperfix.chat/button/github.svg)](https://hyperfix.chat/?agent=github/ibelick/hyperfix)

![hyperfix screenshot](./public/cover_hyperfix.webp)

## Features

- Multi-model support: OpenAI, Mistral, Claude, Gemini, **Ollama (local models)**
- File uploads with context-aware answers
- Clean, responsive UI with light/dark themes
- Built with Tailwind, shadcn/ui, and prompt-kit
- Fully open-source and self-hostable
- Customizable: user system prompt, multiple layout options
- **Local AI with Ollama**: Run models locally with automatic model detection

## Agent Features (WIP)

- `@agent` mentions
- Early tool and MCP integration for agent workflows
- Foundation for more powerful, customizable agents (more coming soon)

## Quick Start

### Option 1: With OpenAI (Cloud)

```bash
git clone https://github.com/ibelick/hyperfix.git
cd hyperfix
npm install
echo "OPENAI_API_KEY=your-key" > .env.local
npm run dev
```

### Option 2: With Ollama (Local)

```bash
# Install and start Ollama
curl -fsSL https://ollama.ai/install.sh | sh
ollama pull llama3.2  # or any model you prefer

# Clone and run HyperFix
git clone https://github.com/ibelick/hyperfix.git
cd hyperfix
npm install
npm run dev
```

HyperFix will automatically detect your local Ollama models!

### Option 3: Docker with Ollama

```bash
git clone https://github.com/ibelick/hyperfix.git
cd hyperfix
docker-compose -f docker-compose.ollama.yml up
```

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/ibelick/hyperfix)

To unlock features like auth, file uploads, and agents, see [INSTALL.md](./INSTALL.md).

## Built with

- [prompt-kit](https://prompt-kit.com/) — AI components
- [shadcn/ui](https://ui.shadcn.com) — core components
- [motion-primitives](https://motion-primitives.com) — animated components
- [vercel ai sdk](https://vercel.com/blog/introducing-the-vercel-ai-sdk) — model integration, AI features
- [supabase](https://supabase.com) — auth and storage

## Sponsors

<a href="https://vercel.com/oss">
  <img alt="Vercel OSS Program" src="https://vercel.com/oss/program-badge.svg" />
</a>

## License

Apache License 2.0

## Notes

This is a beta release. The codebase is evolving and may change.
