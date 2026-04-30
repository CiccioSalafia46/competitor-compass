import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
// Initialize i18n before React renders — reads localStorage to avoid language flash
import "./lib/i18n";

// Initialize dark mode before React renders to prevent flash
const storedTheme = localStorage.getItem("theme");
if (storedTheme === "dark" || (!storedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
  document.documentElement.classList.add("dark");
}

// Grain texture for depth
document.documentElement.classList.add("grain");

createRoot(document.getElementById("root")!).render(<App />);
