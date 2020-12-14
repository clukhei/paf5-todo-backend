const multer = require("multer");
const multerS3 = require("multer-s3");

const AWS = require("aws-sdk");
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

module.exports = uploadImgPromise