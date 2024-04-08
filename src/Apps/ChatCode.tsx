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
  IconButton,
  ButtonGroup,
  useDisclosure,
  useToast,
  Select,
} from "@chakra-ui/react";
import ReactMarkdown from "react-markdown";
import {
  SandpackProvider,
  SandpackLayout,
  SandpackPreview,
  SandpackCodeEditor,
  useSandpack,
  useActiveCode,
  SandpackFileExplorer,
} from "@codesandbox/sandpack-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { a11yDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { callModelWithStreaming } from "./callModel";
import { parseCodeFromMarkDown } from "./parseCodeFromMarkDown";
import { toMarkdown } from "mdast-util-to-markdown";
import { fromMarkdown } from "mdast-util-from-markdown";
import OpenAI from "openai";
import { useResizeObserver } from "./useResizeObserver";
import * as LocalDb from "./LocalDb";
import { ExpandLeft, ExpandRight, Menu, NewPaper, Key } from "../Icons";
import { OlderSessionsDrawer } from "./OlderSessionsDrawer";
import { MODELS, Models } from "./constants";
import { AcceptOpenAIKeyModal } from "./AcceptOpenAIKeyModal";
import { KeyUpdateDialog } from "./KeyUpdateDialog";

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

const { SESSION_ID_KEY } = LocalDb;

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
            //@ts-ignore
            <SyntaxHighlighter
              {...rest}
              PreTag="div"
              children={String(children).replace(/\n$/, "")}
              codeTagProps={{ style: { fontSize: "14px" } }}
              showLineNumbers
              style={a11yDark}
            />
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

const TEXT_INPUT_HEIGHT = 60;
const ChatItem = memo(ChatItemOriginal);

const generateFullInitialPrompt = (text: string) => {
  if (!text.trim().endsWith(".")) {
    text = `${text}.`;
  }
  return `You are an experienced web developer. Generate full code for a web app based on the following request: ${text} I don't want a basic example. I need full implementation. I need following rules must be followed while generating the code. First line of the code in each code file should be a comment specifying relative path of the file. I need contents of each code file should formatted within a separate fenced code blocks. The code must be in Javascript language. Prefer using React.js when its suitable. If its easier and very simple, use plain javascript. You MUST PROVIDE package.json always, without any scripts attribute. I am using parcel bundler to run. ${templateDescriptions} If I ask for any changes after you provided me initial code,its VERY IMPORTANT that you MUST PROVIDE THE FULL CODE OF THE FILE, ONLY WHICH ARE GETTING CHANGED, WITH UPDATED CODE instead of referring the existing code with comments. DO NOT provide the code unless the content is changing. When suggesting additional dependencies, definitely provide full package.json again with updated dependencies. Because nobody is going to read the comments and copy paste the previous code, since this is an automated system.`;
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
      console.log("index props", { messageIndex, oldIndexOfTheCode, parsed });
      if (oldIndexOfTheCode > -1 && messageIndex > -1 && parsed) {
        //@ts-ignore
        parsed.children[oldIndexOfTheCode].value = activeCode;

        setMessages((messages) => {
          let newMessages = [...messages];

          if (messages.length > 0) {
            const messageToUpdate = newMessages[messageIndex];

            messageToUpdate.content = toMarkdown(parsed);
            LocalDb.updateMessage(messageToUpdate.id!, {
              content: toMarkdown(parsed),
            })
              .then((v) => {
                console.log("message updated", v);
              })
              .catch((e) => {
                console.warn("error updating message e", e);
              });
          }

          return newMessages;
        });

        codesRef.current = { ...codesRef.current, [activeFile]: activeCode };
        if (sessionStorage[SESSION_ID_KEY]) {
          LocalDb.setCodesForSession(
            codesRef.current,
            sessionStorage[SESSION_ID_KEY]
          );
        }

        setActiveFile(activeFile);
      }
    }
    console.timeEnd("codeCompare");
  }, [activeCode, activeFile]);

  useEffect(() => {
    const cleanup = listen((e) => {
      console.log("got message from csb:::::", e);
      if (e.type === "console" && e?.log?.[0]?.method === "error") {
        console.warn(e.log[0].data);
      }
    });

    return cleanup;
  }, []);

  return null;
}

const fileExlorerStyle = { paddingTop: "40px" };

function getMessageFromError(error: any) {
  if (error?.message) {
    return error.message;
  } else {
    return `${error}`;
  }
}

function codesWithPackageJson(codes: Record<string, string>) {
  if (!codes["/package.json"]) {
    codes = {
      ...codes,
      ["/package.json"]: JSON.stringify({
        main: "index.js",
        dependencies: { react: "^17.0.2", "react-dom": "^17.0.2" },
      }),
    };
  }
  return codes;
}

function ChatCode() {
  const [currentPrompt, setCurrentPrompt] = useState("");
  const [initialprompt, setInitialPrompt] = useState("");
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [expandCode, setExpandCode] = useState(false);
  const codesRef = useRef<Record<string, string>>({});
  const [messages, setMessages] = useState<
    (OpenAI.ChatCompletionMessageParam & { id?: string })[]
  >([]);
  const [model, setModel] = useState<Models>("gpt-3.5-turbo");

  const {
    isOpen: isDrawerOpen,
    onOpen: onDrawerOpen,
    onClose: onDrawerClose,
  } = useDisclosure();

  const [generating, setGenerating] = useState(false);
  const srcollContainer = useRef<HTMLDivElement>(null);

  const { height: contentItemHeight, ref: contentItemref } =
    useResizeObserver();
  const lastParsedMarkDownRef = useRef<any>(null);

  const reset = () => {
    sessionStorage.removeItem(SESSION_ID_KEY);
    setCurrentPrompt("");
    setInitialPrompt("");
    setCodes({});
    setExpandCode(false);
    codesRef.current = {};
    setMessages([]);
    setGenerating(false);
    lastParsedMarkDownRef.current = null;
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      if (srcollContainer.current) {
        srcollContainer.current.scrollTop =
          srcollContainer.current.scrollHeight;
      }
    }, 50);
  };

  const loadSession = (sessionId: string) => {
    LocalDb.getSession(sessionId).then((result) => {
      if (result) {
        const { initialPrompt, messages, codes } = result;
        setInitialPrompt(initialPrompt);
        setMessages(messages);
        setCodes(codes);
        codesRef.current = codes;
        setExpandCode(false);
        scrollToBottom();
      }
    });
  };

  useEffect(() => {
    const sessionId = sessionStorage[SESSION_ID_KEY];
    if (sessionId) {
      loadSession(sessionId);
    }
  }, []);

  const toast = useToast({
    position: "top",
    containerStyle: { marginTop: 100 },
  });

  // console.log('messages',messages);
  const submitText = async (text: string) => {
    setGenerating(true);
    let messagesToSend = [...messages];
    if (messages.length === 0) {
      setInitialPrompt(text);

      const sessionId = await LocalDb.addSession(text);
      sessionStorage[SESSION_ID_KEY] = sessionId;

      messagesToSend = [
        { role: "user", content: generateFullInitialPrompt(text) },
      ];
      await LocalDb.addMessage(messagesToSend[0], sessionId);
    } else {
      const sessionId = sessionStorage[SESSION_ID_KEY];
      const message = { role: "user", content: text } as const;
      messagesToSend = [...messagesToSend, message];
      await LocalDb.addMessage(message, sessionId);
    }
    setMessages(messagesToSend);
    scrollToBottom();
    const indexToUpdate = messagesToSend.length;

    // console.log("messages before calling", messages);
    callModelWithStreaming({
      model: model,
      // model: "gpt-4-1106-preview",
      //@ts-ignore
      messages: messagesToSend.map((x) => omit(x, "id")),
      setState: (v, id) => {
        messagesToSend[indexToUpdate] = { role: "assistant", content: v, id };
        setMessages([...messagesToSend]);

        scrollToBottom();
      },
      onComplete: async (fullMessage, id) => {
        const sessionId = sessionStorage[SESSION_ID_KEY];
        await LocalDb.addMessage(
          { role: "assistant", content: fullMessage, id },
          sessionId
        );

        setGenerating(false);
        setCurrentPrompt("");
        const { codeBlocks: codeFiles, parsedMarkdown } =
          parseCodeFromMarkDown(fullMessage);
        lastParsedMarkDownRef.current = parsedMarkdown;
        // console.log("got codefiles", codeFiles);
        let newCodes: Record<string, string> = {};
        for (const codeFile of codeFiles) {
          if (codeFile.path) {
            newCodes[`/${codeFile.path}`] = codeFile.text;
          }
        }

        codesRef.current = { ...codesRef.current, ...newCodes };
        setCodes((existing) => ({
          ...existing,
          ...codesRef.current,
          ...newCodes,
        }));

        await LocalDb.setCodesForSession({ ...codesRef.current }, sessionId);
      },
      onError: (error) => {
        setGenerating(false);
        console.log("got error", { error });
        toast({
          duration: 10000,
          title: "Got Error",
          status: "error",
          description: getMessageFromError(error),
          isClosable: true,
        });
      },
    });
  };

  const isCodePresent = useMemo(() => {
    return Object.keys(codes).length > 0;
  }, [codes]);

  return (
    <>
      <AcceptOpenAIKeyModal
        model={model}
        onChangeModel={(m) => {
          setModel(m);
        }}
      />
      <Container height="100vh" maxW="container.2xl">
        <Grid
          width="100%"
          height="100%"
          pt={2}
          pb={15}
          gap={2}
          position="relative"
          templateRows={`1fr ${TEXT_INPUT_HEIGHT}px`}
          templateColumns={"1fr 1fr"}
          templateAreas={`"${expandCode ? "preview" : "messages"} preview"
        "bottomTextInput bottomTextInput"
        `}
        >
          <ButtonGroup
            top="5px"
            position="absolute"
            zIndex={2}
            isAttached
            variant="solid"
          >
            <Button
              colorScheme="twitter"
              leftIcon={<Menu boxSize="2em" />}
              onClick={() => onDrawerOpen()}
            >
              Previous Sessions
            </Button>
            <Button
              colorScheme="teal"
              onClick={() => {
                reset();
              }}
              leftIcon={<NewPaper boxSize="2em" />}
            >
              New Session
            </Button>
            <Button paddingInlineStart={0} paddingInlineEnd={0}>
              <Select
                value={model}
                onChange={(e) => {
                  setModel(e.target.value as Models);
                }}
              >
                {MODELS.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </Select>
            </Button>
            <KeyUpdateDialog />
          </ButtonGroup>

          <GridItem
            height="100%"
            overflowY="auto"
            area="messages"
            ref={srcollContainer}
            display={expandCode ? "none" : "block"}
          >
            <Flex
              width="100%"
              minHeight="100%"
              pt={50}
              flexDir="column"
              justifyContent="flex-end"
            >
              <ChatItem
                key="system-first-message"
                system
                text="Describe the web app you need me to write. I will try my best"
              />
              {initialprompt ? <ChatItem text={initialprompt} /> : null}
              {messages.slice(1).map((msg, index) => (
                <ChatItem
                  key={msg.id || index}
                  text={msg.content as string}
                  system={msg.role === "assistant" || msg.role === "system"}
                />
              ))}
            </Flex>
          </GridItem>

          <GridItem
            bg={"green.300"}
            area="preview"
            ref={contentItemref}
            position="relative"
          >
            {isCodePresent ? (
              <>
                <IconButton
                  position="absolute"
                  left={"-24px"}
                  isRound
                  top="calc( ((100vh - 90px)/2) + 24px)"
                  zIndex={2}
                  size="lg"
                  onClick={() => setExpandCode((v) => !v)}
                  colorScheme="teal"
                  aria-label={expandCode ? "Show Chat" : "Expand Code Editor"}
                  title={expandCode ? "Show Chat" : "Expand Code Editor"}
                  icon={expandCode ? <ExpandRight /> : <ExpandLeft />}
                />
                <SandpackProvider
                  theme="dark"
                  files={codesWithPackageJson(codes)}
                  template="vanilla"
                >
                  <SandpackLayout
                    style={{ "--sp-layout-height": contentItemHeight } as any}
                  >
                    {expandCode ? (
                      <SandpackFileExplorer style={fileExlorerStyle} />
                    ) : null}
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
              </>
            ) : null}
          </GridItem>
          <GridItem
            area="bottomTextInput"
            as="form"
            onSubmit={(e) => {
              e.preventDefault();
              submitText(currentPrompt);
            }}
          >
            <InputGroup marginBottom="10px">
              <Textarea
                textOverflow="wrap"
                borderWidth={2}
                width="calc(100% - 71px)"
                placeholder="Enter your request"
                value={currentPrompt}
                height={`${TEXT_INPUT_HEIGHT}px`}
                minHeight={`${TEXT_INPUT_HEIGHT}px`}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    submitText(currentPrompt);
                  }
                }}
                onChange={(e) => {
                  setCurrentPrompt(e.target.value);
                }}
                disabled={generating}
              />
              <InputRightElement height="full" width="4.5rem">
                <Button
                  borderLeftRadius={0}
                  size="md"
                  height={`${TEXT_INPUT_HEIGHT}px`}
                  colorScheme="teal"
                  type="submit"
                  isLoading={generating}
                >
                  submit
                </Button>
              </InputRightElement>
            </InputGroup>
          </GridItem>
        </Grid>
      </Container>
      <OlderSessionsDrawer
        reset={reset}
        loadSession={loadSession}
        placement="left"
        isOpen={isDrawerOpen}
        onClose={onDrawerClose}
      />
    </>
  );
}

ChatCode.displayName = "ChatCode";

export const Component = ChatCode;
