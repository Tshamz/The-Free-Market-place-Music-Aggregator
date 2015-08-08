var $ = require('cheerio');
var request = require('request');


function getHTML(err, resp, html) {
  if (err) {
    return console.error(err);
  }

  var parsedHTML = $.load(html);

  parsedHTML('a').map(function(i, link) {
    var href = $(link).attr('href');
    if (!href.match('.png')) {
      return
    }
    imageURLs.push(domain + href)
  });
};

var domain = 'http://www.marketplace.org/latest-music';
request(domain, getHTML);
