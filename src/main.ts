import { mount } from "svelte";
import "./app.css";
import App from "./App.svelte";
import { live } from "./lib/live.svelte";

mount(App, { target: document.getElementById("app")! });
live.start();

// Dev only: lets the browser console fake a call to check the called-race motion. Stripped from builds.
if (import.meta.env.DEV) (window as unknown as { __live: typeof live }).__live = live;
