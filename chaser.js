function robot(state, unit) {
  enemies = state.objsByTeam(state.otherTeam)
  closestEnemy = _.minBy(enemies,
    e => e.coords.distanceTo(unit.coords)
  )
  direction = unit.coords.directionTo(closestEnemy.coords)

  if (unit.coords.distanceTo(closestEnemy.coords) === 1) {
    return Action.attack(direction)
  } else {
    return Action.move(direction)
  }
}
