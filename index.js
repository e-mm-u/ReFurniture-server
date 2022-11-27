const express = require('express');
const cors = require('cors');
const port = process.env.PORT || 5000;
const stripe = require('stripe')(process.env.STRIPE_SK)
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
            // console.log({email},{result});
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

        app.put('/users', async(req,res)=>{
            const email = req.query.email ;
            const filter = { email : email};
            const updateInfo = req.body ;

            let updateArray = null;

            if(updateInfo.booking){
                updateArray = {
                    $push : {
                        booking : updateInfo.product_id
                    }
                }
            }
            if(updateInfo.wishlist){
                updateArray = {
                    $push : {
                        wishlist : updateInfo.product_id
                    }
                }
            }

            const result = await usersCollection.updateOne(filter, updateArray)

            console.log(result);
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

        // _________________________________________________________________
        // ___________________ P R O D U C T S C R U D ______________________\


        // _________________________________________________________________________________________
        // \___________________ A P I : G E T   P R O D U C T S  by  C A T E G O R Y ______________|


        app.get('/products', async(req,res)=>{
            const category = req.query.category ;
            const query = {category : category};
            const result = await productsCollection.find(query).toArray();
            res.send(result);
        })

        // _________________________________________________________________________________________
        // \___________________ A P I : G E T   P R O D U C T S  by  I D  __________ ______________|


        app.get('/products/:id', async(req,res)=>{
            const id = req.params.id ;
            const query = { _id : ObjectId(id) };
            const result = await productsCollection.findOne(query);
            res.send(result);
        })

        // _________________________________________________________________________________________
        // \___________________ A P I : G E T   Buyers for a Seller   P R O D U C T S______________|


        // _________________________________________________________________________________________
        // \___________________ A P I : G E T   S E L L E R ' S   P R O D U C T S__________________|

        app.get('/products/postedby', async(req,res)=>{
            const email = req.query.email ;
            const query = { "seller.email" : email }
            const result = await productsCollection.find(query).toArray();
            res.send(result);
        })

        // _________________________________________________________________________________________
        // \___________________ A P I : G E T   P U R C H A S E D   P R O D U C T S________________|

        app.get('/products/purchasedby', async(req,res)=>{
            const email = req.query.email ;
            const query = { "buyer.email" : email }
            const result = await productsCollection.find(query).toArray();
            res.send(result);
        })
        // _____________________________________________________________________________________________
        // \___________________A P I : G E T   B O O K E D   P R O D U C T S___________________________|

        app.get('/products/booking', async(req,res)=>{
            const email = req.query.email;
            const user = await usersCollection.findOne({email : email});
            const userBooking = user.booking;

            userBooking.forEach((element,i) => {
                userBooking[i] = ObjectId(element);
            });

            const products = await productsCollection.find({_id : { $in : userBooking}}).toArray();
            res.send(products);
        })
        // _____________________________________________________________________________________________
        // \___________________A P I : G E T   W I S H L I S T   P R O D U C T S_______________________|

        app.get('/products/wishlist', async(req,res)=>{
            const email = req.query.email;
            const user = await usersCollection.findOne({email : email});
            const userWishlist = user.wishlist;

            userWishlist.forEach((element,i) => {
                userWishlist[i] = ObjectId(element);
            });

            const products = await productsCollection.find({_id : { $in : userWishlist}}).toArray();
            res.send(products);
        })

        // _____________________________________________________________________________________________
        // \___________________ A P I : G E T   A D V E R T I S E D   P R O D U C T S__________________|

        app.get('/products/advertise', async(req,res)=>{
            const query = { advertise : true };
            const result = await productsCollection.find(query).toArray();
            res.send(result);
        })
        // _____________________________________________________________________________________________
        // \___________________ A P I : G E T   R E P O R T E D   P R O D U C T S______________________|

        app.get('/products/reported', async(req,res)=>{
            const query = { reported : true };
            const result = await productsCollection.find(query).toArray();
            res.send(result);
        })

        // _____________________________________________________________________________________________
        // \___________________ A P I : S E L L E R    P O S T   P R O D U C T S_______________________|

        app.post('/products', async(req,res)=>{
            const product = req.body;
            // console.log(product)
            const result = await productsCollection.insertOne(product);
            console.log(result);
            res.send(result);
        })

        // _________________________________________________________________
        // ___________________ P A Y M E N T _______________________________\
        app.post('/create-payment-intent', async(req,res)=>{
            const product = req.body;
            const price = product.price;
            const amount = price*100;

            const paymentIntent = await stripe.paymentIntents.create({
                currency : 'usd',
                amount : amount ,
                "payment_method_types" : [
                    "card"
                ]
            });
            res.send({
                clientSecret : paymentIntent.client_secret
            })
        })

        app.put('/products/payment/:id', async(req,res)=>{
            const id = req.params.id;
            const buyer = req.body ;
            const query = { _id : ObjectId(id)};

            const update = {
                $set : {
                    buyer : buyer,
                    paid : true
                }
            }
            const options = { upsert : true }
            
            const result = await productsCollection.updateOne(query, update, options);
            
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
