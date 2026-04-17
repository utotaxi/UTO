UTO Design Guidelines
Brand Identity
Purpose: UTO is a dual-mode ride-sharing platform where users seamlessly toggle between requesting rides (Rider Mode) and providing rides (Driver Mode) in a single app.

Tone: Bold/Striking with Professional Trust

High contrast to ensure critical information (price, ETA, status) is instantly readable
Clean, confident typography that feels premium yet accessible
Strategic use of color to differentiate modes while maintaining cohesion
Map-first design where UI elements complement, not compete with, the map
Differentiation: The mode switcher is the hero. Users can instantly toggle between earning money (Driver) and getting a ride (Rider) - this duality is reflected in a split-personality color system where Rider Mode uses cool tones and Driver Mode uses warm tones, but both feel part of the same family.

Navigation Architecture
Root Navigation: Stack-based with mode switcher overlay

Auth flow → Role Selection → Mode Selection → Main App
Main app uses Tab Navigation when in each mode
Mode switcher is accessible via Settings or floating button (based on user role)
Rider Mode Tabs (3 tabs):

Home - Map with ride request
Activity - Ride history and scheduled rides
Account - Profile, payment methods, settings
Driver Mode Tabs (3 tabs):

Drive - Map with online toggle
Earnings - Trip history and earnings
Account - Profile, vehicle info, settings
Modal Screens (accessible from both modes):

Ride details
Rating/review
Payment confirmation
Settings (with mode switcher)
Emergency/SOS
Screen Specifications
Auth Screens
Sign In Screen

Layout: Centered content, stack-only navigation
Components: Phone input field, "Send Code" button, "Use Email" link
No header, full-screen with UTO logo at top
Safe area: top: insets.top + 48, bottom: insets.bottom + 24
Role Selection Screen (onboarding)

Layout: Vertical stack with three cards
Components: "Rider Only", "Driver Only", "Both" selection cards
Header: Back button (left), progress indicator (title)
Safe area: standard with header
Rider Mode
Home Screen

Layout: Map fills screen, search bar floats at top, ride request card at bottom
Header: Transparent, hamburger menu (left), mode badge (right)
Components:
Google Map with current location marker
Floating search bar (pickup/dropoff)
Bottom sheet: ride type selector (Economy/Premium/XL) with price estimates
"Request Ride" button (CTA)
Safe area: top: headerHeight + 16, bottom: tabBarHeight + 24
Empty state: N/A (map always shows)
Activity Screen

Layout: Scrollable list
Header: Title "Activity", filter button (right)
Components: Ride history cards (date, route, fare, driver rating)
Empty state: Illustration "no-rides.png" - person waiting at bus stop with "Take your first ride"
Safe area: top: 16, bottom: tabBarHeight + 16
Account Screen (Rider)

Layout: Scrollable form
Header: Title "Account", edit button (right)
Components: Avatar, name, phone, email, payment methods, settings
Safe area: top: 16, bottom: tabBarHeight + 16
Driver Mode
Drive Screen

Layout: Map fills screen, online toggle floats at top, active ride card at bottom
Header: Transparent, hamburger menu (left), mode badge (right)
Components:
Google Map with driver location marker
Floating online/offline toggle (prominent)
Bottom sheet: incoming ride request OR navigation to pickup/dropoff
Accept/Decline buttons when ride request appears
Safe area: top: headerHeight + 16, bottom: tabBarHeight + 24
Earnings Screen

Layout: Scrollable with summary cards at top
Header: Title "Earnings", date filter (right)
Components: Total earnings card, weekly summary, trip list
Empty state: Illustration "no-earnings.png" - empty wallet with "Complete rides to start earning"
Safe area: top: 16, bottom: tabBarHeight + 16
Shared Screens
Settings Screen

Layout: Scrollable list
Header: Back button (left), title "Settings"
Components:
Mode switcher section (if user.role = 'both')
Account settings
Notifications
Privacy & safety
Log out (destructive)
Safe area: standard
Rating Screen (modal)

Layout: Centered content
Header: Close button (left), title "Rate Your Ride"
Components: 5-star selector, optional comment field, submit button
Safe area: standard modal
Color Palette
Rider Mode (Cool Tones):

Primary: #0066FF (Vibrant Blue)
Primary Dark: #0047B3
Background: #FFFFFF
Surface: #F5F7FA
Text Primary: #1A1A1A
Text Secondary: #6B7280
Success: #10B981
Error: #EF4444
Driver Mode (Warm Tones):

Primary: #FF6B00 (Energetic Orange)
Primary Dark: #CC5500
Background: #FFFFFF
Surface: #FFF9F5
Text Primary: #1A1A1A
Text Secondary: #6B7280
Success: #10B981
Error: #EF4444
Neutral (Used in both modes):

Border: #E5E7EB
Disabled: #D1D5DB
Overlay: rgba(0, 0, 0, 0.4)
Typography
Font: Inter (Google Font - clean, legible, modern)

Display: 32px, Bold (screen titles)
H1: 24px, Bold (section headers)
H2: 20px, Semibold (card titles)
Body: 16px, Regular (main text)
Caption: 14px, Regular (secondary info)
Small: 12px, Regular (timestamps, labels)
Price Display: SF Mono (monospace for fare amounts)

Visual Design
Icons: Feather icons from @expo/vector-icons
Touchable Feedback: 0.7 opacity on press for all buttons
Floating Buttons: shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.10, shadowRadius: 2
Cards: 12px border radius, subtle shadow
Mode Badge: Pill-shaped indicator in header showing "RIDER" or "DRIVER" with respective primary color
Assets to Generate
Required Assets:

icon.png - App icon with "UTO" wordmark in bold sans-serif, gradient from blue (#0066FF) to orange (#FF6B00)
splash-icon.png - Same as app icon, centered on splash screen
no-rides.png - Empty state for Activity (Rider): Illustration of person with phone at street corner in soft blues, WHERE USED: Activity Screen empty state
no-earnings.png - Empty state for Earnings (Driver): Illustration of car with dollar sign in soft oranges, WHERE USED: Earnings Screen empty state
rider-welcome.png - Onboarding illustration: Person entering car with map background, WHERE USED: Role Selection Screen
driver-welcome.png - Onboarding illustration: Person driving with earnings dashboard, WHERE USED: Role Selection Screen
avatar-rider.png - Default rider avatar (neutral, professional), WHERE USED: Account Screen
avatar-driver.png - Default driver avatar (friendly, professional), WHERE USED: Account Screen
mode-switch.png - Illustration showing dual modes: split image rider/driver, WHERE USED: Settings > Mode Switcher
Style: Minimal, flat illustrations with subtle gradients. Use brand colors (blue for rider-focused, orange for driver-focused). Avoid excessive detail - clarity over complexity.


