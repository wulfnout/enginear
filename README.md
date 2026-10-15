# EngiNear

A two-sided marketplace app for iPhone and Android that connects car owners with independent mechanics: mobile mechanics who come to you, shops you drop off at, or both.

- **Clients** keep their cars in My garage, book a service (come to me, or take it to a shop), approve or decline every parts-and-labor quote in the app, check the finished work with a checklist, rate and tip.
- **Mechanics** go through an 8-step setup (skills, certifications, prices, where they work, ID and background check, payouts), find jobs on a list or map, send quotes, and get paid through Stripe with instant cash-out. No lead fees or subscriptions.
- **Pricing**, set per service by each mechanic: a flat price, hourly labor plus parts, or a diagnostic fee followed by a quote.
- **Client-controlled jobs.** For mobile jobs the mechanic checks in and the client confirms. For shop jobs the client drops off the car and the mechanic confirms. Quotes need the client's approval. The mechanic can only finish after the client approves the work, which happens automatically 24 hours after the estimated end if the client never responds.
- **Everyone** gets an AI Help Assistant, real-time chat, push notifications, dark mode, adjustable text size and a safety center.

Logo mark: a steel combination wrench on the diagonal with an orange grip. Colors: graphite `#1D232B` and safety orange `#C2410C` / `#F97316`.

Built from the Clean Connect codebase, with its own database, Stripe account, Expo project and website.

---

## What's inside

| Part | Technology | Where |
|---|---|---|
| Mobile app (iOS + Android) | Expo SDK 53, React Native, Expo Router, TypeScript | `app/`, `src/` |
| Accounts, database, file storage, realtime chat | Supabase (Postgres with row-level security) | `supabase/migrations/` |
| Server functions | Supabase Edge Functions (Deno) | `supabase/functions/` |
| Payments and mechanic payouts | Stripe (PaymentSheet, Connect Express, instant payouts) | `payment-sheet`, `complete-booking`, `stripe-connect`, `stripe-webhook` |
| AI Help Assistant | Claude via the Anthropic API | `ai-assistant` |
| Background checks | Checkr (optional; falls back to manual review) | `background-check`, `checkr-webhook` |
| Push notifications | Expo Push Service | `send-push` |
| Maps | Apple Maps on iOS, Google Maps on Android (`react-native-maps`) | Find and Find jobs tabs |
| Builds and store submission | EAS Build and EAS Submit | `eas.json` |

### Money flow

1. A client saves a card with Stripe when booking. Nothing is charged yet.
2. When the mechanic taps **Finish job & get paid**, the server charges the client and transfers the mechanic's share to their Stripe account.
3. Pricing is calculated on the server (`create_booking` in the migration), so the app can't be tampered with:
   - Recurring discounts are 15% weekly, 10% every 2 weeks and 5% monthly.
   - Clients pay a 6% service and trust fee.
   - The platform keeps 10% of the cleaning price.
   - Tips and late-cancel fees go 100% to the mechanic.
4. Change the rates in `service_fee_rate()` and `platform_commission_rate()` in the migration, and in `src/lib/constants.ts`, which drives the price shown in the app.

---

## 1. Accounts you need

| Service | Why | Cost |
|---|---|---|
| [Supabase](https://supabase.com) | Database, sign-in, storage, server functions | Free tier, then $25/mo Pro |
| [Stripe](https://stripe.com) | Card payments, Connect payouts | Per-transaction fees |
| [Anthropic](https://console.anthropic.com) | AI Help Assistant | Pay per use |
| [Expo / EAS](https://expo.dev) | Cloud builds and app store submission | Free tier available |
| [Apple Developer Program](https://developer.apple.com/programs/) | Publish on the App Store | $99/year |
| [Google Play Console](https://play.google.com/console) | Publish on Google Play | $25 once |
| [Google Cloud](https://console.cloud.google.com) | Maps SDK for Android key | Free quota |
| [Checkr](https://checkr.com) (optional) | Automated background checks | Per check |

## 2. Install

Requires Node 20+.

```bash
npm install
npx expo install --fix      # aligns every package with your installed Expo SDK
cp .env.example .env        # then fill in the values
npm run typecheck
```

## 3. Set up the backend (Supabase)

```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push                                  # creates tables, security rules, storage buckets
cp supabase/functions/.env.example supabase/functions/.env   # fill in secrets
supabase secrets set --env-file supabase/functions/.env
npm run functions:deploy
```

Then in the Supabase dashboard:

1. **Authentication › URL Configuration.** Add `enginear://**` to Redirect URLs.
2. **Authentication › Emails.** Customize the confirmation and reset emails with your branding.
3. **Database › Webhooks.** Create a webhook on `INSERT` into `public.notifications`:
   - Type: Supabase Edge Function `send-push`
   - Header: `x-push-secret: <your SEND_PUSH_SECRET>`

## 4. Set up Stripe

1. Turn on **Connect** and choose **Express** accounts. Set your platform branding.
2. **Developers › Webhooks.** Add an endpoint `https://YOUR_PROJECT.supabase.co/functions/v1/stripe-webhook`.
   - Destination 1 ("Your account"): `setup_intent.succeeded`, `payment_intent.payment_failed`. Signing secret → `STRIPE_WEBHOOK_SECRET`.
   - Destination 2 ("Connected accounts"), same URL: `account.updated`. Signing secret → `STRIPE_CONNECT_WEBHOOK_SECRET`.
3. Optional: enable Apple Pay. This needs the merchant ID `merchant.app.enginear` in your Apple Developer account.

Use test keys (`pk_test_…`, `sk_test_…`) until you've run through a full booking, then switch to live keys.

## 5. Background checks (optional)

1. Set `CHECKR_API_KEY` and `CHECKR_PACKAGE`.
2. Point a Checkr webhook at `/functions/v1/checkr-webhook` for `report.completed`.

Without Checkr, mechanics are marked "pending" so your team can review their uploaded ID and selfie (bucket `verification`). You then set `verification_status = 'approved'` in the `mechanic_profiles` table.

## 6. Run it on your phone

```bash
npx expo prebuild          # generates the native projects (needed for Stripe, Maps, push)
npx expo run:ios           # or: npx expo run:android
```

Alternatively, build a development client in the cloud with `eas build --profile development` and install it on your phone.

## 7. Publish to the App Store and Google Play

```bash
npm install -g eas-cli
eas login
eas init                                   # creates the project; put the id in EAS_PROJECT_ID
eas env:create --environment production    # add each EXPO_PUBLIC_ value and GOOGLE_MAPS_ANDROID_API_KEY
npm run build:ios && npm run submit:ios
npm run build:android && npm run submit:android
```

### Before you submit

- [ ] Put the website (`website/index.html`) live at enginear.app. The app links to its Terms (`#terms`) and Privacy (`#privacy`) sections.
- [ ] Set your support email in `EXPO_PUBLIC_SUPPORT_EMAIL` and `supabase/functions/ai-assistant` (`SUPPORT_EMAIL` secret).
- [ ] Have a lawyer review your terms, especially independent-contractor classification for mechanics and the cancellation policy.
- [ ] Complete Apple's App Privacy questions. You collect contact info, location, photos, payment info (via Stripe) and user content.
- [ ] Apple requires in-app account deletion. The app links to an email request from Me › Terms & privacy. If App Review asks for an in-app button, add one that calls a function deleting the user with the service role.
- [ ] Create a test client and test mechanic account for App Review, and put their logins in the review notes.
- [ ] Booking notifications show times in `America/Chicago`. Change the zone in `on_booking_change()` if you launch elsewhere.

`STORE_LISTING.md` has ready-to-paste store text.

---

## Project map

```
app/
  welcome.tsx                 choose "I need a mechanic" or "I want cleaning work"
  auth/client.tsx             client sign up / sign in  (separate)
  auth/mechanic.tsx            mechanic sign up / sign in (separate)
  (client)/                   only client accounts can open these
    quiz.tsx                  7-question preferences quiz
    (tabs)/home|find|bookings|spending|account
    quick-book.tsx, book.tsx, booked.tsx, mechanic/[id].tsx, review/[id].tsx, reschedule/[id].tsx, problem/[id].tsx, ...
  (mechanic)/                  only mechanic accounts can open these
    onboarding/               intro, checklist, 7 steps, approved
    (tabs)/earnings|jobs|schedule|messages|profile
    job/[id].tsx, rate-client/[id].tsx
  assistant.tsx               AI Help Assistant
  chat/[id].tsx               real-time chat
  notifications.tsx, help.tsx, safety.tsx, legal.tsx, edit-profile.tsx
src/
  components/                 design system (blue + white), cards, chart, tab bar
  providers/                  sign-in state, text size and theme
  lib/                        API calls, pricing, matching, types
supabase/
  migrations/                 full schema, security rules, booking logic
  functions/                  payments, payouts, AI, background checks, push
```

## Accessibility

- Buttons are at least 44–52 points tall and every tab and header icon has a text label.
- The app honors the phone's text size, and **Me › Display › Text size** adds Large and Largest options.
- Light, dark and automatic appearance are supported.
- All controls have screen reader labels.
