const express = require('express');
const cors = require('cors');
const port = process.env.PORT || 5000;
require('dotenv').config();

const app = express();

// middleware 
app.use(cors());
app.use(express.json());

app('/', (req,res)=>{
    res.send('Hello Hi bYe ByE');
})

app.listen(port, ()=>{
    console.log(`Hey, don't worry, I am listening you from port ${port}`)
})
