"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { getClientIp } from "@/lib/auth/session";
import { LIMITS, rateLimit } from "@/lib/rate-limit";

export type ContactState = { success?: string; error?: string };

const contactSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  subject: z.string().trim().max(140).optional(),
  message: z
    .string()
    .trim()
    .min(10, "Please add a little more detail (at least 10 characters).")
    .max(4000),
  // Honeypot: hidden from humans, filled by bots.
  website: z.string().max(0).optional(),
});

export async function submitContactAction(
  _prev: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const ip = await getClientIp();
  const limit = rateLimit(
    `contact:${ip}`,
    LIMITS.contact.limit,
    LIMITS.contact.window,
  );
  if (!limit.ok) {
    return { error: "Too many messages sent. Please try again later." };
  }

  // Bot filled the honeypot: report success without storing anything, so it
  // learns nothing from the response.
  if (formData.get("website")) {
    return { success: "Thanks, your message has been sent." };
  }

  const parsed = contactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    subject: formData.get("subject") || undefined,
    message: formData.get("message"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Please check your details.",
    };
  }

  const { name, email, subject, message } = parsed.data;

  await prisma.contactMessage.create({
    data: { name, email, subject: subject ?? null, message },
  });

  return {
    success:
      "Thanks, your message has been sent. We will reply within one business day.",
  };
}
