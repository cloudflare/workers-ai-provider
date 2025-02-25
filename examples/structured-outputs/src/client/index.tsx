import { createRoot } from "react-dom/client";
import Chat from "./chat";

function App() {
  return <Chat id="example-room" />;
}

const root = createRoot(document.getElementById("root")!);

root.render(<App />);
