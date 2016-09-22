/**
 * @license
 * 	Copyright 2016, Google, Inc.
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

var config = require('./config.js');
var gcloud = require('gcloud')({
  keyFilename: config.firebase.serviceAccountFilePath,
  projectId: config.projectId
});

var firebase = require('firebase');
var robot = require('robotjs');

// Configure BigQuery settings.
var table = gcloud.bigquery().dataset(config.dataset).table(config.table);

console.log('Connecting to ' + config.firebase.databaseUrl);
firebase.initializeApp({
  serviceAccount: config.firebase.serviceAccountFilePath,
  databaseURL: config.firebase.databaseUrl,
  authDomain: config.firebase.authDomain,
  projectId: config.firebase.projectId
});
var db = firebase.database();

var commandsRef = db.ref(config.firebase.commandsQueueNode);
var commandsArchiveRef = db.ref(config.firebase.commandsArchiveNode);
var validCommands = ['up', 'down', 'left', 'right'];

// Take a command, simulate the corresponding key press, and log to stderr and BigQuery.
commandsRef.on('child_added', function(snapshot) {
  var commandMetadata = snapshot.val();
  snapshot.ref.remove();
  // Update the timestamp with server time, rather than client timestamp.
  commandMetadata.timestamp = Math.round(Date.now() / 1000);
  var cmd = commandMetadata.command.toLowerCase();
  if (validCommands.indexOf(cmd) !== -1) {
    commandsArchiveRef.push(commandMetadata);
    console.log('Tapping: ' + cmd);
    robot.keyTap(cmd);

    // Save record of the command to BigQuery.
    table.insert(commandMetadata, function(err, insertErrors, apiResponse) {
      console.log('Inserting with timestamp: ' + commandMetadata.timestamp);
      if (err) {
        console.error('BigQuery API failed on insert: ' + err);
        console.error('API response: ' + JSON.stringify(apiResponse, null, '\t'));
      }
      if (insertErrors && insertErrors.length) {
        console.error('BigQuery insert failed: ' + insertErrors[0].errors[0].message);
      }
    });
  } else {
    console.warn('Invalid input: ' + cmd);
  }
});
