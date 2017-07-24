'use strict'; /*jslint node:true*/

let maxStatesPerControl = 10;

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

  length(v) { return this.arr.length; }

  remove(v) {
    let i = this.arr.findIndex(a => a.is(v));
    if (i > -1) {
      this.arr.splice(i, 1);
    }
    return this;
  }

  add(v) {
    measure.start('list add');
    if (!Array.isArray(v))
      v = [v];
    this.arr = this.arr.concat(v);
    measure.pause('list add');
    return this;
  }

  isEmpty() {
    return !this.arr.length;
  }

  reduce() {
    return this.arr.reduce.apply(this.arr, arguments);
  }

  clone() {
    return new List(this.arr.slice(0));
  }
}

class Measure {
  constructor() {
    this.max = {};
    this.measures = {};
  }

  start(label) {
    if (!this.measures[label])
      this.measures[label] = {total: 0};
    this.measures[label].start = Date.now();
  }

  pause(label) {
    this.measures[label].total += Date.now() - this.measures[label].start;
  }

  cycle() {
    Object.keys(this.measures).forEach(l=>{
      if (this.measures[l].total > this.max[l] || !this.max[l])
        this.max[l] = this.measures[l].total;
      console.warn(`${l}: ${this.measures[l].total} ms, max ${this.max[l]}`)
    });
    this.measures = {};
  }
}

let measure;

class AStar {
  constructor(gameState) {
    this.gameState = gameState;
    this.blockedDiamonds = [];
  }

  /**
   * Returns path list from [from] to any point from [to].
   */
  path(from, to, startPath) {
    startPath = startPath||[];
    let neighborX = [1, 0, -1, 0];
    let neighborY = [0, 1, 0, -1];
    let current;
    let gScore = {};
    gScore[from] = 0;
    let fScore = {};
    fScore[from] = this._distance(from, to);
    let closedSet = new List();
    let openSet = new List([from]);
    let cameFrom = {};
    let world = this.gameState.getRootWorld();
    measure.start('while');
    while (!openSet.isEmpty()) {
      measure.start('openSet.reduce');
      current = openSet.reduce((first, second) => fScore[first] < fScore[second] ? first : second);
      measure.pause('openSet.reduce');
      measure.start('to.contains(current)');
      if (to.contains(current))
      {
        measure.pause('to.contains(current)');
        measure.pause('while');
        return this._getPath(cameFrom, current);
      }
      measure.pause('to.contains(current)');
      measure.start('openSet.remove');
      openSet.remove(current);
      closedSet.add(current);
      measure.pause('openSet.remove');
      measure.start('for');
      for (let i = 0; i < 4; i++) {
        measure.start('neighbor');
        let x = current.x + neighborX[i];
        let y = current.y + neighborY[i];
        let neighbor = new Point(x, y);
        measure.pause('neighbor');
        if (world.isOutOfMap(x, y))
          continue;
        if (closedSet.contains(neighbor))
          continue;
        /* Game-specific logic start*/
        if (world.isObstacle(neighbor))
          continue;
        measure.start('cameFromTmp');
        // OPTIMIZATION: (~20ms in pick moments) Object.assign() is slow sometimes, maybe when manipulates a big map.
        // Use solution w/o clone.
        let prev = cameFrom[neighbor];
        cameFrom[neighbor] = current;
        measure.pause('cameFromTmp');
        let path = this._getPath(cameFrom, neighbor);
        cameFrom[neighbor] = prev;
        if (this.gameState.getCounter() <= maxStatesPerControl)
        {
          measure.start('isDeadPos');
          if (this.gameState.isDeadPos(path.concat(startPath.slice(1)).reverse()))
          {
            measure.pause('isDeadPos');
            continue;
          }
          measure.pause('isDeadPos');
        }
        /* Game-specific logic end*/
        measure.start('for end');
        let tentativeGScore = gScore[current] + 1/* + waitTime*/;
        if (openSet.contains(neighbor) && tentativeGScore >= gScore[neighbor])
        {
          measure.pause('for end');
          continue;
        }
        /* Game-specific logic start*/
        measure.start('next way check');
        if (this.gameState.getCounter() <= maxStatesPerControl) {
          if (!startPath.length && to.contains(neighbor) && to.length() > 1 &&
            !this.path(neighbor, to.clone().remove(neighbor), path)) {
            this.blockedDiamonds.push(neighbor);
            measure.pause('next way check');
            continue;
          }
        }
        measure.pause('next way check');
        /* Game-specific logic end*/
        cameFrom[neighbor] = current;
        gScore[neighbor] = tentativeGScore;
        fScore[neighbor] = gScore[neighbor] + this._distance(neighbor, to);
        if (!openSet.contains(neighbor))
          openSet.add(neighbor);
        measure.pause('for end');
      }
      measure.pause('for');
    }
    measure.pause('while');
    return null;
  }

  _distance(from, to) {
    measure.start('_distance');
    // TODO: optimize for single [to].
    let val = to.reduce((min, point)=>{
      let distance = point.distanceTo(from);
      return min > distance ? distance : min;
    }, Number.MAX_VALUE);
    measure.pause('_distance');
    return val;
  }

  _getPath(cameFrom, current) {
    measure.start('_getPath');
    let totalPath = [current];
    while (cameFrom[current]) {
      current = cameFrom[current];
      totalPath.push(current);
    }
    measure.pause('_getPath');
    return totalPath;
  }
}

class Game {
  *loop(screen) {
    let max_time = 0, max_path = 0, max_states = 0;
    screen.pop();
    let world = from_ascii(screen, {});
    let gameState = new GameState(world.playerPos(), world);
    measure = new Measure();
    while (true){
      gameState.resetCounter();
      //console.warn(screen);
      screen.pop();
      world = gameState.getRootWorld();
      if (!world.isInSync(screen))
      {
        console.warn(screen);
        console.warn(world.render());
        console.warn(`started to lose frames (${max_time} ms), quiting`);
        yield 'q';
        return;
      }
      console.warn('pos', world.playerPos());
      let ts = Date.now();
      let aStar = new AStar(gameState);
      let diamonds = gameState.getDiamonds();
      //console.warn('from ', world.playerPos);
      let move, path;
      if (!diamonds.isEmpty()) {
        measure.start('AStar');
        path = aStar.path(world.playerPos(), diamonds);
        gameState.blockedDiamonds.add(aStar.blockedDiamonds);
        measure.pause('AStar');
      }
      if (path)
      {
        move = world.playerPos().dir(path[path.length-2]);
        max_path = Math.max(max_path, path.length);
      }
      gameState.nextStep(path && path.reverse()[1]);
      //console.warn('max path length', max_path);
      let time = Date.now() - ts;
      measure.cycle();
      max_time = Math.max(time, max_time);
      max_states = Math.max(gameState.getCounter(), max_states);
      console.warn('time', time, 'max', max_time, 'max states', max_states);
      console.warn('move', dir2char(move), path);
      yield dir2char(move);
    }
  }
}

class GameState {
  constructor(point, world) {
    this.statesGraph = {};
    this.statesGraph[point] = {world: world};
    this.statesPerStep = 0;
    /**
     * Example:
     * AB
     * :0
     * :+0
     *   +
     * *0:
     * 0+:
     *
     * We don't fit in the states ahead calc in B state and so can't fully calc retreat path from tunnel.
     * But we fit in A state and know we will be killed by boulder.
     * Blocking this diamond until next time will make us prevent infinite moves between A and B.
     */
    this.blockedDiamonds = new List();
  }

  getGraphPath(path) {
    let cur = this.statesGraph;
    path.forEach(point=>{
      if (cur[point])
      {
        cur = cur[point];
        return;
      }
      cur[point] = {parent: cur};
      cur = cur[point];
    });
    return cur;
  }

  resetCounter() {
    this.statesPerStep = 0;
  }

  getCounter() {
    return this.statesPerStep;
  }

  getDiamonds() {
    let root = this._getRoot();
    return root.world.getDiamonds(this.blockedDiamonds);
  }

  nextStep(point) {
    let root = this._getRoot();
    this.statesGraph = {};
    if (!point) {
      this.statesGraph[root.world.playerPos()] = {world: root.world};
      root.world.update();
      return;
    }
    let next = root[point];
    next.parent = null;
    this.statesGraph[point] = next;
    if (root.world.diamonds_collected < next.world.diamonds_collected)
      this.blockedDiamonds = new List();
  }

  _calcPath(path) {
    let graphPath = this.getGraphPath(path);
    if (graphPath.world)
      return graphPath.world;
    this.statesPerStep++;
    measure.start('_calcPath');
    let prevWorld = graphPath.parent.world;
    let world = new World(prevWorld.width, prevWorld.height, {});
    // copy only literal values
    Object.keys(prevWorld).filter(k=>!['cells', 'player'].includes(k)).forEach(k=>world[k] = prevWorld[k]);
    graphPath.world = world;
    measure.start('_calcPath clone');
    // OPTIMIZATION: (~15ms always) JS Iterators are slow, using plain for's instead.
    for (let y = 0; y<prevWorld.height; y++)
    {
      let row = prevWorld.cells[y];
      for (let x = 0; x<prevWorld.width; x++)
      {
        if (row[x])
        {
          measure.start('_calcPath set');
          world.set(row[x].point, row[x].clone(world));
          measure.pause('_calcPath set');
        }
      }
    }
    measure.pause('_calcPath clone');
    world.control(world.playerPos().dir(path[path.length-1]));
    world.update();
    measure.pause('_calcPath');
    return world;
  }

  worldAtPath(path) {
    let cur = [], world;
    for (let i = 0; i < path.length; i++) {
      cur.push(path[i]);
      world = this._calcPath(cur);
    }
    return world;
  }

  _getRoot() {
    return this.statesGraph[Object.keys(this.statesGraph)[0]];
  }

  getRootWorld() {
    return this._getRoot().world;
  }

  isDeadPos(path) {
    let cur = [path[0]];
    for (let i = 1; i < path.length; i++) {
      cur.push(path[i]);
      let world = this._calcPath(cur);
      // check if we are alive and moved (=there were no obstacle)
      if (!world.is_playable() || !world.playerPos().is(path[i]))
        return true;
    }
    return false;
  }
}

let game = new Game();
exports.play = game.loop;



/* !!! c-p from game code with patches !!! */



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
  isMovable(){ return false; }
  canKill(){ return false; }
  clone(world) {
    measure.start('clone');
    let thing = new this.constructor(world);
    Object.keys(this).filter(k=>!['world', 'mark'].includes(k)).forEach(k=>thing[k] = this[k]);
    measure.pause('clone');
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
  isMovable(){ return true; }
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
  isMovable(){ return true; }
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
  isMovable(){ return true; }
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
  hit(){ this.alive = false; }
  isMovable(){ return true; }
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
      this.player = thing;
  }
  playerPos() {
    return this.player.point;
  }
  isOutOfMap(x, y) {
    return x < 0 || y < 0 || y >= this.height || x >= this.width;
  }
  isObstacle(point) {
    // this.get(point) == undefined == free cell
    return this.get(point) && !this.get(point).isMovable();
  }
  canKill(point) {
    return this.get(point) && this.get(point).canKill();
  }
  getDiamonds(exclude) {
    let diamonds = new List();
    for (let y = 0; y<this.height; y++)
    {
      let row = this.cells[y];
      for (let x = 0; x<this.width; x++) {
        if (row[x] instanceof Diamond && !exclude.contains(new Point(x, y)))
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
      if (screen[i] != cur[i]) {
        console.warn('out of sync line', i);
        return false;
      }
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
