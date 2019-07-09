const express = require("express");
const sharp = require("sharp");
const bodyparser = require("body-parser");
const path = require("path");
const fs = require("fs");
const app = express();
const settings = require("./settings");
const mysql = require("mysql");

const db = mysql.createConnection(settings.db)


db.connect((err) => {
  if (err) throw err;

  console.log("db: ready");

  db.query(
    `CREATE TABLE IF NOT EXISTS images
    (
        id INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
        date_created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        date_used TIMESTAMP NULL DEFAULT NULL,
        name VARCHAR(300) NOT NULL,
        size INT(11) UNSIGNED NOT NULL,
        data LONGBLOB NOT NULL,

        PRIMARY KEY (id),
        UNIQUE KEY name (name)
    )
    ENGINE=InnoDB DEFAULT CHARSET=utf8`
  );

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
    });
  });

  app.post("/uploads/:name", bodyparser.raw({
    limit: "100kb",
    type: "image/*"
  }), (req, res) => {
    console.log(req.params.name);
    db.query("INSERT INTO images SET ?", {
      name: req.params.name,
      size: req.body.length,
      data: req.body,
    }, (err) => {
      if (err) {
        return res.send({
          status: "error",
          code: err.code
        });
      }

      res.send({
        status: "ok",
        size: req.body.length
      });
    });
  });

  app.head("/uploads/:image", (req, res) => {
    return res.status(200).end();
  });

  app.get("/uploads/:image", download_image);

  app.listen(3000, () => {
    console.log("app: ready");
  });
});


function download_image(req, res) {
  fs.access(req.localpath, fs.constants.R_OK, (err) => {
    if (err) return res.status(404).end();

    let image = sharp(req.localpath);
    let width = +req.query.width;
    let height = +req.query.height;
    let blur = +req.query.blur;
    let sharpen = +req.query.sharpen;
    let greyscale = ["y", "yes", "1", "on"].includes(req.query.greyscale);
    let flip = ["y", "yes", "1", "on"].includes(req.query.flip);
    let flop = ["y", "yes", "1", "on"].includes(req.query.flop);

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

    res.setHeader("Content-Type", "image/" +
      path.extname(req.image).substr(1));

    image.pipe(res);
  });
}