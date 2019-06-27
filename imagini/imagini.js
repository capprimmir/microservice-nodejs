const settings = require('./settings');
const mysql = require('mysql');
const bodyparser = require('body-parser');
const path = require('path');
const fs = require('fs');
const express = require('express');
const sharp = require('sharp');

const app = express();
const db = mysql.createConnection(settings.db);

db.connect((err) => {
    if (err) throw err;
    console.log("db: ready");

    db.query(
        `CREATE TABLE IF NOT EXISTS images
        (
            id INT(11)UNSIGNED NOT NULL AUTO_INCREMENT,
            date_created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            date_used TIMESTAMP NULL DEFAULT NULL,
            name VARCHAR(300) NOT NULL,
            size INT(11) UNSIGNED NOT NULL,
            data LONGBLOB NOT NULL,

            PRIMARY KEY (id),
            UNIQUE KEY name (name)
        )
        ENGINE=InnoBD DEFAULT CHARSET=utf8`
    );

        //use route parameter to validate image name
    app.param("image", (req, res, next, image) => {
        if (!image.match(/\.(png|jpg)$/i)) {
            return res.status(403).end();
        }

        db.query("SELECT * FROM images WHERE name = ?", [image], (err, images) => {
            if (err || !images.length) {
                return res.status(404).end();
            }
            req.image = images[0];
            return next();
        })
    });

    //function that wil handle uploadin an image
    app.post("/uploads/:name", bodyparser.raw({
        limit: "10mb",
        type: "image/*"
    }), (req, res) => {
        db.query("INSERT INTO images SET ?", {
            name: req.params.name,
            size: req.body.length,
            data: req.body,
        }, (err) => {
            if (err) {
                return res.send({status: "error", code: err.code});
            }
            res.send({status: "ok", size: req.body.length});
        })
        });


    app.head("/uploads/:image", (req, res) => {
        return res.status(200).end();
    });

    app.get("/uploads/:width(\\d+)x:height(\\d+)-:greyscale-:image", download_image);
    app.get("/uploads/:width(\\d+)x:height(\\d+)-:image", download_image);
    app.get("/uploads/_x:heigh(\\d+)-:greyscale-:image",download_image);
    app.get("/uploads/_x:heigh(\\d+)-:image",download_image);
    app.get("/uploads/:width(\\d+)x_-greyscale-:image",download_image);
    app.get("/uploads/:width(\\d+)x_-:image",download_image);
    app.get("/uploads/:greyscale-:image", download_image);

    app.get("/uploads/:image", (req, res) => {
        fs.access(req.localpath, fs.constants.R_OK, (err) => {
            if (err) return res.status(404).end();

            //initilaize image processing
            let image = sharp(req.localpath);
            let width = +req.query.width;
            let height = +req.query.height;
            let blur = +req.query.blur;
            let sharpen = +req.query.sharpen;
            let greyscale = ["yes", "y", "true", "si",].includes(req.query.greyscale);
            let flop = ["yes", "y", "true", "si",].includes(req.query.flop);
            let flip = ["yes", "y", "true", "si",].includes(req.query.flip);
            

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

            res.setHeader("Content-Type", "image/" + path.extname(req.image).substr(1));

            image.pipe(res);

        });
    });


    app.listen(3000, () => {
    console.log("ready");
    });
});


