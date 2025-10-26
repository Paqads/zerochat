# Design Guidelines: Secure Decentralized Chat Application

## Design Approach

**Selected Approach**: Custom Terminal/Hacker Aesthetic inspired by security tools and command-line interfaces, with modern UX enhancements for usability.

**Key Design Principles**:
- Terminal-style interface with cyberpunk/hacker aesthetics
- Monospace typography as primary typeface
- Minimal distractions, maximum security awareness
- Clear encryption and connection status indicators
- Dark theme optimized for extended use

---

## Core Design Elements

### A. Typography

**Primary Font**: `'JetBrains Mono', 'Fira Code', 'Consolas', monospace`
- Headers: 24px, font-weight 700, letter-spacing -0.02em
- Subheaders: 18px, font-weight 600
- Body text (messages): 14px, font-weight 400, line-height 1.6
- Metadata (timestamps, usernames): 12px, font-weight 500, opacity 70%
- System messages: 13px, font-weight 500, italic

**Secondary Font** (for minimal UI labels only): `'Inter', sans-serif`
- Button labels: 14px, font-weight 500
- Form labels: 13px, font-weight 600, uppercase, letter-spacing 0.05em

### B. Layout System

**Spacing Units**: Tailwind units of 2, 4, 6, 8, 12, 16
- Component padding: p-4, p-6, p-8
- Section margins: mb-4, mb-6, mb-8
- Icon spacing: gap-2, gap-3
- Form field spacing: space-y-4

**Container Structure**:
- Full-height app layout: `h-screen flex flex-col`
- Chat area: flex-1 with overflow handling
- Fixed input area at bottom: sticky positioning

---

## C. Component Library

### 1. Authentication Screen (Passphrase Entry)

**Layout**: Centered card on full-screen dark background
- Card: max-w-md, rounded-lg, border with glow effect
- Title: Large monospace heading with glitch-style underline
- Passphrase input: Full-width, monospace, with show/hide toggle
- Visual feedback: Encryption strength indicator (animated bars)
- Submit button: Full-width, terminal-style with "> JOIN ROOM" prefix

### 2. Main Chat Interface

**Structure**: Three-column layout on desktop, collapsed on mobile

**Left Sidebar** (w-64 on desktop, drawer on mobile):
- Room information panel
- Current passphrase display with copy button
- Active users list with online indicators (green dot)
- Encryption status badge (locked icon + "AES-256 ENCRYPTED")
- Settings/admin controls (change passphrase button for room creator)

**Center Panel** (flex-1):
- Header bar: Room name, connection status (blinking dot), user count
- Messages area: scrollable, reverse chronological
  - Message bubbles with subtle border-left accent
  - Username in bold, timestamp in muted color
  - System messages (joins/leaves) with different styling
  - Auto-scroll to latest message
- Bottom input bar: sticky, with send button and character counter

**Right Panel** (w-56, optional, can be toggled):
- Security log (connection events, passphrase changes)
- Room options
- Export chat history (encrypted)

### 3. Message Components

**User Message**:
- Username with random color-coded icon/avatar (using initials)
- Message text with monospace rendering for code blocks
- Timestamp (HH:MM format)
- Optional encryption verification checkmark icon

**System Message**:
- Centered, italic, muted
- Icon prefix for different event types
- Examples: "→ User joined", "← User left", "🔐 Passphrase changed"

### 4. Input Area

**Features**:
- Textarea with auto-expand (max 5 lines)
- Send button with keyboard shortcut indicator (Enter)
- File attachment icon (disabled, showing "Coming soon" tooltip)
- Emoji picker icon
- Character limit indicator

**Styling**:
- Border-top separator from chat area
- Subtle background differentiation
- Focus state with glowing border effect

### 5. Navigation & Controls

**Top Bar**:
- App logo/title (left): "SECURE CHAT" with lock icon
- Room dropdown (center): Current room with chevron
- User menu (right): Username, settings icon, disconnect button

**Button Styles**:
- Primary (Join/Send): Solid with terminal green/cyan glow on hover
- Secondary (Cancel/Back): Outline with subtle border
- Danger (Disconnect/Change Passphrase): Red accent with warning icon
- Icon buttons: Square, subtle hover background

### 6. Status Indicators

**Connection Status**:
- Animated pulsing dot (green = connected, yellow = reconnecting, red = disconnected)
- Tooltip on hover with connection details

**Encryption Badge**:
- Lock icon with "ENCRYPTED" label
- Small, positioned in header or near input
- Click to show encryption details modal

**User Presence**:
- Small circular avatars with status dot
- Active typing indicator: "Username is typing..." with animated dots

### 7. Modals & Overlays

**Change Passphrase Modal**:
- Center overlay with backdrop blur
- Warning message about disconnecting other users
- New passphrase input with strength meter
- Confirm/Cancel buttons

**Settings Panel**:
- Slide-in from right
- Sections: Notifications, Display (font size), Security, About
- Toggle switches for options
- Close button (X) in top-right

---

## D. Animations

**Use Sparingly**:
- Connection status dot: Gentle pulse (2s interval)
- Typing indicator: Bouncing dots animation
- New message arrival: Subtle fade-in (200ms)
- Modal appearance: Fade + scale (300ms)
- Hover states: 150ms transition for all interactive elements

**No animations** for:
- Message scrolling (instant)
- Text input
- Passphrase changes
- User list updates

---

## Visual Hierarchy

1. **Primary focus**: Chat messages and input area
2. **Secondary**: User list and room information
3. **Tertiary**: Settings and admin controls

**Contrast Strategy**:
- Message text: Highest contrast for readability
- Usernames: Medium contrast with color coding
- Timestamps/metadata: Lower contrast, smaller size
- System messages: Distinct italic styling

---

## Accessibility

- All interactive elements have focus states with visible outlines
- Keyboard navigation fully supported (Tab, Enter, Escape)
- Screen reader labels for icons and status indicators
- Sufficient color contrast ratios (WCAG AA minimum)
- Error messages with clear descriptions
- ARIA labels for dynamic content (new messages, user joins)

---

## Responsive Behavior

**Desktop (lg+)**: Three-column layout, all panels visible
**Tablet (md)**: Two-column, right panel hidden, left sidebar toggleable
**Mobile (base)**: Single column, sidebars as slide-in drawers, full-width chat

**Mobile-specific enhancements**:
- Larger touch targets (min 44px height)
- Bottom input bar fixed with safe-area padding
- Swipe gestures to open/close sidebars
- Simplified header with hamburger menu

---

## Images

**No hero images or marketing imagery**. This is a functional application.

**Icon usage**:
- Use Font Awesome 6 for interface icons (lock, user, send, settings, etc.)
- Consistent icon size: 16px for inline, 20px for buttons, 24px for headers
- CDN: `https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css`