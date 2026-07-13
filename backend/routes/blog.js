const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const pool = require('../database/db');
const { authenticate, requireRole, logActivity } = require('../middleware/auth');
const { safePagination } = require('../lib/helpers');

const fmt = (r) => ({
  id: r.id,
  titleSq: r.title_sq,
  titleEn: r.title_en,
  slug: r.slug,
  excerptSq: r.excerpt_sq,
  excerptEn: r.excerpt_en,
  contentSq: r.content_sq,
  contentEn: r.content_en,
  coverImage: r.cover_image,
  tags: r.tags,
  status: r.status,
  publishedAt: r.published_at,
  authorId: r.author_id,
  metaTitleSq: r.meta_title_sq,
  metaTitleEn: r.meta_title_en,
  metaDescSq: r.meta_desc_sq,
  metaDescEn: r.meta_desc_en,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

// Public — published posts only
router.get('/', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const [rows] = await pool.query(
      'SELECT * FROM blog_posts WHERE status = ? ORDER BY published_at DESC LIMIT ? OFFSET ?',
      ['published', ...safePagination(limit, offset, 50)]
    );
    res.set('Cache-Control', 'public, max-age=60');
    res.json(rows.map(fmt));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gabim i brendshëm.' });
  }
});

// Public — single post by slug
router.get('/slug/:slug', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM blog_posts WHERE slug = ? AND status = ?',
      [req.params.slug, 'published']
    );
    if (!rows.length) return res.status(404).json({ error: 'Postimi nuk u gjet.' });
    res.set('Cache-Control', 'public, max-age=120');
    res.json(fmt(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gabim i brendshëm.' });
  }
});

// Admin — all posts (drafts + published)
router.get('/admin', authenticate, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;
    const [rows] = await pool.query('SELECT * FROM blog_posts ORDER BY created_at DESC LIMIT ? OFFSET ?',
      safePagination(limit, offset, 100));
    res.json(rows.map(fmt));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gabim i brendshëm.' });
  }
});

// Admin — single post by id
router.get('/admin/:id', authenticate, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM blog_posts WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Postimi nuk u gjet.' });
    res.json(fmt(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gabim i brendshëm.' });
  }
});

// Helper: generate slug from title
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[ëë]/g, 'e').replace(/[çç]/g, 'c').replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

// Admin — create post
router.post('/', authenticate, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { titleSq, titleEn, slug, excerptSq, excerptEn, contentSq, contentEn, coverImage, tags, status, metaTitleSq, metaTitleEn, metaDescSq, metaDescEn } = req.body;

    if (!titleSq || !contentSq) {
      return res.status(400).json({ error: 'Titulli dhe përmbajtja në shqip janë të detyrueshme.' });
    }

    const id = uuidv4();
    const postSlug = slug || slugify(titleSq);
    const publishedAt = status === 'published' ? new Date() : null;

    await pool.query(
      `INSERT INTO blog_posts (id, title_sq, title_en, slug, excerpt_sq, excerpt_en, content_sq, content_en, cover_image, tags, status, published_at, author_id, meta_title_sq, meta_title_en, meta_desc_sq, meta_desc_en)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, titleSq, titleEn || null, postSlug, excerptSq || null, excerptEn || null, contentSq, contentEn || null, coverImage || null, tags || null, status || 'draft', publishedAt, req.user.id, metaTitleSq || null, metaTitleEn || null, metaDescSq || null, metaDescEn || null]
    );

    await logActivity({ userId: req.user.id, action: 'CREATE', entity: 'BlogPost', entityId: id, description: `Postim blog u krijua: ${titleSq}`, ipAddress: req.ip });

    const [rows] = await pool.query('SELECT * FROM blog_posts WHERE id = ?', [id]);
    res.status(201).json(fmt(rows[0]));
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Slug-u tashmë ekziston. Zgjidhni një tjetër.' });
    }
    console.error(err);
    res.status(500).json({ error: 'Gabim i brendshëm.' });
  }
});

// Admin — update post
router.put('/:id', authenticate, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { titleSq, titleEn, slug, excerptSq, excerptEn, contentSq, contentEn, coverImage, tags, status, metaTitleSq, metaTitleEn, metaDescSq, metaDescEn } = req.body;

    // If changing to published and wasn't before, set published_at
    const [existing] = await pool.query('SELECT status, published_at FROM blog_posts WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ error: 'Postimi nuk u gjet.' });

    const publishedAt = status === 'published' && existing[0].status !== 'published'
      ? new Date()
      : existing[0].published_at;

    await pool.query(
      `UPDATE blog_posts SET title_sq=?, title_en=?, slug=?, excerpt_sq=?, excerpt_en=?, content_sq=?, content_en=?, cover_image=?, tags=?, status=?, published_at=?, meta_title_sq=?, meta_title_en=?, meta_desc_sq=?, meta_desc_en=? WHERE id=?`,
      [titleSq, titleEn || null, slug, excerptSq || null, excerptEn || null, contentSq, contentEn || null, coverImage || null, tags || null, status, publishedAt, metaTitleSq || null, metaTitleEn || null, metaDescSq || null, metaDescEn || null, req.params.id]
    );

    await logActivity({ userId: req.user.id, action: 'UPDATE', entity: 'BlogPost', entityId: req.params.id, description: `Postim blog u përditësua: ${titleSq}`, ipAddress: req.ip });

    const [rows] = await pool.query('SELECT * FROM blog_posts WHERE id = ?', [req.params.id]);
    res.json(fmt(rows[0]));
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Slug-u tashmë ekziston.' });
    }
    console.error(err);
    res.status(500).json({ error: 'Gabim i brendshëm.' });
  }
});

// Admin — delete post
router.delete('/:id', authenticate, requireRole('admin', 'manager'), async (req, res) => {
  try {
    await pool.query('DELETE FROM blog_posts WHERE id = ?', [req.params.id]);
    await logActivity({ userId: req.user.id, action: 'DELETE', entity: 'BlogPost', entityId: req.params.id, description: 'Postim blog u fshi', ipAddress: req.ip });
    res.json({ message: 'Postimi u fshi.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gabim i brendshëm.' });
  }
});

module.exports = router;
