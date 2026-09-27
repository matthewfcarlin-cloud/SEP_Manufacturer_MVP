# Commission on store sales: what the platforms allow

Business model (jack, 2026-09-27): designing is free; producing and selling
needs a subscription; Moko takes a commission on each sale, including sales
on third-party stores. This note records how sales could be tracked and what
each platform's terms say. Nothing here is built yet.

Checked 2026-09-27. Items marked *unverified* come from general knowledge,
not a document read that day; re-check before building.

## Etsy (Open API v3)

- **Tracking sales:** the seller's orders are readable with the
  `transactions_r` scope (shop receipts and transactions). The app would add
  that scope to the OAuth request, and only read receipts for listings Moko
  created (we store their `listing_id`s on `version.storeListings`).
- **Terms, quoted from etsy.com/legal/api:**
  - Developers may not "charge Etsy sellers a fee to use or access any part
    of your Application that integrates with the Etsy API and that Etsy
    provides to Etsy sellers free of charge". Creating and managing listings
    is free on Etsy, so a fee for *that* part is risky. A subscription for
    Moko's own work (design, manufacturing, order coordination) is on safer
    ground.
  - The developer is "the sole person or entity responsible for invoicing
    and collecting any fees": Etsy won't collect a commission for us, so we
    would bill the creator ourselves (e.g. Stripe), based on sales we read.
  - Apps must not request "more than the minimum amount of data needed".
    Reading receipts only to compute a commission has to be justified as part
    of the app's purpose in the commercial access application.
  - The API may not be used "to connect with any third-party advertising or
    marketing platform". Manufacturer ads on Moko's own site aren't the API,
    but don't feed Etsy data into an ad system.
  - Etsy "reserves discretion to prohibit any commercial use ... it deems
    inappropriate", and a multi-seller app needs commercial access review.
    Describe the commission honestly in that application.

## Shopify (Admin API) *unverified*

- **Tracking sales:** `read_orders` scope (last 60 days; older needs
  `read_all_orders` approval). Webhook `orders/create` gives sales as they
  happen.
- **Terms:** a public (App Store) app that charges merchants must charge
  through Shopify's Billing API. Billing supports a recurring subscription
  plus usage charges, which can carry a per-sale commission with a capped
  monthly amount. Charging outside Shopify billing breaks the Partner
  Program Agreement for public apps.
- Today Moko only exports a CSV, so it can't see Shopify sales at all. A
  commission there needs a real Shopify app first.

## Amazon (SP-API) *unverified*

- **Tracking sales:** Orders API, with the creator authorizing Moko as a
  developer app (needs Amazon's developer registration and role approval).
- **Terms:** the Data Protection Policy restricts buyer personal data;
  commission maths only needs order totals and SKUs, so request no PII roles.
- Today Moko doesn't connect to Amazon, so it can't see sales there.

## Simplest honest version

Until the store connections read orders, a commission can only be
self-reported: the creator enters units sold (`POST /api/outcomes`
`units_sold` already exists) and is billed on that. Reading orders later
replaces the self-report with real numbers.
