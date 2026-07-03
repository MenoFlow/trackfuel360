// APRÈS (ES module — COPIE-COLLE ÇA)
import multer from 'multer';
import path from 'path';

const uploadRoot = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(uploadRoot, 'pleins'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'bon_plein_' + uniqueSuffix + ext);
  }
});

const upload = multer({ storage });

export {
    upload
  };
  
