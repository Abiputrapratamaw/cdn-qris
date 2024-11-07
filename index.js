const express = require('express');
const multer = require('multer');
const path = require('path');
const ejs = require('ejs');
const fs = require('fs');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

const TELEGRAM_BOT_TOKEN = '8020136391:AAHsRn_jM4JskjhoUBFY5Hx-KV16TpaZCQU';
const TELEGRAM_CHAT_ID = '6118514130';

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));

const uploadDir = path.join('/tmp');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const generateRandomString = (length) => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const newFileName = `${generateRandomString(10)}${path.extname(file.originalname)}`;
    cb(null, newFileName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'audio/mpeg', 'video/mp4'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type'), false);
  }
};

const upload = multer({ storage, fileFilter });

app.get('/', (req, res) => {
  res.render('index');
});

app.post('/', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded or invalid file type' });
  }
  
  const fileUrl = `https://${req.get('host')}/file/${req.file.filename}`;
  const fileSize = req.file.size;
  const uploaderIP = req.ip;

  const message = `File uploaded successfully:
- URL: ${fileUrl}
- File: ${req.file.filename}
- Size: ${fileSize} bytes
- IP: ${uploaderIP}`;

  fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: message
    })
  })
  .then(response => response.json())
  .then(data => {
    if (data.ok) {
      console.log('Message sent to Telegram');
    } else {
      console.error('Error sending message to Telegram:', data.description);
    }
  })
  .catch(error => {
    console.error('Error sending message to Telegram:', error);
  });

  res.json({ message: 'File uploaded successfully', fileUrl: fileUrl });
});

app.get('/file/:filename', (req, res) => {
  const filePath = path.join(uploadDir, req.params.filename);
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      return res.status(404).json({ error: 'File not found' });
    }
    res.sendFile(filePath);
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
