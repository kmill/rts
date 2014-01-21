var _ = require("underscore");

var channel_max = 50;
var audio_channels = {};
window.audio_channels = audio_channels;

function ensure_channel(id) {
  var sound = document.getElementById(id);
  $(sound).on('canplay canplaythrough', function () {
    var channels = [];
    for (var i = 0; i < channel_max; i++) {
      channels[i] = {
        channel : new Audio(),
        duration : sound.duration*1000,
        finished : -1
      };
      channels[i].channel.src = sound.src;
      channels[i].channel.load();
    }
    audio_channels[id] = channels;
  });
}


function play_sound(id, volume) {
  if (volume === void 0) volume = 1;
  if (!_.has(audio_channels, id)) {
    return;
  }
  var channels = audio_channels[id];
  for (var i = 0; i < channels.length; i++) {
    var thistime = new Date();
    if (channels[i].finished < thistime.getTime()) {
      channels[i].finished = thistime.getTime() + channels[i].duration;
      channels[i].channel.volume = volume;
      //channels[i].channel.currentTime = 0;
      channels[i].channel.play();
      break;
    }
  }
}

exports.playSound = play_sound;
exports.ensureSound = ensure_channel;
