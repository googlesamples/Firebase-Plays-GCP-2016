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

// Walkie-Talkie mode
// While the user is holding down the "Talk button," Speech is recorded.
// Once the User let's go, the audio is sent to the Cloud Speech API for processing
$(document).on('ready', function() {
  navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
  if (navigator.getUserMedia) {
    $('#nomic').hide();
    $('#start').on('mousedown touchstart', function() {
      setTimeout(function() {
        $('#start').addClass('btn-success');
        $('#btnText').text('Listening');
      }, 500);
      Fr.voice.record(false, function() {});
    });
    $('#start').on('mouseup touchend', function() {
      $('#start').removeClass('btn-success');
      $('#start').prop('disabled', true);
      $('#btnText').text('Processing');
      Fr.voice.export(function(f) {postToSpeechAPI('LINEAR16', f);}, 'base64');
      Fr.voice.stop();
    });
  }else {
    $('#start').hide();
    $('#sapicont').hide();
  }
});

// Manual Buttons
$('#dpad_up').click(function() {
  postToFirebase('up');
});
$('#dpad_left').click(function() {
  postToFirebase('left');
});
$('#dpad_right').click(function() {
  postToFirebase('right');
});
$('#dpad_down').click(function() {
  postToFirebase('down');
});

function postToFirebase(cmd) {
  userInfo.command = cmd;
  arrows.push(cmd);
  commands.push(userInfo);
}

// Send audio to Speech API for transcription
// Sends resulting commands to Firebase as well
function postToSpeechAPI(format, url) {
  var speechData = {
    config: {
      encoding: format,
      sampleRate: 44100,
      profanityFilter: true
    },
    audio: {
      content: url.substring(url.indexOf('base64,') + 7)
    }
  };
  $.ajax({
    url: 'https://speech.googleapis.com/v1beta1/speech:syncrecognize?key=' + config.apiKey,
    type: 'POST',
    data: JSON.stringify(speechData),
    contentType: 'application/json',
    dataType: 'json',
    success: function(data) {
      $('#start').prop('disabled', false);
      $('#btnText').text('Hold to speak');
      var text = '';
      if (!(data.results &&
            data.results[0] &&
            data.results[0].alternatives &&
            data.results[0].alternatives[0] &&
            data.results[0].alternatives[0].transcript)) {
        console.log('No Text Recieved from Speech API');
        return;
      }
      text = data.results[0].alternatives[0].transcript;
      // Display Text
      $('#sapiout').text(text);
      text = text.split(' ');
      for (var j = 0; j < text.length; j++) {
        // If we find a command, send it to the commnd list in Firebase
        var lowerCommand = text[j].toLowerCase();
        if (commandList.indexOf(lowerCommand) != -1) {
          postToFirebase(lowerCommand);
        }
      }
    }
  });
}

function displayArrows() {
  // Hide all the arrows
  for (var w = 0; w < commandList.length; w++) {
    document.getElementById(commandList[w]).style.display = 'none';
  }
  // If there are arrows in the queue, pop one off and display it
  if (arrows.length > 0) {
    var arrow = arrows.shift();
    document.getElementById(arrow).style.display = 'block';
    $('#command-list').prepend('<i class="fa fa-arrow-' + arrow + '"></i>');
  }
}

// Every 200ms, check the arrow queue for commands to display
setInterval(displayArrows, 200);

// Show commands from all users playing the game
commands.on('child_added', function(snap) {
  var arrow = snap.val().command;
  $('#all-command-list').prepend('<i class="fa fa-arrow-' + arrow + '"></i>');
});
