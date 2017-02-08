// DEV ================================
const chalk = require('chalk');
const writeJson = require('write-json');
const fs = require('fs');
const readline = require('readline');
var sources = require('./data.js');

// PROD ===============================
const request = require('request');
const cheerio = require('cheerio');
const async = require('async');

var sources = addFeedPath(sources);
async.concatSeries(sources, function(source, callback){
    getHeadlines(source["url"], function(err, res) {
      if(err) {
        return console.log(chalk.red.bold(source["name"]), err);
      }
      console.log("Checked: ", chalk.green.bold(source.name));
      callback(null, res);
    });
}, function(err, results) {
  console.log(results);
  //console.log(chalk.blue("Total articles: " + results.length));
  writeJson.sync("test.json", results, function(err) {
    if(err) {
        return console.log(err);
    }
  });
});

function addFeedPath(sources) {
  var rssSources = [];
  for(var i = 0; i < sources.length; i++) {
     var s = sources[i];
     var rss = false;
     if ((s.url.search("rss") > 0) || (s.url.search("feed") > 0) || s.url.search("api") > 0) {
       var rss = true;
     }
     if(!rss) {
       s.url = s.url + "feed/";
     }
     rssSources.push(s);
  }
  return rssSources;
}


function getHeadlines(rss, cb) {
  request(rss, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var $ = cheerio.load(body, {
        xmlMode: true
      });
      var stories = $('item');
      var headlines = [];
      //console.log(body);
      stories.each(function(i, elem) {
        var headline = {
          'title': $('title', elem).text(),
          'href': $('link', elem).text(),
          'date': new Date($('pubDate', elem).text()),
          'img': $('enclosure', elem).attr('url')
          //'media': $('media\\:content', elem).prop("url"),
          //'content': $('description', elem).text()
        };
        if(!headline.img) {
          headline.img = null;
        }
        //var headline = [$('title', elem).text(), $('link', elem).text(), $('pubDate', elem).text()];
        // if((headline[1] === '') || (headline[1].indexOf('feed') > 0) || (headline[1].toLowerCase().indexOf('rss') > 0)) {
        //   headline[1] = $('guid', elem).text();
        // }
        if(headline.href === '' || (headline.href.toLowerCase().indexOf('feed') > 0) || (headline.href.toLowerCase().indexOf('rss') > 0)) {
          headline.href = $('guid', elem).text();
        }
        // console.log(headline);
        headlines.push(headline);
      });
      cb(null, headlines);
    }
  });
}

//========= UTILITY ==============
Array.prototype.remove = function(from, to) {
 var rest = this.slice((to || from) + 1 || this.length);
 this.length = from < 0 ? this.length + from : from;
 return this.push.apply(this, rest);
};
