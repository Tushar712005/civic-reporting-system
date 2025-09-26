// index.js
const express = require('express');
const multer = require('multer');
const app = express();
const port = 5001;

const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json());

app.post('/predict', upload.single('file'), (req, res) => {
  // Dummy response: always return Medium priority
  res.json({ priority: 'Medium' });
});

app.listen(port, () => {
  console.log(`AI service running at http://localhost:${port}`);
});
