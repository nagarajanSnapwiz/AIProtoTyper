import {
  memo,
  useState,
  useRef,
  useMemo,
  useEffect,
  useImperativeHandle,
} from "react";
import omit from "lodash.omit";
import {
  Container,
  Grid,
  GridItem,
  Textarea,
  Input,
  Button,
  InputGroup,
  InputRightElement,
  Box,
  Flex,
  Heading,
  Avatar,
  Text,
} from "@chakra-ui/react";
import ReactMarkdown from "react-markdown";
import {
  SandpackProvider,
  SandpackLayout,
  SandpackPreview,
  SandpackCodeEditor,
  useSandpack,
  useActiveCode,
} from "@codesandbox/sandpack-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { a11yDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { callModelWithStreaming } from "./callModel";
import { parseCodeFromMarkDown } from "./parseCodeFromMarkDown";
import { toMarkdown } from "mdast-util-to-markdown";
import { fromMarkdown } from "mdast-util-from-markdown";
import OpenAI from "openai";
import { useResizeObserver } from "./useResizeObserver";

type ChatItemProps = {
  system?: Boolean;
  text: string;
};

// const templateDescriptions = `The web app can be either react.js based or plain javascript. For react.js based projects, we have following files setup. public/index.html for entry. App.js containing main component code at root folder. index.js already contains code to mount the main component and no need to generate this file. For react.js based projects, we don't need to generate index.html and index.js files. For plain javascript project, we have following files at the root. index.html,index.js and style.css. For plain javascript projects, there shouldn't be any folder and all the source must be within root folder. Choose the appropriate kind and generate code only for that`;

const templateDescriptions = `I have following setup already. I have following files index.html, index.js, styles.css. Must generate code for each of these files. The styles.css would be imported inside index.js instead of being linked with index.html`;

/**
 *
 * TODOS
 */

function SafeMarkdown({ text }: { text: string }) {
  return (
    <ReactMarkdown
      disallowedElements={["img"]}
      children={text}
      components={{
        code(props) {
          const { children, className, node, ...rest } = props;
          const match = /language-(\w+)/.exec(className || "");
          return match ? (
            //@ts-ignore
            <SyntaxHighlighter
              {...rest}
              PreTag="div"
              children={String(children).replace(/\n$/, "")}
              language={match[1]}
              codeTagProps={{ style: { fontSize: "14px" } }}
              showLineNumbers
              style={a11yDark}
            />
          ) : (
            <code {...rest} className={className}>
              {children}
            </code>
          );
        },
      }}
    />
  );
}

function ChatItemOriginal({ system = false, text }: ChatItemProps) {
  return (
    <Box mb={7}>
      <Flex flex="1" gap="4" alignItems="center" flexWrap="wrap">
        {system ? (
          <>
            <Avatar userSelect="none" name="A i" size="xs" />
            <Heading userSelect="none" size="sm">
              System
            </Heading>
          </>
        ) : (
          <>
            <Avatar userSelect="none" size="xs" />
            <Heading userSelect="none" size="sm">
              You
            </Heading>
          </>
        )}
      </Flex>

      {system ? (
        <Box ml="2.5rem">
          <SafeMarkdown text={text} />
        </Box>
      ) : (
        <Text ml="2.5rem" fontSize="lg">
          {text}
        </Text>
      )}
    </Box>
  );
}

const ChatItem = memo(ChatItemOriginal);

const generateFullInitialPrompt = (text: string) => {
  if (!text.trim().endsWith(".")) {
    text = `${text}.`;
  }
  return `Generate full code for a web app based on the following request: ${text} I don't want a basic example. I need full implementation. I need following rules must be followed while generating the code. First line of the code in each code file should be a comment specifying relative path of the file. I need contents of each code file should formatted within a separate fenced code blocks. The code must be in Javascript language. Prefer using React.js when only necessary. If its easier, use plain javascript. Definitely provide package.json without any comments and scripts attribute. I am using parcel bundler to run. ${templateDescriptions} If I ask for any changes after you provided me initial code,its VERY IMPORTANT that you MUST PROVIDE THE FULL CODE OF THE FILE, ONLY WHICH ARE GETTING CHANGED, WITH UPDATED CODE instead of referring the existing code with comments. DO NOT provide the code unless the content is changing. When suggesting additional dependencies, definitely provide full package.json again with updated dependencies. Because nobody is going to read the comments and copy paste the previous code, since this is an automated system.`;
};

function CustomSandpackBehaviour({
  lastParsedMarkDownRef,
  setMessages,
  messages,
  codesRef,
}: {
  lastParsedMarkDownRef: React.MutableRefObject<any>;
  codesRef: React.MutableRefObject<Record<string, string>>;
  messages: (OpenAI.Chat.Completions.ChatCompletionMessageParam & {
    id?: string | undefined;
  })[];
  setMessages: React.Dispatch<
    React.SetStateAction<
      (OpenAI.Chat.Completions.ChatCompletionMessageParam & {
        id?: string | undefined;
      })[]
    >
  >;
}) {
  const { listen, sandpack } = useSandpack();
  const { activeFile, setActiveFile } = sandpack;

  const { code: activeCode } = useActiveCode();

  useEffect(() => {
    const { current: codes } = codesRef;
    const findIndexForMessageToChange = () => {
      for (let i = messages.length - 1; i >= 0; i--) {
        const message = messages[i];
        const parsed = fromMarkdown(message.content as string);
        const index = parsed.children?.findIndex((node: any) => {
          if (node.type === "code" && node.value === codes[activeFile]) {
            return true;
          }
        });
        if (index > -1) {
          return [i, index, parsed] as const;
        }
      }

      return [-1, -1, null] as const;
    };
    console.time("codeCompare");
    if (codes[activeFile] && activeCode && codes[activeFile] !== activeCode) {
      const [messageIndex, oldIndexOfTheCode, parsed] =
        findIndexForMessageToChange();
      if (oldIndexOfTheCode > -1 && messageIndex > -1 && parsed) {
        //@ts-ignore
        parsed.children[oldIndexOfTheCode].value = activeCode;
        setMessages((messages) => {
          let newMessages = [...messages];

          if (messages.length > 0) {
            const messageToUpdate = newMessages[messageIndex];

            messageToUpdate.content = toMarkdown(parsed);
          }

          return newMessages;
        });

        codesRef.current = { ...codesRef.current, [activeFile]: activeCode };
        setActiveFile(activeFile);
      }
    }
    console.timeEnd("codeCompare");
  }, [activeCode, activeFile]);

  useEffect(() => {
    const cleanup = listen((e) => {
      // console.warn('got message from csb:::::',e);
      if (e.type === "console" && e?.log?.[0]?.method === "error") {
        console.warn(e.log[0].data);
      }
    });

    return cleanup;
  }, []);

  return null;
}

function ChatCode() {
  const [currentPrompt, setCurrentPrompt] = useState("");
  const [initialprompt, setInitialPrompt] = useState("");
  const [codes, setCodes] = useState<Record<string, string>>({});
  const codesRef = useRef<Record<string, string>>({});
  const [messages, setMessages] = useState<
    (OpenAI.ChatCompletionMessageParam & { id?: string })[]
  >([]);

  const [generating, setGenerating] = useState(false);
  const srcollContainer = useRef<HTMLDivElement>(null);

  const { height: contentItemHeight, ref: contentItemref } =
    useResizeObserver();
  const lastParsedMarkDownRef = useRef<any>(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (srcollContainer.current) {
        srcollContainer.current.scrollTop =
          srcollContainer.current.scrollHeight;
      }
    }, 50);
  };

  // console.log('messages',messages);
  const submitText = (text: string) => {
    setGenerating(true);
    let messagesToSend = [...messages];
    if (messages.length === 0) {
      setInitialPrompt(text);
      messagesToSend = [
        { role: "user", content: generateFullInitialPrompt(text) },
      ];
    } else {
      messagesToSend = [...messagesToSend, { role: "user", content: text }];
    }
    setMessages(messagesToSend);
    scrollToBottom();
    const indexToUpdate = messagesToSend.length;

    // console.log("messages before calling", messages);
    callModelWithStreaming({
      model: "gpt-3.5-turbo-1106",
      // model: "gpt-4-1106-preview",
      //@ts-ignore
      messages: messagesToSend.map((x) => omit(x, "id")),
      setState: (v, id) => {
        messagesToSend[indexToUpdate] = { role: "assistant", content: v, id };
        setMessages([...messagesToSend]);

        scrollToBottom();
      },
      onComplete: (fullMessage) => {
        setGenerating(false);
        setCurrentPrompt("");
        const { codeBlocks: codeFiles, parsedMarkdown } =
          parseCodeFromMarkDown(fullMessage);
        lastParsedMarkDownRef.current = parsedMarkdown;
        console.log("got codefiles", codeFiles);
        let newCodes: Record<string, string> = {};
        for (const codeFile of codeFiles) {
          if (codeFile.lang && codeFile.path) {
            newCodes[`/${codeFile.path}`] = codeFile.text;
          }
        }

        codesRef.current = { ...codesRef.current, ...newCodes };
        setCodes((existing) => ({
          ...existing,
          ...codesRef.current,
          ...newCodes,
        }));
      },
    });
  };

  const isCodePresent = useMemo(() => {
    return Object.keys(codes).length > 0;
  }, [codes]);

  return (
    <Container height="100vh" maxW="container.2xl">
      <Grid
        width="100%"
        height="100%"
        pt={2}
        pb={15}
        gap={2}
        templateRows={"1fr 35px"}
        templateColumns={"1fr 1fr"}
        templateAreas={`"messages preview"
        "bottomTextInput bottomTextInput"
        `}
      >
        <GridItem
          height="100%"
          overflowY="auto"
          area="messages"
          ref={srcollContainer}
        >
          <Flex
            width="100%"
            minHeight="100%"
            pt={50}
            flexDir="column"
            justifyContent="flex-end"
          >
            <ChatItem
              system
              text="Describe the web app you need me to write. I will try my best"
            />
            {initialprompt ? <ChatItem text={initialprompt} /> : null}
            {messages.slice(1).map((msg) => (
              <ChatItem
                key={msg.id}
                text={msg.content as string}
                system={msg.role === "assistant" || msg.role === "system"}
              />
            ))}
          </Flex>
        </GridItem>
        <GridItem bg={"green.300"} area="preview" ref={contentItemref}>
          {isCodePresent ? (
            <SandpackProvider theme="dark" files={codes} template="vanilla">
              <SandpackLayout
                style={{ "--sp-layout-height": contentItemHeight } as any}
              >
                {/* <SandpackFileExplorer /> */}
                <SandpackCodeEditor
                  showTabs
                  showLineNumbers
                  showInlineErrors
                  wrapContent
                />

                <SandpackPreview showSandpackErrorOverlay={false} />
              </SandpackLayout>
              <CustomSandpackBehaviour
                messages={messages}
                setMessages={setMessages}
                codesRef={codesRef}
                lastParsedMarkDownRef={lastParsedMarkDownRef}
              />
            </SandpackProvider>
          ) : null}
        </GridItem>
        <GridItem area="bottomTextInput">
          <InputGroup>
            <Textarea
              borderWidth={2}
              placeholder="Enter your request"
              value={currentPrompt}
              height="full"
              onChange={(e) => {
                setCurrentPrompt(e.target.value);
              }}
              disabled={generating}
            ></Textarea>
            <InputRightElement height="full" width="4.5rem">
              <Button
                borderLeftRadius={0}
                size="md"
                height="full"
                colorScheme="teal"
                onClick={() => submitText(currentPrompt)}
                isLoading={generating}
              >
                submit
              </Button>
            </InputRightElement>
          </InputGroup>
        </GridItem>
      </Grid>
    </Container>
  );
}

ChatCode.displayName = "ChatCode";

export const Component = ChatCode;
