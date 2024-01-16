import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { coy } from "react-syntax-highlighter/dist/cjs/styles/prism";

type CodeBlockProps = {
  value: string;
  language: string;
};

export function CodeBlock({ value, language }: CodeBlockProps) {
  return (
    <SyntaxHighlighter language={language} style={coy}>
      {value}
    </SyntaxHighlighter>
  );
}
