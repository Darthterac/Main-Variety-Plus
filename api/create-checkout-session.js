// api/create-checkout-session.js
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY); // Set this in Vercel env vars

export default {
  async fetch(request) {
    // Only allow POST
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    try {
      const { items } = await request.json();

      if (!items || !Array.isArray(items) || items.length === 0) {
        return new Response(
          JSON.stringify({ error: "No items provided" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Map each cart entry to a Stripe line item
      const lineItems = items.map((item) => ({
        price_data: {
          currency: "cad",
          product_data: { name: item.name },
          unit_amount: Math.round(item.price * 100), // dollars -> cents
        },
        quantity: 1, // your front-end pushes 1 item per click
      }));

      // Use the site origin (works on Vercel + custom domains)
      const origin = request.headers.get("origin") || "https://example.com";

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: lineItems,
        mode: "payment",
        success_url: `${origin}/api/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/`, // back to store on cancel
        metadata: { pickup: "in-store" },
      });

      return new Response(JSON.stringify({ id: session.id }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Stripe error:", error);
      return new Response(
        JSON.stringify({ error: error.message || "Stripe error" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  },
};
