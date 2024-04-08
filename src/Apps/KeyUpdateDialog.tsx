import { Key } from "../Icons";
import {
  Button,
  AlertDialog,
  AlertDialogContent,
  AlertDialogOverlay,
  AlertDialogHeader,
  AlertDialogFooter,
  useDisclosure,
  AlertDialogBody,
  Input,
} from "@chakra-ui/react";
import { useRef, useState } from "react";
import { LOCAL_STORAGE_OPEN_AI_KEY } from "./constants";

export const KeyUpdateDialog = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = useRef<any>();
  const [openAIKey, setOpenAIKey] = useState(
    localStorage[LOCAL_STORAGE_OPEN_AI_KEY] || ""
  );

  return (
    <>
      <Button
        leftIcon={<Key boxSize="2em" />}
        colorScheme="green"
        onClick={onOpen}
      >
        OpenAI API Key
      </Button>

      <AlertDialog
        isOpen={isOpen}
        leastDestructiveRef={cancelRef}
        onClose={onClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Update OpenAPI Key
            </AlertDialogHeader>

            <AlertDialogBody>
              <Input
                type="password"
                placeholder="API Key"
                value={openAIKey}
                onChange={(e) => {
                  const value = e.target.value.trim();

                  localStorage[LOCAL_STORAGE_OPEN_AI_KEY] = value;
                  setOpenAIKey(value);
                }}
              />
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose}>
                Cancel
              </Button>
              <Button colorScheme="teal" onClick={onClose} ml={3}>
                Update
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
};
