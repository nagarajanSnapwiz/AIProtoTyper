import { useRef, useState } from "react";
import { Container, Grid, GridItem, Textarea, Input, Button,Image } from "@chakra-ui/react";
import {callModelWithStreaming} from './callModel';
import { fileToDataUrl} from './fileToDataUrl';




function Test() {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    const [text,setText] = useState("");
    const [result,setResult] = useState("");
    const [selectedImageDataUrl, setSelectedImageDataUrl] = useState("");
  return (
    <Container height="100vh" width="100%" margin="auto">
      <Grid
        gap={2}
        height="100%"
        templateRows="80px 50px 1fr 10px"
        templateAreas={`"head head head"
"modelSelect fileInput submit"
"content content content"
"footer footer footer"`}
      >
        <GridItem area="head" paddingTop={4}>
          <Textarea value={text} onChange={(e)=> setText(e.target.value)} height="full" placeholder="Enter text here"></Textarea>
        </GridItem>
         <GridItem area="modelSelect">
         <Button size="lg" colorScheme="blue"  onClick={()=>{
           setSelectedImageDataUrl("");
           fileInputRef.current!.value = "";
          }} >Clear Image</Button>
        </GridItem>
        <GridItem area="fileInput">
          <Input ref={fileInputRef} type="file" paddingTop={2} accept="image/*" size="lg" onChange={(e)=> {
            if(e.target.files?.[0]){
                fileToDataUrl(e.target.files[0]).then((r)=>{
                    setSelectedImageDataUrl(r as string);
                });
            }
                            
          }}  placeholder="Select or capture image"  />
        </GridItem>
        <GridItem area="submit">
          <Button size="lg" colorScheme="teal"  onClick={()=>{
            callModelWithStreaming({text, image: selectedImageDataUrl, setState: (v)=> {
                setResult(v);
                setTimeout(()=>{
                    contentRef.current?.scroll({left: 0, top: contentRef.current.scrollHeight, behavior:"smooth"});
                },50);
            }});
          }} >submit</Button>
        </GridItem>
        <GridItem ref={contentRef} whiteSpace="pre-wrap" area="content" overflowY="auto">
          {selectedImageDataUrl? <Image fit="contain" src={selectedImageDataUrl} />: null}
          {result}
        </GridItem>
        <GridItem bg="green.300" area="footer">
          
        </GridItem>
      </Grid>
    </Container>
  );
}

export const Component = Test;