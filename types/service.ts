import { z } from "zod"

// Schema for a specific package (e.g., "Golden Vows")
export const packageSchema = z.object({
  id: z.string(),
  title: z.string().min(1, "Title is required"), // e.g., "Basic Package"
  description: z.string().optional(), // e.g., "Perfect for court weddings"
  price: z.number().min(0), // e.g., 210000
  features: z.array(z.string()), // e.g., ["2-3 hours coverage", "10+ photos"]
})

// Schema for the main Service Category (e.g., "Wedding Photography")
export const serviceCategorySchema = z.object({
  id: z.string(),
  title: z.string().min(1, "Service name is required"),
  description: z.string().optional(),
  packages: z.array(packageSchema),
})

export type ServicePackage = z.infer<typeof packageSchema>
export type ServiceCategory = z.infer<typeof serviceCategorySchema>