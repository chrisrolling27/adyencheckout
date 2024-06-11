const express = require("express");
const path = require("path");
const hbs = require("express-handlebars");
const dotenv = require("dotenv");
const morgan = require("morgan");
const { v4: uuidv4 } = require('uuid');

const { hmacValidator } = require('@adyen/api-library');
const { Client, Config, CheckoutAPI } = require("@adyen/api-library");

const app = express();
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "/public")));

dotenv.config({
  path: "./.env",
});

// Adyen NodeJS library configuration
const config = new Config();
config.apiKey = process.env.ADYEN_API_KEY;
const client = new Client({ config });
client.setEnvironment("TEST");  
const checkout = new CheckoutAPI(client);

app.engine(
  "handlebars",
  hbs.engine({
    defaultLayout: "main",
    layoutsDir: __dirname + "/views/layouts",
    helpers: require("./util/helpers"),
  })
);

app.set("view engine", "handlebars");



/* ################# API ENDPOINTS ###################### */

// creates drop-in session 
app.post("/api/sessions", async (req, res) => {

  try {
    const orderRef = uuidv4();
    const protocol = req.socket.encrypted? 'https' : 'http';
    
    const response = await checkout.PaymentsApi.sessions({
      amount: { currency: "EUR", value: 10000 }, // value is 100€ in minor units
      countryCode: "NL",
      merchantAccount: process.env.ADYEN_MERCHANT_ACCOUNT, 
      reference: orderRef, 
      returnUrl: `${protocol}://${req.get('host')}/checkout?orderRef=${orderRef}`, // set redirect URL required for some payment methods (ie iDEAL)
      shopperEmail: "chrisrolling27@gmail.com",
      lineItems: [
        {quantity: 1, amountIncludingTax: 5000 , description: "Sunglasses"},
        {quantity: 1, amountIncludingTax: 5000 , description: "Headphones"}
      ] 
    });

    console.log(response);
    res.json(response);
  } catch (err) {
    console.error(`Error: ${err.message}, error code: ${err.errorCode}`);
    res.status(err.statusCode).json(err.message);
  }
});


/* ################# CLIENT SIDE ENDPOINTS ###################### */

// Index
app.get("/", (req, res) => res.render("index"));

// Cart (continue to checkout)
app.get("/preview", (req, res) =>
  res.render("preview", {
    type: req.query.type,
  })
);

// Checkout page (make a payment)
app.get("/checkout", (req, res) =>
  res.render("checkout", {
    type: req.query.type,
    clientKey: process.env.ADYEN_CLIENT_KEY
  })
);

// Result page
app.get("/result/:type", (req, res) =>
  res.render("result", {
    type: req.params.type,
  })
);


/* ################# WEBHOOK ###################### */

// Process incoming Webhook: get NotificationRequestItem, validate HMAC signature,
// consume the event asynchronously, send response status code 202
// app.post("/api/webhooks/notifications", async (req, res) => {

//   // YOUR_HMAC_KEY from the Customer Area
//   const hmacKey = process.env.ADYEN_HMAC_KEY;
//   const validator = new hmacValidator()
//   // Notification Request JSON
//   const notificationRequest = req.body;
//   const notificationRequestItems = notificationRequest.notificationItems

//   // fetch first (and only) NotificationRequestItem
//   const notification = notificationRequestItems[0].NotificationRequestItem
//   console.log(notification)
  
//   // Handle the notification
//   if( validator.validateHMAC(notification, hmacKey) ) {
//     // valid hmac: process event
//     const merchantReference = notification.merchantReference;
//     const eventCode = notification.eventCode;
//     console.log("merchantReference:" + merchantReference + " eventCode:" + eventCode);

//     // consume event asynchronously
//     consumeEvent(notification);

//     // acknowledge event has been consumed
//     res.status(202).send(); // Send a 202 response with an empty body

//   } else {
//     // invalid hmac
//     console.log("Invalid HMAC signature: " + notification);
//     res.status(401).send('Invalid HMAC signature');
//   }

// });

// process payload asynchronously
// function consumeEvent(notification) {
//   // add item to DB, queue or different thread
  
// }



/* ################# end WEBHOOK ###################### */

/* ################# UTILS ###################### */

function getPort() {
  return process.env.PORT || 8080;
}

/* ################# end UTILS ###################### */

// Start server
app.listen(getPort(), () => console.log(`Server started -> http://localhost:${getPort()}`));
