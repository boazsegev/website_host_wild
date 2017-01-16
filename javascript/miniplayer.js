/*
Copyright: Boaz Segev, 2017
License: MIT

Feel free to copy, use and enjoy according to the license provided.
*/
function MiniPlayer(obj_id) {
  this.vol_background = "#557";
  this.vol_color = "#99f";
  this.time_background = "#756";
  this.time_color = "#f9a";

  this.obj_id = obj_id;
  this.container = document.getElementById(obj_id);
  this.container.player = this;

  this.canvas = document.createElement('canvas');
  this.canvas.player = this;
  this.canvas.style.position = "absolute";
  this.canvas.style.top = "0";
  this.canvas.style.left = "0";
  this.canvas.style.width = "100%";
  this.canvas.style.height = "100%";
  this.container.appendChild(this.canvas);

  this.player = document.createElement('audio');
  this.player.owner = this;
  this.player.controls = false;
  this.player.style.position = "absolute";
  this.player.style.display = "hidden";
  this.player.style.top = "0";
  this.player.style.left = "0";
  this.player.style.width = "0px";
  this.player.style.height = "0px";
  this.container.appendChild(this.player);

  this.player.addEventListener("timeupdate",
                               function(e) { e.target.owner.draw_time(); });
  this.player.addEventListener("canplaythrough",
                               function(e) { e.target.play(); });

  if (window.javascript_player_objects == undefined) {
    window.javascript_player_objects = [];
  }
  window.javascript_player_objects.push(this);

  window.addEventListener("resize", function(e) {
    var len = window.javascript_player_objects.length;
    for (var i = 0; i < len; i++) {
      window.javascript_player_objects[i].redraw();
    }
  });

  this.container.onmousedown = function(e) { console.log(e); };
  this.container.onmouseup = function(e) { console.log(e); };
  this.redraw();
  this;
};

MiniPlayer.prototype.draw_volume = function() {
  var context = this.canvas.getContext('2d');
  var radius_limit = Math.min(this.canvas.height, this.canvas.width);
  // Draw background
  context.beginPath();
  context.strokeStyle = this.vol_background;
  context.lineWidth = radius_limit * 0.05;
  context.arc(this.canvas.width * 0.5, this.canvas.height * 0.5,
              radius_limit * 0.4, 0.75 * Math.PI,
              0.75 * Math.PI + (2 * Math.PI * 1));
  context.stroke();
  // Draw volume value
  if (this.player.volume > 1)
    this.player.volume = 1;
  if (this.player.volume < 0)
    this.player.volume = 0;
  context.beginPath();
  context.strokeStyle = this.vol_color;
  context.lineWidth = radius_limit * 0.04;
  context.arc(this.canvas.width * 0.5, this.canvas.height * 0.5,
              radius_limit * 0.4, 0.75 * Math.PI,
              0.75 * Math.PI + (2 * Math.PI * this.player.volume * 0.75));
  context.stroke();
};

MiniPlayer.prototype.draw_time = function() {
  var context = this.canvas.getContext('2d');
  var radius_limit = Math.min(this.canvas.height, this.canvas.width);
  var time = 0.0;
  if (this.player.seekable.length > 0 && this.player.played.length > 0)
    time = (1.0 * this.player.played.end(0)) /
           (this.player.seekable.end(0) - this.player.seekable.start(0));
  // Draw background
  context.beginPath();
  context.strokeStyle = this.time_background;
  context.lineWidth = radius_limit * 0.05;
  context.arc(this.canvas.width * 0.5, this.canvas.height * 0.5,
              radius_limit * 0.3, 0.75 * Math.PI,
              0.75 * Math.PI + (2 * Math.PI * 1));
  context.stroke();
  // Draw time value
  context.beginPath();
  context.strokeStyle = this.time_color;
  context.lineWidth = radius_limit * 0.04;
  context.arc(this.canvas.width * 0.5, this.canvas.height * 0.5,
              radius_limit * 0.3, 0.75 * Math.PI,
              0.75 * Math.PI + (2 * Math.PI * time * 0.75));
  context.stroke();
};

MiniPlayer.prototype.set_volume = function(volume) {
  if (volume > 1)
    volume = 1;
  if (volume < 0)
    volume = 0;
  this.player.volume = volume;
  this.draw_volume();
};

MiniPlayer.prototype.get_volume = function(volume) {
  return this.player.volume;
};

MiniPlayer.prototype.set_sources = function() {
  // clear existing sources.
  while (this.player.firstChild) {
    this.player.removeChild(this.player.firstChild);
  }
  // add requested sources.
  for (var i = 0; i < arguments.length; i++) {
    if (typeof(arguments[i]) == typeof('')) {
      var tmp = document.createElement('source')
      tmp.src = arguments[i];
      this.player.appendChild(tmp);
    }
  }
  this.player.load();
};

MiniPlayer.prototype.play = function() { return this.player.play(); };
MiniPlayer.prototype.pause = function() { return this.player.pause(); };

MiniPlayer.prototype.redraw = function() {
  this.canvas.width = this.canvas.offsetWidth;
  this.canvas.height = this.canvas.offsetHeight;

  this.draw_volume();
  this.draw_time();
};
