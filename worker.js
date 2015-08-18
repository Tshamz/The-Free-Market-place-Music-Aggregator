var $ = require('cheerio');
var restler = require('restler');
var SpotifyWebApi = require('spotify-web-api-node');
var Promise = require('promise');

var spotifyApi = new SpotifyWebApi({
    "clientId": "e5cede67c620456b9ab00fea9e745ab9",
    "clientSecret": "508425b34378495182459128bf513d8c",
    "redirectUri": "http://dev.tylershambora.com/music"
});

var refreshToken = "AQCYCBF1gEk8VEDB_97lCBerjexbtfyH9MSFCVwyeDjgZF3dj3ntP4RIfR1TiqWNybGinQ0OEwnyqmpqt8JBv59DNuCtSpbQ50Q5I432uZGpRvnWkzT8kt8VClPYRE46MfI";

var playlistId = "1vnwLjkLHCuyMcrYu3GUyF";

function parseTracks(html) {
  var tracks = [];
  html('#songs_from_our_shows .view-content > .views-row').each(function(index, element) {
    var artist = $(element).find('.field-name-field-song-artist .field-item, .creator').text();
    var title = $(element).find('.field-name-field-song-title .field-item, .product-title').text();
    if (title.indexOf(' [Explicit]') > -1) {
      title = title.replace(' [Explicit]', '');
    }
    tracks.push({'artist': artist, 'title': title});
  });
  return tracks;
}

function getHtml() {
  restler.get('http://www.marketplace.org/latest-music')
    .on('success', function(data, response) {
      var html = $.load(data);
      var tracks = parseTracks(html);
      console.log(tracks);
      refreshAccessToken(tracks);
    });
}

function authorizeCode() {
  spotifyApi.authorizationCodeGrant(code)
    .then(function(data) {
      console.log('The token expires in ' + data.body['expires_in']);
      console.log('The access token is ' + data.body['access_token']);
      console.log('The refresh token is ' + data.body['refresh_token']);

      // Set the access token on the API object to use it in later calls
      spotifyApi.setAccessToken(data.body['access_token']);
      spotifyApi.setRefreshToken(data.body['refresh_token']);
    }, function(err) {
      console.log('Something went wrong!', err);
    });
}

function refreshAccessToken(tracks) {
  spotifyApi.setRefreshToken(refreshToken);
  spotifyApi.refreshAccessToken()
    .then(function(data) {
      spotifyApi.setAccessToken(data.body.access_token);
      getSpotifyUris(tracks);
    }, function(err) {
      console.log('Could not refresh access token', err);
    });
}

function getSpotifyUris(tracks) {
  var uris = [];
  var promises = [];
  tracks.forEach(function(track, index) {
    promises.push(spotifyApi.searchTracks(track.artist+' '+track.title).then(function(data) {
      uris.push(getUri(data));
    }));
  });
  Promise.all(promises).then(function() {
    spotifyApi.addTracksToPlaylist('tshamz', playlistId, uris);
  });
}


function getUri(data) {
  var results = data.body.tracks.items;
  resultsLoop:
  for (var i = 0; i < results.length; i++) {
    if (results[i].name.toLowerCase().indexOf(track.title.toLowerCase() > -1)) {
      for (var n = 0; n < results[i].artists.length; n++) {
        if (results[i].artists[n].name.toLowerCase().indexOf(track.artist.toLowerCase() > -1)) {
          return results[i].uri;
          // break resultsLoop;
        }
      }
    }
  }
}

getHtml();
//authorizeCode();
