import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/styles/global.css";
import { NativeRoot } from "./NativeRoot";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <NativeRoot />
  </StrictMode>
);
