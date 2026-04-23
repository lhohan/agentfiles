import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export default function discoveryToolsExtension(pi: ExtensionAPI) {
  pi.on("session_start", () => {
    const activeTools = new Set(pi.getActiveTools());

    activeTools.add("grep");
    activeTools.add("find");
    activeTools.add("ls");

    pi.setActiveTools([...activeTools]);
  });
}
