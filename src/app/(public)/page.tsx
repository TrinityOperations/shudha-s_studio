import { FactsStrip } from "@/components/public/home/facts-strip";
import { FollowStudio } from "@/components/public/home/follow-studio";
import { HappyCustomers } from "@/components/public/home/happy-customers";
import { Hero } from "@/components/public/home/hero";
import { KindWords } from "@/components/public/home/kind-words";
import { MadeForYou } from "@/components/public/home/made-for-you";
import { MeetShudha } from "@/components/public/home/meet-shudha";
import { NewFromStudio } from "@/components/public/home/new-from-studio";
import { Occasions, type OccasionTile } from "@/components/public/home/occasions";
import { SeasonalBanner } from "@/components/public/home/seasonal-banner";
import { SignatureDesigns } from "@/components/public/home/signature-designs";
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
  getHomeSettings,
  getSeasonalBannerSettings,
  getSocialSettings,
} from "@/db/queries/settings";
import { listCategories, listOccasions } from "@/db/queries/taxonomy";
import { listVisibleTestimonials } from "@/db/queries/testimonials";
import { pickProducts, resolveOccasionTile } from "@/lib/home";
import { HOME_NEW_PICKS_MAX, HOME_SIGNATURE_PICKS_MAX } from "@/lib/validators/settings";

/** PW-01..PW-09: the home page, every section from docs/design.md in order. */
export default async function HomePage() {
  // Everything that doesn't depend on the owner's picks runs in one round; the picks follow.
  const [
    home,
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
    getHomeSettings(),
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

  return (
    <>
      <Hero poster={home.heroPoster} videoPath={home.heroVideoPath} />
      <FactsStrip />
      <Occasions tiles={occasionTiles} />
      <SignatureDesigns
        products={pickProducts(signaturePicks, signature, HOME_SIGNATURE_PICKS_MAX)}
        panel={home.signaturePanel}
      />
      <NewFromStudio
        products={pickProducts(newPicks, newest, HOME_NEW_PICKS_MAX)}
        categories={categories}
      />
      <MadeForYou photo={home.madeForYou} />
      <SeasonalBanner banner={banner} />
      <MeetShudha portrait={home.portrait} about={about} />
      <KindWords testimonials={testimonials} />
      <HappyCustomers tiles={gallery} />
      <FollowStudio collage={home.collage} social={social} />
    </>
  );
}
