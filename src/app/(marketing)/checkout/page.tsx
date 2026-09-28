import { redirect } from "next/navigation";

/**
 * Checkout lives inline on the pricing page (M-2: plans are server-rendered so
 * they are indexable). This route exists so shared links keep working and
 * forwards any preselected plan.
 */
export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; coupon?: string }>;
}) {
  const { plan, coupon } = await searchParams;

  const query = new URLSearchParams();
  if (plan) query.set("plan", plan);
  if (coupon) query.set("coupon", coupon);
  query.set("checkout", "1");

  redirect(`/pricing?${query.toString()}#checkout`);
}
