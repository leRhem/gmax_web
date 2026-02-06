// lib/paystack.ts
// Helper functions for Paystack payment link generation

import { prisma } from "@/lib/prisma"

interface GeneratePaymentLinkOptions {
  bookingId: string
  amount: number
  email: string
  clientName: string
  clientPhone?: string
  studioName: string
  serviceNames: string
}

interface PaystackInitResponse {
  status: boolean
  message: string
  data: {
    authorization_url: string
    access_code: string
    reference: string
  }
}

/**
 * Generate a Paystack payment link for a booking
 * Returns the existing link if one already exists, or creates a new one
 */
export async function generatePaymentLink(options: GeneratePaymentLinkOptions) {
  const { bookingId, amount, email, clientName, clientPhone, studioName, serviceNames } = options

  // Check if payment link already exists
  const existingLink = await prisma.paymentLink.findUnique({
    where: { bookingId },
  })

  if (existingLink && existingLink.status === "ACTIVE") {
    return {
      paymentLink: existingLink, // Return full object
      isExisting: true,
    }
  }

  // Check for Paystack secret key
  const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY
  if (!paystackSecretKey) {
    throw new Error("Payment gateway not configured")
  }

  // Generate unique reference
  const reference = `GMAX-${bookingId.slice(-8)}-${Date.now().toString(36).toUpperCase()}`

  // Initialize Paystack transaction
  const paystackResponse = await fetch(
    "https://api.paystack.co/transaction/initialize",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email || `${clientPhone?.replace(/\D/g, "")}@gmax.studio`,
        amount: Math.round(amount * 100), // Paystack uses kobo
        reference,
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/verify?ref=${reference}`,
        metadata: {
          bookingId,
          clientName,
          studioName,
          services: serviceNames,
        },
        channels: ["card", "bank", "ussd", "bank_transfer"],
      }),
    }
  )

  if (!paystackResponse.ok) {
    const errorData = (await paystackResponse.json()) as any
    console.error("Paystack error:", errorData)
    throw new Error(errorData.message || "Failed to generate payment link")
  }

  const paystackData: PaystackInitResponse = (await paystackResponse.json()) as any

  if (!paystackData.status) {
    throw new Error(paystackData.message || "Failed to generate payment link")
  }

  // Store the payment link
  const paymentLink = await prisma.paymentLink.upsert({
    where: { bookingId },
    update: {
      paystackUrl: paystackData.data.authorization_url,
      paystackRef: paystackData.data.reference,
      accessCode: paystackData.data.access_code,
      amount,
      status: "ACTIVE",
    },
    create: {
      bookingId,
      paystackUrl: paystackData.data.authorization_url,
      paystackRef: paystackData.data.reference,
      accessCode: paystackData.data.access_code,
      amount,
      status: "ACTIVE",
    },
  })

  return {
    paymentLink: paymentLink, // Return full object
    isExisting: false,
  }
}

/**
 * Get existing payment link for a booking
 */
export async function getPaymentLink(bookingId: string) {
  const link = await prisma.paymentLink.findUnique({
    where: { bookingId },
  })

  return link
}

/**
 * Track when a payment link is viewed
 */
export async function trackPaymentLinkView(bookingId: string) {
  await prisma.paymentLink.update({
    where: { bookingId },
    data: {
      viewCount: { increment: 1 },
      lastViewedAt: new Date(),
    },
  })
}

/**
 * Mark payment link as used
 */
export async function markPaymentLinkUsed(paystackRef: string) {
  await prisma.paymentLink.update({
    where: { paystackRef },
    data: {
      status: "USED",
      usedAt: new Date(),
    },
  })
}
