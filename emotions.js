'use strict';

const spreadsheetId = '1MZpVDhEvYZn6xYkQU-VTh9LX30-7kHHyaqNpwse446M';
const alchemyApiKey = '';

var google = require('googleapis');
var async = require('async');

var sheets;
var sheetsAuth;
var alchemyLanguage;

google.auth.getApplicationDefault(handleAuth);

function handleAuth(err, authClient) {
  if (err) {
    console.log('Authentication error: ', err);
  } else {
    if (authClient.createScopedRequired && authClient.createScopedRequired()) {
      authClient = authClient.createScoped(
          ['https://www.googleapis.com/auth/spreadsheets']);
    }

    sheets = google.sheets('v4');
    sheetsAuth = authClient

    var watson = require('watson-developer-cloud');
    alchemyLanguage = watson.alchemy_language({
      api_key: alchemyApiKey
    });

    makeSheetsRequest();
  }
}

function makeSheetsRequest() {
  sheets.spreadsheets.values.get({
    auth: sheetsAuth,
    spreadsheetId: spreadsheetId,
    range: 'Raw!A2:CC',  // Assume 3 columns and 1 header row.
  }, handleReadSheetResponse);
}

function handleReadSheetResponse(err, response) {
  if (err) {
    console.log('Sheets API error: ' + err);
    return;
  }

  console.log('Sheet: ' + JSON.stringify(response, null, 2));

  var rows = response.values;
  async.eachOfSeries(rows, function(row, row_id, callback) {
    handleRow(row_id, row[0], row[1], row[2]);
    setTimeout(function() {
      callback(null);
    }, 1000);
  });
}

function handleRow(row_id, title, href, date) {
  function handleWatson(err, response) {
    handleWatsonResponse(err, response, row_id, title, href, date);
  }

  var parameters = {
    url: href,
    showSourceText: 1,
    outputMode: 'json'
  };
  alchemyLanguage.emotion(parameters, handleWatson);
}

function handleWatsonResponse(err, response, row_id, title, href, date) {
  if (err) {
    console.log('Watson API error: ' + err);
    return;
  }

  console.log('Emotions: ' + JSON.stringify(response, null, 2));

  var text = response.text;
  var emotions = response.docEmotions;
  var anger = emotions.anger;
  var disgust = emotions.disgust;
  var fear = emotions.fear;
  var joy = emotions.joy;
  var sadness = emotions.sadness;

  console.log('%s %s %s %s', row_id, title, href, text, date)
  console.log('%s %s %s %s %s', anger, disgust, fear, joy, sadness);

  writeToSheet(row_id, title, href, date, text, anger, disgust, fear, joy, sadness);
}

function writeToSheet(row_id, title, href, date, text, anger, disgust, fear, joy, sadness) {
  var row_num = row_id + 2;  // Header row index is 1.
  var range = 'Annotated!A' + row_num + ':I' + row_num;
  // Expected column order in sheet "Annotated":
  var values = [[title, href, date, text, anger, disgust, fear, joy, sadness]];
  console.log('Range: ' + range);
  console.log('Values: ' + values);

  sheets.spreadsheets.values.update({
    auth: sheetsAuth,
    spreadsheetId: spreadsheetId,
    range: range,
    valueInputOption: 'USER_ENTERED',
    resource: {
      range: range,
      majorDimension: 'ROWS',
      values: values
    }
  }, handleWriteSheetResponse);
}

function handleWriteSheetResponse(err, response) {
  if (err) {
    console.log('Sheets API error: ' + err);
    return;
  }

  console.log('Sheet written.');
}
