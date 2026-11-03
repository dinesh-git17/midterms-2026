import { mount } from "svelte";
import "./app.css";
import App from "./App.svelte";
import { live } from "./lib/live.svelte";

mount(App, { target: document.getElementById("app")! });
live.start();
