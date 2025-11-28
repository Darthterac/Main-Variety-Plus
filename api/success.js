// api/success.js
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default {
  async fetch(request) {
    try {
      const url = new URL(request.url);
      const sessionId = url.searchParams.get("session_id");

      if (!sessionId) {
        return new Response("Missing session_id", { status: 400 });
      }

      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["line_items"],
      });

      if (session.payment_status === "paid") {
        let productList = "";
        for (const item of session.line_items.data) {
          productList += `<li>${item.description} - Quantity: ${
            item.quantity
          } - $${(item.amount_total / 100).toFixed(2)}</li>`;
        }

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Order Confirmation</title>
  <style>
    body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; text-align: center; }
    .container { max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
    h1 { color: #4CAF50; }
    h2 { color: #333; }
    ul { list-style: none; padding: 0; }
    li { background: #eee; margin: 10px 0; padding: 10px; border-radius: 5px; }
    .map { margin-top: 20px; }
    iframe { border: 0; width: 100%; height: 300px; border-radius: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Payment Successful!</h1>
    <h2>Your order is ready for pickup.</h2>
    <p>Here's what you ordered:</p>
    <ul>${productList}</ul>
    <p>Total: $${(session.amount_total / 100).toFixed(2)}</p>
    <div class="map">
      <h3>Store Location</h3>
      <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d721.681673470789!2d-79.93237445959521!3d43.65385429961054!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x882b0d67bf47b15d%3A0xd77a0399c0fbb53c!2sMain%20Street%20Variety%20Plus!5e0!3m2!1sen!2sca!4v1764323401951!5m2!1sen!2sca"
        allowfullscreen
        loading="lazy"
        referrerpolicy="no-referrer-when-downgrade"></iframe>
    </div>
    <p>Confirmation emailed to ${session.customer_details?.email || "you"}.</p>
  </div>
</body>
</html>`;

        return new Response(html, {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      } else {
        const notPaidHtml = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Payment Issue</title></head>
<body>
  <div class="container">
    <h1 style="color: #f44336;">Payment Issue</h1>
    <p>Please contact us for assistance.</p>
  </div>
</body>
</html>`;
        return new Response(notPaidHtml, {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }
    } catch (error) {
      console.error("Success page error:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  },
};
