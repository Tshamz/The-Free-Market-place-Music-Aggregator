var $ = require('cheerio');
var restler = require('restler');

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
    });
}

getHtml();
