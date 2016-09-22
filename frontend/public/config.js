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

// Set up Firebase
var config = {
  apiKey: '',
  databaseURL: '',
  projectId: ''
};

// Firebase initialization
var app = firebase.initializeApp(config);
var auth = app.auth();
var db = firebase.database();
var commands = db.ref('commands');
var chat = db.ref('chat');
var userName = '';
var arrows = [];

// Commands
var commandList = ['up', 'down', 'left', 'right'];

// User Information
var userInfo = {
  country: '',
  state: '',
  city: '',
  browser: navigator.userAgent,
  device: WURFL.form_factor,
  os: navigator.platform,
  timestamp: ''
};

// Get GeoLocation
if ('geolocation' in navigator) {
  var options = {
    enableHighAccuracy: true,
    timeout: 5000,
    maximumAge: 0
  };

  function success(pos) {
    var crd = pos.coords;
    // Get Location Details from Google Maps
    fetch('https://maps.googleapis.com/maps/api/geocode/json?latlng=' + crd.latitude + ',' + crd.longitude)
    .then(function(response) {
      return response.json();
    }).then(function(response) {
      if (response.status != 'OK') {
        console.error('Response from Google Maps not OK - ' + response.status);
        return;
      }
      else if (response.status == 'OK') {
        var addrs = response.results[0].address_components;
        for (var i = 0; i < addrs.length; i++) {
          // Country
          if (addrs[i].types.indexOf('country') != -1) {
            userInfo.country = addrs[i].long_name;
          }
          // State
          if (addrs[i].types.indexOf('administrative_area_level_1') != -1) {
            userInfo.state = addrs[i].long_name;
          }
          // City
          if (addrs[i].types.indexOf('locality') != -1) {
            userInfo.city = addrs[i].long_name;
          }
        }
      }
    });
  }

  function error(err) {
    console.warn('GEO ERROR(' + err.code + '): ' + err.message);
  }

  navigator.geolocation.getCurrentPosition(success, error, options);
}
