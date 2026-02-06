// prisma/seed.ts
// Enhanced with Session-Based Booking Configuration
// Run with: npx tsx prisma/seed.ts
import 'dotenv/config'
import { ClientType, StaffRole, ServiceType } from '@/lib/generated/prisma'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

async function main() {
  console.log('🚀 Seeding GMAX Database (Session-Based System)...\n')

  // ==========================================
  // 1. SEED STUDIOS (Multi-Location)
  // ==========================================
  console.log('📍 Creating Studios...')
  
  const abujaMain = await prisma.studio.upsert({
    where: { slug: 'gmax-abuja-central' },
    update: {},
    create: {
      name: 'GMAX Abuja Central',
      slug: 'gmax-abuja-central',
      city: 'Abuja',
      state: 'FCT',
      address: 'Plot 123, Wuse 2, Abuja, FCT',
      phone: '+234 803 456 7890',
      email: 'abuja@gmaxstudio.com',
    },
  })

  const abujaGwarinpa = await prisma.studio.upsert({
    where: { slug: 'gmax-gwarinpa' },
    update: {},
    create: {
      name: 'GMAX Gwarinpa',
      slug: 'gmax-gwarinpa',
      city: 'Abuja',
      state: 'FCT',
      address: '5th Avenue, Gwarinpa Estate, Abuja',
      phone: '+234 803 456 7891',
      email: 'gwarinpa@gmaxstudio.com',
    },
  })

  const lagosVi = await prisma.studio.upsert({
    where: { slug: 'gmax-lagos-vi' },
    update: {},
    create: {
      name: 'GMAX Victoria Island',
      slug: 'gmax-lagos-vi',
      city: 'Lagos',
      state: 'Lagos',
      address: 'Adeola Odeku Street, Victoria Island, Lagos',
      phone: '+234 803 456 7892',
      email: 'lagos@gmaxstudio.com',
    },
  })

  console.log(`   ✅ ${abujaMain.name}`)
  console.log(`   ✅ ${abujaGwarinpa.name}`)
  console.log(`   ✅ ${lagosVi.name}\n`)

  // ==========================================
  // 2. CREATE STUDIO SETTINGS (NEW!)
  // ==========================================
  console.log('⚙️  Creating Studio Settings...')
  
  await prisma.studioSettings.upsert({
    where: { studioId: abujaMain.id },
    update: {},
    create: {
      studioId: abujaMain.id,
      maxSessionsPerDay: 15,
      defaultSessionDuration: 45,
      requireConfirmation: true,
      confirmationExpiryHours: 24,
      allowPartialPayment: true,
      minimumDepositPercentage: 50,
    },
  })

  await prisma.studioSettings.upsert({
    where: { studioId: abujaGwarinpa.id },
    update: {},
    create: {
      studioId: abujaGwarinpa.id,
      maxSessionsPerDay: 15,
      defaultSessionDuration: 45,
      requireConfirmation: true,
      confirmationExpiryHours: 24,
      allowPartialPayment: true,
      minimumDepositPercentage: 50,
    },
  })

  await prisma.studioSettings.upsert({
    where: { studioId: lagosVi.id },
    update: {},
    create: {
      studioId: lagosVi.id,
      maxSessionsPerDay: 15,
      defaultSessionDuration: 45,
      requireConfirmation: true,
      confirmationExpiryHours: 24,
      allowPartialPayment: true,
      minimumDepositPercentage: 50,
    },
  })

  console.log('   ✅ All studio settings configured\n')

  // ==========================================
  // 3. SEED INITIAL ADMIN USER
  // ==========================================
  console.log('👤 Creating Admin User...')
  
  const hashedPassword = await bcrypt.hash('Admin@123', 10)
  
  const adminUser = await prisma.staff.upsert({
    where: { email: 'admin@gmaxstudio.com' },
    update: {},
    create: {
      name: 'System Admin',
      email: 'admin@gmaxstudio.com',
      password: hashedPassword,
      role: StaffRole.ADMIN,
      studioId: abujaMain.id,
      isActive: true,
      emailVerified: new Date(),
      acceptedAt: new Date(),
    },
  })

  console.log(`   ✅ Admin: ${adminUser.email} (Password: Admin@123)\n`)

  // ==========================================
  // 4. SEED SERVICE CATEGORIES
  // ==========================================
  console.log('📦 Creating Service Categories...')
  
  const categories = [
    { 
      name: 'Photography', 
      slug: 'photography', 
      description: 'Studio, Outdoor, and Birthday Shoots' 
    },
    { 
      name: 'Weddings & Events', 
      slug: 'weddings-events', 
      description: 'White, Traditional, and Event Coverage' 
    },
    { 
      name: 'Academy', 
      slug: 'academy', 
      description: 'Photography Training (Foundation to Master Class)' 
    },
    { 
      name: 'Videography', 
      slug: 'videography', 
      description: 'Highlight videos, Documentaries' 
    },
    { 
      name: 'Frames & Products', 
      slug: 'frames-products', 
      description: 'Frames, Photobooks, and Prints' 
    },
    { 
      name: 'Rentals & Services', 
      slug: 'rentals-services', 
      description: 'Studio space rental and makeup' 
    },
  ]

  for (const cat of categories) {
    await prisma.serviceCategory.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    })
    console.log(`   ✅ ${cat.name}`)
  }

  console.log('')

  // ==========================================
  // 5. SEED SERVICES WITH SESSION CONFIG
  // ==========================================
  console.log('🎨 Creating Services with Session Configuration...')

  const getCategoryId = async (slug: string) => {
    const cat = await prisma.serviceCategory.findUnique({ where: { slug } })
    return cat!.id
  }

  // --- PHOTOGRAPHY SERVICES (Session-Based) ---
  const photoCatId = await getCategoryId('photography')
  
  // ✅ Standard Shoot (Per Picture) - ADD-ON ONLY
  await prisma.service.upsert({
    where: { slug: 'standard-shoot-per-pic' },
    update: {},
    create: {
      categoryId: photoCatId,
      name: 'Standard Shoot (Per Picture)',
      slug: 'standard-shoot-per-pic',
      price: 4000,
      serviceType: ServiceType.STUDIO,
      features: ['₦4,000 per picture', 'Professional editing', 'High-resolution output'],
      
      // ✅ SESSION CONFIG: This is an add-on, not a standalone session
      sessionDuration: 0,        // Doesn't consume session time
      includesSessions: 0,       // No sessions included
      allowExtraOutfits: false,  // Can't add outfits to a per-pic service
      allowExtraPics: false,     // This IS the extra pic service
      extraPicPrice: null,
    },
  })

  // ✅ Discount Studio Session - 1 SESSION (30 mins)
  await prisma.service.upsert({
    where: { slug: 'discount-studio-session-1' },
    update: {},
    create: {
      categoryId: photoCatId,
      name: 'Discount Studio Session (Package 1)',
      slug: 'discount-studio-session-1',
      price: 10000,
      duration: '30 mins',
      serviceType: ServiceType.STUDIO,
      features: ['3 edited pictures', 'One outfit', 'Studio lighting included'],
      
      // ✅ SESSION CONFIG
      sessionDuration: 30,       // 30 minutes per session
      includesSessions: 1,       // 1 session included (1 outfit)
      allowExtraOutfits: true,   // Can add more outfits
      extraOutfitPrice: 10000,   // ₦10,000 per extra outfit
      extraOutfitDuration: 30,   // 30 mins per extra outfit
      allowExtraPics: true,      // Can add extra pics
      extraPicPrice: 4000,       // ₦4,000 per extra pic (Standard Shoot price)
    },
  })

  // ✅ Simply You (Basic Package) - 1 SESSION (30 mins)
  await prisma.service.upsert({
    where: { slug: 'simply-you-basic' },
    update: {},
    create: {
      categoryId: photoCatId,
      name: 'Simply You (Basic Package)',
      slug: 'simply-you-basic',
      price: 42700,
      salePrice: 35500,
      duration: '30 mins',
      serviceType: ServiceType.STUDIO,
      features: [
        '5 retouched images',
        '8x10 Frame included',
        'Professional makeup',
        '1 Outfit change',
        '3 unedited photos free'
      ],
      
      // ✅ SESSION CONFIG
      sessionDuration: 30,
      includesSessions: 1,
      allowExtraOutfits: true,
      extraOutfitPrice: 15000,   // Premium package, higher outfit price
      extraOutfitDuration: 30,
      allowExtraPics: true,
      extraPicPrice: 4000,
    },
  })

  // ✅ Golden Glow (Standard Package) - 2 SESSIONS (1 hour)
  await prisma.service.upsert({
    where: { slug: 'golden-glow-standard' },
    update: {},
    create: {
      categoryId: photoCatId,
      name: 'Golden Glow (Standard Package)',
      slug: 'golden-glow-standard',
      price: 100500,
      salePrice: 75000,
      duration: '1 hour',
      serviceType: ServiceType.STUDIO,
      features: [
        '7 retouched images',
        '12x15 Frame',
        'Short highlight video',
        '2 Outfit changes',
        'Hair & Makeup included'
      ],
      
      // ✅ SESSION CONFIG
      sessionDuration: 60,       // 1 hour total
      includesSessions: 2,       // 2 sessions (2 outfits included)
      allowExtraOutfits: true,
      extraOutfitPrice: 20000,   // Premium price
      extraOutfitDuration: 45,   // 45 mins per extra outfit
      allowExtraPics: true,
      extraPicPrice: 4000,
    },
  })

  console.log('   ✅ Photography Packages (Session-Based)')

  // --- WEDDING SERVICES (Event-Based, No Extra Outfits) ---
  const weddingCatId = await getCategoryId('weddings-events')
  
  const weddingServices = [
    {
      name: 'Ever True - Basic Package',
      slug: 'wedding-ever-true-basic',
      price: 210000,
      duration: '2-3 hours',
      features: [
        '10+ social media edits',
        '100+ editorial images',
        '2-3 min video highlight',
        '1 Framed photo (12x16)',
        'Professional photographer'
      ],
      sessionDuration: 180,    // 3 hours
      includesSessions: 4,     // Takes 4 session slots (180 mins / 45 mins)
    },
    {
      name: 'Golden Vows - Standard Package',
      slug: 'wedding-golden-vows-standard',
      price: 420000,
      duration: 'Up to 6 hours',
      features: [
        '15+ social media edits',
        '400+ editorial images',
        'Full ceremony video coverage',
        'Premium photobook (20 pages)',
        'Framed photo (16x20)',
        '5 Free pre-wedding pictures'
      ],
      sessionDuration: 360,
      includesSessions: 8,     // 6 hours = 8 sessions
    },
    {
      name: 'Diamond Day - Premium Package',
      slug: 'wedding-diamond-day-premium',
      price: 600000,
      duration: '10-12 hours',
      features: [
        '35+ social media edits',
        '600+ editorial images',
        '3-5 min cinematic film',
        'Deluxe photobook (30 pages)',
        '3 Canvas frames',
        'Drone footage',
        '2 Photographers + 1 Videographer'
      ],
      sessionDuration: 720,
      includesSessions: 15,    // Full day (blocks entire studio!)
    },
    {
      name: 'Royal Memoirs - VIP Package',
      slug: 'wedding-royal-memoirs-vip',
      price: 1500000,
      duration: 'Full day coverage',
      features: [
        'Unlimited edited photos',
        '1000+ images',
        '5-7 min cinematic film',
        'Royal photobook (50 pages)',
        '5 Canvas frames',
        'Drone footage',
        'Same-day edit video',
        '3 Photographers + 2 Videographers',
        'Free engagement shoot'
      ],
      sessionDuration: 720,
      includesSessions: 15,    // Full day exclusive
    },
  ]

  for (const service of weddingServices) {
    await prisma.service.upsert({
      where: { slug: service.slug },
      update: {},
      create: {
        categoryId: weddingCatId,
        ...service,
        serviceType: ServiceType.ON_LOCATION,
        allowExtraOutfits: false,  // Weddings don't have "outfits"
        allowExtraPics: false,     // All-inclusive
      },
    })
  }

  console.log('   ✅ Wedding & Events Packages')

  // --- ACADEMY (No Session Tracking) ---
  const academyCatId = await getCategoryId('academy')
  
  const academyServices = [
    {
      name: 'Foundation Level (Beginner)',
      slug: 'academy-foundation',
      price: 70000,
      duration: '9-10 weeks',
      features: [
        'Introduction to Photography',
        'Camera settings & controls',
        'Lighting basics',
        'Composition fundamentals',
        'Smartphone photography',
        'Certificate upon completion'
      ],
    },
    {
      name: 'Intermediate Level',
      slug: 'academy-intermediate',
      price: 120000,
      duration: '24 weeks',
      features: [
        'Portrait photography',
        'Event photography',
        'Studio lighting techniques',
        'Photo critique sessions',
        'Real-world assignments',
        'Certificate upon completion'
      ],
    },
    {
      name: 'Advanced Level',
      slug: 'academy-advanced',
      price: 180000,
      duration: '3-4 weeks',
      features: [
        'Advanced editing techniques',
        'Color grading mastery',
        'Creative lighting setups',
        'Portfolio development',
        'Certificate upon completion'
      ],
    },
    {
      name: 'Master Class (Post-Production)',
      slug: 'academy-master-class',
      price: 250000,
      duration: '3-4 weeks',
      features: [
        'High-end retouching',
        'Commercial editing',
        'Branding & marketing',
        'Starting a photography business',
        'Portfolio review',
        'Master Certificate'
      ],
    },
  ]

  for (const service of academyServices) {
    await prisma.service.upsert({
      where: { slug: service.slug },
      update: {},
      create: {
        categoryId: academyCatId,
        ...service,
        serviceType: ServiceType.STUDIO,
        sessionDuration: 0,      // Training doesn't use session slots
        includesSessions: 0,
        allowExtraOutfits: false,
        allowExtraPics: false,
      },
    })
  }

  console.log('   ✅ Academy Training Packages')

  // --- VIDEOGRAPHY (Event-Based) ---
  const videoCatId = await getCategoryId('videography')
  
  const videoServices = [
    {
      name: 'Highlight Video (2-3 mins)',
      slug: 'video-highlight-short',
      price: 50000,
      duration: '1 day coverage',
      features: [
        '2-3 minute highlight video',
        'Professional editing',
        'Music & color grading',
        'Delivered within 7 days'
      ],
      sessionDuration: 240,
      includesSessions: 5,
    },
    {
      name: 'Cinematic Film (5-7 mins)',
      slug: 'video-cinematic-film',
      price: 150000,
      duration: 'Full event coverage',
      features: [
        '5-7 minute cinematic film',
        'Drone footage',
        'Advanced color grading',
        'Premium music licensing',
        'Delivered within 14 days'
      ],
      sessionDuration: 480,
      includesSessions: 10,
    },
    {
      name: 'Documentary Style (10+ mins)',
      slug: 'video-documentary',
      price: 300000,
      duration: 'Multi-day coverage',
      features: [
        '10+ minute documentary',
        'Interview segments',
        'Multiple camera angles',
        'Drone footage',
        'Professional storytelling',
        'Delivered within 21 days'
      ],
      sessionDuration: 960,
      includesSessions: 15,    // Multi-day
    },
  ]

  for (const service of videoServices) {
    await prisma.service.upsert({
      where: { slug: service.slug },
      update: {},
      create: {
        categoryId: videoCatId,
        ...service,
        serviceType: ServiceType.ON_LOCATION,
        allowExtraOutfits: false,
        allowExtraPics: false,
      },
    })
  }

  console.log('   ✅ Videography Services')

  // --- FRAMES & PRODUCTS (No Sessions) ---
  const framesCatId = await getCategoryId('frames-products')
  
  const frameServices = [
    {
      name: '8x10 Standard Frame',
      slug: 'frame-8x10-standard',
      price: 15000,
      features: ['8x10 inch frame', 'High-quality print', 'Standard glass'],
    },
    {
      name: '12x16 Premium Frame',
      slug: 'frame-12x16-premium',
      price: 25000,
      features: ['12x16 inch frame', 'Premium quality print', 'Anti-glare glass'],
    },
    {
      name: 'Canvas Print (16x20)',
      slug: 'canvas-16x20',
      price: 35000,
      features: ['16x20 inch canvas', 'Gallery-wrapped', 'Ready to hang'],
    },
    {
      name: 'Premium Photobook (20 pages)',
      slug: 'photobook-20-pages',
      price: 45000,
      features: [
        '20 pages',
        'Hardcover binding',
        'Premium matte finish',
        'Custom design'
      ],
    },
    {
      name: 'Deluxe Photobook (30 pages)',
      slug: 'photobook-30-pages',
      price: 65000,
      features: [
        '30 pages',
        'Leather hardcover',
        'Premium glossy finish',
        'Custom design',
        'Gift box included'
      ],
    },
  ]

  for (const service of frameServices) {
    await prisma.service.upsert({
      where: { slug: service.slug },
      update: {},
      create: {
        categoryId: framesCatId,
        ...service,
        serviceType: ServiceType.STUDIO,
        sessionDuration: 0,
        includesSessions: 0,
        allowExtraOutfits: false,
        allowExtraPics: false,
      },
    })
  }

  console.log('   ✅ Frames & Products')

  // --- RENTALS & SERVICES (Session-Based) ---
  const rentalsCatId = await getCategoryId('rentals-services')
  
  await prisma.service.upsert({
    where: { slug: 'studio-rental-hourly' },
    update: {},
    create: {
      categoryId: rentalsCatId,
      name: 'Studio Space Rental (Hourly)',
      slug: 'studio-rental-hourly',
      price: 10000,
      duration: '1 hour',
      serviceType: ServiceType.STUDIO,
      features: [
        'Fully equipped studio',
        'Professional lighting',
        'Backdrop options',
        'Props available'
      ],
      sessionDuration: 60,
      includesSessions: 1,
      allowExtraOutfits: false,
      allowExtraPics: false,
    },
  })

  await prisma.service.upsert({
    where: { slug: 'studio-rental-half-day' },
    update: {},
    create: {
      categoryId: rentalsCatId,
      name: 'Studio Space Rental (Half Day)',
      slug: 'studio-rental-half-day',
      price: 40000,
      duration: '4 hours',
      serviceType: ServiceType.STUDIO,
      features: [
        'Fully equipped studio',
        'Professional lighting',
        'Backdrop options',
        'Props available',
        'Assistant included'
      ],
      sessionDuration: 240,
      includesSessions: 5,
      allowExtraOutfits: false,
      allowExtraPics: false,
    },
  })

  await prisma.service.upsert({
    where: { slug: 'professional-makeup' },
    update: {},
    create: {
      categoryId: rentalsCatId,
      name: 'Professional Makeup',
      slug: 'professional-makeup',
      price: 15000,
      duration: '1 hour',
      serviceType: ServiceType.STUDIO,
      features: [
        'Professional makeup artist',
        'Premium products',
        'Touch-ups included'
      ],
      sessionDuration: 0,    // Add-on service
      includesSessions: 0,
      allowExtraOutfits: false,
      allowExtraPics: false,
    },
  })

  await prisma.service.upsert({
    where: { slug: 'hair-styling' },
    update: {},
    create: {
      categoryId: rentalsCatId,
      name: 'Hair Styling',
      slug: 'hair-styling',
      price: 12000,
      duration: '1 hour',
      serviceType: ServiceType.STUDIO,
      features: [
        'Professional hair stylist',
        'Creative styling',
        'Products included'
      ],
      sessionDuration: 0,
      includesSessions: 0,
      allowExtraOutfits: false,
      allowExtraPics: false,
    },
  })

  console.log('   ✅ Rentals & Services\n')

  // ==========================================
  // 6. SEED SAMPLE CLIENTS
  // ==========================================
  console.log('👥 Creating Sample Clients...')
  
  const clients = [
    {
      name: 'Adewale Johnson',
      phone: '+2348012345678',
      email: 'adewale@example.com',
      type: ClientType.VIP,
      address: 'Maitama, Abuja',
    },
    {
      name: 'Chioma Okonkwo',
      phone: '+2348087654321',
      email: 'chioma@example.com',
      type: ClientType.STANDARD,
      address: 'Wuse 2, Abuja',
    },
    {
      name: 'Emeka & Blessing Wedding',
      phone: '+2348023456789',
      email: 'emeka.blessing@example.com',
      type: ClientType.VVIP,
      address: 'Asokoro, Abuja',
      notes: 'VIP wedding client - December 2025',
    },
    {
      name: 'TechCorp Nigeria Ltd',
      phone: '+2348034567890',
      email: 'info@techcorp.ng',
      type: ClientType.CORPORATE,
      address: 'Central Business District, Abuja',
      notes: 'Corporate headshots and event photography',
    },
  ]

  for (const client of clients) {
    await prisma.client.upsert({
      where: { phone: client.phone },
      update: {},
      create: client,
    })
    console.log(`   ✅ ${client.name} (${client.type})`)
  }

  console.log('\n✅ Database seeding completed successfully!\n')
  console.log('📊 Summary:')
  console.log(`   • ${await prisma.studio.count()} Studios`)
  console.log(`   • ${await prisma.studioSettings.count()} Studio Settings`)
  console.log(`   • ${await prisma.staff.count()} Staff Members`)
  console.log(`   • ${await prisma.serviceCategory.count()} Service Categories`)
  console.log(`   • ${await prisma.service.count()} Services (Session-Configured)`)
  console.log(`   • ${await prisma.client.count()} Clients`)
  console.log('\n🔐 Admin Login:')
  console.log('   Email: admin@gmaxstudio.com')
  console.log('   Password: Admin@123')
  console.log('\n📋 Session-Based Services Configured:')
  console.log('   • Standard Shoot: ₦4,000 (add-on only)')
  console.log('   • Discount Session: ₦10,000 (1 session)')
  console.log('   • Simply You: ₦35,500 (1 session)')
  console.log('   • Golden Glow: ₦75,000 (2 sessions)')
  console.log('   • Extra outfits: +₦10,000-20,000 per outfit')
  console.log('   • Extra pics: +₦4,000 per picture')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })