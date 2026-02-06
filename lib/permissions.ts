import { StaffRole } from "@/lib/generated/prisma"

// Define all dashboard routes and their allowed roles
export const PAGE_PERMISSIONS: Record<string, StaffRole[]> = {
    // Main dashboard - accessible by all authenticated staff
    "/dashboard": [
        "ADMIN",
        "MANAGER",
        "RECEPTIONIST",
        "PHOTOGRAPHER",
        "VIDEOGRAPHER",
        "PHOTO_EDITOR",
        "VIDEO_EDITOR",
        "STAFF",
    ],

    // Bookings - operational roles
    "/dashboard/bookings": [
        "ADMIN",
        "MANAGER",
        "RECEPTIONIST",
        "PHOTOGRAPHER",
        "VIDEOGRAPHER",
    ],

    // Clients - front desk and management
    "/dashboard/clients": ["ADMIN", "MANAGER", "RECEPTIONIST"],

    // Services - management only
    "/dashboard/services": ["ADMIN", "MANAGER"],

    // Staffs - admin only
    "/dashboard/staffs": ["ADMIN"],

    // Studios - admin only
    "/dashboard/studios": ["ADMIN"],

    // Analytics - management level
    "/dashboard/analytics": ["ADMIN", "MANAGER"],

    // Activity Logs - admin only
    "/dashboard/logs": ["ADMIN"],

    // Tasks - all staff can see their own tasks
    "/dashboard/tasks": [
        "ADMIN",
        "MANAGER",
        "RECEPTIONIST",
        "PHOTOGRAPHER",
        "VIDEOGRAPHER",
        "PHOTO_EDITOR",
        "VIDEO_EDITOR",
        "STAFF",
    ],

    // Asset Review - management level


    // Equipment - management level
    "/dashboard/equipment": ["ADMIN", "MANAGER"],

    // Academy - management level
    "/dashboard/academy": ["ADMIN", "MANAGER"],

    // Payments - front desk and management
    "/dashboard/payments": ["ADMIN", "MANAGER", "RECEPTIONIST"],
}

// Navigation items with their metadata
export interface NavItem {
    title: string
    url: string
    icon: string // Icon name from @tabler/icons-react
    roles: StaffRole[]
    section: "main" | "management" | "secondary"
}

export const NAV_ITEMS: NavItem[] = [
    // Main navigation
    {
        title: "Overview",
        url: "/dashboard",
        icon: "IconDashboard",
        roles: [
            "ADMIN",
            "MANAGER",
            "RECEPTIONIST",
            "PHOTOGRAPHER",
            "VIDEOGRAPHER",
            "PHOTO_EDITOR",
            "VIDEO_EDITOR",
            "STAFF",
        ],
        section: "main",
    },
    {
        title: "Bookings",
        url: "/dashboard/bookings",
        icon: "IconCalendarEvent",
        roles: [
            "ADMIN",
            "MANAGER",
            "RECEPTIONIST",
            "PHOTOGRAPHER",
            "VIDEOGRAPHER",
        ],
        section: "main",
    },
    {
        title: "Clients",
        url: "/dashboard/clients",
        icon: "IconUsers",
        roles: ["ADMIN", "MANAGER", "RECEPTIONIST"],
        section: "main",
    },
    {
        title: "My Tasks",
        url: "/dashboard/tasks",
        icon: "IconChecklist",
        roles: [
            "ADMIN",
            "MANAGER",
            "RECEPTIONIST",
            "PHOTOGRAPHER",
            "VIDEOGRAPHER",
            "PHOTO_EDITOR",
            "VIDEO_EDITOR",
            "STAFF",
        ],
        section: "main",
    },
    {
        title: "Payments",
        url: "/dashboard/payments",
        icon: "IconCash",
        roles: ["ADMIN", "MANAGER", "RECEPTIONIST"],
        section: "main",
    },

    // Management section

    {
        title: "Equipment",
        url: "/dashboard/equipment",
        icon: "IconCamera",
        roles: ["ADMIN", "MANAGER"],
        section: "management",
    },
    {
        title: "Academy",
        url: "/dashboard/academy",
        icon: "IconSchool",
        roles: ["ADMIN", "MANAGER"],
        section: "management",
    },
    {
        title: "Services",
        url: "/dashboard/services",
        icon: "IconTools",
        roles: ["ADMIN", "MANAGER"],
        section: "management",
    },
    {
        title: "Staff",
        url: "/dashboard/staffs",
        icon: "IconUserCog",
        roles: ["ADMIN"],
        section: "management",
    },
    {
        title: "Studios",
        url: "/dashboard/studios",
        icon: "IconBuildingWarehouse",
        roles: ["ADMIN"],
        section: "management",
    },
    {
        title: "Analytics",
        url: "/dashboard/analytics",
        icon: "IconChartBar",
        roles: ["ADMIN", "MANAGER"],
        section: "management",
    },
    {
        title: "Activity Logs",
        url: "/dashboard/logs",
        icon: "IconHistory",
        roles: ["ADMIN"],
        section: "management",
    },
]

/**
 * Check if a user role has access to a specific page
 */
export function hasPageAccess(userRole: StaffRole, path: string): boolean {
    // Find the most specific matching route
    const matchingRoutes = Object.keys(PAGE_PERMISSIONS)
        .filter((route) => path.startsWith(route))
        .sort((a, b) => b.length - a.length) // Sort by specificity (longest first)

    if (matchingRoutes.length === 0) {
        // No specific permission defined, allow access (for dynamic routes under allowed parents)
        // Check if parent route is allowed
        const parentRoute = path.split("/").slice(0, -1).join("/")
        if (parentRoute && PAGE_PERMISSIONS[parentRoute]) {
            return PAGE_PERMISSIONS[parentRoute].includes(userRole)
        }
        return false // Fail-closed: deny access if no permission defined
    }

    const allowedRoles = PAGE_PERMISSIONS[matchingRoutes[0]]
    return allowedRoles.includes(userRole)
}

/**
 * Get navigation items filtered by user role
 */
export function getNavItemsForRole(userRole: StaffRole): {
    main: NavItem[]
    management: NavItem[]
} {
    const allowedItems = NAV_ITEMS.filter((item) => item.roles.includes(userRole))

    return {
        main: allowedItems.filter((item) => item.section === "main"),
        management: allowedItems.filter((item) => item.section === "management"),
    }
}
