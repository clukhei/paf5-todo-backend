require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const {pool} = require('./database')
const apiRouter = require('./api')
const app = express();

app.use(cors());
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
app.use(bodyParser.json({ limit: "50mb" }));
const PORT = process.env.APP_PORT;

app.use('/api', apiRouter)

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
