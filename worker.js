const moment        = require('moment');
const cheerio       = require('cheerio');
const fetch         = require('node-fetch');
const SpotifyWebApi = require('spotify-web-api-node');

const now = moment();
const then = moment().subtract(1, 'week');

const user = process.env.SPOTIFY_USER_ID;
const playlist = process.env.SPOTIFY_PLAYLIST_ID;

const spotifyApi = new SpotifyWebApi({
  "clientId": process.env.SPOTIFY_CLIENT_ID,
  "clientSecret": process.env.SPOTIFY_CLIENT_SECRET,
  "redirectUri": process.env.SPOTIFY_REDIRECT_URI,
  'refreshToken' : process.env.SPOTIFY_REFRESH_TOKEN
});

const refreshAccessToken = async () => {
  const refresh = await spotifyApi.refreshAccessToken();
  const { body: { access_token: accessToken } } = await spotifyApi.refreshAccessToken();
  spotifyApi.setAccessToken(accessToken);
};

const cleanUpMeta = meta => {
  return meta
    .replace(/\[.*?\]/g, '')
    .replace(' & ', ' ')
    .replace('(Album Version)', '')
    .replace('(Single Edit)', '')
    .replace('(Radio Edit)', '')
    .replace('- Single', '')
    .trim();
};

const fetchEpisodes = async () => {
  const html = await fetch('http://www.marketplace.org/latest-music').then(res => res.text());
  const $ = cheerio.load(html);
  return $('.episode-music').map((i, episode) => {
    const dateParts = $(episode).prev().text().split(':')[0].split('/');
    const tracks = $(episode).children().map((i, track) => {
      const title = cleanUpMeta($(track).find('.episode-music-title').text());
      const artist = cleanUpMeta($(track).find('.episode-music-artist').text());
      return { title, artist };
    }).get();
    return { date: `${dateParts[2]}-${dateParts[0]}-${dateParts[1]}`, tracks };
  }).get();
};

const getTracks = episodes => {
  return episodes
    .filter(episode => moment(episode.date).isBetween(then, now, 'day', []))
    .reduce((tracks, episode) => [ ...tracks, ...episode.tracks ], []).sort();
};

const searchTrack = (title, artist, query, deep) => {
  return spotifyApi.searchTracks(query, { limit: 50 })
    .then(({ body: { tracks } }) => ({ title, artist, tracks }));
};

const searchTracks = tracks => {
  const searches = tracks.map(({ title, artist }) => searchTrack(title, artist, `track:${title} artist:${artist}`, true));
  return Promise.all(searches);
};

const backupPlaylist = async () => {
  try {
    const backupPlaylistTitle = `[${then.format('MM-DD-YY')}]`;
    console.log(backupPlaylistTitle);
    const backupTracks = await spotifyApi.getPlaylistTracks(user, playlist);
    console.log(backupTracks);
    // const backupPlaylist = await spotifyApi.createPlaylist(user, backupPlaylistTitle);
  } catch (err) {
    console.log(err);
  }
};

const addTracks = async results => {
  const uris = results.reduce((ids, {tracks}) => (tracks.total > 0) ? [ ...ids, tracks.items[0].uri ] : [ ...ids ], []);
  return spotifyApi.replaceTracksInPlaylist(user, playlist, uris);
};

const init = async () => {
  if (now.isoWeekday() === 3) {
    await refreshAccessToken();
    const episodes = await fetchEpisodes();
    const tracks = getTracks(episodes);
    const results = await searchTracks(tracks);
    // await backupPlaylist();
    addTracks(results);
  }
};

init();
