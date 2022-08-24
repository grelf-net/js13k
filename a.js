// Free Spirits, for js13kGames 2022
// by Graham Relf, grelf.net & grelf.itch.io
// 
// This program uses techniques for generating limitless terrain that I devised
// around 1980. The first published version (The Forest, 1983) was for TRS-80 
// having only 16kb of RAM. You can read full details of how it works in PDFs 
// downloadable from grelf.itch.io/forest and there you can play a bigger game
// in HTML5/JavaScript (2D canvas).
// 
// I only use the original style of JS, to run in all graphical browsers without
// the need for conversion tools. My only concession to modernity is one "const".
// 
// (I am in my 70s, so not needing competition prizes - give them to younger
// entrants, to encourage them.)

const A = // Just 1 global object
{ R:50,// Visible range
  ng:0,// Number of ghosts liberated
  dn:{},// Hash table for marking ghost sources as done (liberated)
  sc:0,// Score
  X:new Array (15),// Images, all created within this program
  nX:0,// Number of images created so far by mX()
  ts:[]// Target areas on screen for clicks
//ac: AudioContext is created on the first click - see oc()
};

function d (id) { return document.getElementById (id); }

function a ()// onload
{ var c = d ("c");// the canvas
  A.w = c.width = window.innerWidth - 20;
  A.w2 = A.w / 2;
  A.h = c.height = window.innerHeight - 120;
  A.h2 = A.h / 2;
  A.g = c.getContext ("2d");
  A.T = new T ();// Terrain generator
  A.I = new I ();// Viewer (eye)
  A.M = new M ();// Moon
  mX ();// Make images
  c.addEventListener ("click", oc);// onClick
  a2 ();
}

function a2 ()
{ if (A.nX < A.X.length)// All images made?
  { setTimeout (a2, 20);
    return;
  }
  sb ();// showButtons
  mk ();// makeKeyTable
  draw ();
  msg ("There are 10 ghosts within", "250 metres of here.", "", "Liberate them all", "before the Moon sets");
  d ("i").innerHTML = "Endless terrain, plain JS, 2D canvas";
// DEVELOPMENT ONLY:
//  countF4 ();
//  testGettingTenth();
//  testMoonset ();
}

function draw ()
{ A.ts = [];// No targets drawn yet
  var g = A.g, i = A.I;
  g.fillStyle = "#224";// Night sky
  g.fillRect (0, 0, A.w, A.h);
  if (A.M.set)
  { msg ("The Moon has set");
    return;
  }
  A.M.draw (g);// Draw the moon, if visible
  var x = i.x, xr = Math.round (x), y = i.y, yr = Math.round (y);
  var ix, iy, ah = [];// ah is ahead (visible)
  var xOdd = (xr & 1 === 1);// Will be drawing 2x2m tiles, centred on odd x and y (integers)
  for (ix = xr - A.R; ix <= xr + A.R; ix++, xOdd = !xOdd)// Scan the visible range around the viewer
  { var dx = ix - x, dx2 = dx * dx;
    var yOdd = (yr & 1 === 1);
    for (iy = yr - A.R; iy <= yr + A.R; iy++, yOdd = !yOdd)
    { var dy = iy - y;
      var dd = Math.sqrt (dx2 + dy * dy);// Distance from viewer
      var bDegs = Math.atan2 (dx, dy) * i.RD;
      var dbDegs = nm (bDegs - i.b);// Difference in bearing from viewer
      if (-90 < dbDegs && dbDegs < 90) ah.push ({x:ix, y:iy, d:dd, db:dbDegs, o:xOdd && yOdd});
  } }
  ah.sort (function (a, b) { return b.d - a.d; });// Descending distance
  for (var j = 0; j < ah.length; j++)// Furthest first
  { var a = ah [j];
    if (a.o)//x, y both odd, for tile centre
    { var x = a.x, y = a.y, fOK = true;
      if (x === -7 || y === -7)// Tile colours:
      { g.fillStyle = '#555'; // NS & EW roads approximately through middle may help navigation
        g.strokeStyle = '#444';
        fOK = false;// No features on roads
      }
      else
      { var d2 = x * x + y * y;// Mark the 250m boundary, to help the poor player:
        g.fillStyle = (62001 <= d2 && d2 <= 63001) ? '#554' : '#405040';// 249 and 251 squared
        g.strokeStyle = '#843';
      }
      var xm1 = x - 1, xp1 = x + 1, ym1 = y - 1, yp1 = y + 1;
      var s = [i.sXY (xm1, yp1), i.sXY (xp1, yp1),
               i.sXY (xp1, ym1), i.sXY (xm1, ym1)];// Corners of the tile
      g.beginPath ();// Ground tile
      g.moveTo (s [0].x, s [0].y);
      for (var k = 1; k < 4; k++) g.lineTo (s [k].x, s [k].y);
      g.fill ();
      g.stroke ();
      if (fOK)// Features not barred by road
      { var f = A.T.f (x, y);// Feature number determined by terrain generator
        if (f < 5 || f === -13 || f === 14)
        { f = Math.abs (f);
          df (g, f, A.X [f], x, y);// Images 0..4, 13, 14: headstones, detector, bone
        }
        else if (50 < f && f < 250) // Tree
        { k = ((x * x - y) * Math.PI) & 0x7;// 0..7 (8 trees available)
          df (g, f, A.X [5 + k], x, y);// Images 5..12
  } } } }
  if (A.GD) { A.GD.draw (); }// Ghost detector, if one has been found
  d ("s").innerHTML = "Score: " + A.sc;
  d ("i").innerHTML = i.toString ();// Position and bearing may help the player
}

function df (g, f, im, x, y)// Draw feature (headstone, tree, etc)
{ var sxy = A.I.sXY (x, y);// Get perspective screen position & distance
  var scale = 5 / sxy.d, ht = im.height * scale, wd = im.width * scale;// Scaled for distance
  var x0 = sxy.x - wd / 2, y0 = sxy.y - ht;// Top, left
  g.drawImage (im, x0, y0, wd, ht);
  if (f < 50) A.ts.push ({x:x0, y:y0, w:wd, h:ht, d:sxy.d, f:f, tx:x, ty:y});// Clickable target, no trees
}
/* Rectangular target areas pushed into array A.ts:
{ x: top left screen x (left to right)
  y: top left screen y (top to bottom)
  w: width
  h: height
  d: distance from viewer (to find nearest if they overlap at clicked position)
  f: feature number (absolute value, so GD has become +13 by this stage)
  tx: terrain x (odd, tile centre)
  ty: terrain y (odd, tile centre)
}
*/

///////////////////////////////////// Viewer:

function I ()// Me, the viewer. Singleton => methods written here rather than on prototype
{ this.HT = 3;// The viewer is tall! (Avoids some problems with closest tiles)
  this.x = 0;// west to east
  this.y = 0;// south to north
  this.z = A.T.h (0, 0) + this.HT;// Ground height + my height
  this.b = 0; // bearing, degrees clockwise from north
  this.DR = Math.PI / 180;// Degrees to radians
  this.RD = 1 / this.DR;// Radians to degrees
  
  this.toString = function ()// Overrides Object.toString() so keep the full name
  { return ' (' + this.x.toFixed (1) + ', ' + this.y.toFixed (1) + ', ' + 
      this.z.toFixed (1) + ') ' + this.b + '&deg;';// b is always integer
  };
  
  this.fwd = function (step)// forward
  { var bRad = this.b * this.DR;
    var dx = step * Math.sin (bRad), dy = step * Math.cos (bRad);
    this.x += dx;// Let's not bother about collisions (KISS principle)
    this.y += dy;
    this.z = A.T.h (this.x, this.y) + this.HT;
    draw ();
  };

  this.tn = function (degs)// turn
  { this.b = nm (this.b + degs);
    draw ();
  };
  
  this.sXY = function (x, y)// getScreenXY, perspective view
  { var dx = x - this.x, dy = y - this.y, d = Math.sqrt (dx * dx + dy * dy);// Distance from viewer
    var db = nm (Math.atan2 (dx, dy) * this.RD - this.b);// Difference in bearing from viewer
    var dbRad = db * this.DR, sinb = Math.sin (dbRad), cosb = Math.cos (dbRad);
    var zz = d * cosb;
    if (zz < 0.001) zz = 0.001;// (fudge)
    var fRatio = 425 / zz;// FF = 425, only used here
    var sx = fRatio * d * sinb + A.w2; // Relative to canvas centre
    var sy = A.h2 - fRatio * (A.T.h (x, y) - this.z);
    return {x:sx, y:sy, d:d, db:db};// Distance d for scaling, db is a bonus in case it's needed
  };
};

function nm (b)// normalise so -180 <= bearing <= +180 degrees
{ if (b < -180) return b + 360;
  if (b > 180) return b - 360;
  return b;
}
    
///////////////////////////////////// Terrain generator:
// toptal.com's minifier makes this only 648 bytes, comparable to my 1982 version in Z80 assembler: great!

function T () // Terrain: a singleton
{ this.P = [];// Profile
  this.A = [1, 15, 10, 5, 16];// Parameters for combining the
  this.B = [14, 3, 17, 13, 7];// profile in 5 "random" directions
  var D =// Data: profile (P) length 128 (could be any power of 2) - written compactly by using base 36
'01357adhlnonlhfeeefgjnqtvxyyzzyyxxwusqnkhgfffggijjihgeca85322334568abcdddeeeffgghijlnqtvuuutttssrqponljhgffeeddccba9876544321100';
  for (var i = 0; i <= 127; i++) this.P.push (parseInt (D [i], 36));

  this.M = {};// Mark positions of placed objects, hash table key x + ',' + y
  this.M ['185,185'] = -13;// -Image number for ghost detector (GD)
  this.M ['185,-185'] = -13;// f = +13 can occur in other ways in T.f(), so use -13 here
  this.M ['-185,-185'] = -13;// NB: x, y must be odd, tile centres
  this.M ['-185,185'] = -13;// All just outside the 250m radius but visible from there

  this.h = function (x, y)// Height
  { var h = 0, i;
    for (i = 0; i < 5; i++) h += this.P [((this.A [i] * x + this.B [i] * y) / 8) & 0x7f];
    return h / 16;
  };

  this.f = function (x, y)// Feature number
  { var m = this.M [x + ',' + y];
    if (m) return m;// If there is a mark for a placed object (such as GD)
    var f = 0, i;
    var xr = Math.round (x), yr = Math.round (y);
    for (i = 0; i < 5; i++) f += this.P [((this.B [i] * xr + this.A [i] * yr) / 8) & 0x7f];// A,B swapped
    f = Math.floor (f * xr * yr / 128) & 0xfff;
    return f;
  };
}

///////////////////////////////////// UI:

function fwd () { A.I.fwd (1); }
function left () { A.I.tn (-15); }
function right () { A.I.tn (15); }
function back () { A.I.tn (180); }

function sb ()// showButtons
{ var i, html = '';
  for (i = 0; i < B.length; i++) html += mb (B [i]);//mb = makeButton
  d ("b").innerHTML = html;// Buttons div
  for (i = 0; i < B.length; i++) d (B [i].i).addEventListener ('click', B [i].f);
}

function mb (b) // makeButton
{ return '<button class="B" id="' + b.i + '" title="Alternative key ' + b.a + '">' + 
    b.t + '<br/>' + b.k + '</button>';
}

const B = [ // buttons: {id, text, key, alternative key, function}
{ i:"L", t:"Left", k:"&#8592;", a:'a', f:left },
{ i:"F", t:"Forward", k:"&#8593;", a:'w', f:fwd },
{ i:"R", t:"Right", k:"&#8594;", a:'d', f:right },
{ i:"B", t:"Back", k:"&#8595;", a:'s', f:back }
]; // NB: id/class generated by JS is upper case, in the HTML only use lower case

const K = [ // keys: {function, keys}
{f:left, k:'Left|ArrowLeft|l|L'},
{f:fwd, k:'Up|ArrowUp|f|F'},
{f:right, k:'Right|ArrowRight|r|R'},
{f:back, k:'Down|ArrowDown|b|B'}
];

function mk ()// makeKeyTable
{ A.KT = {};
  for (var i = 0; i < K.length; i++)
  { var ki = K [i], ks = ki.k.split ('|');
    for (var j = 0; j < ks.length; j++)
    { A.KT [ks [j]] = ki.f;// Associates function with key
  } }
  window.addEventListener ('keydown', function (e) { if (A.KT [e.key]) A.KT [e.key] (); });
}

function oc (e)// onClick
{ var c = d ("c");// canvas
  var r = c.getBoundingClientRect ();
  var mouseX = (e.clientX - r.left) * c.width / r.width;
  var mouseY = (e.clientY - r.top) * c.height / r.height;
  var dd = 1000, nr;// Find closest potential target:
  for (var i = 0; i < A.ts.length; i++)
  { var ti = A.ts [i];// Target
    if (mouseX > ti.x && mouseX < ti.x + ti.w
     && mouseY > ti.y && mouseY < ti.y + ti.h
     && ti.d < dd)// Nearer headstone/detector/bone (trees are not targets)
    { dd = ti.d;
      nr = ti;// Nearest possible target so far
  } }
  if (!nr) return;// No target clicked
  var x = nr.x, y = nr.y, g = A.g;
  switch (nr.f)// Feature number
  {
  case 4:// Headstone with ghost
    var tx = nr.tx, ty = nr.ty;// Terrain x, y
    if (A.dn [tx + ',' + ty])
    { A.sc--;
      play (1);
      msg ("Already done", "", "Lose a point");
    }
    else
    { if (tx * tx + ty * ty > 62500)// 250 squared - no need for sqrt()
      { play (2);
        msg ("Sorry", "", "That's outside", "the 250m radius");// But no penalty
      }
      else// Liberate a ghost:
      { A.sc += 10;
        A.dn [tx + ',' + ty] = 1;// Mark as done
        A.ng++;// Another one done
        A.v = [x, y];// Vertices: 6 quadrilaterals with (x, y) in common. Needed in ag() so added to A
        for (i = 0; i < 18; i++)
        { A.v.push (x + random (0, nr.w));
          A.v.push (y + random (0, nr.h));
        }
        A.sz = nr.w; // Size needed in ag()
        play (4);
        ag ();// Animate ghost
      }
    }
    break;

  case 13:// Ghost detector
    if (A.GD) A.GD.dt ();// Detector previously found, so detect
    else A.GD = new GD ();// Found a detector (one of 4)
    break;

  case 14:// Bone
    play (3);
    msg ("Just a bone");
    break;
    
  default:// Other headstones
    play (0);
    g.fillStyle = '#700';
    g.fillRect (x, y, nr.w, nr.h);
    A.sc--;
    msg ("No ghost here", "", "Lose a point");
  }
}

function random (min, max) { return min + Math.random () * (max - min); }

function ag ()// Animate ghost
{ draw ();// The scene
  var g = A.g, v = A.v, x0 = v [0], y0 = v [1], j = 2;// j starts after the common x, y
  g.fillStyle = '#fff';
  g.globalAlpha = 0.3;// Transparent
  for (var i = 0; i < 6; i++)// Draw ghost, 6 quadrilaterals with 1 common vertex
  { g.beginPath ();
    g.moveTo (x0, y0);
    for (var k = 0; k < 3; k++, j += 2) { g.lineTo (v [j], v [j + 1]); }
    g.closePath ();
    g.fill ();
  }
  g.globalAlpha = 1;// Reset to opaque
  for (i = 0; i < v.length; i += 2) // Move randomly
  { v [i] += random (-A.sz, A.sz);// x spreads
    v [i + 1] -= random (0, A.sz / 2);// y always upwards
  }
  var os = false;// onScreen
  for (i = 1; i < v.length; i += 2)// y values only
  { if (v [i] > 0)// There is a y still on screen
    { os = true;
      break;
  } }
  if (os) setTimeout (ag, 40);// 25fps loop
  else
  { draw ();// Clear possible remnant
    if (A.ng === 10) msg ("Well done!", "", "You liberated all 10 ghosts");
  }
}

function msg ()// Display a message. May be multi-line, one string argument per line
{ var ar = arguments, n = ar.length;
  if (n > 0)
  { //var ROW_HT = 25, MARGIN = 10;
    var g = A.g;// Context
    g.font = "20px sans-serif";// ROW_HT - 5
    var i, tw, maxWd = 0;
    for (i = 0; i < n; i++)// Find maximum text line width
    { tw = g.measureText (ar [i]).width;
      if (tw > maxWd) maxWd = tw;
    }
    var xL = (A.w - maxWd) / 2 - 10;//MARGIN;
    var xR = (A.w + maxWd) / 2 + 10;//MARGIN;
    var txHt2 = 25 * n / 2 + 10;//ROW_HT, MARGIN;
    var yT = A.h2 - txHt2, yB = A.h2 + txHt2;
    g.fillStyle = "#fff";
    g.fillRect (xL, yT, xR - xL, yB - yT);
    var x = xL + 10, y = yT + 25;//ROW_HT;
    g.fillStyle = "#000";
    for (i = 0; i < n; i++) { g.fillText (ar [i], x, y); y += 25; }//ROW_HT; }
} }

///////////////////////////////////// Make images:

function mX ()
{ var cnvs = new Array (15), ims = new Array (15);
  for (var i = 0; i < 5; i++)// 5 headstones, various shapes:
  { var wd = 100, ht = 200, g = cc (i, cnvs, wd, ht);// Make off-screen canvas
    g.fillStyle = '#986';
    g.strokeStyle = '#000';
    switch (i)
    { case 2:
        dp (g, [0,ht, 0,20, wd / 2,0, wd,20, wd,ht]);
        break;
      case 3:
        dp (g, [0,ht, 0,30, 30,30, 30,0, wd - 30,0, wd - 30,30,  wd,30, wd,ht]);
        break;
      case 4:
        dp (g, [0,ht, 0,30, 30,0, wd - 30,0, wd,30, wd,ht]);
        break;
      default:
        g.fillRect (0, 0, wd, ht);
        g.strokeRect (0, 0, wd, ht);
    }
    g.fillStyle = '#000';
    g.font = '24px serif';
    var text = 'R. I. P.';
    g.fillText (text, (wd - g.measureText (text).width) / 2, ht / 2);
    pim (i, ims, cnvs);// Put image into A.X array
  }
  for (; i < 13; i++)// 8 trees:
  { wd = 250; ht = 500;
    g = cc (i, cnvs, wd, ht);
    g.fillStyle = g.strokeStyle = '#555';
    var w2 = wd / 2, h0 = random (ht * 0.4, ht * 0.7);
    dl (g, w2, ht, h0, 90, random (15, 25));// Trunk
    for (var j = 0; j < random (6, 12); j++)// Branches:
    { dl (g, w2, ht - random (h0 * 0.5, h0), random (wd * 0.2, wd * 0.8), random (10, 170), random (2, 10));            }
    pim (i, ims, cnvs);
  }
  // Ghost detector:
  i = 13;
  wd = 200; ht = 80;
  g = cc (i, cnvs, wd, ht);
  g.fillStyle = '#aaa';
  g.strokeStyle = '#00f';
  g.fillRect (0, 0, wd, ht);
  g.strokeRect (0, 0, wd, ht);
  g.font = '16px serif';
  g.fillStyle = '#00f';
  var text = 'GHOST DETECTOR';
  g.fillText (text, (wd - g.measureText (text).width) / 2, 30);
  text = 'Click to use';
  g.fillText (text, (wd - g.measureText (text).width) / 2, 55);
  pim (i, ims, cnvs);
  // Bone:
  i = 14;
  wd = 100; ht = 30;
  g = cc (i, cnvs, wd, ht);
  g.fillStyle = '#ccc';
  g.strokeStyle = '#000';
  dp (g, [10,0, 15,0, 25,7, 75,7, 85,0, 90,0, 100,5, 100,10, 97,15, 100,20,
    100,25, 90,30, 85,30, 75,23, 25,23, 15,30, 10,30, 0,25, 0,20, 3,15, 0,10, 0,5]);
  pim (i, ims, cnvs);
}

function cc (i, cnvs, wd, ht)// Create off-screen canvas & return context
{ cnvs [i] = document.createElement ('canvas');
  cnvs [i].width = wd;
  cnvs [i].height = ht;
  return cnvs [i].getContext ('2d');
}

function pim (i, ims, cnvs) // Convert canvas to image and put into A.X, the array of images
{ ims [i] = new Image ();
  ims [i].i = i;// In case i is not accessible in onload() but it probably is
  ims [i].onload = function () 
  { A.X [this.i] = this;
    A.nX++;// Enables a2() to proceed
  };
  ims [i].src = cnvs [i].toDataURL ('image/png');
}

function dp (g, v)// Draw path (context, vertices array)
{ g.beginPath ();
  g.moveTo (v [0], v [1]);
  for (var j = 2; j < v.length; j += 2)
  { g.lineTo (v [j], v [j + 1]); }
  g.closePath ();
  g.fill ();
  g.stroke ();
}

// Draw line from (x, y), length ln at angle a (degrees anticlock from Ox), line width w (px)
function dl (g, x, y, ln, a, w)
{ var ar = a * A.I.DR;
  g.lineWidth = w;
  g.beginPath ();
  g.moveTo (x, y);
  g.lineTo (x + ln * Math.cos (ar), y - ln * Math.sin (ar));
  g.stroke ();
  g.lineWidth = 1;
}

///////////////////////////////////// Ghost detector (image A.X [13]):

function GD ()// Singleton created as A.GD when player clicks image 13
{ A.T.M = {};// Clear the 4 images from the ground. Only need one

  this.draw = function ()
  { var im = A.X [13], w = im.width, h = im.height;
    A.g.drawImage (im, 0, 0, w, h);// Top left corner of screen
    A.ts.push ({x:0, y:0, w:w, h:h, d:0, f:13, tx:0, ty:0});// Possible target to click
  };

  this.dt = function ()// Detect
  { var x0 = Math.round (A.I.x), y0 = Math.round (A.I.y);// Viewer's position
    for (var x = x0 - 20; x <= x0 + 20; x++)
    { for (var y = y0 - 20; y <= y0 + 20; y++)
      { if ((x & 1) === 1 && (y & 1) === 1 // NB: x, y must be odd
          && 4 === A.T.f (x, y) && !(A.dn [x + ',' + y]))// Headstone 4, not already done (liberated)
        { msg ("There is a ghost", "within 20m");
          return;
    } } }
    msg ("No ghost within 20m");    
  };
  
  draw ();
  this.draw ();// First time, not yet set as A.GD
}

///////////////////////////////////// Moon:

function M () // Moon, singleton
{ this.b = 180;// Bearing, degrees
  this.y = 40;// Vertical screen position (from top)
  this.c = '#ddd';// fillStyle (221, 221, 221)
  
  this.draw = function (g)// context
  { g.fillStyle = this.c;
    var ai = A.I, db = nm (ai.b - this.b);// Viewer, difference in bearing
    if (-90 < db && db < 90)
    { var r = 10000, br = this.b * ai.DR;// r large - Moon is very distant
      var x = ai.x + r * Math.sin (br);
      var y = ai.y + r * Math.cos (br);
      var sxy = ai.sXY (x, y);// Get screen x of distant moon (don't need y)
      g.beginPath ();
      g.ellipse (sxy.x, this.y, 40, 40, 0, 0, 2 * Math.PI);// Circle
      g.fill ();
  } }

  this.update = function ()
  { this.b = nm (this.b + 1);
    this.y += 2;
    this.set = false;// Colour changes as the Moon sets:
    var y1 = A.h2 * 0.7, y2 = A.h2 * 1.2, dy = y2 - y1;// (221, 221, 221) above y1 -> (100, 60, 0) at y2
    if (this.y > y2)
    { this.set = true;
      clearInterval (this.t);
    }
    else if (this.y > y1)
    { var f = (this.y - y1) / dy, r = 221, g = r, b = r, dr = r - 100, dg = g - 60;
      this.c = mcc (Math.round (r - f * dr), Math.round (g - f * dg), Math.round ((1 - f) * b));
    }
  };

  this.t = setInterval (um, 60000);// Every minute
}

function um ()// Update moon
{ A.M.update (); }

function mcc (r, g, b)// makeCssColour, rgb integers 0..255
{ var rs = r.toString (16), gs = g.toString (16), bs = b.toString (16);
  if (r < 16) rs = '0' + rs;
  if (g < 16) gs = '0' + gs;
  if (b < 16) bs = '0' + bs;
  return '#' + rs + gs + bs; 
}

///////////////////////////////////// Audio:

// The above was complete without sounds but minified it was less than 9kb, so I decided to add sounds
// Sampled waves would be too much data so I have been reading on MDN about the Web Audio API
function play (sound)
{ if (!A.ac)
  { if (AudioContext)
    { A.ac = new AudioContext (); 
      if (!A.ac) return;// Cannot play sounds
    }
    else return;//Cannot play sounds
    setTimeout (cuckoo, random (60000, 300000));
  }
  var osc, gn, ds = A.ac.destination, t = A.ac.currentTime;
  switch (sound)
  { case 0:// Wrong headstone
      osc = new OscillatorNode (A.ac, {type:'triangle', frequency:50});
      break;
    case 1:// Already done
      osc = new OscillatorNode (A.ac, {type:'square', frequency:50});
      break;
    case 2:// Outside range
      osc = new OscillatorNode (A.ac, {type:'sine', frequency:50});
      break;
    case 3:// Bone
      osc = new OscillatorNode (A.ac, {type:'sine', frequency:400});
      break;
    case 4:// Liberating
      for (var j = 0; j < 9; j++)
      { osc = new OscillatorNode (A.ac, {type:'sine', frequency:random (800, 2200)});
        gn = new GainNode (A.ac, {gain:0.005});// Softly
        osc.connect (gn);
        gn.connect (ds);
        var k = j / 2;
        osc.start (t + k);
        osc.stop (t + k + 2);
      }
      return;// Skip the common code below
    case 5:// Cuckoo
      osc = new OscillatorNode (A.ac, {type:'sine', frequency:622.25});//Eb
      gn = new GainNode (A.ac, {gain:0.005});
      osc.connect (gn);
      gn.connect (ds);
      osc.start ();
      osc.stop (t + 0.5);
      osc = new OscillatorNode (A.ac, {type:'sine', frequency:466.16});//Bb
      osc.connect (gn);
      osc.start (t + 0.5);
      osc.stop (t + 1);
      return;
  }
  osc.connect (ds);
  osc.start ();
  osc.stop (t + 0.2);
}

function cuckoo ()
{ play (5);
  setTimeout (cuckoo, random (60000, 300000));
}

///////////////////////////////////// FOR DEVELOPMENT ONLY (COMMENT OUT TO MINIFY):
/*
function countF4 () // r = 250 -> n = 10
{ var n = 0, t = A.T, r = 250, r2 = r * r;
  var posn = [];
  for (var x = -r; x <= r; x++)
  { var x2 = x * x, xOdd = (x & 1) === 1;
    for (var y = -r; y < r; y++)
    { var yOdd = (y & 1) === 1;
      if (xOdd && yOdd)
      { if (x2 + y * y <= r2 && t.f (x, y) === 4)
        { n++;
          posn.push ('(' + x + ', ' + y + ')');
  } } } }
  console.log (n, posn);
}
// (-135, -185), (-81, 61), (-61, 207), (-11, -1), (1, 9), (7, 1), (35, -129), (79, -65), (105, 185), (169, -53)
*/
/*
function testGettingTenth ()
{ mad (-135, -185); 
  mad (-81, 61); 
  mad (-61, 207); 
  mad (-11, -1); 
  mad (7, 1); 
  mad (35, -129); 
  mad (79, -65); 
  mad (105, 185); 
  mad (169, -53);
  A.ng = 9;
  // Just leaves (1, 9) to click - should see "Well done" message
}

function mad (x, y)// Mark as done
{ A.dn [x + ',' + y] = 1; }
*/
/*
function testMoonset ()
{ back (); // Turn round to see it
  A.M.t2 = setInterval (tum, 200);// Every 1/5 second
}

function tum ()// Update moon, test version
{ A.M.update ();
  draw ();
  console.log (A.M.b, A.M.y, A.M.c, A.M.set);
  if (A.M.set) clearInterval (A.M.t2);
}
*/