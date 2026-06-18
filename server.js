const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { pool, initDatabase } = require('./db');

const app = express();
const PORT = process.env.PORT || 8080;

// Enable CORS and parsing of JSON and URL-encoded bodies
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve static frontend files from root directory
app.use(express.static(__dirname));
// Serve uploads folder as static files
app.use('/uploads', express.static(uploadsDir));

// Multer storage configuration for handling file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique name: timestamp + original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 20 * 1024 * 1024 } // Limit files to 20MB
});

// File upload endpoint (supports script files, logos, packaging images, fonts)
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  // Return the relative URL of the uploaded file
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ url: fileUrl, originalName: req.file.originalname });
});

// Create/Update spec sheet endpoint (upsert)
app.post('/api/spec', async (req, res) => {
  const d = req.body;
  
  if (!d.id || !d.client || !d.brand) {
    return res.status(400).json({ error: 'ID, Client, and Brand are required fields' });
  }

  // Pre-process arrays/objects to JSON strings for database compatibility
  const pipeline = d.pipeline ? JSON.stringify(d.pipeline) : null;
  const adaptAR = d.adaptAR ? JSON.stringify(d.adaptAR) : null;
  const downEditAR = d.downEditAR ? JSON.stringify(d.downEditAR) : null;
  const pubRights = d.pubRights ? JSON.stringify(d.pubRights) : null;

  const sql = `
    INSERT INTO spec_sheets (
      id, date, client, brand, project_title,
      spoc_cn, spoc_cp, spoc_ce,
      spoc_an, spoc_ap, spoc_ae,
      spoc_in, spoc_ip, spoc_ie,
      master_script, master_script_file,
      num_films, resolution, primary_lang, contemporary, contemp_spec,
      film_duration, num_down_edits, master_ar, logo_pos, brand_color,
      subtitle, subtitle_size, subtitle_font, subtitle_style,
      logo_file, pack_file, font_file, additional_notes,
      pipeline, adapt_ar, down_edit_ar, pub_rights, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      date = VALUES(date),
      client = VALUES(client),
      brand = VALUES(brand),
      project_title = VALUES(project_title),
      spoc_cn = VALUES(spoc_cn),
      spoc_cp = VALUES(spoc_cp),
      spoc_ce = VALUES(spoc_ce),
      spoc_an = VALUES(spoc_an),
      spoc_ap = VALUES(spoc_ap),
      spoc_ae = VALUES(spoc_ae),
      spoc_in = VALUES(spoc_in),
      spoc_ip = VALUES(spoc_ip),
      spoc_ie = VALUES(spoc_ie),
      master_script = VALUES(master_script),
      master_script_file = VALUES(master_script_file),
      num_films = VALUES(num_films),
      resolution = VALUES(resolution),
      primary_lang = VALUES(primary_lang),
      contemporary = VALUES(contemporary),
      contemp_spec = VALUES(contemp_spec),
      film_duration = VALUES(film_duration),
      num_down_edits = VALUES(num_down_edits),
      master_ar = VALUES(master_ar),
      logo_pos = VALUES(logo_pos),
      brand_color = VALUES(brand_color),
      subtitle = VALUES(subtitle),
      subtitle_size = VALUES(subtitle_size),
      subtitle_font = VALUES(subtitle_font),
      subtitle_style = VALUES(subtitle_style),
      logo_file = VALUES(logo_file),
      pack_file = VALUES(pack_file),
      font_file = VALUES(font_file),
      additional_notes = VALUES(additional_notes),
      pipeline = VALUES(pipeline),
      adapt_ar = VALUES(adapt_ar),
      down_edit_ar = VALUES(down_edit_ar),
      pub_rights = VALUES(pub_rights),
      status = IF(status = 'shared_with_client' AND VALUES(status) = 'draft', 'client_submitted', VALUES(status))
  `;

  const values = [
    d.id, d.date, d.client, d.brand, d.projectTitle || '',
    d.spocCN || null, d.spocCP || null, d.spocCE || null,
    d.spocAN || null, d.spocAP || null, d.spocAE || null,
    d.spocIN || null, d.spocIP || null, d.spocIE || null,
    d.masterScript || null, d.masterScriptFile || null,
    d.numFilms || null, d.resolution || null, d.primaryLang || null,
    d.contemporary ? 1 : 0, d.contempSpec || null,
    d.filmDuration ? parseInt(d.filmDuration) : null, d.numDownEdits || null,
    d.masterAR || null, d.logoPos || null, d.brandColor || null,
    d.subtitle ? 1 : 0, d.subtitleSize ? parseInt(d.subtitleSize) : null,
    d.subtitleFont || null, d.subtitleStyle || null,
    d.logoFile || null, d.packFile || null, d.fontFile || null,
    d.additionalNotes || null,
    pipeline, adaptAR, downEditAR, pubRights,
    d.status || 'draft'
  ];

  try {
    await pool.query(sql, values);
    res.json({ success: true, message: `Spec sheet successfully saved as ${d.status}` });
  } catch (error) {
    console.error('SQL Error:', error.message);
    res.status(500).json({ error: 'Failed to save spec sheet database record' });
  }
});

// Fetch all spec sheets endpoint
app.get('/api/specs', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM spec_sheets ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    console.error('SQL Error:', error);
    res.status(500).json({ error: 'Failed to fetch spec sheets' });
  }
});

// Fetch single spec sheet endpoint by ID
app.get('/api/spec/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM spec_sheets WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Spec sheet not found' });
    }
    const row = rows[0];
    
    // Parse JSON strings back to standard objects/arrays for frontend
    const parseField = (val) => {
      if (!val) return val;
      if (typeof val === 'string') {
        try {
          return JSON.parse(val);
        } catch (e) {
          return val;
        }
      }
      return val;
    };

    row.pipeline = parseField(row.pipeline);
    row.adapt_ar = parseField(row.adapt_ar);
    row.down_edit_ar = parseField(row.down_edit_ar);
    row.pub_rights = parseField(row.pub_rights);
    row.internal_snapshot = parseField(row.internal_snapshot);
    
    res.json(row);
  } catch (error) {
    console.error('SQL Error:', error);
    res.status(500).json({ error: 'Failed to fetch spec sheet' });
  }
});

// Unlock spec sheet endpoint
app.post('/api/spec/:id/unlock', async (req, res) => {
  try {
    await pool.query('UPDATE spec_sheets SET status = "draft" WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Spec sheet unlocked for editing' });
  } catch (error) {
    console.error('SQL Error:', error);
    res.status(500).json({ error: 'Failed to unlock spec sheet' });
  }
});

// Share with client endpoint
app.post('/api/spec/:id/share', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM spec_sheets WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Spec sheet not found' });
    }
    const snapshot = JSON.stringify(rows[0]);
    await pool.query('UPDATE spec_sheets SET status = "shared_with_client", internal_snapshot = ? WHERE id = ?', [snapshot, req.params.id]);
    res.json({ success: true, message: 'Spec sheet shared with client' });
  } catch (error) {
    console.error('SQL Error:', error);
    res.status(500).json({ error: 'Failed to share spec sheet' });
  }
});

// Finalize endpoint
app.post('/api/spec/:id/finalize', async (req, res) => {
  try {
    await pool.query('UPDATE spec_sheets SET status = "finalized" WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Spec sheet finalized' });
  } catch (error) {
    console.error('SQL Error:', error);
    res.status(500).json({ error: 'Failed to finalize spec sheet' });
  }
});

// Initialize database and start listening
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Production Spec Sheet Server running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Database connection failed. Exiting Server.', err);
  process.exit(1);
});
