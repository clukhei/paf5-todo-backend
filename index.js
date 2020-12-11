require('dotenv').config()
const express = require('express')
const bodyParser= require('body-parser')
const multer = require('multer')
const multerS3 = require('multer-s3')
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

const AWS_S3_HOSTNAME = process.env.AWS_S3_HOSTNAME
const AWS_S3_ACCESS_KEY = process.env.AWS_S3_ACCESS_KEY
const AWS_S3_SECRET_ACCESSKEY = process.env.AWS_S3_SECRET_ACCESSKEY
const AWS_S3_BUCKETNAME = process.env.AWS_S3_BUCKETNAME

const spaceEndPoint = new AWS.Endpoint(AWS_S3_HOSTNAME)

const s3 = new AWS.S3({
    endpoint: spaceEndPoint,
    accessKeyId: AWS_S3_ACCESS_KEY,
    secretAccessKey: AWS_S3_SECRET_ACCESSKEY
})

const uploadImg = multer({
    storage: multerS3({
        s3: s3,
        bucket: AWS_S3_BUCKETNAME,
        acl: 'public-read',
        metadata: (req,file,cb)=> {
            
            cb(null, {
                fileName: file.fieldname,
                originalFile: file.originalname,
                uploadDatetime: new Date().toString(),
                mainTaskTitle: req.body.mainTaskTitle,
                subtasks: req.body.subtasks,
                // uploaded: req.query.uploader,
                // note: req.query.note
            })
        },
        key: function(requests, file, cb) {
            cb(null, new Date().getTime() + '_' + file.originalname)
        }
    })
}).array('imageFile', 1)

const uploadImgPromise = (req,res) => {
 
    return new Promise((resolve, reject)=> {
        uploadImg(req,res, (error)=> {
            if (error){
                console.log('error')
                reject(error)
            } else {
                console.log(req.files[0].location)
                resolve(req)
            }
        })
    })
}


const SQL_INSERT_MAINTASK = "INSERT INTO maintasks (`maintask_title`, `maintask_img`) values(? , ?)"
const SQL_INSERT_SUBTASK = "INSERT INTO subtasks (`maintask_id`, `subtask_title`, `substask_status`) values ?"
app.post('/insert', async(req,res)=> {
  
    const conn = await pool.getConnection()
  
    try{
        const processedData = await uploadImgPromise(req,res)
        const imgLink = processedData.files[0].location
        const mainTaskTitle = processedData.body.mainTaskTitle
        const subtasks = JSON.parse(processedData.body.subtasks)
        await conn.beginTransaction()
         const result = await pool.query(SQL_INSERT_MAINTASK, [mainTaskTitle,imgLink])
         const bulkySubTasksArr= []
        subtasks.forEach(st=> {
            const values = Object.values(st)
            values.unshift(result[0].insertId)
            bulkySubTasksArr.push(values)
        })
         await pool.query(SQL_INSERT_SUBTASK, [bulkySubTasksArr])
         await conn.commit()
         res.status(200).json({message:"Main Task and subtasks are inserted"})
    }catch(e) {
        console.log(e)
        conn.rollback()
        res.status(500).json({message: `server error: ${e}`})
    }finally{
        conn.release()
    } 
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
