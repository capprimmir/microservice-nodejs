const bodyparser = require("body-parser");
const path = require("path");
const fs = require("fs");
const express = require("express");
const sharp = require("sharp");

const app = express();
const db = require("./queries");
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
            return res.status(404).end();
        }
        req.image = images[0];
        return next();
    });
});

//function that wil handle uploadin an image
app.post(
    "/uploads/:name",
    bodyparser.raw({
        limit: "10mb",
        type: "image/*"
    }),
    (req, res) => {
        //let imageUrl = "./example.jpg";
        pool.query(
            "INSERT INTO images (name, size, data) VALUES ($1, $2, $3)",
            [req.params.name, req.body.length, req.body],
            err => {
                //if (err) return res.send(err);
                if (err) throw err;

                res.send({
                    status: "ok",
                    size: req.body.length
                });
            }
        );
    }
);

app.head("/uploads/:image", (req, res) => {
    return res.status(200).end();
});

app.get(
    "/uploads/:width(\\d+)x:height(\\d+)-:greyscale-:image",
    download_image
);
app.get("/uploads/:width(\\d+)x:height(\\d+)-:image", download_image);
app.get("/uploads/_x:heigh(\\d+)-:greyscale-:image", download_image);
app.get("/uploads/_x:heigh(\\d+)-:image", download_image);
app.get("/uploads/:width(\\d+)x_-greyscale-:image", download_image);
app.get("/uploads/:width(\\d+)x_-:image", download_image);
app.get("/uploads/:greyscale-:image", download_image);

/// test to see if server is running
app.get("/", (req, res) => {
    res.json({
        info: "Node.js, Express, and Postgres API runing from imagini"
    });
});

//request using postgres
app.get("/users", db.getUsers);

app.get("/uploads/:image", (req, res) => {
    // fs.access(req.localpath, fs.constants.R_OK, err => {
    //     if (err) return res.status(404).end();

    //initilaize image processing
    // let image = sharp(req.localpath);
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

    pool.query("UPDATE images SET date_used = $1, WHERE id = $2", [UTC_TIMESTAMP, req.image.id]);

    res.setHeader(
        "Content-Type",
        "image/" + path.extname(req.image.name).substr(1)
    );

    image.pipe(res);
    //});
});

app.listen(3000, () => {
    console.log("ready");
});

function download_image(req, res) {
    //check if an image exists
    fs.access(req.localpath, fs.constants.R_OK, err => {
        if (err) return res.status(404).end();

        //initilaize image processing
        let image = sharp(req.localpath);
        let width = +req.query.width;
        let height = +req.query.height;
        let greyscale = ["yes", "y", "true", "si"].includes(req.query.greyscale);

        //if receive width and height, tell sharp to ignore aspect ratio and resize
        if (width > 0 && height > 0) {
            image.ignoreAspectRatio();
        }

        // if width or height, resized is done with one parameter
        if (width > 0 || height > 0) {
            image.resize(width || null, height || null);
        }

        if (greyscale) {
            image.greyscale();
        }

        res.setHeader("Content-Type", "image/" + path.extname(req.image).substr(1));

        image.pipe(res);
    });
}