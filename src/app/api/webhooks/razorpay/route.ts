import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { activateSubscription } from "@/lib/orders";
import { verifyWebhookSignature } from "@/lib/payments/razorpay";

/**
 * Razorpay webhook (P-5).
 *
 * Security posture:
 *  - The signature is checked against the RAW request body, so a parsed-and-
 *    reserialised payload cannot be used to forge one.
 *  - Every event id is stored in WebhookEvent before processing, so retries
 *    are no-ops. This is the idempotency guarantee the PRD asks for.
 *  - Premium is only granted for `payment.captured`. `authorized` events are
 *    recorded but ignored, because a capture can still fail.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");

  if (!(await verifyWebhookSignature({ rawBody, signature }))) {
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 401 },
    );
  }

  let event: {
    event?: string;
    payload?: {
      payment?: {
        entity?: {
          id?: string;
          order_id?: string;
          amount?: number;
          currency?: string;
          notes?: Record<string, string>;
        };
      };
    };
  };

  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Malformed payload" }, { status: 400 });
  }

  const eventType = event.event ?? "unknown";

  // Razorpay does not send a unique event id in the body, so derive a stable
  // one from the payment id and event type. Retries of the same payment
  // therefore collapse to a single row.
  const paymentId = event.payload?.payment?.entity?.id;
  const eventId = paymentId ? `${eventType}:${paymentId}` : rawBody.slice(0, 200);

  const existing = await prisma.webhookEvent.findUnique({
    where: { gateway_eventId: { gateway: "razorpay", eventId } },
  });
  if (existing) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  await prisma.webhookEvent.create({
    data: {
      gateway: "razorpay",
      eventId,
      eventType,
      payload: JSON.parse(rawBody) as object,
    },
  });

  if (eventType !== "payment.captured") {
    return NextResponse.json({ received: true, ignored: eventType });
  }

  const payment = event.payload?.payment?.entity;
  const gatewayOrderId = payment?.order_id;
  const gatewayPaymentId = payment?.id;

  if (!gatewayOrderId || !gatewayPaymentId) {
    await prisma.webhookEvent.updateMany({
      where: { gateway: "razorpay", eventId },
      data: { error: "Missing order_id or payment id" },
    });
    return NextResponse.json({ error: "Missing identifiers" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { gatewayOrderId },
    select: { id: true, amount: true, status: true },
  });

  if (!order) {
    await prisma.webhookEvent.updateMany({
      where: { gateway: "razorpay", eventId },
      data: { error: `No local order for gateway order ${gatewayOrderId}` },
    });
    // 200 so Razorpay does not retry forever; the admin can reconcile.
    return NextResponse.json({ received: true, matched: false });
  }

  // Amount check: guards against a payment for a different order being
  // applied to this one.
  if (payment?.amount !== undefined && payment.amount !== order.amount) {
    await prisma.webhookEvent.updateMany({
      where: { gateway: "razorpay", eventId },
      data: { error: `Amount mismatch: paid ${payment.amount}, expected ${order.amount}` },
    });
    return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
  }

  const result = await activateSubscription({
    orderId: order.id,
    gatewayPaymentId,
  });

  if (!result.ok) {
    await prisma.webhookEvent.updateMany({
      where: { gateway: "razorpay", eventId },
      data: { error: result.error ?? "Activation failed" },
    });
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({
    received: true,
    activated: true,
    invoice: result.invoiceNumber,
  });
}
