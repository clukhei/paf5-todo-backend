const { ConnectContactLens } = require("aws-sdk");
const { Router } = require("express");
const express = require("express")
const router = express.Router()
const uploadImgPromise = require("./S3")
const {sqlQuery, pool, sqlStatement} = require("./database")

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

router.get("/alltasks", (req, res) => {
	sqlQuery.getAllTasks()
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

router.get("/nextsubtaskId", (req,res)=> {
	sqlQuery.getNextSubTaskId()
		.then(result => {
			console.log(result)
			res.status(200).json(result[0])
		})
		.catch(err=> {
			console.log(err)
			res.status(500).json(err)
		})
})

router.get("/task/:id", (req, res) => {
	const mainTaskId = req.params["id"];

	sqlQuery.getOneTask(mainTaskId)
		.then((result) => {
			console.log(result)
			res.status(200).json(result)
		})
		.catch((err) => console.log(err));
});

router.post("/update/:mainTaskId", async(req,res)=> {
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
			await conn.query(sqlStatement.SQL_UPDATE_MAINTASK, [mainTaskTitle, imgLink, mainTaskId])
		} else {
			await conn.query(sqlStatement.SQL_UPDATE_MAINTASK_WO_IMG, [mainTaskTitle, mainTaskId])
		}
		
		const bulkySubTasksArr = [];
		subtasks.forEach((st) => {
			const values = Object.values(st);
			values.splice(1, 0, mainTaskId)
			console.log(values)
			bulkySubTasksArr.push(values);
		});
		console.log(bulkySubTasksArr)
		await conn.query(sqlStatement.SQL_UPDATE_SUBTASK, [bulkySubTasksArr]);
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

router.delete("/delete/:mainTaskId", (req,res)=> {
	const mainTaskId = req.params['mainTaskId']
	sqlQuery.deleteMainTask(mainTaskId)
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


router.post("/insert", async (req, res) => {
	const conn = await pool.getConnection();

	try {
		const processedData = await uploadImgPromise(req, res);
		const imgLink = processedData.files.length > 0 ? processedData.files[0].location: null;
		const mainTaskTitle = processedData.body.mainTaskTitle;
		const subtasks = JSON.parse(processedData.body.subtasks);
		 await conn.beginTransaction();
		
		const result = await conn.query(sqlStatement.SQL_INSERT_MAINTASK, [
			mainTaskTitle,
			imgLink,
		]);
		const bulkySubTasksArr = [];
		subtasks.forEach((st) => {
			const values = Object.values(st);
			values.unshift(result[0].insertId);
			bulkySubTasksArr.push(values);
		});
		
		await conn.query(sqlStatement.SQL_INSERT_SUBTASK, [bulkySubTasksArr]);
	
		await conn.commit();
		res.status(200).json({
			message: "Main Task and subtasks are inserted",
		});
	} catch (e) {
		console.log(e);
		 conn.rollback().then(()=> console.log('rolled back'));
		res.status(500).json({ message: `server error: ${e}` });
	} finally {
		 conn.release();
	}
});


module.exports = router