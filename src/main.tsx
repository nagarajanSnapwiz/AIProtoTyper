import React from "react";
import ReactDOM from "react-dom/client";
import {
  createBrowserRouter,
  RouterProvider,
  Link,
  Route,
  createRoutesFromElements,
} from "react-router-dom";

import { ChakraProvider } from "@chakra-ui/react";
// import { Test } from './Apps/Test';
// import {TestCode} from './Apps/Container/TestCode';

let routes = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route
        path="/"
        element={
          <div>
            <h1>Hello World</h1>
            <Link to="/about">About Us</Link>
          </div>
        }
      />
      <Route path="/test" lazy={() => import("./Apps/Test")} />
      <Route path="/code-iterate" lazy={() => import("./Apps/CodeIterate")} />
      <Route path="/about" element={<div>About</div>} />
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
