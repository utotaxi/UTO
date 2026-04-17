import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn("STRIPE_SECRET_KEY is not set. Stripe payments will not work.");
}

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-01-28.clover" as any,
    })
  : null;

export async function createPaymentIntent(
  amount: number,
  currency: string = "gbp",
  customerId?: string
): Promise<{ clientSecret: string; paymentIntentId: string } | null> {
  if (!stripe) {
    console.error("Stripe is not configured");
    return null;
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency,
      customer: customerId,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return {
      clientSecret: paymentIntent.client_secret!,
      paymentIntentId: paymentIntent.id,
    };
  } catch (error) {
    console.error("Error creating payment intent:", error);
    throw error;
  }
}

export async function createCustomer(email: string, name: string): Promise<string | null> {
  if (!stripe) {
    console.error("Stripe is not configured");
    return null;
  }

  try {
    const customer = await stripe.customers.create({
      email,
      name,
    });
    return customer.id;
  } catch (error) {
    console.error("Error creating customer:", error);
    throw error;
  }
}

export async function getPaymentMethods(customerId: string) {
  if (!stripe) {
    console.error("Stripe is not configured");
    return [];
  }

  try {
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });
    return paymentMethods.data.map(pm => ({
      id: pm.id,
      brand: pm.card?.brand,
      last4: pm.card?.last4,
      expMonth: pm.card?.exp_month,
      expYear: pm.card?.exp_year,
    }));
  } catch (error) {
    console.error("Error fetching payment methods:", error);
    return [];
  }
}

export async function deletePaymentMethod(paymentMethodId: string) {
  if (!stripe) {
    console.error("Stripe is not configured");
    return false;
  }

  try {
    await stripe.paymentMethods.detach(paymentMethodId);
    return true;
  } catch (error) {
    console.error("Error deleting payment method:", error);
    return false;
  }
}

export async function createSetupIntent(customerId: string): Promise<{ clientSecret: string } | null> {
  if (!stripe) {
    console.error("Stripe is not configured");
    return null;
  }

  try {
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
    });

    return {
      clientSecret: setupIntent.client_secret!,
    };
  } catch (error) {
    console.error("Error creating setup intent:", error);
    throw error;
  }
}

export async function confirmPayment(paymentIntentId: string): Promise<boolean> {
  if (!stripe) {
    console.error("Stripe is not configured");
    return false;
  }

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return paymentIntent.status === "succeeded";
  } catch (error) {
    console.error("Error confirming payment:", error);
    return false;
  }
}

export async function refundPayment(paymentIntentId: string): Promise<boolean> {
  if (!stripe) {
    console.error("Stripe is not configured");
    return false;
  }

  try {
    await stripe.refunds.create({
      payment_intent: paymentIntentId,
    });
    return true;
  } catch (error) {
    console.error("Error refunding payment:", error);
    return false;
  }
}

/**
 * Charge a rider's saved card off-session for a no-show penalty.
 * This is used when the rider selected "cash" payment but didn't show up
 * within the 10-minute waiting window after the driver arrived.
 *
 * Flow:
 * 1. Look up the customer's saved payment methods (cards)
 * 2. Use the first available card to create a PaymentIntent
 * 3. Confirm the PaymentIntent off-session (no rider interaction needed)
 *
 * @returns { success, paymentIntentId, error } — success=true if charge went through
 */
export async function chargeSavedCard(
  stripeCustomerId: string,
  amount: number,
  rideId: string,
  currency: string = "gbp",
  chargeType: "ride_fare" | "no_show_fee" = "no_show_fee"
): Promise<{ success: boolean; paymentIntentId?: string; error?: string }> {
  if (!stripe) {
    return { success: false, error: "Stripe is not configured" };
  }

  if (!stripeCustomerId) {
    return { success: false, error: "No Stripe customer ID provided" };
  }

  if (amount <= 0) {
    return { success: false, error: "Invalid charge amount" };
  }

  try {
    // 1. Get the customer's saved payment methods
    const paymentMethods = await stripe.paymentMethods.list({
      customer: stripeCustomerId,
      type: "card",
    });

    if (!paymentMethods.data || paymentMethods.data.length === 0) {
      return { success: false, error: "No saved card found for this customer" };
    }

    // Use the first (most recently attached) card
    const paymentMethodId = paymentMethods.data[0].id;
    const cardBrand = paymentMethods.data[0].card?.brand || "card";
    const cardLast4 = paymentMethods.data[0].card?.last4 || "****";

    console.log(`💳 Charging ${chargeType}: £${amount} on ${cardBrand} ****${cardLast4} for ride ${rideId}`);

    // 2. Create and immediately confirm a PaymentIntent off-session
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Stripe uses pence/cents
      currency,
      customer: stripeCustomerId,
      payment_method: paymentMethodId,
      off_session: true,
      confirm: true,
      description: chargeType === "ride_fare" ? `Ride fare for ride ${rideId}` : `No-show cancellation fee for ride ${rideId}`,
      metadata: {
        ride_id: rideId,
        charge_type: chargeType,
      },
    });

    if (paymentIntent.status === "succeeded") {
      console.log(`✅ ${chargeType} charged successfully: PaymentIntent ${paymentIntent.id}`);
      return { success: true, paymentIntentId: paymentIntent.id };
    } else {
      console.warn(`⚠️ PaymentIntent status: ${paymentIntent.status} (expected succeeded)`);
      return {
        success: false,
        paymentIntentId: paymentIntent.id,
        error: `Payment status: ${paymentIntent.status}`,
      };
    }
  } catch (error: any) {
    console.error(`❌ Error charging ${chargeType}:`, error.message || error);

    // Handle specific Stripe error types
    if (error.type === "StripeCardError") {
      return { success: false, error: `Card declined: ${error.message}` };
    }
    if (error.code === "authentication_required") {
      return { success: false, error: "Card requires authentication — cannot charge off-session" };
    }

    return { success: false, error: error.message || "Unknown Stripe error" };
  }
}
