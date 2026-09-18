import { ImageUrlSchema } from './common.js';

describe('ImageUrlSchema', () => {
  it.each(['https://cdn.lawfirm.mn/a.png', 'http://localhost:9000/law-firm-documents/a.jpg'])('accepts %s', (url) => {
    expect(ImageUrlSchema.safeParse(url).success).toBe(true);
  });

  // z.url() on its own accepts these, and a stored javascript:/data: URL becomes XSS the day it
  // lands in an anchor rather than an <img>.
  it.each(['javascript:alert(1)', 'data:text/html,<script>alert(1)</script>', 'file:///etc/passwd', 'not a url'])(
    'refuses %s',
    (url) => {
      expect(ImageUrlSchema.safeParse(url).success).toBe(false);
    },
  );
});
