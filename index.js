const express = require('express');
const cors = require('cors');
const port = process.env.PORT || 5000;
require('dotenv').config();

const app = express();

// middleware 
app.use(cors());
app.use(express.json());



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.37l0ps0.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run(){
    try{
        const usersCollection = client.db('recycle-furniture').collection('users');
        const productsCollection = client.db('recycle-furniture').collection('products');
        
        // _______________________________________________________
        // ___________________ USERS C R U D ______________________
        
        app.get('/users/:id', async(req,res)=>{
            const id = req.params.id;
            const query = { _id : ObjectId(id)};
            const result = await usersCollection.findOne(query);
            res.send(result);
        })
        app.get('/users', async(req,res)=>{

            let query = { };
            const email = req?.query?.email;
            const role = req?.query?.role;

            // get user based on email
            if(email){
                query = {email : email};
            }
            // get users based on roles : admin/seller/buyer
            if(role && role==='admin'){
                return res.status(403).send({message : 'forbidden access'})
            }
            if(role && role!=='admin'){
                query = {role : role};
            }

            const result = await usersCollection.find(query).toArray();
            res.send(result);
        })
        app.post('/users', async(req,res)=>{

            const user = req.body;
            const query = {email : user.email}

            const alreadyExist = await usersCollection.find(query).toArray();
            if(alreadyExist.length>0){
                console.log(alreadyExist);
                return res.send({message : 'already saved user'})
            }

            const result = await usersCollection.insertOne(user);
            res.send(result);
        })
        app.delete('/users/:id', async(req,res)=>{
            const id = req.params.id;
            const query = { _id : ObjectId(id) };
            const result = await usersCollection.deleteOne(query);
            if (result.deletedCount === 1) {
                console.log('deleted')
            }
            res.send(result);
        })

        // _______________________________________________________
        // ___________________ PRODUCTS C R U D ______________________

        app.get('/products', async(req,res)=>{
            const category = req.query?.category || null;
            const seller = req.query?.seller || null ;
            const buyer = req.query?.buyer || null;
            const reported = req.query?.reported || null;
            const advertise = req.query?.advertise || null;
            
            let query = {};

            if(category){
                query = { category : category }
            }
            if(seller){
                query = { "seller.email" : seller }
            }
            if(buyer){
                query = { "buyer.email" : buyer }
            }
            if(reported){
                query = { reported : reported }
            }
            if(advertise){
                query = { advertise : advertise }
            }

            const result = await productsCollection.find(query).toArray();
            res.send(result);
        })
        app.post('/products', async(req,res)=>{
            const product = req.body;
            // console.log(product)
            const result = await productsCollection.insertOne(product);
            console.log(result);
            res.send(result);
        })

    }finally{

    }

}
run().catch(console.dir);

app.get('/', (req,res)=>{
    res.send('Hello Hi bYe ByE .........');
})

app.listen(port, ()=>{
    console.log(`Hey, don't worry, I am listening you from port ${port}`)
})
