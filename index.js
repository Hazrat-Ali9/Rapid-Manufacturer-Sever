const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// middleware
app.use(cors());
app.use(express.json());





const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.fl8bx.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'UnAuthorized Access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden Access' })
        }
        req.decoded = decoded;
        next();
    });

}


async function run() {
    try {
        await client.connect();
        const itemsCollection = client.db('rapid_manufacturer').collection('items');
        const purchaseCollection = client.db('rapid_manufacturer').collection('purchases');
        const reviewsCollection = client.db('rapid_manufacturer').collection('reviews');
        const userCollection = client.db('rapid_manufacturer').collection('users');
        const paymentCollection = client.db('rapid_manufacturer').collection('payments');
        const productCollection = client.db('rapid_manufacturer').collection('products');

        // To load all items to the client site 
        app.get('/items', async (req, res) => {
            const query = {};
            const cursor = itemsCollection.find(query);
            const items = await cursor.toArray();
            res.send(items);
        })


        // using post API to purchase a particular item 
        app.post('/purchase', async (req, res) => {
            const purchase = req.body;
            const result = purchaseCollection.insertOne(purchase);
            res.send(result);

        })

        app.get('/purchases', async (req, res) => {
            const query = {};
            const result = await purchaseCollection.find(query).toArray();
            res.send(result);

        })


        app.patch('/purchase/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const updatedDoc = {
                $set: {
                    shipped: true
                }
            }
            const updatedPurchase = await purchaseCollection.updateOne(filter, updatedDoc);
            res.send(updatedPurchase);
        })


        app.get('/user', async (req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users);
        })

        app.get('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            res.send(user);
        })



        app.delete('/user/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email }
            const users = await userCollection.deleteOne(query);
            res.send(users);
        })

        app.put('/user/admin/:email', async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const updateDoc = {
                $set: { role: 'admin' },
            };
            const result = await userCollection.updateOne(filter, updateDoc);

            res.send({ result });
        })

      


        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            const isAdmin = user.role === 'admin';
            res.send({ admin: isAdmin });
        })


        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.send({ result, token });
        })


        app.patch('/updateUser/:email', async (req, res) => {
            const email = req.params.email;
            const userData = req.body;
            const filter = { email: email };
            const updateDoc = {
                $set: userData,
            };
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result);
        })



        app.get('/item/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const users = await itemsCollection.findOne(query);
            res.send(users);
        })




        app.get('/purchase/:email', async (req, res) => {
            const email = req.params.email;

            const query = { userEmail: email };
            const cursor = purchaseCollection.find(query);
            const purchase = await cursor.toArray();
            res.send(purchase);
        })



        app.delete('/purchase/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const purchase = await purchaseCollection.deleteOne(query);
            res.send(purchase);
        })


        app.post('/review', async (req, res) => {
            const review = req.body;
            const result = reviewsCollection.insertOne(review);
            res.send(result);

        })


        app.get('/reviews', async (req, res) => {
            const query = {};
            const cursor = reviewsCollection.find(query);
            const reviews = await cursor.toArray();
            res.send(reviews);
        })



        // for payment 
        app.post('/create-payment-intent', async (req, res) => {
            const service = req.body;
            const price = service.price;
            const newPrice = price || 1
            const amount = parseInt(newPrice) * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });
            res.send({ clientSecret: paymentIntent.client_secret })
        })



        app.patch('/payment/:id', async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const filter = { _id: ObjectId(id) };
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }
            const result = await paymentCollection.insertOne(payment);
            const updatedPayment = await purchaseCollection.updateOne(filter, updatedDoc);
            res.send(updatedPayment);
        })



        app.get('/buy/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const query = { _id: ObjectId(id) };
            const result = await purchaseCollection.findOne(query);
            res.send(result);
        })


        app.post('/product', async (req, res) => {
            const product = req.body;
            const result = await itemsCollection.insertOne(product);
            res.send(result);

        })


        app.delete('/item/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const deleteResult = await itemsCollection.deleteOne(query);
            res.send(deleteResult);
        })


    }
    finally {
        // await client.close();
    }
}

run().catch(console.dir);






app.get('/', (req, res) => {
    res.send('Hello from Rapid Manufacturer!')
})

app.listen(port, () => {
    console.log(`Alhamdulilah Server is Running`)
})

//${port}