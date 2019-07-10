const bodyparser = require("body-parser");
const path = require("path");
const fs = require("fs");
const express = require("express");
const sharp = require("sharp");
const multer = require('multer');

const app = express();
const db = require("./queries");
const pool = db.pool;
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});
const upload = multer({
    storage: storage
});

app.db = db;

db.createTable();
console.log("Table created");


//use route parameter to validate image name
app.param("image", (req, res, next, image) => {
    if (!image.match(/\.(png|jpg)$/i)) {
        return res.status(403).end();
    }
    req.image = image;
    req.localpath = path.join(__dirname, "uploads", req.image);

    return next();

});

app.post('/uploads', upload.single('image'), (req, res) => {
    console.log(req.file);
    console.log('nombre', req.file.fieldname);
    pool.query(
        "INSERT INTO images (name, size, path, data) VALUES ($1, $2, $3, $4)",
        [req.body.name, req.file.size, req.file.path, req.body],
        err => {
            if (err) throw err;

            res.send({
                status: "ok",
                size: req.file.size
            });
        }
    );

})

app.head("/uploads/:image", (req, res) => {
    fs.access(req.localpath, fs.constants.R_OK, (err) => {
        res.status(err ? 404 : 200).end();
    });
});

//test server is running
app.get("/", (req, res) => {
    res.json({
        info: "Node.js, Express, and Postgres API runing from imagini"
    });
});

app.get("/uploads/:image", (req, res) => {
    fs.access(req.localpath, fs.constants.R_OK, (err) => {
        if (err) return res.status(404).end();

        let image = sharp(req.localpath);
        let width = +req.query.width;
        let height = +req.query.height;
        let blur = +req.query.blur;
        let sharpen = +req.query.sharpen;
        let greyscale = ["y", "yes", "true", "1", "on"].includes(req.query.greyscale);
        let flip = ["y", "yes", "true", "1", "on"].includes(req.query.flip);
        let flop = ["y", "yes", "true", "1", "on"].includes(req.query.flop);

        if (width > 0 && height > 0) {
            image.ignoreAspectRatio();
        }
        if (width > 0 || height > 0) {
            image.resize(width || null, height || null);
        }
        if (flip) image.flip();
        if (flop) image.flop();
        if (blur > 0) image.blur(blur);
        if (sharpen > 0) image.sharpen(sharpen);
        if (greyscale) image.greyscale();

        res.setHeader("Content-Type", "image/" + path.extname(req.image).substr(1));

        image.pipe(res);
    });
});

app.listen(3000, () => {
    console.log("ready");
});

module.exports = app;