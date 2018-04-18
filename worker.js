const moment        = require('moment');
const cheerio       = require('cheerio');
const fetch         = require('node-fetch');
const SpotifyWebApi = require('spotify-web-api-node');

const now = moment();
const then = moment().subtract(1, 'week');

const USER_ID = 'tshamz';
const PLAYLIST_ID = '2aYZPU81RDkXbounr6WD6W';

const spotifyApi = new SpotifyWebApi({
  "clientId": process.env.SPOTIFY_CLIENT_ID,
  "clientSecret": process.env.SPOTIFY_CLIENT_SECRET,
  "redirectUri": process.env.SPOTIFY_REDIRECT_URI,
  'refreshToken' : process.env.SPOTIFY_REFRESH_TOKEN
});

const refreshAccessToken = async () => {
  const { body: { access_token: accessToken } } = await spotifyApi.refreshAccessToken();
  spotifyApi.setAccessToken(accessToken);
};

const fetchEpisodes = async () => {
  const html = await fetch('http://www.marketplace.org/latest-music').then(res => res.text());
  const $ = cheerio.load(html);
  return $('.episode-music').map((i, episode) => {
    const dateParts = $(episode).prev().text().split(':')[0].split('/');
    const songs = $(episode).children().map((i, track) => {
      const title = $(track).find('.episode-music-title').text().replace(/\[.*?\]/g, '').trim();
      const artist = $(track).find('.episode-music-artist').text().replace(' & ', ' ');
      return { title, artist };
    }).get();
    return { date: `${dateParts[2]}-${dateParts[0]}-${dateParts[1]}`, songs };
  }).get();
};

const getSongs = episodes => {
  return episodes
    .filter(episode => moment(episode.date).isBetween(then, now, 'day', []))
    .reduce((songs, episode) => [ ...songs, ...episode.songs ], []).sort();
};

const searchSong = (title, artist, query) => {
  return spotifyApi.searchTracks(query, { limit: 50 })
    .then(({ body: { tracks } }) => ({ title, artist, tracks }));
};

const searchSongs = songs => {
  const searches = songs.map(({ title, artist }) => searchSong(title, artist, `track:${title} artist:${artist}`));
  return Promise.all(searches);
};

const searchForEmptyResults = results => {
  const searches = results
    .filter(result => result.tracks.total === 0)
    .map(result => {
      const title = result.title.replace('(Album Version)', '').trim();
      searchSong(title, artist, `track:${title}`)
    });
  return Promise.all(searches);
  // const tracks = results.reduce((ids, { title, artist, tracks }) => {
  //   if (tracks.total === 0) {
  //     const query = `track:${title}`;
  //     return { promises: [ ...promises, searchSong(title, artist, query) ], ids: [ ...ids ] };
  //   } else {
  //     return { promises: [ ...promises ], ids: [ ...ids, tracks.items[0].uri ] };
  //   }
  // }, { promises: [], ids: [] });
};

const addSongs = async results => {
  const uris = results.reduce((ids, {tracks}) => (tracks.total > 0) ? [ ...ids, tracks.items[0].uri ] : [ ...ids ], []);
  return spotifyApi.replaceTracksInPlaylist(USER_ID, PLAYLIST_ID, uris);
};

const init = async () => {
  if (now.isoWeekday() === 3) {
    await refreshAccessToken();
    const episodes = await fetchEpisodes();
    const songs = getSongs(episodes);
    const results = await searchSongs(songs);
    // const moreResults = await searchForEmptyResults(results);
    // console.log(moreResults);
    addSongs(results);
  }
};

init();
