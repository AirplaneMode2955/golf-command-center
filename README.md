# Golf Command Center

Drop in your 18Birdies account archive and see your whole golf game: scoring trend, handicap, courses, hole-by-hole averages, and fairway/green misses.

Your file is read in the browser and never uploaded. A trimmed copy (rounds and friend names only, no email, phone or birth year) is kept in your browser's local storage so you only load it once. "Clear data" removes it.

## Get your data

Sign in at https://18birdies.com/download-account-data/, request your data, and drop the `.json` file on the site.

## Run it

```bash
npm install
npm run dev   # http://localhost:3008
```

## Notes on the data

- The archive has no par per hole, so hole-by-hole numbers compare each hole to your own average at that course.
- 9-hole rounds are left out of hole-by-hole views because the file doesn't say which nine.
- Rounds with missing holes, mismatched totals or implausibly low scores are hidden by default. A checkbox brings them back.
- Putts and strokes gained are empty in the archive, so they aren't shown.

Stack: Next.js 16, React 19, TypeScript, plain CSS, no chart library.
