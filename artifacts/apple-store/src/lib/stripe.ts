import Stripe from "stripe";
import { ReplitConnectors } from "@replit/connectors-sdk";
import Product from "@/models/Product";

type StripeCredentials = {
  secretKey: string;
  webhookSecret?: string;
};

type ReplitConnectionResponse = {
  items?: Array<{
    connector_name?: string;
    settings?: {
      secret_key?: string;
      webhook_secret?: string;
    };
  }>;
};

/**
 * Vercel uses explicit server-only environment variables. In Replit, credentials
 * come from the attached Stripe connection and are refreshed for each operation.
 */
export async function getStripeCredentials(): Promise<StripeCredentials> {
  const configuredKey = process.env.STRIPE_SECRET_KEY?.trim();
  const configuredWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (configuredKey) {
    return {
      secretKey: configuredKey,
      webhookSecret: configuredWebhookSecret || undefined,
    };
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const replitToken = process.env.REPL_IDENTITY
    ? `repl ${process.env.REPL_IDENTITY}`
    : process.env.WEB_REPL_RENEWAL
      ? `depl ${process.env.WEB_REPL_RENEWAL}`
      : null;

  if (!hostname || !replitToken) {
    throw new Error(
      "Stripe is not configured. Add STRIPE_SECRET_KEY to the deployment environment.",
    );
  }

  const endpoint = new URL(`https://${hostname}/api/v2/connection`);
  endpoint.searchParams.set("include_secrets", "true");
  endpoint.searchParams.set("connector_names", "stripe");

  const response = await fetch(endpoint, {
    headers: {
      Accept: "application/json",
      X_REPLIT_TOKEN: replitToken,
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Stripe connection lookup failed with status ${response.status}.`);
  }

  const data = (await response.json()) as ReplitConnectionResponse;
  const settings = data.items?.find((item) => item.connector_name === "stripe")?.settings
    ?? data.items?.[0]?.settings;

  if (!settings?.secret_key) {
    throw new Error("The connected Stripe account does not provide a secret key.");
  }

  return {
    secretKey: settings.secret_key,
    webhookSecret: configuredWebhookSecret || settings.webhook_secret || undefined,
  };
}

export async function getStripeClient() {
  const { secretKey } = await getStripeCredentials();
  return new Stripe(secretKey);
}

function appendStripeFormValue(
  form: URLSearchParams,
  key: string,
  value: unknown,
) {
  if (value === undefined || value === null) return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      appendStripeFormValue(form, `${key}[${index}]`, item),
    );
    return;
  }
  if (typeof value === "object") {
    for (const [childKey, childValue] of Object.entries(value)) {
      appendStripeFormValue(form, `${key}[${childKey}]`, childValue);
    }
    return;
  }
  form.append(key, String(value));
}

/**
 * Use the Replit Stripe connector during development. Vercel deployments use
 * their own STRIPE_SECRET_KEY, since Replit connections are not available there.
 */
export async function stripeApi<T>(
  path: string,
  method: "GET" | "POST",
  parameters?: Record<string, unknown>,
  idempotencyKey?: string,
): Promise<T> {
  const form = new URLSearchParams();
  for (const [key, value] of Object.entries(parameters ?? {})) {
    appendStripeFormValue(form, key, value);
  }

  const apiKey = process.env.STRIPE_SECRET_KEY?.trim();
  let response: Response;
  if (apiKey) {
    const url = new URL(`https://api.stripe.com${path}`);
    if (method === "GET") {
      for (const [key, value] of form.entries()) url.searchParams.append(key, value);
    }
    response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        ...(method === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      },
      body: method === "POST" ? form.toString() : undefined,
      signal: AbortSignal.timeout(20_000),
    });
  } else {
    const connectors = new ReplitConnectors();
    response = await connectors.proxy("stripe", path, {
      method,
      headers: {
        ...(method === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      },
      body: method === "POST" ? form.toString() : undefined,
    });
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new Error(`Stripe returned an invalid response (${response.status}).`);
  }
  if (!response.ok) {
    throw new Error(`Stripe request failed with status ${response.status}.`);
  }
  return data as T;
}

export async function getStripeWebhookSecret() {
  const { webhookSecret } = await getStripeCredentials();
  if (!webhookSecret) {
    throw new Error(
      "Stripe webhook signing secret is not configured for this environment.",
    );
  }
  return webhookSecret;
}

type StripeProductRecord = {
  _id: { toString(): string };
  name: string;
  slug: string;
  description: string;
  price: number;
  stripeProductId?: string | null;
  stripePriceId?: string | null;
  stripePriceAmountCents?: number | null;
};

/**
 * Create a Stripe Product and immutable Price only when the catalog item needs
 * a new price. Checkout itself always uses a Stripe Price ID, never client prices.
 */
export async function ensureStripePrice(product: StripeProductRecord) {
  const amountCents = Math.round(product.price * 100);
  if (!Number.isSafeInteger(amountCents) || amountCents < 1) {
    throw new Error("This product does not have a valid payable price.");
  }

  if (
    product.stripePriceId &&
    product.stripeProductId &&
    product.stripePriceAmountCents === amountCents
  ) {
    return product.stripePriceId;
  }

  const productId = product._id.toString();
  let stripeProductId = product.stripeProductId ?? undefined;

  if (!stripeProductId) {
    const created = await stripeApi<{ id: string }>(
      "/v1/products",
      "POST",
      {
        name: product.name,
        description: product.description.slice(0, 500),
        metadata: {
          apple_store_product_id: productId,
          apple_store_slug: product.slug,
        },
      },
      `apple-store-product-${productId}`,
    );
    stripeProductId = created.id;
  } else {
    await stripeApi(
      `/v1/products/${encodeURIComponent(stripeProductId)}`,
      "POST",
      { name: product.name, description: product.description.slice(0, 500) },
    );
  }

  const price = await stripeApi<{ id: string }>(
    "/v1/prices",
    "POST",
    {
      product: stripeProductId,
      unit_amount: amountCents,
      currency: "usd",
      metadata: { apple_store_product_id: productId },
    },
    `apple-store-price-${productId}-${amountCents}-usd`,
  );

  await stripeApi(
    `/v1/products/${encodeURIComponent(stripeProductId)}`,
    "POST",
    { default_price: price.id },
  );

  const update = await Product.updateOne(
    { _id: product._id, price: product.price },
    {
      $set: {
        stripeProductId,
        stripePriceId: price.id,
        stripePriceAmountCents: amountCents,
      },
    },
  ).exec();

  if (update.matchedCount !== 1) {
    throw new Error("The product changed during checkout. Please try again.");
  }

  return price.id;
}

export function getPublicAppUrl(request: Request) {
  const configuredUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    process.env.REPLIT_DOMAINS?.split(",")[0]?.trim() ||
    process.env.REPLIT_DEV_DOMAIN;

  if (configuredUrl) {
    const normalized = configuredUrl.includes("://")
      ? configuredUrl
      : `https://${configuredUrl}`;
    return new URL(normalized).origin;
  }

  return new URL(request.url).origin;
}
