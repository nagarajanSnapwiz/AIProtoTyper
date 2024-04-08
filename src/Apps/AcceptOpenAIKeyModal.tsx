import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  Button,
  ModalProps,
  FormControl,
  FormLabel,
  Input,
  FormHelperText,
  Select,
  useDisclosure,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { LOCAL_STORAGE_OPEN_AI_KEY, MODELS, Models } from "./constants";


type AcceptOpenAIKeyModalProps = Omit<
  ModalProps,
  "children" | "onClose" | "isOpen"
> & {
  model: Models;
  onChangeModel: (v: Models) => void;
};
export const AcceptOpenAIKeyModal = ({
  model,
  onChangeModel,
  ...props
}: AcceptOpenAIKeyModalProps) => {
  const [openAIKey, setOpenAIKey] = useState("");
  const { isOpen, onOpen, onClose } = useDisclosure();
  useEffect(() => {
    if (!window.localStorage[LOCAL_STORAGE_OPEN_AI_KEY]) {
      onOpen();
    }
  }, []);

  return (
    <Modal
      closeOnEsc={false}
      closeOnOverlayClick={false}
      isOpen={isOpen}
      onClose={onClose}
      {...props}
    >
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>OpenAI API key needed</ModalHeader>
        <ModalBody>
          <FormControl>
            <FormLabel>Open AI key</FormLabel>
            <Input
              value={openAIKey}
              onChange={(e) => {
                const changed = e.target.value.trim();
                setOpenAIKey(changed);
                localStorage[LOCAL_STORAGE_OPEN_AI_KEY] = changed;
                
              }}
              type="password"
              placeholder="Enter the key"
            />
            <FormHelperText>
              This will be stored only on the browser
            </FormHelperText>
          </FormControl>
          <FormControl mt={5}>
            <FormLabel>Select Model to start with</FormLabel>
            <Select
              size="lg"
              disabled={!openAIKey}
              placeholder="Select the model to start with"
              value={model}
              onChange={(e) => {
                onChangeModel(e.target.value as Models);
              }}
            >
              {MODELS.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </Select>
          </FormControl>
        </ModalBody>

        <ModalFooter>
          {openAIKey ? (
            <Button colorScheme="blue" mr={3} onClick={onClose}>
              Close
            </Button>
          ) : null}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
