
const mysql = require("mysql2/promise");

const pool = mysql.createPool({
	host: process.env.MYSQL_SERVER,
	port: process.env.MYSQL_SVR_PORT,
	user: process.env.MYSQL_USERNAME,
	password: process.env.MYSQL_PASSWORD,
	database: process.env.MYSQL_SCHEMA,
	connectionLimit: process.env.MYSQL_CON_LIMIT,
});
const sqlStatement = {
	SQL_GET_TASKS:"SELECT * from subtasks right join maintasks on subtasks.maintask_id = maintasks.id",
	SQL_GET_ONE_TASK:
		"SELECT maintask_id as maintaskId, maintask_img as img, subtasks.id as subtaskId, subtask_title as subtaskTitle, substask_status as subtaskStatus, maintask_title as mainTaskTitle from subtasks right join maintasks on subtasks.maintask_id = maintasks.id where maintask_id = ? ",
	SQL_NEXT_SUBTASKID :
		"select MAX(id)+1 as nextSubtaskId from subtasks;",
	 SQL_INSERT_MAINTASK :
		"INSERT INTO maintasks (`maintask_title`, `maintask_img`) values(? , ?)",
	 SQL_INSERT_SUBTASK :
		"INSERT INTO subtasks (`maintask_id`,`id`, `subtask_title`, `substask_status`) values ?",
	 SQL_UPDATE_MAINTASK :
		"UPDATE maintasks set maintask_title = ? , maintask_img = ? where id =?",
	 SQL_UPDATE_MAINTASK_WO_IMG :
		"UPDATE maintasks set maintask_title = ? where id =?",
	 SQL_UPDATE_SUBTASK :
		"INSERT INTO subtasks(id, maintask_id ,subtask_title, substask_status) values ? on duplicate key update subtask_title=values(subtask_title), substask_status=values(substask_status)",
	 SQL_DELETE_MAINTASK :"delete from maintasks where id = ?"

}

const makeQuery = (sqlQuery, pool) => {
		return async (args) => {
			console.log(args)
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

const sqlQuery = {
	 getAllTasks : makeQuery(sqlStatement.SQL_GET_TASKS, pool),
	 getOneTask : makeQuery(sqlStatement.SQL_GET_ONE_TASK, pool),
	 getNextSubTaskId : makeQuery(sqlStatement.SQL_NEXT_SUBTASKID, pool),
	 deleteMainTask : makeQuery(sqlStatement.SQL_DELETE_MAINTASK, pool)
}

/* 	const getAllTasks = makeQuery(SQL_GET_TASKS, pool);
	const getOneTask = makeQuery(SQL_GET_ONE_TASK, pool);
	const getNextSubTaskId = makeQuery(SQL_NEXT_SUBTASKID, pool);
	const deleteMainTask = makeQuery(SQL_DELETE_MAINTASK, pool);
;
 */

module.exports = {sqlStatement, sqlQuery, pool};


/* 	const SQL_GET_TASKS =
		"SELECT * from subtasks right join maintasks on subtasks.maintask_id = maintasks.id";
	const SQL_GET_ONE_TASK =
		"SELECT maintask_id as maintaskId, maintask_img as img, subtasks.id as subtaskId, subtask_title as subtaskTitle, substask_status as subtaskStatus, maintask_title as mainTaskTitle from subtasks right join maintasks on subtasks.maintask_id = maintasks.id where maintask_id = ? ";
	const SQL_NEXT_SUBTASKID =
		"select MAX(id)+1 as nextSubtaskId from subtasks;";
	const SQL_INSERT_MAINTASK =
		"INSERT INTO maintasks (`maintask_title`, `maintask_img`) values(? , ?)";
	const SQL_INSERT_SUBTASK =
		"INSERT INTO subtasks (`maintask_id`, `subtask_title`, `substask_status`) values ?";
	const SQL_UPDATE_MAINTASK =
		"UPDATE maintasks set maintask_title = ? , maintask_img = ? where id =?";
	const SQL_UPDATE_MAINTASK_WO_IMG =
		"UPDATE maintasks set maintask_title = ? where id =?";
	const SQL_UPDATE_SUBTASK =
		"INSERT INTO subtasks(id, maintask_id ,subtask_title, substask_status) values ? on duplicate key update subtask_title=values(subtask_title), substask_status=values(substask_status)";
	const SQL_DELETE_MAINTASK = "delete from maintasks where id = ?;"; */