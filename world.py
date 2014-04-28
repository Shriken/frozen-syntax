import unit

class World:
    def __init__(self, playerCount):
        self.players = range(playerCount) #This will be replaced by an enum.
        self.units = {player : {} for player in self.players}
        self.walls = []
        self.map_bounds = (-1000, 1000, -1000, 1000)
        self.time = 0
        self.visibility = {player : {} for player in self.players}
        #self.visibility[player1][player2][unitID] is a boolean that tells me whether
        #player1 can see the unit with ID unitID, which belongs to player2

    def addWall(self, x0, y0, width, height):
        self.walls.append((x0, x0+width, y0, y0+height)) #xmin, xmax, ymin, ymax

    def addWallCentered(self, x0, y0, width, height):
        self.walls.append((x0 - width/2, x0 + width/2, y0 - height/2, y0 + height/2))

    def pointInWall(self, x, y):
        for wall in self.walls:
            if wall[0] <= x <= wall[1] and wall[2] <= y <= wall[3]:
                return true
        return false

    def pointOnMap(self, x, y):
        return (self.map_bounds[0] < x < self.map_bounds[1]) \
            and (self.map_bounds[2] < y < self.map_bounds[3])

    def addUnit(self, unit, unitID, player):
        if unitID in self.units[player]:
            print "UnitID already taken"
        else:
            self.units[player] = unit
            createEvent(actorSpawnedEvent(unitID, \
                                          unit.x, \
                                          unit.y, \
                                          player, \
                                          'unit'))

    def runStep(self):
        self.time += 1
        for player in self.players:
            for unit in self.units.itervalues():
                unit.singleStep()
                if self.pointInWall(unit.x, unit.y):
                    unit.unStep()
                elif not self.pointOnMap(unit.x, unit.y):
                    unit.unStep()

    def move(self, unit, dx, dy):
        unit.destination = (unit.x + dx, unit.y + dy)

    def go(self, unit, x, y):
        unit.destination = (x, y)

    def say(self, unit, message):
        pass

    def createEvent(event): #this needs to send the event to the client
        print event

    def updateVisibility(self, player1, player2): #player1 is looking for player2's units
        units_seen = {}
        for u2 in self.units[player2]:
            units_seen[u2] = False
            for u1 in self.units[player1]:
                if self.canSee(u1, u2):
                    units_seen[u2] = True
                    break
        vis_event_units = {unitID : units_seen[unitID] for unitID in units_seen \
                           if units_seen[unitID] != self.visibility[player1][player2][unitID]}
        for unitID in vis_event_units:
            if vis_event_units[unitID]:
                createEvent(actorSeenEvent(unitID, \
                                           self.units[player2].x, \
                                           self`.units[player2].y, \
                                           player2, \
                                           'unit'))
            else:
                createEvent(actorHiddenEvent(unitID))
        self.visibility[player1][player2] = units_seen

    def canSee(self, unit1, unit2): #Returns whether unit1 can see unit2
        return True

    def actorSpawnedEvent(unitID, x, y, team, actor_type):
        event = {}
        event['timestamp'] = str(self.time)
        event['type'] = str('ActorSpawned')
        event['data'] = {}
        event['data']['id'] = str(unitID)
        event['data']['x'] = str(x)
        event['data']['y'] = str(y)
        event['data']['team'] = str(team)
        event['data']['type'] = str(actor_type)
        return event

    def actorSeenEvent(unitID, x, y, team, actor_type):
        event = {}
        event['timestamp'] = str(self.time)
        event['type'] = 'ActorSeen'
        event['data'] = {}
        event['data']['id'] = str(unitID)
        event['data']['x'] = str(x)
        event['data']['y'] = str(y)
        event['data']['team'] = str(team)
        event['data']['type'] = str(actor_type)
        return event

    def actorHiddenEvent(unitID):
        event = {}
        event['timestamp'] = str(self.time)
        event['type'] = 'ActorHidden'
        event['data'] = {}
        event['data']['id'] = str(unitID)
        return event

    def actorStoppedEvent(unitID):
        event = {}
        event['timestamp'] = str(self.time)
        event['type'] = 'ActorStopped'
        event['data'] = {}
        event['data']['id'] = str(unitID)
        return event

    def actorStartedMovingEvent(unitID, x, y, vx, vy):
        event = {}
        event['timestamp'] = str(self.time)
        event['type'] = 'ActorStartedMoving'
        event['data'] = {}
        event['data']['id'] = str(unitID)
        event['data']['x'] = str(x)
        event['data']['y'] = str(y)
        event['data']['vx'] = str(vx)
        event['data']['vy'] = str(vy)
        return event
