// Config ===============================================

var Q            = require('q');
var request      = require('request');
var promise      = require('promise');
var cheerio      = require('cheerio');
var moment       = require('moment');

var SpotifyWebApi = require('spotify-web-api-node');

// var spotifyApi = new SpotifyWebApi({
//     "clientId": process.env.SPOTIFY_CLIENT_ID,
//     "clientSecret": process.env.SPOTIFY_CLIENT_SECRET,
//     "redirectUri": process.env.SPOTIFY_REDIRECT_URI,
//     'refreshToken' : process.env.SPOTIFY_REFRESH_TOKEN
// });

var spotifyApi = new SpotifyWebApi({
    "clientId": "e5cede67c620456b9ab00fea9e745ab9",
    "clientSecret": "508425b34378495182459128bf513d8c",
    "redirectUri": "http://dev.tylershambora.com/music",
    'refreshToken' : "AQCYCBF1gEk8VEDB_97lCBerjexbtfyH9MSFCVwyeDjgZF3dj3ntP4RIfR1TiqWNybGinQ0OEwnyqmpqt8JBv59DNuCtSpbQ50Q5I432uZGpRvnWkzT8kt8VClPYRE46MfI"
});

// var playlists = {
//   "new": {
//     "id": process.env.SPOTIFY_ALL_PLAYLIST_ID
//   },
//   "all": {
//     "id": process.env.SPOTIFY_ALL_PLAYLIST_ID
//   }
// };

var playlists = {
  "new": {
    "id": "1vnwLjkLHCuyMcrYu3GUyF"
  },
  "all": {
    "id": "00qHC2E0lX9Gcpyo2nobl8"
  }
};

// Helper Functions ===============================================

var refreshAccessToken = function () {
  var deferred = Q.defer();
  spotifyApi.refreshAccessToken().then(function(data) {
    spotifyApi.setAccessToken(data.body.access_token);
    deferred.resolve();
  }, function(err) {
    console.log('Could not refresh the token!', err.message);
    deferred.reject(new Error(err));
  });
  return deferred.promise;
};

var getSongs = function () {
  var deferred = Q.defer();
  request('http://www.marketplace.org/latest-music', function(error, response, body) {
    if (error) {
      deferred.reject(new Error(error));
    } else if (!error && response.statusCode == 200) {
      var $ = cheerio.load(body);
      var tracks = [];
      var date = $('.river--hed').first().find('a').text();
      var parseableDate = date.replace('Marketplace for ', '');

      $('.episode-music').first().children().each(function () {
        var title = $(this).find('.episode-music-group .episode-music-title').text().replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();
        var artist = $(this).find('.episode-music-group .episode-music-artist').text();
        tracks.push({'artist': artist, 'title': title});
      });
      deferred.resolve({"date": parseableDate, "tracks": tracks});
    }
  });
  return deferred.promise;
};

var addSongs = function(musicData) {
  spotifyApi.replaceTracksInPlaylist('tshamz', playlists.new.id, []).then(function () {
    musicData.tracks.forEach(function(track, index) {
      spotifyApi.searchTracks(track.title + ' ' + track.artist).then(function(data) {
        var results = data.body.tracks.items;
        for (var i = 0; i < results.length; i++) {
          var isArtist = results[i].artists.map(function (artist) {
            return artist.name.toLowerCase().replace(' ', '-');
          }).indexOf(track.artist.toLowerCase());
          var isTrack = results[i].name.toLowerCase().indexOf(track.title.toLowerCase());
          if (isArtist && isTrack) {
            spotifyApi.addTracksToPlaylist('tshamz', playlists.new.id, results[i].uri)
            break;
          }
        }
      });
    });
  });
};

// Init ===============================================

Q.fcall(refreshAccessToken).then(getSongs).then(addSongs);

