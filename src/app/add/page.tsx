import { Nav } from "@/components/Nav";
import { AddFlow } from "@/components/AddFlow";

export default function AddPage() {
  return (
    <>
      <Nav active="add" />
      <main className="flex-1">
        <AddFlow />
      </main>
    </>
  );
}
