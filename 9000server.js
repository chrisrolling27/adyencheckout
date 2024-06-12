const express = require("express");
const bodyParser = require("body-parser");
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const port = 9000;

// Use body-parser middleware to parse JSON requests
app.use(bodyParser.json());

// Endpoint to serve a simple HTML page
app.get("/hello", (req, res) => {
  res.send(`
        <!DOCTYPE html>
        <html>
        <body>
            <h1>Hello, World!</h1>
        </body>
        </html>
    `);
});

// Endpoint to receive webhooks
app.all("/*", function (req, res) {
  console.log("-------------- New Request --------------");
  console.log("Headers:" + JSON.stringify(req.headers, null, 3));
  console.log("Body:" + JSON.stringify(req.body, null, 3));
  res.status(200).json({ message: "Thank you for the message!" });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
