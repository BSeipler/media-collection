import { notFound } from "next/navigation";
import { Nav } from "@/components/Nav";
import { ItemDetail } from "@/components/ItemDetail";
import { getComps, getItem } from "@/lib/db";
import { soldSearchUrl } from "@/lib/ebay";
import { getSessionRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function ItemPage({ params }: Props) {
  const { id } = await params;
  const item = await getItem(Number(id));
  if (!item) notFound();
  const comps = await getComps(item.id);
  const soldUrl = soldSearchUrl(item.title, item.format);
  const guest = (await getSessionRole()) === "guest";

  return (
    <>
      <Nav active="collection" guest={guest} />
      <main className="flex-1">
        <ItemDetail
          item={item}
          comps={comps}
          soldUrl={soldUrl}
          readOnly={guest}
        />
      </main>
    </>
  );
}
