const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
// const stripe = require('stripe')(process.env.STRIPE_SK);
const port = process.env.PORT || 5000;

require('dotenv').config();

const app = express();

// middleware 
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { application } = require('express');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.37l0ps0.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

        // ___________________________________________________________________
        // __________________ J W T - V E R I F Y  T O K E N ________________/

function verifyJWT(req,res,next){
    console.log(req.headers.authorization);
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message : 'unauthorized access'});
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded;
        next();
    })
}


async function run(){
    try{
        const usersCollection = client.db('recycle-furniture').collection('users');
        const productsCollection = client.db('recycle-furniture').collection('products');

        // ___________________________________________________________________
        // ___________________ V E R I F Y    A D M I N _____________________/
        
        const verifyAdmin = async(req,res,next) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await usersCollection.findOne(query);

            if (user?.role !== 'admin') {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next();
        }
        // ___________________________________________________________________
        // ___________________ V E R I F Y   S E L L E R ____________________/
        
        const verifySeller = async(req,res,next) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await usersCollection.findOne(query);

            if (user?.role !== 'seller') {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next();
        }
        // ___________________________________________________________________
        // ___________________  V E R I F Y   B U Y E R _____________________/
        
        const verifyBuyer = async(req,res,next) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await usersCollection.findOne(query);

            if (user?.role !== 'buyer') {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next();
        }

        // ___________________________________________________________________
        // ___________________ J W T - token generator A P I ________________/

        app.get('/jwt', async(req,res)=>{
            const email = req.query.email ;
            const query = { email : email };
            const user = await usersCollection.findOne(query) ;
            if(user){
                const token = jwt.sign( {email}, process.env.ACCESS_TOKEN, {expiresIn : '12h'});
                return res.send({access_token : token });
            }
            res.status(403).send({access_token : null});
        })


        // ___________________________________________________________________
        // ________________ is admin ? useAdmin hook   _____-_______________/
        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await usersCollection.findOne(query);
            res.send({ isAdmin : user?.role === 'admin' });
        })
        // ___________________________________________________________________
        // ________________ is seller ? useSeller hook ________________________/
        app.get('/users/seller/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await usersCollection.findOne(query);
            res.send({ isSeller : user?.role === 'seller' });
        })
        // ___________________________________________________________________
        // ________________ is buyer ? useBuyer hook  ______________________/
        app.get('/users/buyer/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await usersCollection.findOne(query);
            res.send({ isBuyer: user?.role === 'buyer' });
        })
        // ________________________________________________________
        // ___________________ USERS C R U D ______________________\
        
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

        // ___________________________________________________________________
        // ________________ A D M I N  : G E T  S E L L E R S _______________/

        app.get('/admin/users/sellers', verifyJWT, verifyAdmin, async(req,res)=>{
            console.log('ok you are admin i know now');
            const query = { role : 'seller' };
            const result = await usersCollection.find(query).toArray();
            res.send(result);
        })

        // ___________________________________________________________________
        // ________________ A D M I N  : G E T  B U Y E R S _______________/

        app.get('/admin/users/buyers', verifyJWT, verifyAdmin, async(req,res)=>{
            console.log('ok you are admin i know now');
            const query = { role : 'buyer' };
            const result = await usersCollection.find(query).toArray();
            res.send(result);
        })     

        // ________________________________________________________________________
        // _______ A D M I N  : G E T  R E P O R T E D  P R O D U C T S___________/

        app.get('/admin/products/reported', verifyJWT, verifyAdmin, async(req,res)=>{
            console.log('ok you are admin i know now');
            const query = { reported : true };
            const result = await usersCollection.find(query).toArray();
            res.send(result);
        })     

        // ______________________________________________________________________________
        // _______ A D M I N  : D E L E T E  R E P O R T E D  P R O D U C T S___________/

        app.delete('/admin/products/reported/:id', verifyJWT, verifyAdmin, async(req,res)=>{
            console.log('ok, you admin can delete reported product');
            const id = req.params.id;
            const query = { _id : ObjectId(id) };
            const result = await productsCollection.deleteOne(query);
            if (result.deletedCount === 1) {
                console.log('deleted')
            }
            res.send(result);
        })

        // ______________________________________________________________________________
        // _______________ A D M I N  : D E L E T E  B U Y E R S _______________________/   
        app.delete('/admin/users/buyers/:id', verifyJWT, verifyAdmin, async(req,res)=>{
            console.log('ok, you admin can delete buyers');
            const id = req.params.id;
            const query = { _id : ObjectId(id) };
            const result = await usersCollection.deleteOne(query);
            if (result.deletedCount === 1) {
                console.log('deleted')
            }
            res.send(result);
        })
        // ______________________________________________________________________________
        // _______________ A D M I N  : D E L E T E  S E L L E R S _____________________/        
        app.delete('/admin/users/sellers/:id', verifyJWT, verifyAdmin, async(req,res)=>{
            console.log('ok, you admin can delete sellers');
            const id = req.params.id;
            const query = { _id : ObjectId(id) };
            const result = await usersCollection.deleteOne(query);
            if (result.deletedCount === 1) {
                console.log('deleted')
            }
            res.send(result);
        }) ;
        // ______________________________________________________________________________
        // _______________ A D M I N  : V E R I F Y  S E L L E R S _____________________/        
        app.put('/admin/users/sellers/:id', verifyJWT, verifyAdmin, async(req,res)=>{
            console.log('ok, you admin can verify sellers');
            const id = req.params.id;
            const filter = { _id : ObjectId(id) };
            const options = { upsert: true };

            const update = {
                $set: {
                    verified : true
                }
            }
            const result = await usersCollection.updateOne(filter, update, options);
            if (result.modifiedCount > 0) {
                console.log('verified')
            }
            res.send(result);
        }) 
                
        
        // ______________________________________________________________________________
        // _______________ S A V E  U S E R  I N  D A T A B A S E  _____________________/   
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

        // __________________________________________________________________________
        // _______________ U P D A T E   BOOKING &  WISHLIST  _____________________/ 
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

        // _________________________________________________________________
        // _________________ P R O D U C T S  C R U D ______________________\
        // __________________________________________________________________________
        // _______________ U P D A T E   R E P O R T E D PRODUCT   _____________________/ 
        app.put('/products/:id', async(req,res)=>{
            const id = req.params.id ;
            const filter = { _id : ObjectId(id) };
            const updateInfo = req.body ;
            const update = {
                $set : {
                    reported : true
                }
            }

            const result = await productsCollection.updateOne(filter, update)

            console.log(result);
            res.send(result);
        })

        // _________________________________________________________________________________________
        // \___________________ A P I : G E T   P R O D U C T S  by  C A T E G O R Y ______________|
        
        app.get('/products', async(req,res)=>{
            let query = { }
            const category = req.query?.category ;
            if(category) { query = {category : category} }
            const result = await productsCollection.find(query).toArray();
            res.send(result);
        })

        // _________________________________________________________________________________________
        // \___________________ A P I : G E T   P U R C H A S E D   P R O D U C T S________________|
        //  need  modification
        app.get('/products/purchasedby', async(req,res)=>{
            const email = req.query.email ;
            const query = { "buyer.email" : email }
            const result = await productsCollection.find(query).toArray();
            res.send(result);
        })
        // _____________________________________________________________________________________________
        // \___________________ B U Y E R's  B O O K E D   P R O D U C T S  ___________________________|

        app.get('/buyer/products/booking', verifyJWT, verifyBuyer, async(req,res)=>{
            console.log('as you are buyer I will return you the list');
            const email = req.query.email;
            const user = await usersCollection.findOne({email : email});
            const userBooking = user?.booking;

            userBooking.forEach((element,i) => {
                userBooking[i] = ObjectId(element);
            });

            const products = await productsCollection.find({_id : { $in : userBooking}}).toArray();
            res.send(products);
        })
        // ___________________________________________________________________________________________
        // \___________________ B U Y E R's  W I S H L I S T   P R O D U C T S_______________________|

        app.get('/buyer/products/wishlist', verifyJWT, verifyBuyer, async(req,res)=>{
            console.log('as you are buyer I will return you the wishlist');
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

        // ____________________________________________________________________________________
        // \___________________  S E L L E R    G E T   P R O D U C T S_______________________|
        app.get('/seller/products', verifyJWT, verifySeller, async(req,res)=>{
            console.log('so you are seller and you can see your added products');
            const email = req.query?.email;
            const query = { "seller.email" : email };
            const result = await productsCollection.find(query).toArray();
            res.send(result);
        })
        // ______________________________________________________________________________________
        // \___________________  S E L L E R    P O S T   P R O D U C T S_______________________|

        app.post('/seller/products', verifyJWT, verifySeller, async(req,res)=>{
            console.log('so you are a seller and you can add product here');
            const product = req.body;
            // console.log(product)
            const result = await productsCollection.insertOne(product);
            console.log(result);
            res.send(result);
        });
        // ______________________________________________________________________________________
        // \___________________  S E L L E R    A D V E R T I S E  P R O D U C T S______________|

        app.put('/seller/products/:id', verifyJWT, verifySeller, async(req,res)=>{
            console.log('so you are a seller and you can advertise product here');
            const id = req.params.id;
            const filter = { _id : ObjectId(id) };
            const options = { upsert: true };

            const update = {
                $set: {
                    advertise : true
                }
            }
            const result = await productsCollection.updateOne(filter, update, options);
            if (result.modifiedCount > 0) {
                console.log('advertised')
            }
            console.log(result);
            res.send(result);
        }); 
        // ______________________________________________________________________________________
        // \___________________  S E L L E R    D E L E T E   P R O D U C T S___________________|

        app.delete('/seller/products/:id', verifyJWT, verifySeller, async(req,res)=>{
            console.log('so you are a seller and you can delete product here');
            const id = req.params.id;
            const query = { _id : ObjectId(id) }
            const result = await productsCollection.deleteOne(query);
            console.log(result);
            res.send(result);
        });     

        // _________________________________________________________________________________________
        // \___________________ A P I : G E T   Buyers of a Seller   P R O D U C T S______________|
        //     not implemented yet


        // _________________________________________________________________
        // ___________________ P A Y M E N T _______________________________\
        // app.post('/create-payment-intent', async(req,res)=>{
        //     console.log("STRIPE_SK", process.env.STRIPE_SK)
        //     const product = req.body;
        //     const price = product.price;
        //     const amount = price*100;
        //     // consolr.log(stripe)
        //     const paymentIntent = await stripe.paymentIntents.create({
        //         currency : 'usd',
        //         amount : amount ,
        //         "payment_method_types" : [
        //             "card"
        //         ]
        //     });
        //     res.send({
        //         clientSecret : paymentIntent.client_secret
        //     })
        // })

        // app.put('/products/payment/:id', async(req,res)=>{
        //     const id = req.params.id;
        //     const buyer = req.body ;
        //     const query = { _id : ObjectId(id)};

        //     const update = {
        //         $set : {
        //             buyer : buyer,
        //             paid : true
        //         }
        //     }
        //     const options = { upsert : true }
            
        //     const result = await productsCollection.updateOne(query, update, options);
            
        //     console.log(result);
        //     res.send(result);
        // })


        // _________________________________________________________________________________________
        // \___________________ A P I : G E T   P R O D U C T S  by  I D  __________ ______________|
        app.get('/products/:id', async(req,res)=>{
            const id = req.params.id;
            const query = { _id : ObjectId(id) } ;
            const result = await productsCollection.findOne(query) ;
            res.send(result)
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
