import { runEngine } from "./engine";

runEngine(process.argv.includes("--watch")).catch(console.error);
