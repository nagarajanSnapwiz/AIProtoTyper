import React from "react";
import ReactDOM from "react-dom/client";
import {
  createHashRouter,
  RouterProvider,
  Route,
  createRoutesFromElements,
} from "react-router-dom";

import { ChakraProvider } from "@chakra-ui/react";

const routes = createHashRouter(
  createRoutesFromElements(
    <>
      <Route path="/" lazy={() => import("./Apps/ChatCode")} />
      <Route path="/code-chat" lazy={() => import("./Apps/ChatCode")} />
    </>
  )
);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ChakraProvider>
      <RouterProvider router={routes} />
    </ChakraProvider>
  </React.StrictMode>
);
