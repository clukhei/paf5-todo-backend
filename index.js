require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const multer = require("multer");
const multerS3 = require("multer-s3");
const AWS = require("aws-sdk");
const imageType = require("image-type");
const fs = require("fs");
const cors = require("cors");
const path = require("path");
const mysql = require("mysql2/promise");

const app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
app.use(bodyParser.json({ limit: "50mb" }));
const PORT = process.env.APP_PORT;
const pool = mysql.createPool({
	host: process.env.MYSQL_SERVER,
	port: process.env.MYSQL_SVR_PORT,
	user: process.env.MYSQL_USERNAME,
	password: process.env.MYSQL_PASSWORD,
	database: process.env.MYSQL_SCHEMA,
	connectionLimit: process.env.MYSQL_CON_LIMIT,
});

const AWS_S3_HOSTNAME = process.env.AWS_S3_HOSTNAME;
const AWS_S3_ACCESS_KEY = process.env.AWS_S3_ACCESS_KEY;
const AWS_S3_SECRET_ACCESSKEY = process.env.AWS_S3_SECRET_ACCESSKEY;
const AWS_S3_BUCKETNAME = process.env.AWS_S3_BUCKETNAME;

const spaceEndPoint = new AWS.Endpoint(AWS_S3_HOSTNAME);

const s3 = new AWS.S3({
	endpoint: spaceEndPoint,
	accessKeyId: AWS_S3_ACCESS_KEY,
	secretAccessKey: AWS_S3_SECRET_ACCESSKEY,
});

const uploadImg = multer({
	storage: multerS3({
		s3: s3,
		bucket: AWS_S3_BUCKETNAME,
		acl: "public-read",
		metadata: (req, file, cb) => {
			console.log(req.body)
			console.log(file)
			cb(null, {
				fileName: file.fieldname,
				originalFile: file.originalname,
				uploadDatetime: new Date().toString(),
				mainTaskTitle: req.body.mainTaskTitle,
				subtasks: req.body.subtasks,
				// uploaded: req.query.uploader,
				// note: req.query.note
			});
		},
		key: function (requests, file, cb) {
			cb(null, new Date().getTime() + "_" + file.originalname);
		},
	}),
}).array("imageFile", 1);

const uploadImgPromise = (req, res) => {
	return new Promise((resolve, reject) => {
		uploadImg(req, res, (error) => {
			if (error) {
				console.log("error");
				reject(error);
			} else {
				console.log(req.file);
				resolve(req);
			}
		});
	});
};

const SQL_GET_TASKS =
	"SELECT * from subtasks right join maintasks on subtasks.maintask_id = maintasks.id";
const SQL_GET_ONE_TASK
	 = "SELECT maintask_id as maintaskId, maintask_img as img, subtasks.id as subtaskId, subtask_title as subtaskTitle, substask_status as subtaskStatus, maintask_title as mainTaskTitle from subtasks right join maintasks on subtasks.maintask_id = maintasks.id where maintask_id = ? "
const SQL_NEXT_SUBTASKID ="select MAX(id)+1 as nextSubtaskId from subtasks;"
const makeQuery = (sqlQuery, pool) => {
	return async (args) => {
		const conn = await pool.getConnection();
		try {
			let results = await conn.query(sqlQuery, args || []);
			return results[0];
		} catch (e) {
			console.log(e);
		} finally {
			conn.release();
		}
	};
};

function groupBy(key) {
	return function group(array) {
		return array.reduce((acc, obj) => {
			const property = obj[key];
			acc[property] = acc[property] || [];
			acc[property].push(obj);
			return acc;
		}, {});
	};
}


const getAllTasks = makeQuery(SQL_GET_TASKS, pool);
app.get("/alltasks", (req, res) => {
	getAllTasks()
		.then((resp) => {
			const groupByMainTaskId = groupBy("maintask_title");
			const groupedRes = groupByMainTaskId(resp);
			res.status(200).json(groupedRes);
		})
		.catch((e) => {
			res.status(500).json({ message: e });
			console.log(e);
		});
});

const getOneTask = makeQuery(SQL_GET_ONE_TASK, pool);
const getNextSubTaskId = makeQuery(SQL_NEXT_SUBTASKID, pool)
app.get("/nextsubtaskId", (req,res)=> {
	getNextSubTaskId()
		.then(result => {
			console.log(result)
			res.status(200).json(result[0])
		})
		.catch(err=> {
			console.log(err)
			res.status(500).json(err)
		})
})
app.get("/task/:id", (req, res) => {
	const mainTaskId = req.params["id"];
	getOneTask(mainTaskId)
		.then((result) => {
			console.log(result)
			res.status(200).json(result)
		})
		.catch((err) => console.log(err));
});

const SQL_INSERT_MAINTASK =
	"INSERT INTO maintasks (`maintask_title`, `maintask_img`) values(? , ?)";
const SQL_INSERT_SUBTASK =
	"INSERT INTO subtasks (`maintask_id`, `subtask_title`, `substask_status`) values ?";
const SQL_UPDATE_MAINTASK = "UPDATE maintasks set maintask_title = ? , maintask_img = ? where id =?"
const SQL_UPDATE_MAINTASK_WO_IMG = "UPDATE maintasks set maintask_title = ? where id =?"
const SQL_UPDATE_SUBTASK =
	"INSERT INTO subtasks(id, maintask_id ,subtask_title, substask_status) values ? on duplicate key update subtask_title=values(subtask_title), substask_status=values(substask_status)"

	app.post("/update/:mainTaskId", async(req,res)=> {
	const mainTaskId = parseInt(req.params['mainTaskId'])

	const conn = await pool.getConnection()
	try{
		const processedData = await uploadImgPromise(req,res)
		const mainTaskTitle = processedData.body.mainTaskTitle
		const subtasks = JSON.parse(processedData.body.subtasks)
		console.log(processedData)
		await conn.beginTransaction()
		if (processedData.files.length > 0){
			const imgLink = processedData.files[0].location
			await pool.query(SQL_UPDATE_MAINTASK, [mainTaskTitle, imgLink, mainTaskId])
		} else {
			await pool.query(SQL_UPDATE_MAINTASK_WO_IMG, [mainTaskTitle, mainTaskId])
		}
		
		const bulkySubTasksArr = [];
		subtasks.forEach((st) => {
			const values = Object.values(st);
			values.splice(1, 0, mainTaskId)
			console.log(values)
			bulkySubTasksArr.push(values);
		});
		console.log(bulkySubTasksArr)
		await pool.query(SQL_UPDATE_SUBTASK, [bulkySubTasksArr]);
		await conn.commit();
		res.status(200).json({
			message: "Main Task and subtasks are inserted",
		});
		
	
	} catch(e){
		conn.rollback()
		console.log(e)
	}finally{
		conn.release()
	}
})
const SQL_DELETE_MAINTASK = "delete from maintasks where id = ?;"
const deleteMainTask =makeQuery(SQL_DELETE_MAINTASK, pool)
app.delete("/delete/:mainTaskId", (req,res)=> {
	const mainTaskId = req.params['mainTaskId']
	deleteMainTask(mainTaskId)
		.then(result => {
			console.log(result)
			if (result.affectedRows > 0){
				res.status(200).json(result)
			} else {
				res.status(404).json({message: "Main task not found"})
			}
			
		})
		.catch(err => {
			res.status(500).json({message: "server error"})
			console.log(err)
		})
})

app.post("/insert", async (req, res) => {
	const conn = await pool.getConnection();

	try {
		const processedData = await uploadImgPromise(req, res);
		const imgLink = processedData.files[0].location;
		const mainTaskTitle = processedData.body.mainTaskTitle;
		const subtasks = JSON.parse(processedData.body.subtasks);
		await conn.beginTransaction();
		const result = await pool.query(SQL_INSERT_MAINTASK, [
			mainTaskTitle,
			imgLink,
		]);
		const bulkySubTasksArr = [];
		subtasks.forEach((st) => {
			const values = Object.values(st);
			values.unshift(result[0].insertId);
			bulkySubTasksArr.push(values);
		});
		await pool.query(SQL_INSERT_SUBTASK, [bulkySubTasksArr]);
		await conn.commit();
		res.status(200).json({
			message: "Main Task and subtasks are inserted",
		});
	} catch (e) {
		console.log(e);
		conn.rollback();
		res.status(500).json({ message: `server error: ${e}` });
	} finally {
		conn.release();
	}
});

const startApp = async (app, pool) => {
	const conn = await pool.getConnection();
	try {
		console.log("pinging database");
		await conn.ping();
		app.listen(PORT, () => {
			console.log(`${PORT} started`);
		});
	} catch (e) {
		console.log(e);
	} finally {
		conn.release();
	}
};

app.use((req, res) => {
	res.redirect("/");
});

startApp(app, pool);
