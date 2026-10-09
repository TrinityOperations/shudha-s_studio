import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { testimonials, type Testimonial } from "@/db/schema";

/** PW-06: visible testimonials in the owner's order. The home page shows the first three. */
export async function listVisibleTestimonials(limit = 3): Promise<Testimonial[]> {
  return db.query.testimonials.findMany({
    where: eq(testimonials.visible, true),
    orderBy: [asc(testimonials.sortOrder), asc(testimonials.createdAt)],
    limit,
  });
}
