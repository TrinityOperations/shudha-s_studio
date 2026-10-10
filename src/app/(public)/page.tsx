import { HomeSections } from "@/components/public/home/home-sections";
import { getHomeSettings } from "@/db/queries/settings";

/** PW-01..PW-09: the home page renders the published copy of the home key. */
export default async function HomePage() {
  const home = await getHomeSettings();
  return <HomeSections home={home} />;
}
