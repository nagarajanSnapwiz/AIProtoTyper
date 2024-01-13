import OpenAI from "openai";
import {extractDataWithPrompt} from 'chatgpt-helper/src/index';
import {z} from 'zod';


const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OP_KEY,
  dangerouslyAllowBrowser: true,
});



type CallParams = {
  text: string;
  model?: string;
  image?: string;
};

type CallParamsStreaming = CallParams & {
  setState: (v: string) => void;
};

export async function callModel({
  text,
  model = "gpt-3.5-turbo-1106",
}: CallParams) {
  const completion = await openai.chat.completions.create({
    messages: [{ role: "user", content: text }],
    model,
  });

  return completion.choices[0].message;
}



const codeSchema = z.object({
  files: z.array(z.object({
    fullPath: z.string().describe("Full path of the file"),
    content: z.string().describe("Code that should be written in the file")
  })).describe("List representing the files and its code contents necessary for the app "),
  additionalDependencies: z.array(z.string()).describe("List of additional dependency"),

});

export async function getCode({prompt,template="react"}:{prompt: string, template?: string}) {
  
  const fullPrompt = `Write full React.js code for running the following app: ${prompt}. Please generate full source code and not some just sample source code. The source code only need to focus on the app logic and build setup can be ignored. The main component should be inside file App.js at project root with default export. We don't need index.js. All the code should be provided as list of files, each with full path represented by "fullPath" attribute and "content" attribute to have source code content of the file. The files shouldn't be empty. If there is a need for any additional npm module (not related to the build setup such as webpack,etc or the main libraries such as react and react-dom). `;

  console.log('fullPrompt::::',fullPrompt);
  return extractDataWithPrompt({api: openai as any, schema: codeSchema, prompt: fullPrompt, max_tokens: 4096-(200+80), temperature: 0. });

}

export async function callModelWithStreaming({
  text,
  model = "gpt-3.5-turbo-1106",
  image,
  setState,
}: CallParamsStreaming) {
  const completion = await openai.chat.completions.create({
    messages: [
      { role: "user", content: [
        {type:"text",text},
        ...(image ? [{ "type": "image_url", image_url: { url: image } } as any] : [])
    ] },
    ],
    model: image ? "gpt-4-vision-preview" : model,
    stream: true,
    max_tokens: 500
  });
  let content = "";

  for await (const chunk of completion) {
    content += chunk.choices[0]?.delta?.content || "";
    setState(content);
  }
}
