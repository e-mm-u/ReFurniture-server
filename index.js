const express = require('express');
const cors = require('cors');
const port = process.env.PORT || 5000;
require('dotenv').config();

const app = express();

// middleware 
app.use(cors());
app.use(express.json());



const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.37l0ps0.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run(){
    try{
        const usersCollection = client.db('recycle-furniture').collection('users');

        app.get('/users', async(req,res)=>{
            const query = { };
            const result = await usersCollection.find(query).toArray();
            res.send(result);
        })
        app.post('/users', async(req,res)=>{
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.send(result);
        })

    }finally{

    }

}
run().catch(console.dir);

app.get('/', (req,res)=>{
    res.send('Hello Hi bYe ByE');
})

app.listen(port, ()=>{
    console.log(`Hey, don't worry, I am listening you from port ${port}`)
})
