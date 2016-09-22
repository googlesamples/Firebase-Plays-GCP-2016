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

// Firebase User Auth
function signIn(googleUser) {
  var credential = firebase.auth.GoogleAuthProvider.credential({
    'idToken' : googleUser.getAuthResponse().id_token
  });
  auth.signInWithCredential(credential).then(function(user) {
    console.log('Sign In Success', user);
    userName = user.displayName;
    document.getElementById('btn').className = 'btn btn-success btn-raised';
    document.getElementById('signOut').className = 'btn btn-default btn-raised';
    document.getElementById('signIn').className = 'g-signin2 hidden';
    document.getElementById('interm').textContent = 'Click "Start" and say some commands: Up, Down, Left, Right. Talk for chat!';
  }, function(error) {
    console.error('Sign In Error', error);
  });
}

function signOut() {
  var auth2 = gapi.auth2.getAuthInstance();
  auth2.signOut().then(function() {
    console.log('User signed out.');
    document.getElementById('btn').className = 'btn btn-success btn-raised hidden';
    document.getElementById('signOut').className = 'btn btn-default btn-raised hidden';
    document.getElementById('signIn').className = 'g-signin2';
    document.getElementById('interm').textContent = '';
  });
}

// Add Message to Chat Box
chat.on('child_added', function(snap) {
  var userName = document.createElement('b');
  var text = document.createElement('span');
  var msg = document.createElement('div');
  msg.className = 'well well-sm';
  msg.style.cursor = 'pointer';

  userName.textContent = snap.val().name + ': ';
  text.textContent = snap.val().text;

  msg.appendChild(userName);
  msg.appendChild(text);

  objDiv = document.getElementById('chat');
  objDiv.insertBefore(msg, objDiv.firstChild);
  objDiv.scrollTop = 0;

  // Flip between original text and translated text on click
  var original = false;
  msg.addEventListener('click', function() {
    if (original) {
      translate();
      text.style.color = 'black';
    } else {
      text.textContent = snap.val().text;
      text.style.color = 'red';
    }
    original = !original;
  });

  // Call the Translate API
  function translate() {
    fetch('https://www.googleapis.com/language/translate/v2?key=' +
             config.apiKey +
             '&q=' + snap.val().text +
             '&target=' + select_dialect.value.substring(0, 2),
    {
      method: 'get'
    }).then(function(response) {
      return response.json();
    }).then(function(response) {
      text.textContent = response.data.translations[0].translatedText;
    });
  };
  translate();

  // Re-translate when language is changed
  window.addEventListener('country_change', function() {
    translate();
  });

});

// Check if browser supports WebSpeech API
if (!('webkitSpeechRecognition' in window)) {
  alert("Your browser doesn't support the Web Speech API :(");
} else {
  var recognizing = false;
  var recognition = new webkitSpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = false;

  function startListening(event) {
    if (recognizing) {
      document.getElementById('select_language').disabled = false;
      document.getElementById('select_dialect').disabled = false;
      recognition.stop();
    }else {
      document.getElementById('select_language').disabled = true;
      document.getElementById('select_dialect').disabled = true;
      recognition.lang = select_dialect.value;
      recognition.start();
    }
  }

  // Create Stop Button once WebSpeech API starts
  recognition.onstart = function() {
    recognizing = true;
    document.getElementById('btnText').textContent = 'Stop';
    document.getElementById('btn').className = 'btn btn-danger btn-raised';
  };

  // Create Start Button once WebSpeech API ends
  recognition.onend = function() {
    recognizing = false;
    document.getElementById('btnText').textContent = 'Start';
    document.getElementById('btn').className = 'btn btn-success btn-raised';
  };

  // Display WebSpeech API errors
  recognition.onerror = function(event) {
    if (event.error == 'no-speech') {
      alert('No speech was detected');
    }
    else if (event.error == 'audio-capture') {
      alert('Could not detect a microphone on your device');
    }
    else if (event.error == 'not-allowed') {
      alert('Cannot access your microphone. Did you grant permissions?');
    }
    else {
      alert('Unknown Error with Speech Recognition - ' + event.error);
    }
  };

  // Handle WebSpeech API results
  recognition.onresult = function(event) {
    for (var i = event.resultIndex; i < event.results.length; ++i) {
      // Only parse text when we get the final results
      if (!(event.results[i].isFinal)) {return;}
      // Split text into individual words
      var text = event.results[i][0].transcript.split(' ');
      // Output to hold the comments
      var output = '';
      var other = false;
      for (var j = 0; j < text.length; j++) {
        // If we find a command, send it to the command list in Firebase
        var lowerCommand = text[j].toLowerCase();
        if (commandList.indexOf(lowerCommand) != -1) {
          userInfo.command = lowerCommand;
          arrows.push(lowerCommand);
          commands.push(userInfo);
        // Otherwise, add it to the chat
        } else if (text[j] != '') {
          other = true;
        }
        output += text[j] + ' ';
      }
      if (other) {
        // Push chat messages up once everything is compiled
        chat.push({name: userName, text: output});
      }
    }
  };

  // Flash directional arrows on the screen
  var arrows = [];
  function displayArrows() {
    for (var w = 0; w < commandList.length; w++) {
      document.getElementById(commandList[w]).style.display = 'none';
    }
    if (arrows.length > 0) {
      document.getElementById(arrows.shift()).style.display = 'block';
    }
  }
  setInterval(function() { displayArrows(); }, 200);

}

// Language Selector
var langs =
[['Afrikaans', 'af', ['af-ZA']],
 ['Bahasa Indonesia', 'id', ['id-ID']],
 ['Bahasa Melayu', 'ms', ['ms-MY']],
 ['Català', ['ca-ES']],
 ['Čeština', ['cs-CZ']],
 ['Deutsch', ['de-DE']],
 ['English', ['en-AU', 'Australia'],
                     ['en-CA', 'Canada'],
                     ['en-IN', 'India'],
                     ['en-NZ', 'New Zealand'],
                     ['en-ZA', 'South Africa'],
                     ['en-GB', 'United Kingdom'],
                     ['en-US', 'United States']],
 ['Español', ['es-AR', 'Argentina'],
                     ['es-BO', 'Bolivia'],
                     ['es-CL', 'Chile'],
                     ['es-CO', 'Colombia'],
                     ['es-CR', 'Costa Rica'],
                     ['es-EC', 'Ecuador'],
                     ['es-SV', 'El Salvador'],
                     ['es-ES', 'España'],
                     ['es-US', 'Estados Unidos'],
                     ['es-GT', 'Guatemala'],
                     ['es-HN', 'Honduras'],
                     ['es-MX', 'México'],
                     ['es-NI', 'Nicaragua'],
                     ['es-PA', 'Panamá'],
                     ['es-PY', 'Paraguay'],
                     ['es-PE', 'Perú'],
                     ['es-PR', 'Puerto Rico'],
                     ['es-DO', 'República Dominicana'],
                     ['es-UY', 'Uruguay'],
                     ['es-VE', 'Venezuela']],
 ['Euskara', ['eu-ES']],
 ['Français', ['fr-FR']],
 ['Galego', ['gl-ES']],
 ['Hrvatski', ['hr_HR']],
 ['IsiZulu', ['zu-ZA']],
 ['Íslenska', ['is-IS']],
 ['Italiano', ['it-IT', 'Italia'],
                     ['it-CH', 'Svizzera']],
 ['Magyar', ['hu-HU']],
 ['Nederlands', ['nl-NL']],
 ['Norsk bokmål', ['nb-NO']],
 ['Polski', ['pl-PL']],
 ['Português', ['pt-BR', 'Brasil'],
                     ['pt-PT', 'Portugal']],
 ['Română', ['ro-RO']],
 ['Slovenčina', ['sk-SK']],
 ['Suomi', ['fi-FI']],
 ['Svenska', ['sv-SE']],
 ['Türkçe', ['tr-TR']],
 ['български', ['bg-BG']],
 ['Pусский', ['ru-RU']],
 ['Српски', ['sr-RS']],
 ['한국어', ['ko-KR']],
 ['中文', ['cmn-Hans-CN', '普通话 (中国大陆)'],
                     ['cmn-Hans-HK', '普通话 (香港)'],
                     ['cmn-Hant-TW', '中文 (台灣)'],
                     ['yue-Hant-HK', '粵語 (香港)']],
 ['日本語', ['ja-JP']],
 ['Lingua latīna', ['la']],
 ['Hebrew', ['he-IL']]];

var country_change = new Event('country_change');

for (var i = 0; i < langs.length; i++) {
  select_language.options[i] = new Option(langs[i][0], i);
}
select_language.selectedIndex = 6;
updateCountry();
select_dialect.selectedIndex = 6;

function updateCountry() {
  for (var i = select_dialect.options.length - 1; i >= 0; i--) {
    select_dialect.remove(i);
  }
  var list = langs[select_language.selectedIndex];
  for (var i = 1; i < list.length; i++) {
    select_dialect.options.add(new Option(list[i][1], list[i][0]));
  }
  select_dialect.style.visibility = list[1].length == 1 ? 'hidden' : 'visible';
  window.dispatchEvent(country_change);
}
