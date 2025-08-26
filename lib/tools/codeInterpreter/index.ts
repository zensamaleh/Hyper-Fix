export const codeInterpreterTool = {
  description: "Execute Python code in a sandboxed environment.",
  isAvailable: () => true, // Always available for now
}

export const codeInterpreterTools = {
  codeInterpreter: {
    ...codeInterpreterTool,
    isAvailable: () => true,
  },
}
