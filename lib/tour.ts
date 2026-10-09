/**
 * PGA Tour benchmarks. These are not an official Tour-wide average: ESPN only lists the top 50 earners per season.
 * "top50" is the rounds-weighted average of those 50 players for the 2025 season (4,124 rounds), computed from
 * https://www.espn.com/golf/stats/player/_/season/2025. The wider field scores a little worse, so treat these as a high bar.
 */
export const TOUR = {
  season: 2025,
  sourceUrl: 'https://www.espn.com/golf/stats/player/_/season/2025',
  top50: { scoring: 69.89, fairways: 61.1, greens: 66.7, birdies: 3.98 },
  scheffler: { name: 'Scottie Scheffler', scoring: 68.0, fairways: 63.0, greens: 71.4, birdies: 4.7 },
};
