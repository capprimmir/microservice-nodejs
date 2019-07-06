const bodyparser = require("body-parser");
const path = require("path");
const fs = require("fs");
const express = require("express");
const sharp = require("sharp");

const app = express();
const db = require("./db-connection");
const pool = db.pool;

db.createTable();
console.log("Table created");


//use route parameter to validate image name
app.param("image", (req, res, next, image) => {
    if (!image.match(/\.(png|jpg)$/i)) {
        return res.status(403).end();
    }

    pool.query("SELECT * FROM images WHERE name = $1", [image], (err, images) => {
        if (err || !images.length) {
            console.log(err);
        }

        req.image = images[0];

        return next()
    })
    // req.image = image;
    // req.localpath = path.join(__dirname, "uploads", req.image);

    // return next();
});

//function that wil handle uploadin an image
app.post(
    "/uploads/:name",
    bodyparser.raw({
        limit: "10mb",
        type: "image/*"
    }),
    (req, res) => {
        pool.query("INSERT INTO images (name, size, data) VALUES ($1, $2, $3) RETURNING id", [req.params.name, req.body.length, req.body], (error, result) => {
            if (error) {
                throw error;
            }
            res.status(201).send(`Image added with ID: ${result.body}`);
        })
        // let fd = fs.createWriteStream(req.localpath, {
        //     flags: "w+",
        //     encoding: "binary"
        // });

        // fd.end(req.body);

        // fd.on("close", () => {
        //     res.send({
        //         status: "ok",
        //         size: req.body.length
        //     });
        // });
    }
);

app.head("/uploads/:image", (req, res) => {
    // fs.access(req.localpath, fs.constants.R_OK, err => {
    //     res.status(err ? 404 : 200).end();
    // });
    return res.status(200).end();
});

app.get("/uploads/:image", (req, res) => {
    // fs.access(req.localpath, fs.constants.R_OK, err => {
    //     if (err) return res.status(404).end();

    let image = sharp(req.image.data);
    let width = +req.query.width;
    let height = +req.query.height;
    let blur = +req.query.blur;
    let sharpen = +req.query.sharpen;
    let greyscale = ["yes", "y", "true", "si"].includes(req.query.greyscale);
    let flop = ["yes", "y", "true", "si"].includes(req.query.flop);
    let flip = ["yes", "y", "true", "si"].includes(req.query.flip);

    //if receive width and height, tell sharp to ignore aspect ratio and resize
    if (width > 0 && height > 0) {
        image.ignoreAspectRatio();
    }

    // if width or height, resized is done with one parameter
    if (width > 0 || height > 0) {
        image.resize(width || null, height || null);
    }

    if (flip) image.flip();
    if (flop) image.flop();
    if (blur > 0) image.blur(blur);
    if (sharpen > 0) image.sharpen(sharpen);
    if (greyscale) image.greyscale();

    pool.query("UPDATE images SET date_used = $1, WHERE id = $2", [UTC_TIMESTAMP, req.image.id])

    res.setHeader("Content-Type", "image/" + path.extname(req.image.name).substr(1));

    image.pipe(res);
    // });
});

app.listen(3000, () => {
    console.log("ready");
});