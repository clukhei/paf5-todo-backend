require('dotenv').config()
const express = require('express')
const bodyParser= require('body-parser')
const multer = require('multer')
const AWS = require('aws-sdk')
const imageType = require('image-type')
const fs = require('fs')
const cors = require('cors')
const path = require('path')
const mysql = require('mysql2/promise')

const app = express()
app.use(cors())
app.use(bodyParser.urlencoded({limit: '50mb', extended:true}))
app.use(bodyParser.json({limit: '50mb'}))
const PORT = process.env.APP_PORT
const pool = mysql.createPool({
    host: process.env.MYSQL_SERVER,
    port: process.env.MYSQL_SVR_PORT,
	user: process.env.MYSQL_USERNAME,
	password: process.env.MYSQL_PASSWORD,
	database: process.env.MYSQL_SCHEMA,
	connectionLimit: process.env.MYSQL_CON_LIMIT,
})


const startApp = async(app, pool) => {
    const conn = await pool.getConnection()
    try{
        console.log('pinging database')
        await conn.ping()
        app.listen(PORT, ()=> {
            console.log(`${PORT} started`)
        })
    } catch(e){
        console.log(e)
    }finally{
        conn.release()
    }
}

app.use((req,res)=> {
    res.redirect('/')
})

startApp(app,pool)
