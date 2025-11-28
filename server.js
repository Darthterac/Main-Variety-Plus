require('dotenv').config();
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // Replace with your secret key in .env
const cors = require('cors');
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

app.post('/create-checkout-session', async (req, res) => {
  const { items } = req.body; // Array of {name, price, quantity}

  // Map cart items to Stripe line_items (prices in cents)
  const lineItems = items.map(item => ({
    price_data: {
      currency: 'cad',
      product_data: { name: item.name },
      unit_amount: Math.round(item.price * 100), // Convert to cents
    },
    quantity: 1, // Assuming quantity 1 per item; adjust if needed
  }));

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment', // One-time payment
      success_url: `http://localhost:3000/success?session_id={CHECKOUT_SESSION_ID}`, // Redirect after success
      cancel_url: `http://localhost:3000/cancel`, // Redirect if canceled
      //shipping_address_collection: { allowed_countries: ['US'] }, // Optional; remove if no shipping
      metadata: { pickup: 'in-store' }, // Custom note for pickup
    });
    res.json({ id: session.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Optional: Verify session on success page
//app.get('/success', async (req, res) => {
  //const session = await stripe.checkout.sessions.retrieve(req.query.session_id);
  //if (session.payment_status === 'paid') {
  //res.send('<html><body><h1 style="text-align: center;">Payment successful!</h1><br><br><h2 style="text-align: center;">Your order is ready for pickup.</h2><br><iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d721.681673470789!2d-79.93237445959521!3d43.65385429961054!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x882b0d67bf47b15d%3A0xd77a0399c0fbb53c!2sMain%20Street%20Variety%20Plus!5e0!3m2!1sen!2sca!4v1764323401951!5m2!1sen!2sca" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></body></html>');
//} else {
  //res.send('<html><body><h1 style="text-align: center;">Payment issue. Please contact us.</h1></body></html>'); // Optional: HTML-ify the error too
//}
//});
// ... inside the /success endpoint in server.js ...

app.get('/success', async (req, res) => {
  const session = await stripe.checkout.sessions.retrieve(req.query.session_id, {
    expand: ['line_items'] // Expand to get full line items details
  });

  if (session.payment_status === 'paid') {
    // Build HTML for the success page
    let productList = '';
    session.line_items.data.forEach(item => {
      productList += `<li>${item.description} - Quantity: ${item.quantity} - $${(item.amount_total / 100).toFixed(2)}</li>`;
    });

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
                  <!-- Replace the src with your actual Google Maps embed URL -->
                  <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d721.681673470789!2d-79.93237445959521!3d43.65385429961054!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x882b0d67bf47b15d%3A0xd77a0399c0fbb53c!2sMain%20Street%20Variety%20Plus!5e0!3m2!1sen!2sca!4v1764323401951!5m2!1sen!2sca" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
              </div>
              <p>Confirmation emailed to ${session.customer_details.email || 'you'}.</p>
          </div>
      </body>
      </html>
    `;

    res.send(html);
  } else {
    res.send('<html><body><div class="container"><h1 style="color: #f44336;">Payment Issue</h1><p>Please contact us for assistance.</p></div></body></html>');
  }
});

app.listen(port, () => console.log(`Server running on http://localhost:${port}`));