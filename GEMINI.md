HORDING MAP - PROJECT OVERVIEW & ARCHITECTURE
🎯 PROJECT SUMMARY
Hording Map is a full-stack web application that connects Out-of-Home (OOH) advertising vendors with advertisers to buy and manage billboard/hording advertising space.

Think of it like Airbnb, but for advertising billboards - vendors list their hording spaces, advertisers search and book them.

🏗️ TECHNOLOGY STACK
Layer	Technology
Frontend	Next.js 15 (App Router), React, CSS Modules
Backend	Next.js API Routes
Database	Supabase (PostgreSQL)
Auth	Supabase Auth
Deployment	Vercel
👥 USER ROLES
1. Vendor (Owner of Hordings)
Creates account and lists their advertising spaces

Manages hording details (location, rate, type, etc.)

Tracks bookings and revenue

Can define metafields (custom attributes for their hordings)

2. Advertiser (Wants to Book Ads)
Searches and filters hordings on the map

Books advertising space

Views detailed hording information

Makes payments

3. Admin (System Manager)
Monitors all hordings and vendors

Approves vendor listings

Manages global metafields

Views analytics

🗂️ SUPABASE DATABASE TABLES-docs/supabase.txt file has schemas.
Table 1: Vendors (Vendor account info)
text
Vendors {
  id: integer (PRIMARY KEY)
  name: string (UNIQUE, required)
  createdAt: timestamp
  updatedAt: timestamp
}
Purpose: Stores vendor profile info
Example Data:

ID: 1, Name: "Billboard Co India"

ID: 2, Name: "Metro Advertising"

Table 2: Hordings (Advertising spaces)
text
Hordings {
  id: integer (PRIMARY KEY)
  vendorId: integer (FOREIGN KEY → Vendors.id)
  
  LOCATION INFO:
  - latitude: double
  - longitude: double
  - state: string (required)
  - city: string (required)
  - zone: string
  - address: text (required)
  - landmark: string
  - roadName: string
  - roadFrom: string
  - roadTo: string
  - positionWRTRoad: enum ('LHS', 'RHS')
  
  TRAFFIC & VISIBILITY:
  - trafficType: enum ('Morning', 'Evening')
  - visibility: string (e.g., 'Prime', 'High', 'Medium', 'Low')
  
  MEDIA SPECS:
  - mediaType: string (e.g., 'digitalScreen', 'hoarding', 'busShelter')
  - screenNumber: integer
  - screenPlacement: enum ('Residential', 'Commercial', 'RailwayStation', 'Cafe', 'Pub', 'Club', 'Restaurant')
  - width: integer (in pixels/units)
  - height: integer (in pixels/units)
  - hordingType: string (e.g., 'LED', 'FrontLit', 'BackLit')
  - screenSize: string
  
  PRICING & BOOKING:
  - rate: integer (₹/month - vendor's asking rate)
  - ourRate: integer (₹/month - our commission rate)
  - paymentTerms: string
  - minimumBookingDuration: string (required, e.g., "1 month", "3 months")
  
  CONTACT INFO:
  - pocName: string (Point of Contact)
  - pocNumber: string
  
  CONTENT & OFFERS:
  - description: text
  - offers: text (e.g., special discounts)
  - previousClientele: text
  
  OPERATIONAL:
  - slotTime: string
  - loopTime: string
  - displayHours: string
  - dwellTime: string
  - propertyCode: string
  
  MANAGEMENT:
  - imageUrls: array (URLs to hording photos)
  - compliance: boolean (regulatory compliance status)
  - status: string (required, 'active', 'pending', 'inactive')
  
  - createdAt: timestamp
  - updatedAt: timestamp
}
Purpose: Stores all advertising space listings
Example Data:

ID: 101, VendorID: 1, Name: "MG Road Banner", City: "Bangalore", Rate: 50000, Status: "active"

ID: 102, VendorID: 1, Name: "DLF Mall Screen", City: "Delhi", Rate: 75000, Status: "pending"

Table 3: Metafields (Custom attributes)
text
Metafields {
  id: integer (PRIMARY KEY)
  name: string (required)
  type: string (e.g., 'text', 'number', 'dropdown', 'checkbox')
  options: array (if type is dropdown)
  createdAt: timestamp
  updatedAt: timestamp
}
Purpose: Stores custom field definitions that vendors can use
Example Data:

ID: 1, Name: "Footfall Count", Type: "number"

ID: 2, Name: "Wi-Fi Enabled", Type: "checkbox"

ID: 3, Name: "Weather Condition", Type: "dropdown", Options: ["Sunny", "Rainy", "Cloudy"]

🔄 USER FLOWS
Flow 1: Vendor Setup
text
1. Vendor creates account (Sign Up)
2. Login to vendor portal (/vendor/dashboard)
3. Navigate to "Hordings" section
4. Click "Create Hording"
5. Fill form:
   - Basic Info (name, description)
   - Location (city, state, address, lat/long)
   - Pricing (rate, minimum booking)
   - Media Details (type, size, placement)
   - Status & Visibility
   - Vendor Info (POC name, phone)
6. Submit → Hording saved to database
7. Admin reviews and approves (status changes to "active")
8. Hording appears on public map (/explore)
Flow 2: Advertiser Searching
text
1. Advertiser visits home page (/)
2. Sees featured hordings or can click "Explore"
3. Navigates to /explore page
4. Uses filters:
   - City/State search
   - Price range
   - Media type
   - Visibility level
   - Custom metafields
5. Views hordings on interactive map
6. Clicks on hording to see details
7. Views full info panel:
   - Images
   - Rate & booking duration
   - Traffic type & visibility
   - POC contact info
   - Previous clientele
8. Clicks "Book Now" (future feature)
Flow 3: Vendor Editing
text
1. Vendor in dashboard clicks on a hording
2. Route: /vendor/hordings/[id]
3. Form pre-fills with existing data
4. Can edit any field
5. Submits changes → Updates database
6. Can delete hording
7. Changes reflected immediately on map
📱 WEBSITE STRUCTURE
Public Routes (Anyone can access)
text
/ ......................... HOME PAGE (landing, featured hordings)
/explore .................. MAP & FILTER PAGE (search hordings)
/explore/[id] ............. HORDING DETAIL PAGE (full info panel)
/auth/login ............... LOGIN PAGE
/auth/signup .............. SIGN UP PAGE
Vendor Routes (Logged-in vendors only)
text
/vendor/dashboard ......... DASHBOARD (stats, recent hordings)
/vendor/hordings .......... HORDINGS LIST (table view)
/vendor/hordings/new ...... CREATE HORDING FORM
/vendor/hordings/[id] .... EDIT HORDING FORM
/vendor/metafields ....... METAFIELDS MANAGEMENT (future)
Admin Routes (Admins only)
text
/admin/dashboard ......... ADMIN DASHBOARD
/admin/hordings .......... APPROVE/MANAGE HORDINGS
/admin/vendors ........... MANAGE VENDORS
/admin/metafields ....... GLOBAL METAFIELDS
🔌 API ENDPOINTS
Vendor Hordings APIs
text
GET    /api/vendor/hordings           → Fetch all hordings (with filters)
POST   /api/vendor/hordings           → Create new hording
GET    /api/vendor/hordings/[id]      → Fetch single hording
PUT    /api/vendor/hordings/[id]      → Update hording
DELETE /api/vendor/hordings/[id]      → Delete hording
Vendor Metafields APIs
text
GET    /api/vendor/metafields         → Fetch all metafields
POST   /api/vendor/metafields         → Create metafield
GET    /api/vendor/metafields/[id]    → Fetch single metafield
PUT    /api/vendor/metafields/[id]    → Update metafield
DELETE /api/vendor/metafields/[id]    → Delete metafield
Existing APIs
text
POST   /api/formdata                  → Form submission (hordings creation)
GET    /api/formdata                  → Get all hordings
📊 DATA RELATIONSHIPS
text
┌─────────────────────────────────────────────────┐
│                   Vendors                       │
│ id | name | createdAt | updatedAt              │
└──────────────┬──────────────────────────────────┘
               │ (1 to Many)
               │
               ▼
┌─────────────────────────────────────────────────────┐
│                   Hordings                          │
│ id | vendorId | city | rate | status | ... | metadata│
└──────────────────────────────────────────────────────┘
               │
               │ (Uses)
               ▼
┌─────────────────────────────────────────────────┐
│                 Metafields                      │
│ id | name | type | options | createdAt        │
└─────────────────────────────────────────────────┘
Relationships:

1 Vendor has Many Hordings (One vendor can list many hording spaces)

Many Hordings use Many Metafields (Custom attributes)

📝 KEY FORM FIELDS IN HORDINGS
Required Fields
name - Hording name/ID

city - City location

state - State location

address - Full address

minimumBookingDuration - Min duration to book (e.g., "1 month")

status - 'active', 'pending', or 'inactive'

Optional Fields
Location: latitude, longitude, landmark, zone, road details

Media: width, height, mediaType, hordingType, screenPlacement

Pricing: rate, ourRate, paymentTerms

Traffic: trafficType, visibility, dwellTime

Contact: pocName, pocNumber

Content: description, offers, previousClientele, imageUrls

Operations: slotTime, loopTime, displayHours, propertyCode

🔐 AUTHENTICATION FLOW
text
1. User signs up via Supabase Auth
2. Email verification (if enabled)
3. User logged in → Auth token stored
4. Token checked in middleware
5. Routes protected by role (vendor vs admin)
6. API requests include auth token
7. Supabase validates token
8. Request proceeds or denied
🗺️ MAP FEATURE
Explore Page (/explore)
Displays all active hordings on interactive map

Uses Leaflet or Google Maps

Shows hording pins/markers at lat/long coordinates

Click marker → Side panel with details

Filters update map in real-time

Data Flow
text
User filters → API call with filters → 
Supabase returns matching hordings → 
Frontend plots on map → 
User clicks marker → 
Side panel loads hording details
📈 PROJECT PHASES
Phase 1: Core Vendor Portal (CURRENT)
✅ Vendor signup & login
✅ Dashboard (stats, recent hordings)
✅ Create/Edit/Delete hordings
✅ Hording list view with table
⏳ API endpoints for all CRUD operations

Phase 2: Public Explore
⏳ Map visualization
⏳ Search & filtering
⏳ Hording detail view
⏳ Metafields customization

Phase 3: Booking System
⏳ Advertiser bookings
⏳ Payment integration
⏳ Booking calendar
⏳ Invoice generation

Phase 4: Admin Panel
⏳ Vendor approval workflow
⏳ Analytics dashboard
⏳ Compliance tracking
⏳ Dispute resolution

📂 FOLDER STRUCTURE
text
Hording-map/
├── src/
│   ├── app/
│   │   ├── (auth)/ ..................... Auth pages
│   │   ├── api/
│   │   │   ├── vendor/hordings/ ....... Vendor hording APIs
│   │   │   ├── vendor/metafields/ .... Vendor metafield APIs
│   │   │   └── formdata/ .............. Form submission API
│   │   ├── admin/ ..................... Admin portal (future)
│   │   ├── explore/ ................... Public explore page
│   │   ├── home/ ...................... Landing page
│   │   ├── vendor/
│   │   │   ├── components/ ............ Sidebar, reusable components
│   │   │   ├── dashboard/ ............ Dashboard page
│   │   │   ├── hordings/
│   │   │   │   ├── page.js ........... Hordings list
│   │   │   │   ├── new/page.js ....... Create form
│   │   │   │   └── [id]/page.js ...... Edit form
│   │   │   └── metafields/ ........... Metafields page
│   │   └── layout.js .................. Root layout
│   ├── components/ .................... Reusable components
│   ├── lib/ ........................... Utilities, config
│   │   └── supabase.js ............... Supabase client
│   └── styles/ ....................... Global styles
├── package.json
├── next.config.js
└── .env.local ........................ Environment variables
🔑 ENVIRONMENT VARIABLES
text
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
🚀 CURRENT DEVELOPMENT STATUS
✅ COMPLETED
Vendor signup/login (Supabase Auth)

Public explore page with map & filters

Hording detail view

Vendor portal structure

Dashboard with stats

⏳ IN PROGRESS
Vendor hording CRUD pages

Vendor API endpoints

Form validation

Error handling

📋 TODO
Metafields customization

Booking system

Payment integration

Admin panel

Analytics

Email notifications

Advanced filters

Export/reporting

💡 KEY CONCEPTS FOR AI AGENT
When explaining to an AI agent:
Tell it the business domain: "This is an Out-of-Home advertising marketplace"

Explain the main entities: "Vendors list hording spaces, Advertisers book them, Admins moderate"

Describe data relationships: "One vendor has many hordings, hordings use custom metafields"

Map the flows: "Vendor creates hording → stored in DB → appears on public map → advertiser books it"

Point out the tech: "Next.js frontend + API routes, Supabase PostgreSQL backend"

Clarify the stage: "Building vendor portal, already have public explore functionality"

Give context: "Hordings = billboards/advertising spaces with location, pricing, media specs"

🎯 QUICK SUMMARY FOR AI AGENTS
What: Marketplace for buying/selling advertising billboard space
Who: Vendors (list spaces) ↔️ Advertisers (book spaces) + Admins (moderate)
Where: Interactive map showing all available hording locations
How: Vendor creates hording entry → appears on map → advertisers search & book
Stack: Next.js (frontend) + Supabase PostgreSQL (backend) + Supabase Auth
Tables: Vendors (account) ↔️ Hordings (ad spaces) ↔️ Metafields (custom attributes)
APIs: CRUD endpoints for vendors to manage hordings & metafields
Status: Phase 1 vendor portal in progress, Phase 2 public explore ready