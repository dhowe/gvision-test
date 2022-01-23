let vision = require('@google-cloud/vision');
let sizeOf = require('image-size');
let express = require('express');
let multer = require('multer');

let app = express(), port = 3000;


let storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads')
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname)
  }
})
let upload = multer({ storage })

app.set("view engine", "ejs");
app.use(express.static(__dirname + '/public'));
app.use('/uploads', express.static('uploads'));

app.post('/upload-image', upload.single('profile-file'), async function (req, res, next) {
  // req.file is the `profile-file` file
  // req.body will hold the text fields, if there were any
  //console.log(JSON.stringify(req.file));
  let image = sizeOf(req.file.path);
  image.path = req.file.path;
  let data = await getAnnotations(req.file.path);
  let rects = data.map(a => ({
    name: a.name,
    score: a.score,
    offset: {
      x: Math.round(a.boundingPoly.normalizedVertices[0].x* image.width),
      y: Math.round(a.boundingPoly.normalizedVertices[0].y* image.height)
    },
    points: (a.boundingPoly.normalizedVertices.reduce(
      (acc, v) => acc + Math.round(v.x * image.width)
        + ',' + Math.round(v.y * image.height) + ' ', '')).trim()
  }));
  res.render('index', { rects, image });
});

// batch upload
app.post('/upload-images', upload.array('profile-files', 12), function (req, res, next) {
  console.log(JSON.stringify(req.file))
  let response = '<a href="/">Home</a><br>'
  response += "Files uploaded successfully.<br>"
  for (let i = 0; i < req.files.length; i++) {
    response += `<img src="${req.files[i].path}" /><br>`
  }
  return res.send(response)
})

async function getAnnotations(fname) {
  const client = new vision.ImageAnnotatorClient();
  const request = { image: { content: require('fs').readFileSync(fname) } };
  const [result] = await client.objectLocalization(request);
  return result.localizedObjectAnnotations;//m.labelAnnotations;
}

app.listen(port, () => console.log(`Server running on port http://localhost:${port}/`))