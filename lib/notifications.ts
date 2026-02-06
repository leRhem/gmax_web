import { prisma } from "@/lib/prisma"
import { NotificationType, NotificationChannel, NotificationStatus } from "@/lib/generated/prisma"

interface SendNotificationParams {
  clientName: string
  clientPhone?: string | null
  clientEmail?: string | null
  type: NotificationType
  message: string
  channels: NotificationChannel[]
  bookingId?: string
}

export async function sendNotification({
  clientName,
  clientPhone,
  clientEmail,
  type,
  message,
  channels,
  bookingId,
}: SendNotificationParams) {
  const results = []

  // Default phone/email if missing but needed? 
  // For now we assume the caller provides available contacts.

  for (const channel of channels) {
    let target = ""
    if (channel === "SMS" || channel === "WHATSAPP") {
        target = clientPhone || ""
    } else if (channel === "EMAIL") {
        target = clientEmail || ""
    }


    if (!target) {
        console.warn(`Skipping ${channel} notification: No contact info.`)
        continue
    }

    // Idempotency check with unique constraint handling
    // We rely on DB unique constraint on [bookingId, type, channel]
    // If we want to allow duplicates after 2 mins, the unique index needs to include time or we just catch and check.
    // Given the unique index is strictly [bookingId, type, channel], it prevents dupes forever for that tuple.
    // If the 2-minute logic is desired, we should rely on 'createdAt' check. 
    // BUT user asked to "replace this pattern with a DB-enforced uniqueness ... or use try/catch that ignores unique-constraint violations"
    // AND "handle the conflict error path".
    // If we have unique index, we can't insert same [bookingId, type, channel] twice.
    
    // 1. Create DB Record (or ignore if exists)
    let notification;
    try {
        notification = await prisma.notification.create({
          data: {
            clientName,
            clientPhone: clientPhone || "", // Schema requires clientPhone string
            clientEmail: clientEmail || null, // Persist clientEmail
            type,
            message,
            channel,
            status: "PENDING",
            bookingId
          }
        })
    } catch (e: any) {
        if (e.code === 'P2002') {
             console.log(`Skipping duplicate ${channel} notification for booking ${bookingId}`)
             continue
        }
        throw e
    }

    // 2. Send via Provider
    try {
        const redactedTarget = target.replace(/.(?=.{3})/g, '*')
        console.log(`[${channel}] Sending to ${redactedTarget}`) // Redacted message content
        
        let response: any = { status: "success" }

        if (channel === "SMS") {
            // Send SMS via Termii (DND route for reliability)
            await sendTermiiMessage(target, message, "dnd")
        } else if (channel === "WHATSAPP") {
            // Send WhatsApp via Termii
            await sendTermiiMessage(target, message, "whatsapp")
        } else if (channel === "EMAIL") {
            // Select Template ID based on notification type
            let templateId = undefined
            if (type === "STAFF_INVITATION") {
                templateId = process.env.TERMII_INVITE_TEMPLATE_ID
            }
            
            // Send Email via Termii
            await sendTermiiEmail(target, message, clientName, templateId)
        }
        
        // Update status to SENT
        try {
             await prisma.notification.update({
                where: { id: notification.id },
                data: { 
                    status: "SENT",
                    sentAt: new Date()
                }
            })
            results.push({ channel, status: "SENT", id: notification.id })
        } catch (dbError) {
             console.error(`Failed to mark notification ${notification.id} as SENT:`, dbError)
             results.push({ channel, status: "SENT_BUT_NOT_RECORDED", id: notification.id })
        }

    } catch (error: any) {
        console.error(`Failed to send ${channel} notification:`, error)
        await prisma.notification.update({
            where: { id: notification.id },
            data: { 
                status: "FAILED",
                errorMessage: error.message || "Unknown error"
            }
        })
        results.push({ channel, status: "FAILED", id: notification.id })
    }
  }

  return results
}

export async function sendTermiiMessage(to: string, message: string, channel: "dnd" | "whatsapp" | "generic" = "dnd") {
    const apiKey = process.env.TERMII_API_KEY
    const from = process.env.TERMII_SENDER_ID || "GMAX" 

    if (!apiKey) {
        throw new Error("TERMII_API_KEY is not configured")
    }

    let formattedTo = to.replace(/\+/g, '').replace(/\s/g, '')

    const payload = {
        to: formattedTo,
        from: from,
        sms: message,
        type: "plain",
        api_key: apiKey,
        channel: channel, 
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000) // 15s timeout

    try {
        const response = await fetch("https://api.ng.termii.com/api/sms/send", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
            signal: controller.signal
        })

        const responseText = await response.text()
        let data

        try {
            data = JSON.parse(responseText)
        } catch (e) {
            throw new Error(`Termii API Error: ${responseText}`)
        }

        if (!response.ok || (data.message && data.message.includes("fail"))) {
            throw new Error(data.message || `Failed to send ${channel} via Termii`)
        }

        return data
    } finally {
        clearTimeout(timeoutId)
    }
}

export async function sendTermiiEmail(to: string, message: string, name: string, templateId?: string) {
    const apiKey = process.env.TERMII_API_KEY
    const configId = process.env.TERMII_EMAIL_CONFIGURATION_ID
    
    if (!apiKey || !configId) {
        throw new Error("Termii Email configuration (API Key or Config ID) is missing")
    }

    // Use specific template ID if provided, otherwise default
    const effectiveTemplateId = templateId || process.env.TERMII_EMAIL_TEMPLATE_ID

    const payload: any = {
        api_key: apiKey,
        email_configuration_id: configId,
        email_address: to, 
        code: message, 
        name: name, // Added name to payload
    }

    if (effectiveTemplateId) {
        payload.email_template_id = effectiveTemplateId
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000) // 15s timeout

    try {
        const response = await fetch("https://api.ng.termii.com/api/email/send", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
            signal: controller.signal
        })

        const data = (await response.json().catch(() => { throw new Error("Invalid JSON response from Termii Email") })) as any

        if (!response.ok || (data.code && data.code !== "ok")) {
            throw new Error(data.message || "Failed to send Email via Termii")
        }

        return data
    } finally {
        clearTimeout(timeoutId)
    }
}
