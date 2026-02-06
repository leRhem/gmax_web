import { PrismaClient } from './generated/prisma/client.js'
import { withAccelerate } from '@prisma/extension-accelerate'

const url = process.env.DATABASE_URL
if (!url) {
  console.log('⚠️ DATABASE_URL is undefined. Using placeholder for build.')
}

const prisma = new PrismaClient({
  accelerateUrl: url,
}).$extends(withAccelerate())

export { prisma }