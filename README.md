# JP&co - AI-Powered Loyalty System

A full-stack SaaS loyalty system with AI-powered marketing capabilities, built with Next.js 14, Supabase, and OpenAI.

## Features

### 3 Distinct Portals

1. **Customer PWA** (`/pwa`) - Mobile-first loyalty app
   - View points balance with beautiful gold gradient card
   - QR code for in-store scanning
   - Browse and redeem vouchers
   - Transaction history

2. **Staff Terminal** (`/staff`) - Point-of-sale integration
   - Add points by scanning customer QR code
   - Verify and redeem vouchers
   - High-contrast interface for easy use

3. **Admin Dashboard** (`/admin`) - Business intelligence
   - Analytics with Recharts visualizations
   - Customer management
   - Rewards/Voucher management
   - AI Marketing Copilot

### AI Marketing Copilot

- Natural language interface for creating marketing campaigns
- Automatically identifies dormant customers (30+ days)
- Generates personalized WhatsApp messages using OpenAI
- Integrates with WATI for WhatsApp Business API

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL + Auth)
- **Styling**: TailwindCSS + Shadcn/UI
- **Icons**: Lucide React
- **Charts**: Recharts
- **AI**: OpenAI GPT-3.5
- **QR Code**: react-qr-code

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm
- Supabase account
- OpenAI API key (for AI features)

### Installation

1. Clone the repository:
```bash
git clone <repo-url>
cd burgerbro-loyalty
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_api_key
```

4. Set up the database:
   - Go to your Supabase dashboard
   - Navigate to SQL Editor
   - Run the contents of `supabase/schema.sql`

5. Create demo users in Supabase Auth:
   - admin@burgerbro.com (then update role to 'admin')
   - staff@burgerbro.com (then update role to 'staff')
   - customer@burgerbro.com (role stays 'customer')

6. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Project Structure

```
├── app/
│   ├── admin/          # Admin dashboard pages
│   │   ├── ai/         # AI Copilot
│   │   ├── analytics/  # Data analytics
│   │   ├── customers/  # Customer management
│   │   ├── rewards/    # Rewards management
│   │   ├── settings/   # System settings
│   │   ├── transactions/ # Transaction history
│   │   └── components/ # Admin-specific components
│   ├── api/
│   │   └── ai/generate/ # AI marketing API
│   ├── auth/           # Auth callbacks
│   ├── login/          # Login page
│   ├── pwa/            # Customer PWA
│   └── staff/          # Staff terminal
├── components/
│   └── ui/             # Shadcn/UI components
├── lib/
│   ├── supabase/       # Supabase client configs
│   └── utils.ts        # Utility functions
├── public/             # Static assets
└── supabase/
    └── schema.sql      # Database schema
```

## Design System

- **Theme**: Dark Mode (Zinc-950 background)
- **Primary Color**: Amber-500 (Gold)
- **Font**: Inter (Sans-serif)
- **UI Components**: Shadcn/UI (Radix-based)

## API Routes

### POST /api/ai/generate

Generates AI-powered marketing messages.

**Request:**
```json
{
  "goal": "唤醒超过30天没有来店的客户"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Generated marketing content...",
  "targetCount": 15,
  "campaign": {
    "id": "uuid",
    "name": "Campaign name",
    "status": "completed"
  }
}
```

## Database Schema

See `supabase/schema.sql` for the complete database schema including:

- `profiles` - User profiles with roles
- `transactions` - Points transactions
- `menu_items` - Menu catalog
- `ai_campaigns` - AI campaign logs
- `vouchers` - Redeemable rewards
- `user_vouchers` - User's redeemed vouchers

## Role-Based Access

| Role     | Access                          |
|----------|--------------------------------|
| admin    | Full access to all features    |
| staff    | Staff terminal only            |
| customer | PWA only                       |

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Self-hosted

```bash
npm run build
npm start
```

## Security

- Row Level Security (RLS) enabled on all tables
- Role-based middleware protection
- Secure session management via Supabase Auth

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

MIT License - See LICENSE file for details.

---

Built with love for JP&co 🍔
