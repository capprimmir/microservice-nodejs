const express = require("express");
const sharp = require("sharp");
const bodyparser = require("body-parser");
const path = require("path");
const fs = require("fs");
const app = express();

app.param("image", (req, res, next, image) => {
  if (!image.match(/\.(png|jpg)$/i)) {
    return res.status(req.method == "POST" ? 403 : 404).end();
  }

  req.image = image;
  req.localpath = path.join(__dirname, "uploads", req.image);

  return next();
});

app.post("/uploads/:image", bodyparser.raw({
  limit: "10mb",
  type: "image/*"
}), (req, res) => {
  let fd = fs.createWriteStream(req.localpath, {
    flags: "w+",
    encoding: "binary"
  });

  fd.end(req.body);

  fd.on("close", () => {
    res.send({
      status: "ok",
      size: req.body.length
    });
  });
});

app.head("/uploads/:image", (req, res) => {
  fs.access(req.localpath, fs.constants.R_OK, (err) => {
    res.status(err ? 404 : 200).end();
  });
});

app.get("/uploads/:image", download_image);

app.listen(3000, () => {
  console.log("ready");
});

function download_image(req, res) {
  fs.access(req.localpath, fs.constants.R_OK, (err) => {
    if (err) return res.status(404).end();

    let image = sharp(req.localpath);
    let width = +req.query.width;
    let height = +req.query.height;
    let greyscale = (req.query.greyscale = ["y", "yes", "1", "on"]);

    if (width > 0 && height > 0) {
      image.ignoreAspectRatio();
    }

    if (width > 0 || height > 0) {
      image.resize(width || null, height || null);
    }

    if (greyscale) {
      image.greyscale();
    }

    res.setHeader("Content-Type", "image/" +
      path.extname(req.image).substr(1));

    image.pipe(res);
  });
}