var promise = require('promise');
var restler = require('restler');
var cheerio = require('cheerio');
var moment  = require('moment');
var SpotifyWebApi = require('spotify-web-api-node');

var spotifyApi = new SpotifyWebApi({
    "clientId": "e5cede67c620456b9ab00fea9e745ab9",
    "clientSecret": "508425b34378495182459128bf513d8c",
    "redirectUri": "http://dev.tylershambora.com/music",
    'refreshToken' : "AQCYCBF1gEk8VEDB_97lCBerjexbtfyH9MSFCVwyeDjgZF3dj3ntP4RIfR1TiqWNybGinQ0OEwnyqmpqt8JBv59DNuCtSpbQ50Q5I432uZGpRvnWkzT8kt8VClPYRE46MfI"
});

var playlists = {
  "new": {
    "id": "1vnwLjkLHCuyMcrYu3GUyF"
  },
  "all": {
    "id": "00qHC2E0lX9Gcpyo2nobl8"
  }
};

function parseHtml(html) {
  var $ = cheerio.load(html);
  var tracks = [];
  var date = $('.grouped-title').first().text();
  $('.view-content').children().first().nextUntil('.grouped-title').each(function(index, element) {
    var artist = $(element).find('.field-name-field-song-artist .field-item, .creator').text();
    var title = $(element).find('.field-name-field-song-title .field-item, .product-title').text();
    if (title.indexOf(' [Explicit]') > -1) {
      title = title.replace(' [Explicit]', '');
    }
    tracks.push({'artist': artist, 'title': title});
  });
  return {"date": date, "tracks": tracks};
}

function init() {
  var uris = [];
  restler.get('http://www.marketplace.org/latest-music').on('success', function(data, response) {
    var musicData = parseHtml(data);
    // var newContent = checkUpdatedTime(parsedHtml.date);
    // if (!newContent) {
    //   return false;
    // }
    spotifyApi.refreshAccessToken().then(function(data) {
      return spotifyApi.setAccessToken(data.body.access_token);
    }).then(function() {
      var promises = [];
      musicData.tracks.forEach(function(track, index) {
        promises.push(spotifyApi.searchTracks(track.artist+ ' ' +track.title).then(function(data) {
          var results = data.body.tracks.items;
          loopOne:
          for (var i = 0; i < results.length; i++) {
            var handelizedTitleResult = results[i].name.toLowerCase();
            var handelizedTitleQuery = track.title.toLowerCase();
            if (handelizedTitleResult.indexOf(handelizedTitleQuery > -1)) {
              for (var n = 0; n < results[i].artists.length; n++) {
                var handelizedArtistResult = results[i].artists[n].name.toLowerCase();
                var handelizedArtistQuery = track.artist.toLowerCase();
                if (handelizedArtistResult.indexOf(handelizedArtistQuery > -1)) {
                  uris.push(results[i].uri);
                  break loopOne;
                }
              }
            }
          }
        }));
      });
      return promise.all(promises);
    }).then(function() {
      spotifyApi.addTracksToPlaylist('tshamz', playlists.all.id, uris);
      return spotifyApi.replaceTracksInPlaylist('tshamz', playlists.new.id, uris);
    }).catch(function(error) {
      console.error(error);
    });
  });
}

init();
