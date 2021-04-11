// credit: Tyler Menezes

const currentlyTargeting = {};

function getTarget(state, me) {
  if (me.id in currentlyTargeting) {
    return state.objById(currentlyTargeting[id]) || null;
  } else return null;
}

function getRobotsForTeam(state, team) {
  return state
    .objsByTeam(team)
    .filter((o) => o.objType.toString() === 'ObjType.Unit');
}

function sqDistance(me, other) {
  return Math.pow(me.coords.x - other.coords.x, 2)
        + Math.pow(me.coords.y - other.coords.y, 2);
}

function closest(me, units) {
  return units.sort((a, b) => sqDistance(me, a) - sqDistance(me, b));
}

function truncDistance(me, units, cutoff) {
  return units.filter((u) => me.coords.distanceTo(u.coords) <= cutoff);
}

function findAdjacentEnemyDirection(me, enemies) {
  return enemies
    .filter((e) => me.coords.distanceTo(e.coords) === 1)
    .sort((a, b) => a.health - b.health)
    .map((e) => me.coords.directionTo(e.coords))[0] || null;
}

function fixNs(d) {
  if (d.toString() === 'Direction.North') return new Coords(0, -1);
  if (d.toString() === 'Direction.South') return new Coords(0, 1);
  return d.toCoords;
}

function cloneDirection (d) {
  if (d.toString() === 'Direction.North') return Direction.North;
  if (d.toString() === 'Direction.East') return Direction.East;
  if (d.toString() === 'Direction.South') return Direction.South;
  if (d.toString() === 'Direction.West') return Direction.West;
}

function mostDirections (me, units) {
  const directionCount = {};
  units.forEach((u) => {
    const dirTo = me.coords.directionTo(u.coords);
    if (!(dirTo in directionCount)) directionCount[dirTo] = 0;
    directionCount[dirTo]++;
  });

  const mostCount = Object.values(directionCount).sort((a, b) => b-a)[0];
  return Object.keys(directionCount).filter((k) => directionCount[k] === mostCount).map(cloneDirection);
}

function isMoveInBounds(state, coords, direction) {
  return typeof state.objByCoords(coords.add(fixNs(direction))) === 'undefined'
}

const NEARBY_RADIUS = 5;
let inspectId;

function robot(state, me) {
  if (!inspectId || !state.objById(inspectId)) {
    inspectId = me.id;
  }

  if (inspectId === me.id) {
    debug.inspect(me);
  }

  const aggressiveMultiplier = ((state.turn % 10) > 7 ? 2 : 1) * (me.health <= 2 ? 0.25 : 1);
  const ourRobots = getRobotsForTeam(state, state.ourTeam);
  const otherRobots = getRobotsForTeam(state, state.otherTeam);
  const myTarget = getTarget(state, me);
  const nearbyFriends = truncDistance(me, ourRobots, NEARBY_RADIUS);
  const nearbyEnemies = truncDistance(me, otherRobots, NEARBY_RADIUS);
  const adjacentEnemy = findAdjacentEnemyDirection(me, nearbyEnemies);

  const nearbyFriendsHealth = nearbyFriends.reduce((h, robot) => h + robot.health, 0)/5;
  const nearbyEnemiesHealth = nearbyFriends.reduce((h, robot) => h + robot.health, 0)/5;

  // If we're outnumbered, try to leave
  if ((nearbyFriendsHealth + nearbyFriends.length) * aggressiveMultiplier < (nearbyEnemiesHealth + nearbyEnemies.length)) {

    // Try to flee in the direction with the most friends, if possible
    const fewestEnemiesDirections = mostDirections(me, nearbyEnemies)
      .map((d) => d.opposite)
      .filter((d) => isMoveInBounds(state, me.coords, d));

    const mostFriendsDirections = mostDirections(me, nearbyFriends)
      .filter((d) => isMoveInBounds(state, me.coords, d));

    const inCommonDirections = fewestEnemiesDirections.filter((d) => mostFriendsDirections.includes(d));

    if (inCommonDirections.length > 0) {
      return Action.move(inCommonDirections[0]);
    } else if (fewestEnemiesDirections.length > 0) {
      return Action.move(fewestEnemiesDirections[0]);
    } else if (adjacentEnemy) {
      return Action.attack(adjacentEnemy);
    } else return null;


  // We're in the local majority, fight!
  } else {

    // Attack if near an enemy
    if (adjacentEnemy) {
      return Action.attack(adjacentEnemy);
    }

    // Try to move to the nearest enemy
    const nearestEnemy = closest(me, otherRobots)[0];
    if (!nearestEnemy) return null;

    // Find a direction we can move, hopefully toward the enemy, or one of the directions to the side
    let moveDirection = me.coords.directionTo(nearestEnemy.coords);
    for (let i = 0; i < 4; i++) {

      if (isMoveInBounds(state, me.coords, moveDirection)) {
        return Action.move(moveDirection);
      }
      moveDirection = moveDirection.rotateCw;
    }
  }

  return null;
}

