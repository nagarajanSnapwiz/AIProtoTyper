import {
  Center,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  DrawerProps,
  IconButton,
  List,
  ListItem,
  Spinner,
  Text,
} from "@chakra-ui/react";
import { liveQuery } from "dexie";
import { getSessions, SESSION_ID_KEY, deleteSession } from "./LocalDb";
import { useEffect, useState } from "react";
import { Enter, Trash } from "../Icons";

type SessionRow = {
  title: string;
  id: string;
  updatedOn: number;
  when: string;
};

function getSessionsObservable() {
  return liveQuery(getSessions);
}

type OlderSessionsDrawerProps = Omit<DrawerProps, "children"> & {
  loadSession: (id: string) => void;
  reset: () => void;
};

export const OlderSessionsDrawer = ({
  loadSession,
  reset,
  ...props
}: OlderSessionsDrawerProps) => {
  const [sessions, setSessions] = useState<SessionRow[]>([]);

  useEffect(() => {
    let unmounted = false;

    const observable = getSessionsObservable();
    const subscription = observable.subscribe({
      next: (rows) => {
        if (!unmounted) setSessions(rows);
      },
      error: (error) => console.error(error),
    });

    return () => {
      subscription.unsubscribe();
      unmounted = true;
    };
  }, [setSessions]);

  const removeSession = (sessionId: string) => {
    if (sessionStorage[SESSION_ID_KEY] === sessionId) {
      reset();
    }
    deleteSession(sessionId);
  };

  return (
    <Drawer {...props}>
      <DrawerOverlay />
      <DrawerContent maxW="xl">
        <DrawerCloseButton />
        <DrawerHeader>Previous Sessions</DrawerHeader>

        <DrawerBody>
          <List>
            {sessions.map((row) => (
              <ListItem
                borderRadius="md"
                pl={2}
                width="100%"
                transition="background 0.3s ease-out"
                borderBottom="1px solid rgba(0,0,0,0.2)"
                py={2}
                cursor="pointer"
                onClick={() => {
                  sessionStorage[SESSION_ID_KEY] = row.id;
                  loadSession(row.id);
                  props.onClose();
                }}
                _hover={{
                  background: "rgba(0,0,0,0.2)",
                }}
                key={row.id}
              >
                <Text
                  as="span"
                  fontWeight="bold"
                  color="teal"
                  display="-webkit-inline-box"
                  overflow="hidden"
                  textOverflow="ellipsis"
                  verticalAlign="middle"
                  mt="-5px"
                  sx={{
                    "WebkitLineClamp": "2",
                    "WebkitBoxOrient": "vertical",
                  }}
                >
                  {row.title}
                </Text>{" "}
                <Text as="i"> updated </Text>
                <Text
                  as="span"
                  title={new Date(row.updatedOn).toISOString()}
                  fontWeight="bold"
                >
                  {row.when}
                </Text>
                <IconButton
                  mx={2}
                  icon={<Enter boxSize="3em" p={2} display="inline-block" />}
                  colorScheme="teal"
                  aria-label="Enter Session"
                />
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    removeSession(row.id);
                  }}
                  icon={<Trash boxSize="3em" p={2} display="inline-block" />}
                  colorScheme="red"
                  variant="outline"
                  aria-label="Delete Session"
                />
              </ListItem>
            ))}
          </List>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
};
