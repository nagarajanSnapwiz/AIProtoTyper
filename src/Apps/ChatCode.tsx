import { memo, useState, useRef } from "react";
import omit from 'lodash.omit';
import {
  Container,
  Grid,
  GridItem,
  Textarea,
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
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { a11yDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { callModelWithStreaming } from "./callModel";
import OpenAI from "openai";

type ChatItemProps = {
  system?: Boolean;
  text: string;
};

function SafeMarkdown({ text }: { text: string }) {
  return (
    <ReactMarkdown
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
              codeTagProps={{style:{fontSize:"14px"}}}
              
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
  return `Generate full code for following app: ${text} I don't want a basic example. I need full implementation. First line of the code in each code file should be a comment specifying relative path of the file. I need contents of each code file should formatted within a separate code blocks. The code must be in Javascript language. If any external dependencies needed, mention that in a file named 'dependencies'. Prefer using React.js when only necessary. If its easier, use plain javascript. If I ask for any changes after you provided me initial code, please provide the full code of each file  retaining existing code`;
};

function ChatCode() {
  const [currentPrompt, setCurrentPrompt] = useState("");
  const [initialprompt, setInitialPrompt] = useState("");
  const [messages, setMessages] = useState<(OpenAI.ChatCompletionMessageParam & {id?: string})[]>(
    []
  );
  const [generating, setGenerating] = useState(false);
  const srcollContainer = useRef<HTMLDivElement>(null);

  console.log('messages',messages);
  const submitText = (text: string) => {
    setGenerating(true);
    let messagesToSend = [...messages];
    if (messages.length === 0) {
      setInitialPrompt(text);
      messagesToSend = [
        { role: "user", content: generateFullInitialPrompt(text) },
      ];
    } else {
      messagesToSend = [
        ...messagesToSend,
        { role: "user", content: text },
      ];
    }
    setMessages(messagesToSend);
    const indexToUpdate = messagesToSend.length;

    console.log("messages before calling", messages);
    callModelWithStreaming({
      model: "gpt-3.5-turbo-1106",
      messages: messagesToSend.map(x => omit(x,"id")),
      setState: (v,id) => {
        messagesToSend[indexToUpdate] = { role: "assistant", content: v, id };
        setMessages([...messagesToSend]);

        setTimeout(() => {
          if (srcollContainer.current) {
            srcollContainer.current.scrollTo({top: 999999});
          }
        }, 100);
      },
      onComplete: () => {
        setGenerating(false);
        setCurrentPrompt("");
      },
    });
  };

  return (
    <Container height="100vh" maxW="container.2xl">
      <Grid
        width="100%"
        height="100%"
        pt={2}
        pb={4}
        gap={2}
        templateRows={"1fr 60px"}
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
          <Box width="100%" pt={50}>
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
          </Box>
        </GridItem>
        <GridItem bg={"green.300"} area="preview"></GridItem>
        <GridItem area="bottomTextInput">
          <InputGroup>
            <Textarea
              borderWidth={2}
              resize="vertical"
              placeholder="Enter your request"
              value={currentPrompt}
              minH="auto"
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
