import React from "react";
import ReactDOM from "react-dom/client";
import {
  createHashRouter,
  RouterProvider,
  Route,
  createRoutesFromElements,
} from "react-router-dom";

import { ChakraProvider } from "@chakra-ui/react";
// import { Test } from './Apps/Test';
// import {TestCode} from './Apps/Container/TestCode';

let routes = createHashRouter(
  createRoutesFromElements(
    <>
      <Route
        path="/"
        lazy={() => import("./Apps/ChatCode")}
      />

      <Route path="/code-chat" lazy={() => import("./Apps/ChatCode")} />

    </>
  )
);

// const router = createBrowserRouter([
//   {
//     path: "/",
//     element: (
//       <div>
//         <h1>Hello World</h1>
//         <Link to="about">About Us</Link>
//       </div>
//     ),
//   },
//   {
//     path: "/test",
//     lazy: () => import('./Apps/Test'),
//   },
//   // {
//   //   path: "/code",
//   //   element: <TestCode />
//   // },
//   {
//     path: "about",
//     element: <div>About</div>,
//   },
// ]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ChakraProvider>
      <RouterProvider router={routes} />
    </ChakraProvider>
  </React.StrictMode>
);
