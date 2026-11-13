import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const prompt = await readFile("agents/pi/.pi/agent/prompts/recap.md", "utf8");
const skill = await readFile("agents/dotagents/.agents/skills/recap/SKILL.md", "utf8");

assert.match(prompt, /Use the recap skill/);
assert.match(skill, /40–60 words/);
assert.match(skill, /unresolved.*caveats/i);
assert.match(skill, /next action/i);
assert.match(skill, /do not use tools/i);
console.log("recap prompt and skill checks passed");
