

export type Models =
  | "gpt-4-1106-preview"
  | "gpt-4-1106-vision-preview"
  | "gpt-4"
  | "gpt-4-turbo-preview"
  | "gpt-4-32k"
  | "gpt-3.5-turbo-1106"
  | "gpt-3.5-turbo"
  | "gpt-3.5-turbo-instruct";


export const MODELS: Models[] = [
    "gpt-3.5-turbo",
    "gpt-4-turbo-preview",
    "gpt-4",
    "gpt-4-32k"
]

export const LOCAL_STORAGE_OPEN_AI_KEY = "OAIKEY";