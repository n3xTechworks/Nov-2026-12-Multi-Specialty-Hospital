# Northcrest Multispeciality Hospital: Website 12 (multi-specialty hospital with patient dashboard)

A static, frontend-only website (HTML, CSS, vanilla JavaScript) for a fictional 450-bed hospital in Bengaluru. There is no backend and no real data:
the patient portal, sign-in, bookings, reports and payments are UI mocks backed by `localStorage`. Forms are validated in the browser only.

## Pages
Public: `index.html` (Home 1), `home-2.html`, `about.html`, `departments.html`, six department pages (`department-cardiology`, `-neurology`, `-orthopaedics`,
`-oncology`, `-paediatrics`, `-gynaecology`), `doctors.html`, `blog.html`, `blog-post-1..7.html`, `contact.html` (appointment request `#appointment`, FAQ, map),
`help.html`, `privacy.html`, `terms.html`, `404.html`.
Auth (no header/footer): `login.html`, `signup.html`, `forgot-password.html`, `reset-password.html`.
Patient dashboard (app shell): `dashboard.html`, `dashboard-appointments.html`, `dashboard-reports.html`, `dashboard-prescriptions.html`, `dashboard-billing.html`, `dashboard-profile.html`.

Navigation (header, mobile menu and footer): Home v (Home 1, Home 2) · About · Departments · Doctors · Blog · Contact · Dashboard, plus Log in and the
"Book appointment" CTA (`contact.html#appointment`). A non-sticky emergency utility strip sits above the sticky navbar.

## Structure
```
src/partials/   head, header (utility strip + navbar), footer, logo, app-top, app-bottom     src/pages/  one file per page (front matter + body)
src/templates/  department.html (detail template)          scripts/build.py  -> writes every <page>.html + data/site-data.js
data/           departments.json (12 departments, 6 with detail content), doctors.json (12 doctors)
css/site.css    design system (tokens light/dark, header, hero search dock, cards, tabs, timing tables, FAQ, footer, navy app shell, auth)
css/pages/ js/pages/   page-specific CSS/JS       js/site.js  theme + RTL, menus, toast, modal, tabs, filter chips, search forms, line chart, motion
js/validation.js  form validator (browser + Node)      images/  WebP photos + ASSIGNMENT.md       COMPONENTS.md  class, macro and markup guide
tests/          validation unit tests + Playwright QA
```
Edit `src/` or `data/`, then run `python3 scripts/build.py` (Python 3, standard library only). The generated root `*.html` files open directly from disk (file://).
Theme and direction persist in `localStorage` (`northcrest-theme`, `northcrest-dir`) and are applied before first paint.
Fonts: Urbanist (headings) and Public Sans (body) from Google Fonts.

## Run
Open `index.html`, or run `python3 -m http.server 8000` in this folder. Demo login: `priya.raman@example.com` / `Northcrest123`.

## Tests
```bash
node --test tests/validation.test.js                 # unit tests: name, email, phone, password, date, required
node tests/qa.cjs "$(pwd)" [--quick] [--pages index.html,doctors.html] [--no-clicks]
bash tests/run-tests.sh                               # build + both
```
QA checks every page at 360 to 1440px in light/dark and LTR/RTL: nav order, utility strip, logo link, theme/RTL/CTA shown once with equal height and radius,
Log in, only the navbar sticky, no horizontal scroll, level card rows, contrast, images (load, alt, size, used on one page only; `user-1` and blog cover/author
pairs excepted), internal links and ids, equal inner-hero heights, Home 1 content (search panel, 4 quick actions, 6 facilities, 8 departments, 3 testimonials),
departments (12 tiles + category chips), doctors (12 cards + filters), blog cards and articles, auth pages without header/footer, dashboard sidebar and
buttons giving feedback, form validation (name, email lower-casing, phone).
**Playwright note:** `tests/qa.cjs` requires Playwright from an absolute path on the build machine. Elsewhere: `npm i -D playwright && npx playwright install chromium`
and change the `require(...)` to `require('playwright')`.

## Credits
Photos are free-licence Unsplash photos (see `images/`). The hospital, people, addresses and phone numbers are fictional (ambulance 108 is India's public number).
