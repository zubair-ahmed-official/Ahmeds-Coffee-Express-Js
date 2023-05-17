const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config()
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken')
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_NAME}:${process.env.DB_PASSWORD}@cluster0.5i6b38m.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const verifyJWT = (req, res, next) =>
{
    console.log("hitting verify jwt")
    console.log(req.headers.authorization)
    const authorization = req.headers.authorization;
    if(!authorization)
    {
        return res.status(401).send({error:true, message: 'unauhtorized access'})
    }
    const token = authorization.split(' ')[1];
    console.log('Token inside verify jwt ',token)
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET,(error, decoded) =>
    {
        if(error)
        {
            return res.status(401).send({error:true, message: 'un-auhtorized access'})
        }
        req.decoded = decoded;
        next();
    })
}
async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        const coffeeCollection = client.db("coffeeDB").collection("coffee");
        const orderCollection = client.db("coffeeDB").collection("orders");

        //jwt
        app.post('/jwt', (req, res) => {
            const user = req.body;
            console.log(user)
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: '1hr'
            });
            res.send({ token });
        })

        app.get('/coffee', async (req, res) => {
            console.log(req.query)
            const page = parseInt(req.query.page) || 0;
            const limit = parseInt(req.query.limit) || 4;
            const skip = page * limit;
            const cursor = coffeeCollection.find().skip(skip).limit(limit);
            const result = await cursor.toArray();
            res.send(result);
        })

        app.get('/totalCoffees', async (req, res) => {
            const result = await coffeeCollection.estimatedDocumentCount();
            res.send({totalCoffees: result});
        })

        app.get('/coffee/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await coffeeCollection.findOne(query);
            res.send(result);
        })

        app.put('/coffee/:id', async (req, res) => {
            const id = req.params.id;
            const updatedCoffee = req.body;
            const filter = { _id: new ObjectId(id) }
            const options = { upsert: true };
            const coffee =
            {
                $set:
                {
                    name: updatedCoffee.name,
                    price: updatedCoffee.price,
                    url: updatedCoffee.url
                }
            }
            const result = await coffeeCollection.updateOne(filter, coffee, options)
            res.send(result)
        })

        app.post('/coffee', async (req, res) => {
            const coffee = req.body;
            console.log('coffee', coffee)
            const result = await coffeeCollection.insertOne(coffee);
            res.send(result);
        })


        app.delete('/coffee/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await coffeeCollection.deleteOne(query);
            res.send(result);

        })

        app.post('/orderCoffee', async (req, res) => {
            const orderCoffee = req.body;
            console.log('ordered coffee', orderCoffee)
            const result = await orderCollection.insertOne(orderCoffee);
            res.send(result);
        })

        app.get('/orderCoffee', verifyJWT, async (req, res) => {

            const decoded = req.decoded;
            console.log('Came after verify', decoded)
            if(decoded.email != req.query.email)
            {
                return res.status(403).send({error:1, message: 'forbidden access'})
            }
            let query = {};
            if (req.query?.email) {
                query = { email: req.query.email }
            }
            const cursor = orderCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        })
        app.put('/orderCoffee/:id', async (req, res) => {
            const id = req.params.id;
            const updatedCoffee = req.body;
            const filter = { _id: new ObjectId(id) }
            const options = { upsert: true };
            const coffee =
            {
                $set:
                {
                    status: updatedCoffee.status,
                    name: updatedCoffee.name,
                    phone: updatedCoffee.phone,
                    email: updatedCoffee.email,
                    address: updatedCoffee.address,
                    num: updatedCoffee.num,
                }
            }
            const result = await orderCollection.updateOne(filter, coffee, options)
            res.send(result)
        })
        app.patch('/orderCoffee/:id', async (req, res) => {
            const id = req.params.id;
            const updatedCoffee = req.body;
            const filter = { _id: new ObjectId(id) }
            // const options = { upsert: true };
            console.log(updatedCoffee)
            const coffee =
            {
                $set:
                {
                    status: updatedCoffee.status  
                }
            }
            const result = await orderCollection.updateOne(filter, coffee)
            res.send(result)
        })

        app.delete('/orderCoffee/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await orderCollection.deleteOne(query);
            res.send(result);
        })


        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        // console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send("The mongodb sever is running");
})

app.listen(port, (req, res) => {
    console.log(`The port number is ${port}`);
})