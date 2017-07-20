'use strict'; /*jslint node:true*/


function dir2char(d){
  switch (d){
    case UP: return 'u';
    case DOWN: return 'd';
    case RIGHT: return 'r';
    case LEFT: return 'l';
  }
}

class Point {
  constructor(x, y){
    this.x = x;
    this.y = y;
    Object.freeze(this);
  }

  up(){ return new Point(this.x, this.y-1); }

  right(){ return new Point(this.x+1, this.y); }

  down(){ return new Point(this.x, this.y+1); }

  left(){ return new Point(this.x-1, this.y); }

  step(dir){
    switch (dir)
    {
      case UP: return this.up();
      case RIGHT: return this.right();
      case DOWN: return this.down();
      case LEFT: return this.left();
    }
  }

  dir(to){
    let dirs = {};
    dirs[this.up()] = UP;
    dirs[this.right()] = RIGHT;
    dirs[this.down()] = DOWN;
    dirs[this.left()] = LEFT;
    if (dirs[to]===undefined)
      throw new Error(`No direction from ${this} to ${to} (${JSON.stringify(dirs)})`);
    return dirs[to];
  }

  distanceTo(to){
    let dx = this.x - to.x;
    let dy = this.y - to.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  is(v) {
    return this.x === v.x && this.y === v.y;
  }

  toString() {
    return this.x + ' ' + this.y;
  }
}

class List {
  constructor(list) {
    this.arr = list||[];
  }

  contains(v) {
    return this.arr.some(a => a.is(v));
  }

  remove(v) {
    let i = this.arr.findIndex(a => a.is(v));
    if (i > -1) {
      this.arr.splice(i, 1);
    }
  }

  add(v) {
    this.arr.push(v);
  }

  isEmpty() {
    return !this.arr.length;
  }

  reduce() {
    return this.arr.reduce.apply(this.arr, arguments);
  }
}

class AStar {
  /*GameState gameState;
  List<Point> _cellsOnFire;*/
  constructor(gameState) {
    this.gameState = gameState;
    //_cellsOnFire = gameState.getCellsOnFire();
  }

/**
 * Returns path list from [from] to any point from [to].
 */
  path(from, to/*, [List<Point> obsticles]*/) {
    /*if (obsticles == null)
      obsticles = [];*/
    //var map = gameState.mapAtStep(0);
    // game does not support diagonal moves
    let neighborX = [1, 0, -1, 0];
    let neighborY = [0, 1, 0, -1];
    let current;
    let gScore = {};
    gScore[from] = 0;
    let fScore = {};
    fScore[from] = this._distance(from, to);
    //Map<Point, Map> bombWait = {};
    let closedSet = new List();
    let openSet = new List([from]);
    openSet.add(from);
    let cameFrom = {};
    let world = this.gameState.worldAtStep(0);
    while (!openSet.isEmpty()) {
      current = openSet.reduce((first, second) => fScore[first] < fScore[second] ? first : second);
      if (to.contains(current))
        return this._getPath(cameFrom, /*bombWait, */current);
      openSet.remove(current);
      closedSet.add(current);
      for (let i = 0; i < 4; i++) {
        let x = current.x + neighborX[i];
        let y = current.y + neighborY[i];
        let neighbor = new Point(x, y);
        if (world.isOutOfMap(x, y))
          continue;
        if (closedSet.contains(neighbor))
          continue;
        /*if (obsticles.contains(neighbor))
          continue;*/
        /* Game-specific logic start*/
        /*var bombWaitTmp = new Map.from(bombWait);
        bombWaitTmp.remove(neighbor);*/
        /*let step = path.length-1;
        let world = this.world.worldAtStep(step);*/
        //var waitPoint, waitTime = 0;
        if (/*!to.contains(neighbor) && */world.isObstacle(neighbor, current.dir(neighbor))/*gameState.isObstacle(neighbor, step)*/) {
          continue;
          /*if (!gameState.isBomb(neighbor, step))
            continue;*/
          /*path.any((point) {
            if (!_cellsOnFire.contains(point)) {
              waitPoint = point;
              return true;
            }
            return false;
          });*/
          /*if (waitPoint == null)
            continue;
          waitTime = gameState.getBombCountdown(neighbor);*/
        }
        let cameFromTmp = Object.assign({}, cameFrom);
        cameFromTmp[neighbor] = current;
        let path = this._getPath(cameFromTmp/*, bombWaitTmp*/, neighbor);
        // TODO: maybe we really need more steps?
        if (path.length < 6)
        {
          if (this.gameState.isDeadPos(neighbor, path.length))
            continue;
        }
        /*if (gameState.isDeadPos(neighbor, step+1))
          continue;*/
        /* Game-specific logic end*/
        let tentativeGScore = gScore[current] + 1/* + waitTime*/;
        if (openSet.contains(neighbor) && tentativeGScore >= gScore[neighbor])
          continue;
        /* Game-specific logic start*/
        //bombWait[neighbor] = {'waitPoint': waitPoint, 'waitTime': waitTime};
        /* Game-specific logic end*/
        cameFrom[neighbor] = current;
        gScore[neighbor] = tentativeGScore;
        fScore[neighbor] = gScore[neighbor] + this._distance(neighbor, to);
        if (!openSet.contains(neighbor))
          openSet.add(neighbor);
      }
    }
    return null;
  }

  _distance(from, to) {
    // TODO: optimize for single [to].
    return to.reduce((min, point)=>{
      let distance = point.distanceTo(from);
      return min > distance ? distance : min;
    }, Number.MAX_VALUE);
  }

  _getPath(cameFrom, /*Map bombWait, */current) {
    let totalPath = [current];
    /*let waitPoints = {};*/
    while (cameFrom[current]) {
      /*if (bombWait[current] != null && bombWait[current]['waitPoint'] != null) {
        waitPoints[bombWait[current]['waitPoint']] = bombWait[current]['waitTime'];
      }*/
      current = cameFrom[current];
      totalPath.push(current);
    }
    /*waitPoints.forEach((point, time) {
      totalPath.insertAll(totalPath.indexOf(point), new List.filled(time, point));
    });*/
    return totalPath;
  }
}

class Game {
  *loop(screen) {
    let max_time = 0;
    screen.pop();
    this.world = from_ascii(screen, {});
    while (true){
      console.warn(screen);
      screen.pop();
      if (!this.world.isInSync(screen))
        throw new Error('started to lose frames');
      console.warn('pos', this.world.playerPos);
      let gameState = new GameState(this.world);
      // TODO: add world compare with "screen", quit and log if we fuckup and missed frames
      let ts = Date.now();
      let aStar = new AStar(gameState);
      let diamonds = this.world.getDiamonds();
      //console.warn('from ', this.world.playerPos);
      // TODO: what if no diamonds?
      let move, path;
      if (!diamonds.isEmpty())
        path = aStar.path(this.world.playerPos, diamonds);
      if (path)
        move = this.world.playerPos.dir(path[path.length-2]);
      console.warn('move ', move, path);
      let time = Date.now() - ts;
      max_time = Math.max(time, max_time);
      console.warn('time', time, 'max', max_time);
      this.world.control(move);
      this.world.update();
      yield dir2char(move);
    }
  }
}

class GameState {
  constructor(world) {
    this.worldPerStep = [world];
  }

  _calcStep(step) {
    if (this.worldPerStep[step])
      return;
    let prevWorld = this.worldPerStep[step-1];
    let world = new World(prevWorld.width, prevWorld.height, {});
    this.worldPerStep[step] = world;
    for (let [point, thing] of prevWorld) {
      if (thing && !(thing instanceof Player))
        world.set(point, thing.clone(world));
    }
    world.update();
  }

  worldAtStep(step) {
    for (let i = 1; i <= step; i++) {
      this._calcStep(i);
    }
    return this.worldPerStep[step];
  }

  isDeadPos(point, step) {
    let killAtStep = this.worldAtStep(step).canKill(point);
    let killBefore = this.worldAtStep(step-1).canKill(point);
    return !killBefore && killAtStep;
  }
}

let game = new Game();
exports.play = game.loop;





const UP = 0, RIGHT = 1, DOWN = 2, LEFT = 3;
function cw(dir){ return (dir+1) % 4; }
function ccw(dir){ return (dir+3) % 4; }

class Thing { // it would be a bad idea to name a class Object :-)
  constructor(world){
    this.world = world;
    this.point = undefined;
    this.mark = world.frame;
  }
  place(point){ this.point = point; }
  move(to){
    if (this.point)
      this.world.set(this.point);
    if (to)
      this.world.set(to, this);
  }
  update(){ this.mark = this.world.frame; }
  get_char(){}
  get_color(){}
  is_rounded(){ return false; } // objects roll off it?
  is_consumable(){ return false; } // consumed by explosions?
  is_settled(){ return true; } // no need to postpone game-over?
  hit(){} // hit by explosion or falling object
  walk_into(dir){ return false; } // can walk into?
  canWalkInto(){ return false; }
  canKill(){ return false; }
  clone(world) {
    let thing = new this.constructor(world);
    Object.keys(this).filter(k=>!['world', 'mark'].includes(k)).forEach(k=>thing[k] = this[k]);
    return thing;
  }
}

class SteelWall extends Thing {
  get_char(){ return '#'; }
  get_color(){ return '37;46'; } // white on cyan
}

class BrickWall extends Thing {
  get_char(){ return '+'; }
  get_color(){ return '30;41'; } // black on red
  is_rounded(){ return true; }
  is_consumable(){ return true; }
}

class Dirt extends Thing {
  get_char(){ return ':'; }
  get_color(){ return '37'; } // white on black
  is_consumable(){ return true; }
  walk_into(dir){ return true; }
  canWalkInto(){ return true; }
}

class LooseThing extends Thing { // an object affected by gravity
  constructor(world){
    super(world);
    this.falling = false;
  }
  update(){
    super.update();
    let under = this.point.down();
    let target = this.world.get(under);
    if (target && target.is_rounded())
    {
      if (this.roll(this.point.left()) || this.roll(this.point.right()))
        return;
    }
    if (target && this.falling)
    {
      target.hit();
      this.falling = false;
    }
    else if (!target)
    {
      this.falling = true;
      this.move(under);
    }
  }
  roll(to){
    if (this.world.get(to) || this.world.get(to.down()))
      return false;
    this.falling = true;
    this.move(to);
    return true;
  }
  is_rounded(){ return !this.falling; }
  is_consumable(){ return true; }
  is_settled(){ return !this.falling; }
  canKill(){ return true; }
}

class Boulder extends LooseThing {
  get_char(){ return 'O'; }
  get_color(){ return '1;34'; } // bright blue on black
  walk_into(dir){
    if (this.falling || dir==UP || dir==DOWN)
      return false;
    let to = this.point.step(dir);
    if (!this.world.get(to))
    {
      this.move(to);
      return true;
    }
    return false;
  }
}

class Diamond extends LooseThing {
  get_char(){ return '*'; }
  get_color(){ return '1;33'; } // bright yellow on black
  walk_into(dir){
    this.world.diamond_collected();
    return true;
  }
  canWalkInto(/*dir*/){
    return true;
    /*return !this.falling || dir!=UP;*/
  }
}

class Explosion extends Thing {
  constructor(world){
    super(world);
    this.stage = 0;
  }
  get_char(){ return '*'; }
  get_color(){ return ['37;47', '1;31;47', '1;31;43', '1;37'][this.stage]; }
  update(){
    if (++this.stage>3)
      this.world.set(this.point, new Diamond(this.world));
  }
  is_settled(){ return false; }
  canKill(){ return true; }
}

class Butterfly extends Thing {
  constructor(world){
    super(world);
    this.dir = UP;
    this.alive = true;
  }
  get_char(){ return '/|\\-'[this.world.frame%4]; }
  get_color(){ return '1;35'; } // bright magenta on black
  update(){
    super.update();
    let points = new Array(4);
    for (let i = 0; i<4; i++)
      points[i] = this.point.step(i);
    let neighbors = points.map(p=>this.world.get(p));
    let locked = true;
    for (let neighbor of neighbors)
    {
      if (!neighbor)
        locked = false;
      else if (neighbor===this.world.player)
        return this.explode();
    }
    if (locked)
      return this.explode();
    let left = ccw(this.dir);
    if (!neighbors[left])
    {
      this.move(points[left]);
      this.dir = left;
    }
    else if (!neighbors[this.dir])
      this.move(points[this.dir]);
    else
      this.dir = cw(this.dir);
  }
  is_consumable(){ return true; }
  hit(){
    if (this.alive)
      this.explode();
  }
  explode(){
    this.alive = false;
    let x1 = this.point.x-1, x2 = this.point.x+1;
    let y1 = this.point.y-1, y2 = this.point.y+1;
    for (let y = y1; y<=y2; y++)
    {
      for (let x = x1; x<=x2; x++)
      {
        let point = new Point(x, y);
        let target = this.world.get(point);
        if (target)
        {
          if (!target.is_consumable())
            continue;
          if (target!==this)
            target.hit();
        }
        this.world.set(point, new Explosion(this.world));
      }
    }
    this.world.butterfly_killed();
  }
  canKill(){ return true; }
}

class Player extends Thing {
  constructor(world){
    super(world);
    this.alive = true;
    this.control = undefined;
  }
  get_char(){ return this.alive ? 'A' : 'X'; }
  get_color(){
    if (this.world.frame<24 && (this.world.frame%4 < 2))
      return '30;42';
    return '1;32'; // bright green on black
  }
  update(){
    super.update();
    if (!this.alive || this.control===undefined)
      return;
    let to = this.point.step(this.control);
    let target = this.world.get(to);
    if (!target || target.walk_into(this.control))
      this.move(to);
    this.control = undefined;
  }
  is_consumable(){ return true; }
  hit(){ debugger; this.alive = false; }
}

class World {
  constructor(w, h, {frames, fps}){
    this.width = w;
    this.height = h;
    this.frame = 0;
    this.frames_left = frames;
    this.fps = fps||10;
    this.settled = false;
    this.player = new Player(this);
    this.score = 0;
    this.streak = 0;
    this.streak_expiry = 0;
    this.streak_message = '';
    this.streaks = 0;
    this.longest_streak = 0;
    this.diamonds_collected = 0;
    this.butterflies_killed = 0;
    this.cells = new Array(h);
    for (let y = 0; y<h; y++)
      this.cells[y] = new Array(w);
    this.playerPos = null;
  }
  *[Symbol.iterator](){
    for (let y = 0; y<this.height; y++)
    {
      let row = this.cells[y];
      for (let x = 0; x<this.width; x++)
        yield [new Point(x, y), row[x]];
    }
  }
  get(point){ return this.cells[point.y][point.x]; }
  set(point, thing){
    let old = this.cells[point.y][point.x];
    if (old===thing)
      return;
    if (old)
      old.place();
    this.cells[point.y][point.x] = thing;
    if (thing)
      thing.place(point);
    if (thing instanceof Player)
      this.playerPos = point;
  }
  isOutOfMap(x, y) {
    return x < 0 || y < 0 || y >= this.height || x >= this.width;
  }
  isObstacle(point, dir) {
    // this.get(point) == undefined == free cell
    return this.get(point) && !this.get(point).canWalkInto();
  }
  canKill(point) {
    return this.get(point) && this.get(point).canKill();
  }
  getDiamonds() {
    let diamonds = new List();
    for (let y = 0; y<this.height; y++)
    {
      let row = this.cells[y];
      for (let x = 0; x<this.width; x++) {
        if (row[x] instanceof Diamond)
          diamonds.add(new Point(x, y));
      }
    }
    return diamonds;
  }
  diamond_collected(){
    this.score++;
    this.diamonds_collected++;
    this.streak++;
    this.streak_expiry = 20;
    this.scored_expiry = 8;
    if (this.streak<3)
      return;
    if (this.streak==3)
      this.streaks++;
    if (this.longest_streak<this.streak)
      this.longest_streak = this.streak;
    for (let i = 2; i*i<=this.streak; i++)
    {
      if (this.streak%i==0)
        return;
    }
    // streak is a prime number
    this.streak_message = `${this.streak}x HOT STREAK!`;
    this.score += this.streak;
  }
  butterfly_killed(){
    if (!this.player.alive) // no reward if player killed
      return;
    this.butterflies_killed++;
    this.score += 10;
    this.scored_expiry = 8;
  }
  leftpad(n, len){
    let res = n.toString();
    return res.length<len ? '0'.repeat(len-res.length)+res : res;
  }
  render(){
    let res = this.cells.map(row=>{
      let res = '';
      for (let cell of row)
      {
        res += cell ? cell.get_char() : ' ';
      }
      return res;
    });
    return res;
  }
  update(){
    this.frame++;
    if (this.frames_left)
      this.frames_left--;
    if (this.streak && !--this.streak_expiry)
    {
      this.streak = 0;
      this.streak_message = '';
    }
    if (this.scored_expiry)
      this.scored_expiry--;
    this.settled = !this.streak_message;
    for (let [point, thing] of this)
    {
      if (!thing)
        continue;
      if (thing.mark<this.frame)
        thing.update();
      if (!thing.is_settled())
        this.settled = false;
    }
    /*if (!this.frames_left)
      this.player.alive = false;*/
  }
  isInSync(screen) {
    let cur = this.render();
    for (let i in screen) {
      if (screen[i] != cur[i])
        return false;
    }
    return true;
  }
  control(c){ this.player.control = c; }
  is_playable(){ return this.player.alive; }
  is_final(){ return !this.player.alive && this.settled; }
}

function from_ascii(rows, opt){
  let w = rows[0].length, h = rows.length;
  if (w<3 || h<3)
    throw new Error('Cave dimensions are too small');
  let world = new World(w, h, opt);
  for (let y = 0; y<h; y++)
  {
    let row = rows[y];
    if (row.length!=w)
      throw new Error('All rows must have the same length');
    for (let x = 0; x<w; x++)
    {
      let c = row[x];
      if (c!='#' && (x==0 || x==w-1 || y==0 || y==h-1))
        throw new Error('All cells along the borders must contain #');
      let point = new Point(x, y);
      switch (c)
      {
        case ' ': break;
        case '#': world.set(point, new SteelWall(world)); break;
        case '+': world.set(point, new BrickWall(world)); break;
        case ':': world.set(point, new Dirt(world)); break;
        case 'O': world.set(point, new Boulder(world)); break;
        case '*': world.set(point, new Diamond(world)); break;
        case '-': case '/': case '|': case '\\':
        world.set(point, new Butterfly(world));
        break;
        case 'A':
          if (world.player.point)
            throw new Error('More than one player position found');
          world.set(point, world.player);
          break;
        default:
          throw new Error('Unknown character: '+c);
      }
    }
  }
  if (!world.player.point)
    throw new Error('Player position not found');
  return world;
}
