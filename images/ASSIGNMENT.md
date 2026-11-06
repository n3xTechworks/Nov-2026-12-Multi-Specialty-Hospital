# Northcrest image assignment (one photo = one page)

Every photo lives on exactly ONE page. Only exceptions: `user-1` (dashboard avatar on all six dashboard pages) and the
pairs `blog-N` + `author-N`, which appear on `blog.html` AND on their own `blog-post-N.html` only.
Sizes: scenes `<slot>-800.webp` / `-1600.webp` (3:2), heroes also `-2000.webp`; portraits `<slot>-160.webp` / `-800.webp` (square).

| Page | Photos |
|---|---|
| index.html (Home 1) | hero-home1, facility-or, facility-icu, facility-imaging, facility-lab, facility-pharmacy, facility-ward, testi-1, testi-2, testi-3, major-* (NEEDED, see below) |
| home-2.html | hero-home2, visit-1, visit-2, visit-3, testi-4, testi-5, testi-6 |
| about.html | hero-about, about-story, about-tech, about-community |
| departments.html | hero-departments, dept-cardiology, dept-neurology, dept-orthopaedics, dept-oncology, dept-paediatrics, dept-gynaecology, dept-gastro, dept-pulmonology, dept-nephrology, dept-ent, dept-dermatology, dept-emergency (all 12 via `{{dept_tiles all}}`) |
| department-cardiology.html | hero-cardiology (NEEDED) |
| department-neurology.html | hero-neurology (NEEDED) |
| department-orthopaedics.html | hero-orthopaedics (NEEDED) |
| department-oncology.html | hero-oncology (NEEDED) |
| department-paediatrics.html | hero-paediatrics (NEEDED) |
| department-gynaecology.html | hero-gynaecology (NEEDED) |
| doctors.html | hero-doctors, doc-1 ... doc-12 (via `{{doctor_cards all}}`) |
| blog.html | hero-blog, blog-1 ... blog-7, author-1 ... author-7 |
| blog-post-N.html | blog-N, author-N (N = 1..7) |
| contact.html | hero-contact |
| login.html | login-image |
| signup.html | signup-image |
| dashboard*.html | user-1 |
| help, privacy, terms, 404, forgot-password, reset-password | none (title band / auth card) |

## Decision: department photos
- `dept-*` (12) belong to **departments.html**, the full specialities grid (the brief asks for photos there).
- The 6 detail pages must not reuse them, so each gets its own hero photo `hero-<slug>`. The detail template has no other photo
  (overview + facts panel, icon cards). Until those files exist the build renders a plain navy hero (`.page-hero--plain`).
- Home 1 "major departments" shows 8 photo tiles; it must not reuse `dept-*`, so it uses `major-<slug>`. Until they exist the
  tiles render an icon panel instead of a photo (build fallback, nothing breaks).

## NEEDED (please source; real, sharp, relevant photos, no text overlays)
Detail-page heroes (3:2, 2000/1600/800, subject centred, room for centred white text over a navy overlay):
- hero-cardiology: cardiac team / cath lab / doctor reviewing heart scan (different from dept-cardiology)
- hero-neurology: doctors reviewing brain MRI on screens / neuro ward
- hero-orthopaedics: physiotherapy session with knee or joint / orthopaedic surgeon with X-ray
- hero-oncology: oncology day-care unit / nurse with patient during infusion
- hero-paediatrics: paediatrician with a young child and parent
- hero-gynaecology: obstetrician with expectant mother / maternity suite

Home 1 major-department tiles (3:2, 1600/800; distinct from every dept-* and hero-*):
- major-cardiology (heart / ECG / stethoscope on chest), major-neurology (brain model or scan), major-orthopaedics (bone X-ray / joint),
  major-oncology (cancer care consultation), major-paediatrics (child health check), major-gynaecology (pregnancy ultrasound / prenatal),
  major-gastroenterology (endoscopy / digestive consultation), major-emergency (emergency room / ambulance bay)

## People (genders already matched in data/doctors.json)
doc-1 M Arvind Rao, doc-2 F Meera Krishnan, doc-3 M Karthik Iyer, doc-4 F Ananya Desai, doc-5 M Rahul Menon, doc-6 F Shalini Kulkarni,
doc-7 M Farhan Sheikh, doc-8 F Amara Nwosu, doc-9 M Martin Ellis, doc-10 F Neha Kapoor, doc-11 M Imran Qureshi, doc-12 F Rosemary Thomas.
testi-1 older woman (Saraswati Gowda), testi-2 young man (Rohan Mehta), testi-3 woman ~30 (Divya Prakash) on Home 1;
testi-4 man ~50, testi-5 elderly woman, testi-6 older man with white beard on Home 2. user-1 = Priya Raman (patient, woman ~35).
