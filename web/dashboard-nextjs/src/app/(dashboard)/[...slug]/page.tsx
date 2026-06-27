const titles: Record<string, string> = {
  kpis: "Representative KPIs",
  projects: "Project Tracker",
  alerts: "Red Flag Alerts",
  agro: "Agri Markets",
  map: "Geo Spatial Map",
  representatives: "Representatives",
};

export default async function PlaceholderPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const resolved = await params;
  const slug = resolved.slug?.[0] ?? "module";
  const title = titles[slug] ?? slug;

  return (
    <div className="mx-auto max-w-7xl animate-fade-in">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="mt-2 text-muted-foreground">Module shell ready — data integration pending.</p>
    </div>
  );
}
