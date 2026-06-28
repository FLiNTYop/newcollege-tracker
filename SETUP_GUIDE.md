# College Tracker — Complete Setup Guide

This app logs into your Google account (read-only), scans Gmail and Google
Classroom every 15 minutes, and pushes a notification to your phone and
laptop whenever it finds something important — a new assignment, an
upcoming deadline, an exam notice, etc. It also has a dashboard listing
everything it's found, color-coded by urgency.

This guide assumes you've never deployed anything before. Follow it top to
bottom, in order. It'll take about 45–60 minutes the first time.

---

## Part 0 — What you'll end up with

- A GitHub repository containing this code
- A free Render.com web service running it 24/7
- The ntfy app installed on your phone, and ntfy desktop (or just the
  website) on your laptop
- A dashboard URL you can bookmark, e.g. `https://college-tracker-yourname.onrender.com`

You will NOT need to pay for anything. Every piece of this is on a free tier.

---

## Part 1 — Install Node.js on your computer (10 min)

We need this to test the app locally before deploying it.

1. Go to https://nodejs.org and download the **LTS** version for your OS.
2. Install it (click through the installer, defaults are fine).
3. Confirm it worked — open a terminal (Command Prompt / PowerShell on
   Windows, Terminal on Mac) and run:
   ```
   node --version
   npm --version
   ```
   You should see version numbers, e.g. `v20.11.0`. If you see
   "command not found," restart your terminal and try again.

---

## Part 2 — Get the code onto your computer

1. Create a free GitHub account at https://github.com if you don't have one.
2. Create a new repository (click the `+` top-right → New repository).
   Name it `college-tracker`. Keep it **Private** (it'll eventually hold
   no real secrets, but private is safer). Don't initialize with a README.
3. On your computer, create a folder and put all the project files in it
   (you should have: `server.js`, `db.js`, `scanner.js`, `classifier.js`,
   `googleAuth.js`, `notify.js`, `scheduler.js`, `package.json`,
   `.env.example`, `.gitignore`, a `views/` folder, and a `public/` folder).
4. Open a terminal in that folder and run:
   ```
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/college-tracker.git
   git push -u origin main
   ```
   (Replace `YOUR_USERNAME` with your actual GitHub username. GitHub may
   prompt you to log in.)

---

## Part 3 — Set up Google Cloud (the trickiest part — go slow)

This is what lets the app read your Gmail and Classroom.

### 3.1 Create a Google Cloud project

1. Go to https://console.cloud.google.com
2. Sign in with the **same Google account** you want this app to monitor
   (your college Workspace account).
3. Top-left, click the project dropdown → **New Project**.
4. Name it `College Tracker` → Create. Wait ~20 seconds, then select it
   from the dropdown so it's the active project.

### 3.2 Enable the two APIs you need

1. In the left sidebar (or search bar at top), go to **APIs & Services →
   Library**.
2. Search for **Gmail API** → click it → click **Enable**.
3. Search for **Google Classroom API** → click it → click **Enable**.

### 3.3 Configure the OAuth consent screen

1. Go to **APIs & Services → OAuth consent screen**.
2. User Type: choose **Internal** if you see that option (only appears
   for Workspace accounts, and is better since it skips Google's review
   entirely). If you only see "External," choose that.
3. Fill in app name (`College Tracker`), your email for support, and your
   email again as developer contact. Save and continue through the
   screens. Skip "Scopes" for now — we'll add them via code-requested
   scopes when logging in.
4. If you chose **External**, you'll land in "Testing" publishing status.
   That's fine. Scroll to **Test users** → **Add users** → add your own
   Google account email. This step is what lets you log in without
   Google's app review process.

### 3.4 Create OAuth credentials

1. Go to **APIs & Services → Credentials**.
2. Click **+ Create Credentials → OAuth client ID**.
3. Application type: **Web application**.
4. Name: `College Tracker Web`.
5. Under **Authorized redirect URIs**, click **+ Add URI** and add:
   ```
   http://localhost:3000/auth/callback
   ```
   (We'll add the production URL here too, after deploying — come back
   to this step later.)
6. Click **Create**. A popup shows your **Client ID** and **Client
   Secret** — copy both somewhere safe. You'll need them in Part 4.

---

## Part 4 — Configure and test locally

1. In your project folder, copy `.env.example` to a new file named `.env`.
2. Open `.env` and fill in:
   ```
   GOOGLE_CLIENT_ID=<paste from step 3.4>
   GOOGLE_CLIENT_SECRET=<paste from step 3.4>
   GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback
   SESSION_SECRET=<mash your keyboard for 30 characters, anything random>
   TRUSTED_EMAIL_DOMAINS=yourcollege.edu
   PORT=3000
   ```
   (Replace `yourcollege.edu` with your actual college email domain —
   this makes emails from college addresses score as "important" more
   easily. You can list more than one, comma-separated.)
3. In the terminal, inside the project folder, run:
   ```
   npm install
   ```
   This downloads all the libraries the app needs. Takes 1-2 minutes.
4. Start the app:
   ```
   npm start
   ```
   You should see:
   ```
   College Tracker running on http://localhost:3000
   [scheduler] Scheduled scans every 15 minutes.
   ```
5. Open `http://localhost:3000` in your browser. Click **Continue with
   Google**, log in, approve the permissions (it'll mention Gmail and
   Classroom — that's expected and correct).
6. You should land on your dashboard. Click **Scan now** to do a first
   manual scan and see if it picks anything up.

If something breaks here, the error message Google gives is usually
exact about what's wrong (e.g. "redirect_uri_mismatch" means the URL in
your `.env` doesn't exactly match what's registered in step 3.4 — check
for trailing slashes or http vs https).

---

## Part 5 — Set up phone & laptop notifications (ntfy)

1. On your **phone**: install the **ntfy** app (search "ntfy" on the App
   Store or Play Store — it's free, no account/signup required).
2. On your dashboard (`http://localhost:3000/dashboard`), click
   **Notifications**. You'll see a randomly generated topic name like
   `college-tracker-a1b2c3d4e5f6`. This is essentially a private channel
   name — keep it secret, since anyone who knows it could send you alerts.
3. In the ntfy app on your phone: tap **+** (subscribe to topic) → paste
   in that exact topic name → Subscribe.
4. On your **laptop**: easiest option is just opening
   `https://ntfy.sh/college-tracker-a1b2c3d4e5f6` (your actual topic) in a
   browser tab and allowing notifications when prompted — it'll push
   browser notifications as long as that tab stays open. For something
   more permanent, install the ntfy desktop app from https://ntfy.sh
   (available for Windows/Mac/Linux) and subscribe the same way.
5. Test it: in your terminal, run this (replace with your real topic):
   ```
   curl -d "Test notification" https://ntfy.sh/college-tracker-a1b2c3d4e5f6
   ```
   You should get a push on both phone and laptop within a few seconds.

---

## Part 6 — Deploy to Render (so it runs even when your laptop is off)

1. Go to https://render.com and sign up — choose **Sign up with GitHub**
   so it can access your repository directly.
2. Click **New +** → **Web Service**.
3. Select your `college-tracker` repository from the list (you may need
   to click "Configure account" to grant Render access to it first).
4. Fill in:
   - **Name**: `college-tracker` (or anything — this becomes part of
     your URL)
   - **Region**: closest to you
   - **Branch**: `main`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: **Free**
5. Scroll to **Environment Variables** → add each one from your `.env`
   file:
   ```
   GOOGLE_CLIENT_ID = <your value>
   GOOGLE_CLIENT_SECRET = <your value>
   GOOGLE_REDIRECT_URI = https://college-tracker.onrender.com/auth/callback
   SESSION_SECRET = <your value>
   TRUSTED_EMAIL_DOMAINS = yourcollege.edu
   ```
   **Important:** for `GOOGLE_REDIRECT_URI`, use the URL Render assigns
   you (shown at the top of the page once you name the service — usually
   `https://<name-you-chose>.onrender.com`), with `/auth/callback` on the
   end. It must be `https://`, not `http://`.
6. Click **Create Web Service**. Render will build and deploy — takes
   2-5 minutes. Watch the logs; you're looking for the same
   "College Tracker running on..." message.

### 6.1 Add the production URL back into Google Cloud

1. Go back to Google Cloud Console → **APIs & Services → Credentials**.
2. Click your OAuth client (`College Tracker Web`).
3. Under **Authorized redirect URIs**, click **+ Add URI** and add your
   real Render URL with `/auth/callback`, e.g.:
   ```
   https://college-tracker.onrender.com/auth/callback
   ```
4. Save. Keep the `localhost` one too — handy for future local testing.

### 6.2 Log in on the live site

Visit your Render URL, log in with Google again (this links your refresh
token to the live database, which starts empty — separate from your
local one). Set up your ntfy topic again on this dashboard. You're done.

### 6.3 Keep it from sleeping (free tier specifics)

Render's free tier puts services to sleep after 15 minutes of no
incoming web traffic, which would also pause the internal 15-minute
scan timer. Fix: use a free external pinger to hit your `/ping` endpoint
every 10 minutes, which counts as traffic and keeps it awake.

1. Go to https://cron-job.org (free, no credit card) and sign up.
2. Create a new cron job:
   - URL: `https://college-tracker.onrender.com/ping`
   - Schedule: every 10 minutes
3. Save. Render will now stay continuously awake, and your scans will
   run on schedule even with your laptop closed.

---

## Part 7 — Daily use

- Just leave it running. Every 15 minutes it checks for new mail and
  classroom posts and pushes alerts for anything it judges important.
- Visit your dashboard URL anytime to see everything it's tracked, sorted
  by due date, with overdue items highlighted in red and today's in
  amber.
- Click **Done** on a task to clear it from the list.
- If it misses something or flags too much noise, open `classifier.js`
  in your code and adjust the `TASK_KEYWORDS` or `NOISE_KEYWORDS` lists
  — no need to redeploy by hand, just `git push` and Render auto-deploys
  the update.

---

## Troubleshooting

**"No refresh token received" on login** — This happens if you've
already authorized this app before with the same Google account, and
Google decides not to re-issue a refresh token. Fix: go to
https://myaccount.google.com/permissions, find "College Tracker," remove
its access, then try logging in again.

**Notifications stopped after ~6 months** — Google's test-mode refresh
tokens expire if completely unused for 6 months. Since this app uses
yours every 15 minutes, this shouldn't happen in practice — but if you
ever pause the app for a long stretch, you may need to log in again
once you resume.

**Nothing shows up on the dashboard** — Click "Scan now" and check the
Render logs (Render dashboard → your service → Logs tab) for errors. The
most common cause is the classifier threshold being too strict for your
college's specific email phrasing — share a sample subject line with me
and I can help tune `classifier.js`.

**Want smarter detection later** — If keyword matching ever feels too
crude, this is built so swapping in the Claude API for classification
later is a small, contained change (just `classifier.js` and a couple
lines in `scanner.js`) — happy to add that when you're ready.
