const bodyparser = require('body-parser');
const path = require('path');
const fs = require('fs');
const express = require('express');
const sharp = require('sharp');
const app = express();

app.get("/uploads/:image", (req,res) => {
    let ext = path.extname(req.params.image);

    if (!ext.match(/^\.(png|jpg)$/)) {
        return resizeBy.status(404).end();
    }

    let fd = fs.createReadStream(path.join(__dirname, "uploads", req.params.image));

    fd.on("error", (e) => {
        if (e.code == "ENOENT") {
            res.status(404);
            if (req.accepts('html')) {
                res.setHeader("Content-Type", "text/html");
                res.write("<strong>Error:</strong> image not found");
            }
            return res.end();
        }
        res.status(500).end();
    });

    res.setHeader("Content-Type", "image/" + ext.substr(1));

    fd.pipe(res);
})

app.head("/uploads/:image", (req, res) => {
    fs.access(
        path.join(__dirname, "uploads", req.params.image),
        fs.constants.R_OK,
        (err) => {
            res.status(err ? 404 : 200);
            res.end();
        }
    )
})

//function that wil handle uploadin an image
app.post("/uploads/:image", bodyparser.raw({
    limit: "10mb",
    type: "image/*"
}), (req, res) => {
    let image = req.params.image.toLowerCase();
    console.log(image);

    //check if correct path and image size
    if (!image.match(/\.(png|jpg)$/)) {
        return res.status(403).end();
    }

    /*
    create stream to the local file to save image and its size.
    enalbles microservice user to check if received all data
    */
    let len = req.body.length;
    let fd = fs.createWriteStream(path.join(__dirname, "uploads", image), {
        flags: "w+",
        encoding: "binary"
    });

    // write the image to the file
    fd.write(req.body);
    fd.end();

    fd.on ("close", () => {
        //after closing the stream, info about image saved is send to user
        res.send({ status: "ok", size: len });
    });
})

app.get(/\/thumbnail\.(jpg|png)/, (req, res, next) => {
  let format = (req.params[0] == "png" ? "png" : "jpeg");
  let width = +req.query.width || 300;
  let height = +req.query.height || 200;
  let border = +req.query.border || 5;
  let bgcolor = +req.query.bgcolor || "#fcfcfc";
  let fgcolor = +req.query.fgcolor || "#ddd";
  let textcolor = +req.query.textcolor || "#aaa";
  let textsize  = +req.query.textsize || 24;

  let image = sharp({
    create: {
      width: width,
      height: height,
      channels: 4,
      background: {r: 0, g: 0, b:0},
    }
  });

  const thumbnail = new Buffer(
    `<svg width="${width}" height="${height}">
        <rect
            x="0" y="0"
            width="${width}" height="${height}"
            fill="${fgcolor}" />
        <rect
            x="${border}" y="${border}"
            width="${width - border * 2}" height="${height - border * 2}"
            fill="${bgcolor}" />
        <line
            x1="${border * 2}" y1="${border * 2}"
            x2="${width - border * 2}" y2="${height - border * 2}"
            stroke-width="${border}" stroke="${fgcolor}" />
        <line
            x1="${width - border * 2}" y1="${border * 2}"
            x2="${border * 2}" y2="${height - border * 2}"
            stroke-width="${border}" stroke="${fgcolor}" />
        <rect
            x="${border}" y="${(height - textsize) / 2}"
            width="${width - border * 2}" height="${textsize}"
            fill="${bgcolor}" />
        <text
            x="${width / 2}" y="${height / 2}" dy="8"
            font-family="Helvetica" font-size="${textsize}"
            fill="${textcolor}" text-anchor="middle">${width} x ${height}</text>
    </svg>`
  );
  
  image.overlayWith(thumbnail)[format]().pipe(res);
});


app.listen(3000, () => {
  console.log("ready");
})


