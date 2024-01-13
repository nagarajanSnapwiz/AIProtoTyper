import { useState } from "react";
import { Container, Grid, GridItem, Textarea, Button } from "@chakra-ui/react";
import { WebContainer } from "@webcontainer/api";

export function TestCode() {
  return (
    <Container height="100vh" maxW={"container.xl"}>
      <Grid
        width="100%"
        height="100%"
        pt={10}
        templateColumns="1fr 1fr"
        gap={4}
        templateRows="1fr 50px"
        templateAreas={`
        "editor preview"

        ".button"
        `}
      >
        <GridItem area="editor">
          <Textarea placeholder="Write code here" width="full" height="full"></Textarea>
        </GridItem>
        <GridItem area="preview" bg="pink.300">
          Preview
        </GridItem>
        <GridItem area="button">
          <Button size="lg" colorScheme="teal">Run Code</Button>
        </GridItem>
      </Grid>
    </Container>
  );
}
