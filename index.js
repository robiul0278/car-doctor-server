const express = require("express");
const app = express();
const cors = require("cors");
var jwt = require("jsonwebtoken");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;

// middleware
app.use(cors({}));
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.djxbtyf.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// JWT MAIN TOKEN FUNCTION |||||||||||||||||||||||||||||||||||||||||||||||
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized access" });
  }
  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.JWT_SECRET_KEY, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ error: true, message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const serviceCollection = client.db("carDoctor").collection("services");
    const checkOutCollection = client.db("carDoctor").collection("check-out");

    // JWT TOKEN SECTION |||||||||||||||||||||||||||||||||||||||||||||||||||
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.JWT_SECRET_KEY, {expiresIn: "1day"});
      res.send({ token });
    });

    // SERVICES SECTION |||||||||||||||||||||||||||||||||||||||||||||||||||||
    // Find Multiple Documents || database store all data read ||
    app.get("/services", async (req, res) => {
      const cursor = serviceCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // Find a Document || database store single data load ||
    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const options = {
        projection: { title: 1, service_id: 1, price: 1, img: 1 },
      };
      const result = await serviceCollection.findOne(query, options);
      res.send(result);
    });

    // CHECKOUT ||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||
    // Insert a Document || client site to database ||
    app.post("/checkout", async (req, res) => {
      const data = req.body;
      const result = await checkOutCollection.insertOne(data);
      res.send(result);
    });

    // Find some Documents || database store some data read ||
    // JWT ||||||||||||||||||
    app.get("/checkout",verifyJWT, async (req, res) => {
      const decoded = req.decoded;
      console.log("come back after verify", decoded);
      // console.log(req.query)
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };
      }
      const result = await checkOutCollection.find(query).toArray();
      res.send(result);
    });

    // DELETE A DOCUMENT || CLIENT SITE TO DELETE DATA SERVER SITE
    app.delete("/checkout/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await checkOutCollection.deleteOne(query);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
