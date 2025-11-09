# Language Switching Issues

## Problem

Language switching doesn't update content on the landing page.

## Root Cause Analysis

### 1. Landing Page Architecture
The landing page (`app/landing/page.tsx`) loads content from CMS using `fetchCmsPage('landing')`:
- CMS content is loaded once on component mount
- CMS content contains hardcoded text (not translation keys)
- CMS content is NOT reactive to language changes

### 2. CMS Content Structure
```javascript
// CMS page sections contain hardcoded text
{
  type: 'hero',
  content: {
    title: "Smart Timing",  // Hardcoded, not a translation key
    subtitle: "Moderne tidsregistrering...",  // Hardcoded
    cta_primary_text: "Kom i gang"  // Hardcoded
  }
}
```

### 3. Translation System (Works Correctly)
The `useTranslations()` hook IS reactive:
- Translations load from `/api/cms/translations`
- Returns language-specific text based on `useLanguage()` context
- Updates when language changes (via `useMemo` dependency)

**Pages using translations work fine:**
- Setup page
- Main app
- Portal pages
- Admin pages

## Why Other Pages Work

Other pages use the translation system directly:
```typescript
const { t } = useTranslations();
return <Typography>{t('setup.title', 'Prosjektinformasjon')}</Typography>
```

When language changes → `t()` function updates → component re-renders with new text ✅

## Why Landing Page Doesn't Work

Landing page uses CMS content:
```typescript
<Typography>{section.content.title}</Typography>  // Static text from CMS
```

When language changes → CMS content doesn't reload → text stays the same ❌

## Solutions

### Solution 1: Make CMS Content Reactive (Quick Fix)
Reload CMS content when language changes:

```typescript
const { language } = useLanguage();

useEffect(() => {
  (async () => {
    setLoading(true);
    const data = await fetchCmsPage('landing');
    setPage(data);
    setLoading(false);
  })();
}, [language]); // Re-fetch when language changes
```

**Problem**: CMS content still contains hardcoded text, so this only helps if we create separate CMS pages per language (`landing-no`, `landing-en`)

### Solution 2: Use Translation Keys in CMS (Proper Fix)
Change CMS structure to use translation keys:

```javascript
// Instead of hardcoded text:
{
  title: "Smart Timing"
}

// Use translation keys:
{
  title_key: "landing.hero.title"
}

// Then in component:
<Typography>{t(section.content.title_key, section.content.title)}</Typography>
```

**Benefits**:
- Single CMS page for all languages
- Translations managed in translation system
- Language switching works immediately
- Content and translations separated

### Solution 3: Language-Specific CMS Pages
Create separate CMS pages per language:
- `landing-no` (Norwegian)
- `landing-en` (English)

Fetch based on current language:
```typescript
const { language } = useLanguage();
const pageId = `landing-${language}`;
await fetchCmsPage(pageId);
```

**Drawbacks**:
- Duplicate content management
- Admin must maintain 2+ pages
- More complex

### Solution 4: Public CMS Endpoint with Language Parameter
Create public endpoint that serves CMS content with translations applied:

```typescript
// Backend
app.get("/api/cms/pages/public/:pageId", async (req, res) => {
  const { pageId } = req.params;
  const { lang = 'no' } = req.query;
  
  const page = await pool.query('SELECT * FROM cms_pages WHERE page_id = $1', [pageId]);
  const translations = await pool.query('SELECT * FROM cms_translations');
  
  // Apply translations to page content based on lang
  const localizedPage = applyTranslations(page.rows[0], translations.rows, lang);
  
  res.json(localizedPage);
});

// Frontend
await fetch(`${API_BASE}/api/cms/pages/public/landing?lang=${language}`);
```

## Recommended Approach

**Short Term** (immediate fix):
1. Add public CMS endpoint without auth requirement
2. Make landing page reload when language changes

**Long Term** (proper solution):
1. Implement Solution 2: Use translation keys in CMS
2. Update CMS admin UI to support translation key selection
3. Migrate existing CMS content to use translation keys

## Implementation Steps

### Step 1: Add Public CMS Endpoint
```javascript
// server.js
app.get("/api/cms/pages/public/:pageId", async (req, res) => {
  try {
    const { pageId } = req.params;
    const result = await pool.query(
      'SELECT * FROM cms_pages WHERE page_id = $1 AND is_published = true',
      [pageId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Page not found' });
    }
    
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch page' });
  }
});
```

### Step 2: Update Landing Page to Reload
```typescript
// app/landing/page.tsx
import { useLanguage } from '../../contexts/LanguageContext';

export default function LandingPage() {
  const { language } = useLanguage();
  const [page, setPage] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await fetchCmsPage('landing');
        setPage(data);
      } catch (e: any) {
        // handle error
      } finally {
        setLoading(false);
      }
    })();
  }, [language]); // Add language dependency
  
  // ...
}
```

### Step 3: Use Translation Keys (Future)
Update CMS content structure and admin UI to support:
```json
{
  "type": "hero",
  "content": {
    "title_key": "landing.hero.title",
    "title_fallback": "Smart Timing",
    "subtitle_key": "landing.hero.subtitle",
    "cta_primary_key": "landing.cta.get_started"
  }
}
```

## Current Status

- ❌ Landing page doesn't respond to language changes
- ✅ All other pages work correctly with translation system
- ❌ CMS endpoint requires authentication (should be public)
- ❌ CMS content uses hardcoded text (should use translation keys)

## Next Steps

1. Add public CMS endpoint to backend
2. Add `language` dependency to landing page useEffect
3. (Optional) Create language-specific landing pages in CMS
4. (Future) Implement translation key system in CMS
