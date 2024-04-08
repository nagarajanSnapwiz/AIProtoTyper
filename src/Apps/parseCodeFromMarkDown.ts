import { parse as mdParse, Tokens } from "marked";
import { fromMarkdown } from 'mdast-util-from-markdown';
import { toMarkdown } from 'mdast-util-to-markdown';
import pathNormalize from "path-normalize";

const fileNameExtensionRegex = /[^\\]*\.(\w+)$/;
window.__toMarkdown = toMarkdown;

function parseAlternateFileName(token: Tokens.Generic) {
  if (token.tokens?.[0].type === "text") {
    const textToken = token.tokens?.[0] as Tokens.Text;
    const textTokenParts = textToken.text.split(" ");

    for (const text of textTokenParts) {
      let _text = text;
      if (_text?.trim()?.endsWith(":")) {
        _text = _text.replace(":", "");
      }
      const textMatches = text.match(fileNameExtensionRegex);
      if (textMatches?.length === 2) {
        const [fileName] = textMatches;
        return fileName;
      }
    }
  } else if (
    (token as Tokens.Paragraph)?.text?.match(fileNameExtensionRegex)?.length ===
    2
  ) {
    const [fileName] = token.text.match(fileNameExtensionRegex);
    return fileName as string;
  }
}

export type CodeUnit = { text: string; path: string; lang?: string };


function isValidJson(text: string){
  try{
    JSON.parse(text);
    return true;
  } catch(e){
    return false;
  }
}


const langFromExtension = (ext: string) => {
  
};

export function parseCodeFromMarkDown(markdownText: string) {
  const parsedItems = mdParse.lexer(markdownText);
  window.__parsedLast = parsedItems;
  const parsedMarkdown = window.__parsed2 = fromMarkdown(markdownText);
  const parsedTokensWithoutSpace = parsedItems.filter(
    (x) => x.type !== "space"
  );
  let alternateFileName: string | undefined = undefined;
  const codeBlocks: CodeUnit[] = [];
  for (const token of parsedTokensWithoutSpace) {
    if (token.type === "code") {
      const { lang, text = "" } = token as Tokens.Code;
      if (lang === "json" && text.includes("dependencies")) {
        codeBlocks.push({
          path: "package.json",
          lang,
          text,
        });
        continue;
      }
      const firstLine = text.trim().split("\n")[0];

      let path = "";
      const firstLineWords = firstLine.split(" ");
      const fileNameWord = firstLineWords.find(
        (x) => x.match(fileNameExtensionRegex)?.length === 2
      );
      if (fileNameWord) {
        const fileName = fileNameWord.match(fileNameExtensionRegex)?.[0];
        if (fileName) {
          path = fileName;
        }
      }
      if (!path) {
        path = alternateFileName as string;
      }

      if (text) {
        path = path?.trim() ? pathNormalize(path) : path;
        if (path?.includes("/")) {
          const corePath = ["index.js", "styles.css", "index.html"].find((x) =>
            path.includes(x)
          );
          if (corePath) {
            //probably an error
            path = corePath;
          }
        }
        codeBlocks.push({
          path: path?.trim() ? pathNormalize(path) : path,
          lang,
          text,
        });
      }
    } else {
      alternateFileName = parseAlternateFileName(token);
    }
  }

  return {codeBlocks,parsedMarkdown};
}
