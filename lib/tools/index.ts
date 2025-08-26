import { exaTools } from "./exa/index"
import { codeInterpreterTools } from "./codeInterpreter"
import { capabilitiesTools } from "./capabilities"

export const TOOL_REGISTRY = {
  ...exaTools,
  ...codeInterpreterTools,
  ...capabilitiesTools,
  // future: ...githubTools, ...huggingfaceTools, etc.
}

export type ToolId = keyof typeof TOOL_REGISTRY

export const getAvailableTools = () =>
  Object.entries(TOOL_REGISTRY)
    .filter(([, tool]) => tool.isAvailable)
    .map(([id, tool]) => ({ ...tool, id }))

export const getAllTools = () =>
  Object.entries(TOOL_REGISTRY).map(([id, tool]) => ({
    ...tool,
    id,
  }))
