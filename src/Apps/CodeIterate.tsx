import { useEffect, useRef, useState,useMemo } from "react";
import {
  Container,
  Grid,
  GridItem,
  Textarea,
  InputGroup,
  InputRightElement,
  Button,
} from "@chakra-ui/react";
import {
  SandpackProvider,
  SandpackLayout,
  SandpackPreview,
  SandpackCodeEditor,
  SandpackFileExplorer,
} from "@codesandbox/sandpack-react";
import { getCode } from './callModel';

function useResizeObserver() {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: "100%", height: "100%" });
  useEffect(() => {
    const resizeObserver = new ResizeObserver((entries) => {
      if (entries[0]) {
        const { height, width } = entries[0].contentRect;
        setSize({ height: `${height - 2}px`, width: `${width}px` });
      }
    });

    resizeObserver.observe(ref.current!);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);
  return { ref, width: size.width, height: size.height };
}

function CodeIterate() {
  const { ref: contentItemref, height: contentItemHeight } =
    useResizeObserver();

 const [currentPrompt,setCurrentPrompt] = useState("");
 const [codeResult, setCoderesult] = useState<any>(null);

 const files =  useMemo(()=>{
    return codeResult? codeResult.files.reduce((acc:any,cur:any)=>{
        acc[cur.fullPath] = cur.content;
        return acc;
      },{}): null;
 },[codeResult?.files]);

 const dependencies = useMemo(()=>{
    return codeResult? codeResult.additionalDependencies.reduce((acc:any,cur:any)=>{
        acc[cur]="latest";
        return acc;
    },{}):[];
 },[codeResult?.additionalDependencies])
  
 console.log('files',{files,dependencies});


  return (
    <Container margin="auto" maxW="container.xl" height="100vh">
      <Grid
        height="100%"
        width="100%"
        templateAreas={`"input"
        "code"
        `}
        gap={2}
        templateRows="auto 1fr"
        gridTemplateColumns="1fr"
        paddingTop={5}
        paddingBottom={5}
      >
        <GridItem area="input">
          <InputGroup>
            <Textarea
              resize="vertical"
              placeholder="Enter your request"
              value={currentPrompt}
              onChange={(e)=>{
                setCurrentPrompt(e.target.value);
              }}
            ></Textarea>
            <InputRightElement height="full" width="4.5rem">
              <Button
                borderLeftRadius={0}
                size="md"
                height="full"
                colorScheme="teal"
                onClick={()=>{
                    getCode({prompt: currentPrompt}).then((r)=>{
                        console.log('got results',r);
                        const data = JSON.parse(r.data||"null");
                        setCoderesult(data);
                        console.log('parsed data',data);
                    }).catch((e)=>{
                        console.warn('error',e);
                    })
                }}
              >
                submit
              </Button>
            </InputRightElement>
          </InputGroup>
        </GridItem>
        <GridItem ref={contentItemref} area="code" background="orange.300">
          <SandpackProvider template="vanilla" customSetup={{dependencies}} >
            {/* @ts-ignore */}
            <SandpackLayout style={{ "--sp-layout-height": contentItemHeight }}>
              <SandpackFileExplorer />
              <SandpackCodeEditor
                showTabs
                showLineNumbers
                showInlineErrors
                wrapContent
                closableTabs
              />

              <SandpackPreview />
            </SandpackLayout>
          </SandpackProvider>
          {/* <Sandpack template="react" options={{editorHeight:contentItemHeight}} /> */}
        </GridItem>
      </Grid>
    </Container>
  );
}

CodeIterate.displayName = "CodeIterate";

export const Component = CodeIterate;
