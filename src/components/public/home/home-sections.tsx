import { listPublishedProductsByIds } from "@/db/queries/catalogue";
import { listApprovedGallery } from "@/db/queries/gallery";
import {
  listNewestProducts,
  listOccasionFallbackImages,
  listProductFirstPhotos,
  listSignatureProducts,
} from "@/db/queries/home";
import {
  getAboutSettings,
  getSeasonalBannerSettings,
  getSocialSettings,
} from "@/db/queries/settings";
import { listCategories, listOccasions } from "@/db/queries/taxonomy";
import { listVisibleTestimonials } from "@/db/queries/testimonials";
import { pickProducts, resolveOccasionTile } from "@/lib/home";
import { getT } from "@/lib/i18n";
import {
  HOME_NEW_PICKS_MAX,
  HOME_SIGNATURE_PICKS_MAX,
  type HomeContent,
} from "@/lib/validators/settings";
import { FactsStrip } from "./facts-strip";
import { FollowStudio } from "./follow-studio";
import { HappyCustomers } from "./happy-customers";
import { Hero } from "./hero";
import { KindWords } from "./kind-words";
import { MadeForYou } from "./made-for-you";
import { MeetShudha } from "./meet-shudha";
import { NewFromStudio } from "./new-from-studio";
import { Occasions, type OccasionTile } from "./occasions";
import { SeasonalBanner } from "./seasonal-banner";
import { SignatureDesigns } from "./signature-designs";

type Props = {
  /** The copy of the home key to render: `published` for visitors, `draft` in the editor */
  home: HomeContent;
  /** The editor route sets this; sections then describe their photo slots to SlotFrame */
  editing?: boolean;
};

/** PW-01..PW-09: every section from docs/design.md in order, shared by the home page and the editor. */
export async function HomeSections({ home, editing = false }: Props) {
  const [
    t,
    banner,
    about,
    social,
    occasions,
    categories,
    signature,
    newest,
    occasionFallbacks,
    testimonials,
    gallery,
  ] = await Promise.all([
    getT(),
    getSeasonalBannerSettings(),
    getAboutSettings(),
    getSocialSettings(),
    listOccasions(),
    listCategories(),
    listSignatureProducts(HOME_SIGNATURE_PICKS_MAX),
    listNewestProducts(HOME_NEW_PICKS_MAX),
    listOccasionFallbackImages(),
    listVisibleTestimonials(),
    listApprovedGallery(),
  ]);
  const overrideProductIds = Object.values(home.occasionTiles).flatMap((tile) =>
    "productId" in tile ? [tile.productId] : [],
  );
  const [signaturePicks, newPicks, overridePhotos] = await Promise.all([
    listPublishedProductsByIds(home.signaturePicks),
    listPublishedProductsByIds(home.newPicks),
    listProductFirstPhotos(overrideProductIds),
  ]);

  const occasionTiles: OccasionTile[] = occasions.map((occasion) => {
    const override = home.occasionTiles[occasion.slug];
    const productPhoto =
      override && "productId" in override ? overridePhotos.get(override.productId) : undefined;
    return {
      occasion,
      photo: resolveOccasionTile(override, productPhoto, occasionFallbacks.get(occasion.id)),
    };
  });
  const signatureProducts = pickProducts(signaturePicks, signature, HOME_SIGNATURE_PICKS_MAX);
  const signatureShown = signatureProducts.map((p) => p.id);

  return (
    <>
      <Hero
        poster={home.heroPoster}
        videoPath={home.heroVideoPath}
        slots={
          editing
            ? [
                {
                  id: "heroVideo",
                  label: t("admin.editor.slots.heroVideo"),
                  shape: "wide",
                  kind: "heroVideo",
                  filled: !!home.heroVideoPath,
                },
                {
                  id: "heroPoster",
                  label: t("admin.editor.slots.heroPoster"),
                  shape: "wide",
                  kind: "image",
                  filled: !!home.heroPoster,
                },
              ]
            : []
        }
      />
      <FactsStrip />
      <Occasions tiles={occasionTiles} editing={editing} />
      <SignatureDesigns
        products={signatureProducts}
        panel={home.signaturePanel}
        slots={
          editing
            ? {
                panel: {
                  id: "signaturePanel",
                  label: t("admin.editor.slots.signaturePanel"),
                  shape: "wide",
                  kind: "image",
                  filled: !!home.signaturePanel,
                },
                tiles: Array.from({ length: HOME_SIGNATURE_PICKS_MAX }, (_, i) => ({
                  id: `signature.${i}`,
                  label: t("admin.editor.slots.signature", { n: i + 1 }),
                  shape: "square" as const,
                  kind: "product" as const,
                  filled: false,
                  shownProductIds: signatureShown,
                  signature: true,
                })),
              }
            : undefined
        }
      />
      <NewFromStudio
        products={pickProducts(newPicks, newest, HOME_NEW_PICKS_MAX)}
        categories={categories}
        editing={editing}
      />
      <MadeForYou photo={home.madeForYou} editing={editing} />
      <SeasonalBanner banner={banner} />
      <MeetShudha portrait={home.portrait} about={about} editing={editing} />
      <KindWords testimonials={testimonials} />
      <HappyCustomers tiles={gallery} editing={editing} />
      <FollowStudio collage={home.collage} social={social} editing={editing} />
    </>
  );
}
